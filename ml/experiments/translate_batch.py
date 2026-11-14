"""EXPERIMENTAL — branch experiment/invention-langue only.

Batch-translates a list of French strings to Duala with the fine-tuned
M2M100 model, the same way ml/inference/server.py does it for one string at
a time. Output is raw, unreviewed model output: never copy it into
packages/shared/data/glossary/ with dua_status "valide" or "a_valider"
without a real speaker/linguist checking it first (see README.md in this
folder).

Usage:
    .venv/Scripts/python.exe ml/experiments/translate_batch.py <input.json> <output.json>

<input.json> is a flat list of French strings. <output.json> is a list of
{"fr": ..., "dua_ia": ..., "ok": bool} in the same order.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import ctranslate2
from transformers import M2M100Tokenizer

MODEL_DIR = Path(__file__).resolve().parents[1] / "models" / "m2m100_dua_ct2"
SOURCE_LANG = "fr"
TARGET_LANG = "dua"

COMBINING_MARK_RE = re.compile(r"\s+([̀-ͯ])")
SPACE_BEFORE_PUNCT_RE = re.compile(r"\s+([.,;:!?])")
SPACE_BEFORE_APOSTROPHE_RE = re.compile(r"\s+([’'])")
LANGUAGE_TOKEN_RE = re.compile(r"^__[a-z]{2,3}__$")


def clean(text: str) -> str:
    text = COMBINING_MARK_RE.sub(r"\1", text)
    text = SPACE_BEFORE_PUNCT_RE.sub(r"\1", text)
    text = SPACE_BEFORE_APOSTROPHE_RE.sub(r"\1", text)
    return re.sub(r"\s+", " ", text).strip()


def main() -> None:
    in_path, out_path = Path(sys.argv[1]), Path(sys.argv[2])
    strings: list[str] = json.loads(in_path.read_text(encoding="utf-8"))

    translator = ctranslate2.Translator(str(MODEL_DIR), device="cpu", compute_type="int8")
    tokenizer = M2M100Tokenizer.from_pretrained(str(MODEL_DIR), extra_special_tokens={}, local_files_only=True)
    tokenizer.src_lang = SOURCE_LANG

    source_id = tokenizer.convert_tokens_to_ids(f"__{SOURCE_LANG}__")
    target_prefix = [[f"__{TARGET_LANG}__"]]

    results = []
    for text in strings:
        ids = tokenizer.encode(text)
        if not ids or ids[0] != source_id:
            ids = [source_id, *ids]
        source_tokens = tokenizer.convert_ids_to_tokens(ids)
        try:
            out = translator.translate_batch(
                [source_tokens], target_prefix=target_prefix, beam_size=4, max_decoding_length=256
            )
            hyp = [t for t in out[0].hypotheses[0] if not LANGUAGE_TOKEN_RE.match(t)]
            target_ids = tokenizer.convert_tokens_to_ids(hyp)
            translated = clean(tokenizer.decode(target_ids, skip_special_tokens=True))
            ok = bool(translated)
        except Exception as exc:  # noqa: BLE001 — this is a throwaway experiment script
            translated = f"<erreur: {exc}>"
            ok = False
        results.append({"fr": text, "dua_ia": translated, "ok": ok})
        print(f"[{'OK' if ok else 'FAIL'}] {text!r} -> {translated!r}")

    out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n{sum(r['ok'] for r in results)}/{len(results)} ok -> {out_path}")


if __name__ == "__main__":
    main()
