"""Fine-tune M2M100 on EN->DUA and synthetic FR->DUA pairs.

The best checkpoint (highest chrF on the validation split) is saved to
``<output_dir>/best`` and is the input of 06_evaluate.py / 07_export_ct2.py.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

from common import (
    DATA_DIR,
    MODELS_DIR,
    ensure_dirs,
    load_config,
    read_jsonl,
    register_dua_token,
    set_seed,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default=None)
    parser.add_argument(
        "--init-model",
        default=str(MODELS_DIR / "m2m100_dua_init"),
        help="Output of 03_add_dua_token.py.",
    )
    parser.add_argument("--data-dir", default=str(DATA_DIR / "processed"))
    parser.add_argument("--output-dir", default=None)
    parser.add_argument("--no-synthetic", action="store_true", help="EN->DUA only.")
    parser.add_argument("--sample", type=int, default=0, help="Max rows per file (smoke test).")
    parser.add_argument("--max-steps", type=int, default=-1)
    parser.add_argument("--num-epochs", type=float, default=None)
    parser.add_argument(
        "--push-to-hub",
        default=None,
        help="HF repo id (e.g. user/edima-m2m100-dua); needs HF_TOKEN.",
    )
    return parser.parse_args()


def load_rows(path: Path, limit: int = 0) -> list[dict]:
    rows = read_jsonl(path)
    return rows[:limit] if limit else rows


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    set_seed(config["train"]["seed"])

    import numpy as np
    import sacrebleu
    import torch
    from datasets import Dataset
    from transformers import (
        AutoModelForSeq2SeqLM,
        AutoTokenizer,
        DataCollatorForSeq2Seq,
        Seq2SeqTrainer,
        Seq2SeqTrainingArguments,
    )

    data_dir = Path(args.data_dir)
    output_dir = Path(args.output_dir or config["train"]["output_dir"])
    ensure_dirs(output_dir)

    tokenizer = AutoTokenizer.from_pretrained(args.init_model)
    dua_token = config["model"]["dua_token"]
    dua_id = register_dua_token(tokenizer, dua_token)

    model = AutoModelForSeq2SeqLM.from_pretrained(args.init_model)
    if model.get_input_embeddings().weight.shape[0] != len(tokenizer):
        model.resize_token_embeddings(len(tokenizer))
    model.config.use_cache = False
    model.generation_config.forced_bos_token_id = dua_id
    setattr(model.config, "forced_bos_token_id", dua_id)

    use_synthetic = config["synthetic"]["enabled"] and not args.no_synthetic
    train_rows = load_rows(data_dir / "train.jsonl", args.sample)
    val_rows = load_rows(data_dir / "val.jsonl", args.sample)
    if use_synthetic:
        train_rows += load_rows(data_dir / "train_fr_syn.jsonl", args.sample)
        val_rows += load_rows(data_dir / "val_fr_syn.jsonl", args.sample)
    if not train_rows:
        raise SystemExit("No training rows; run 02_prepare_data.py first.")

    print(
        f"train rows={len(train_rows)} (synthetic={use_synthetic}) | "
        f"val rows={len(val_rows)}"
    )

    max_length = config["data"]["max_length"]

    def encode(example: dict) -> dict:
        tokenizer.src_lang = example["src_lang"]
        tokenizer.tgt_lang = example["tgt_lang"]
        model_inputs = tokenizer(example["src"], truncation=True, max_length=max_length)
        labels = tokenizer(
            text_target=example["tgt"], truncation=True, max_length=max_length
        )
        model_inputs["labels"] = labels["input_ids"]
        return model_inputs

    train_dataset = Dataset.from_list(train_rows)
    train_dataset = train_dataset.map(
        encode, remove_columns=list(train_dataset.column_names)
    )

    if val_rows:
        val_dataset = Dataset.from_list(val_rows)
        val_dataset = val_dataset.map(
            encode, remove_columns=list(val_dataset.column_names)
        )
    else:
        val_dataset = None

    data_collator = DataCollatorForSeq2Seq(
        tokenizer, model=model, padding=True, label_pad_token_id=-100
    )

    def compute_metrics(eval_pred) -> dict:
        predictions, labels = eval_pred
        if isinstance(predictions, tuple):
            predictions = predictions[0]
        decoded_preds = tokenizer.batch_decode(predictions, skip_special_tokens=True)
        labels = np.where(labels != -100, labels, tokenizer.pad_token_id)
        decoded_labels = tokenizer.batch_decode(labels, skip_special_tokens=True)
        return {
            "chrf": sacrebleu.corpus_chrf(decoded_preds, [decoded_labels]).score,
            "bleu": sacrebleu.corpus_bleu(decoded_preds, [decoded_labels]).score,
        }

    train_cfg = config["train"]
    fp16 = bool(train_cfg["fp16"]) and torch.cuda.is_available()
    push_to_hub = bool(args.push_to_hub and os.environ.get("HF_TOKEN"))
    if args.push_to_hub and not push_to_hub:
        print("HF_TOKEN is missing; disabling --push-to-hub.")

    training_args = Seq2SeqTrainingArguments(
        output_dir=str(output_dir),
        per_device_train_batch_size=train_cfg["per_device_train_batch_size"],
        per_device_eval_batch_size=train_cfg["per_device_eval_batch_size"],
        gradient_accumulation_steps=train_cfg["gradient_accumulation_steps"],
        learning_rate=train_cfg["learning_rate"],
        num_train_epochs=(
            args.num_epochs
            if args.num_epochs is not None
            else train_cfg["num_train_epochs"]
        ),
        warmup_steps=train_cfg["warmup_steps"],
        fp16=fp16,
        gradient_checkpointing=train_cfg["gradient_checkpointing"],
        predict_with_generate=True,
        evaluation_strategy="steps" if val_dataset is not None else "no",
        eval_steps=train_cfg["eval_steps"],
        save_steps=train_cfg["save_steps"],
        save_total_limit=train_cfg["save_total_limit"],
        logging_steps=train_cfg["logging_steps"],
        load_best_model_at_end=val_dataset is not None,
        metric_for_best_model="chrf",
        greater_is_better=True,
        report_to="none",
        seed=train_cfg["seed"],
        max_steps=args.max_steps,
        push_to_hub=push_to_hub,
        hub_model_id=args.push_to_hub if push_to_hub else None,
        hub_token=os.environ.get("HF_TOKEN") if push_to_hub else None,
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        tokenizer=tokenizer,
        data_collator=data_collator,
        compute_metrics=compute_metrics,
    )

    trainer.train()
    best_dir = output_dir / "best"
    trainer.save_model(str(best_dir))
    tokenizer.save_pretrained(str(best_dir))
    print(f"Saved best model -> {best_dir}")

    if push_to_hub:
        trainer.push_to_hub()
        print(f"Pushed to https://huggingface.co/{args.push_to_hub}")


if __name__ == "__main__":
    main()
