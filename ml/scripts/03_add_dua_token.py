"""Add the __dua__ language token to M2M100 and warm-start its embedding.

The new embedding is initialized as the mean of related Bantu language
embeddings (lingala, luganda, kinyarwanda, chichewa, swahili, zulu, xhosa).
"""
from __future__ import annotations

import argparse
from pathlib import Path

from common import MODELS_DIR, ensure_dirs, load_config, register_dua_token


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default=None)
    parser.add_argument(
        "--base-model",
        default=None,
        help="Local path or HF id (default: models/<base name> from config).",
    )
    parser.add_argument(
        "--output-dir",
        default=str(MODELS_DIR / "m2m100_dua_init"),
        help="Where to save the model with the new token.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    model_cfg = config["model"]
    base = args.base_model or str(MODELS_DIR / model_cfg["base"].split("/")[-1])
    dua_token = model_cfg["dua_token"]
    related_langs = model_cfg["related_langs"]
    output_dir = Path(args.output_dir)
    ensure_dirs(output_dir)

    import torch
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    print(f"Loading base model from {base}")
    tokenizer = AutoTokenizer.from_pretrained(base)
    model = AutoModelForSeq2SeqLM.from_pretrained(base)

    if dua_token in tokenizer.get_vocab():
        print(f"{dua_token} already in vocabulary; reusing it")
    else:
        tokenizer.add_special_tokens({"additional_special_tokens": [dua_token]})
        print(f"Added {dua_token}")

    old_vocab = model.get_input_embeddings().weight.shape[0]
    model.resize_token_embeddings(len(tokenizer))
    dua_id = register_dua_token(tokenizer, dua_token)

    with torch.no_grad():
        input_embeddings = model.get_input_embeddings().weight
        related_ids = [
            tokenizer.lang_code_to_id[lang]
            for lang in related_langs
            if lang in tokenizer.lang_code_to_id
        ]
        if not related_ids:
            raise SystemExit("No related language id found; cannot warm-start.")
        input_embeddings[dua_id] = input_embeddings[related_ids].mean(dim=0)

        output_embeddings = model.get_output_embeddings()
        if output_embeddings is not None and output_embeddings.weight.shape[0] > dua_id:
            output_embeddings.weight[dua_id] = input_embeddings[dua_id]

    model.generation_config.forced_bos_token_id = dua_id
    setattr(model.config, "forced_bos_token_id", dua_id)

    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"Saved init model -> {output_dir}")
    print(
        f"  vocab {old_vocab} -> {len(tokenizer)} | "
        f"dua id={dua_id} | warm-start from {related_langs}"
    )


if __name__ == "__main__":
    main()
