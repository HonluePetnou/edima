"""Convert the fine-tuned model to CTranslate2 int8 and verify a translation.

The exported directory is what the local sidecar loads for the jury demo
(~450 MB, CPU-friendly).
"""
from __future__ import annotations

import argparse
from pathlib import Path

from common import OUT_DIR, ensure_dirs, load_config, register_dua_token


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default=None)
    parser.add_argument("--model", default=str(OUT_DIR / "m2m100_dua" / "best"))
    parser.add_argument("--output-dir", default=None)
    parser.add_argument("--quantization", default=None)
    parser.add_argument(
        "--sample-src", default="Le solde de votre compte est disponible."
    )
    parser.add_argument("--src-lang", default="fr")
    parser.add_argument("--tgt-lang", default="dua")
    parser.add_argument("--device", default="cpu", choices=["cpu", "cuda"])
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    export_cfg = config["export"]
    output_dir = Path(args.output_dir or export_cfg["output_dir"])
    quantization = args.quantization or export_cfg["quantization"]
    ensure_dirs(output_dir)

    import ctranslate2
    from ctranslate2.converters import TransformersConverter
    from transformers import AutoTokenizer

    print(f"Converting {args.model} -> {output_dir} ({quantization})")
    converter = TransformersConverter(str(args.model))
    converter.convert(str(output_dir), quantization=quantization, force=True)

    tokenizer = AutoTokenizer.from_pretrained(args.model)
    dua_token = config["model"]["dua_token"]
    register_dua_token(tokenizer, dua_token)
    tokenizer.save_pretrained(output_dir)
    print("Tokenizer copied to the CT2 directory")

    translator = ctranslate2.Translator(
        str(output_dir), device=args.device, compute_type=quantization
    )
    tokenizer.src_lang = args.src_lang
    source_tokens = tokenizer.convert_ids_to_tokens(
        tokenizer(args.sample_src)["input_ids"]
    )
    target_token = tokenizer.lang_code_to_token[args.tgt_lang]
    results = translator.translate_batch(
        [source_tokens],
        target_prefix=[[target_token]],
        max_decoding_length=config["eval"]["max_length"],
    )
    output_tokens = results[0].hypotheses[0]
    if output_tokens and output_tokens[0] == target_token:
        output_tokens = output_tokens[1:]
    text = tokenizer.decode(
        tokenizer.convert_tokens_to_ids(output_tokens), skip_special_tokens=True
    )
    print(f"Sample: {args.sample_src!r} -> {text!r}")
    print(f"Export ready: {output_dir}")


if __name__ == "__main__":
    main()
