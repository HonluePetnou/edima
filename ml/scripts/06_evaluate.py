"""Evaluate a fine-tuned model: chrF/BLEU plus glossary term accuracy.

Term accuracy is only meaningful on French sources that contain validated
glossary terms; on MT560 (English sources) it will be close to zero.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from common import (
    DATA_DIR,
    GLOSSARY_TERMS,
    OUT_DIR,
    load_config,
    normalize_text,
    read_jsonl,
    register_dua_token,
    resolve_device,
    write_jsonl,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default=None)
    parser.add_argument("--model", default=str(OUT_DIR / "m2m100_dua" / "best"))
    parser.add_argument("--data", default=str(DATA_DIR / "processed" / "test.jsonl"))
    parser.add_argument("--output-dir", default=str(OUT_DIR / "eval"))
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--num-beams", type=int, default=None)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--glossary", default=str(GLOSSARY_TERMS))
    parser.add_argument("--no-glossary", action="store_true")
    return parser.parse_args()


def load_glossary(path: Path) -> list[tuple[str, str]]:
    if not path.exists():
        return []
    terms = json.loads(path.read_text(encoding="utf-8"))
    pairs: list[tuple[str, str]] = []
    for term in terms:
        dua = term.get("dua")
        if dua and term.get("dua_status") == "valide":
            fr = normalize_text(term.get("fr", ""))
            dua = normalize_text(dua)
            if fr and dua:
                pairs.append((fr, dua))
    return pairs


def term_metrics(
    sources: list[str], predictions: list[str], pairs: list[tuple[str, str]]
) -> dict:
    total = hits = 0
    for src, pred in zip(sources, predictions):
        src_l = normalize_text(src).lower()
        pred_l = normalize_text(pred).lower()
        for fr, dua in pairs:
            if fr.lower() in src_l:
                total += 1
                if dua.lower() in pred_l:
                    hits += 1
    return {
        "term_total": total,
        "term_hits": hits,
        "term_accuracy": (hits / total) if total else None,
    }


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    eval_cfg = config["eval"]
    batch_size = args.batch_size or eval_cfg["batch_size"]
    num_beams = args.num_beams or eval_cfg["num_beams"]
    max_length = eval_cfg["max_length"]
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    rows = read_jsonl(Path(args.data))
    if args.limit:
        rows = rows[: args.limit]
    if not rows:
        raise SystemExit(f"No evaluation rows in {args.data}")

    import sacrebleu
    import torch
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    device = resolve_device()
    tokenizer = AutoTokenizer.from_pretrained(args.model)
    dua_token = config["model"]["dua_token"]
    dua_id = register_dua_token(tokenizer, dua_token)
    model = AutoModelForSeq2SeqLM.from_pretrained(args.model).to(device).eval()

    predictions: list[str] = []
    for start in range(0, len(rows), batch_size):
        batch = rows[start : start + batch_size]
        tokenizer.src_lang = batch[0]["src_lang"]
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
                forced_bos_token_id=dua_id,
                max_length=max_length,
                num_beams=num_beams,
            )
        predictions.extend(tokenizer.batch_decode(generated, skip_special_tokens=True))
        done = min(start + batch_size, len(rows))
        print(f"  {done}/{len(rows)}", end="\r", flush=True)
    print()

    sources = [row["src"] for row in rows]
    references = [row["tgt"] for row in rows]
    metrics: dict = {
        "rows": len(rows),
        "chrf": sacrebleu.corpus_chrf(predictions, [references]).score,
        "bleu": sacrebleu.corpus_bleu(predictions, [references]).score,
    }
    if not args.no_glossary:
        pairs = load_glossary(Path(args.glossary))
        metrics.update(term_metrics(sources, predictions, pairs))
        metrics["glossary_validated_terms"] = len(pairs)

    write_jsonl(
        output_dir / "predictions.jsonl",
        [
            {"src": src, "tgt": ref, "pred": pred}
            for src, ref, pred in zip(sources, references, predictions)
        ],
    )
    metrics_path = output_dir / "metrics.json"
    metrics_path.write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(metrics, ensure_ascii=False, indent=2))
    print(f"Wrote {output_dir / 'predictions.jsonl'} and {metrics_path}")


if __name__ == "__main__":
    main()
