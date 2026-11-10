"""Translate the English side of MT560 into French with M2M100 (EN->FR).

This gives the model a FR->DUA direction even though no public parallel
French-Duala corpus exists. Synthetic French is only a bootstrap: the gold
domain data comes from the validated glossary and, later, the demo portal.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import torch

from common import (
    DATA_DIR,
    MODELS_DIR,
    load_config,
    normalize_text,
    read_jsonl,
    resolve_device,
    write_jsonl,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default=None)
    parser.add_argument("--data-dir", default=str(DATA_DIR / "processed"))
    parser.add_argument(
        "--model",
        default=None,
        help="Base model path/id (default: models/m2m100_418M).",
    )
    parser.add_argument("--splits", nargs="+", default=["train", "val", "test"])
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--num-beams", type=int, default=None)
    parser.add_argument("--limit", type=int, default=0, help="Max rows per split (debug).")
    return parser.parse_args()


def translate_rows(
    model,
    tokenizer,
    rows: list[dict],
    device: str,
    batch_size: int,
    max_length: int,
    num_beams: int,
) -> list[dict]:
    tokenizer.src_lang = "en"
    fr_id = tokenizer.lang_code_to_id["fr"]
    outputs: list[dict] = []

    for start in range(0, len(rows), batch_size):
        batch = rows[start : start + batch_size]
        encoded = tokenizer(
            [row["src"] for row in batch],
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=max_length,
        )
        encoded = {key: value.to(device) for key, value in encoded.items()}
        with torch.inference_mode():
            generated = model.generate(
                **encoded,
                forced_bos_token_id=fr_id,
                max_length=max_length,
                num_beams=num_beams,
            )
        translations = tokenizer.batch_decode(generated, skip_special_tokens=True)
        for row, translation in zip(batch, translations):
            outputs.append(
                {
                    "src": normalize_text(translation),
                    "tgt": row["tgt"],
                    "src_lang": "fr",
                    "tgt_lang": "dua",
                    "en": row["src"],
                }
            )
        done = min(start + batch_size, len(rows))
        print(f"  {done}/{len(rows)}", end="\r", flush=True)
    print()
    return outputs


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    data_dir = Path(args.data_dir)
    model_cfg = config["model"]
    synth_cfg = config["synthetic"]
    model_path = args.model or str(MODELS_DIR / model_cfg["base"].split("/")[-1])
    batch_size = args.batch_size or synth_cfg["batch_size"]
    num_beams = args.num_beams or synth_cfg["num_beams"]
    max_length = synth_cfg["max_length"]

    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    device = resolve_device()
    print(f"Device: {device} | model: {model_path}")
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_path).to(device).eval()

    for split in args.splits:
        source_path = data_dir / f"{split}.jsonl"
        rows = read_jsonl(source_path)
        if not rows:
            print(f"skip {split}: no rows in {source_path}")
            continue
        if args.limit:
            rows = rows[: args.limit]

        print(f"Translating {split}: {len(rows)} rows -> fr")
        translated = translate_rows(
            model, tokenizer, rows, device, batch_size, max_length, num_beams
        )
        target_path = data_dir / f"{split}_fr_syn.jsonl"
        count = write_jsonl(target_path, translated)
        print(f"  wrote {count} rows -> {target_path}")


if __name__ == "__main__":
    main()
