"""Clean, deduplicate and split the MT560 EN-DUA corpus into JSONL files.

Output rows use a stable schema:
    {"src": ..., "tgt": ..., "src_lang": "en", "tgt_lang": "dua"}
"""
from __future__ import annotations

import argparse
import random
from pathlib import Path

from common import (
    DATA_DIR,
    count_words,
    load_config,
    normalize_text,
    set_seed,
    write_jsonl,
)

SOURCE_COLUMNS = ("eng", "en", "english", "src", "source")
TARGET_COLUMNS = ("dua", "dual", "target", "tgt")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default=None)
    parser.add_argument(
        "--raw-dir",
        default=str(DATA_DIR / "raw" / "mt560_en_dua"),
        help="Directory produced by 01_download.py.",
    )
    parser.add_argument(
        "--out-dir",
        default=str(DATA_DIR / "processed"),
        help="Where to write train/val/test JSONL.",
    )
    parser.add_argument("--limit", type=int, default=0, help="Stop after N kept pairs.")
    return parser.parse_args()


def pick_columns(column_names: list[str]) -> tuple[str, str]:
    columns = set(column_names)
    src = next((name for name in SOURCE_COLUMNS if name in columns), None)
    tgt = next((name for name in TARGET_COLUMNS if name in columns), None)
    if src is None or tgt is None:
        raise SystemExit(f"Cannot find EN/DUA columns in {sorted(columns)}")
    return src, tgt


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    data_cfg = config["data"]
    set_seed(data_cfg["seed"])

    from datasets import load_from_disk

    dataset = load_from_disk(args.raw_dir)
    if hasattr(dataset, "keys") and "train" in dataset:
        split = dataset["train"]
    else:
        split = dataset
    src_col, tgt_col = pick_columns(split.column_names)
    print(f"Using columns src={src_col!r}, tgt={tgt_col!r}, rows={len(split)}")

    rows: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    skipped = 0

    for example in split:
        src = normalize_text(example[src_col])
        tgt = normalize_text(example[tgt_col])
        if not src or not tgt:
            skipped += 1
            continue

        src_words = count_words(src)
        tgt_words = count_words(tgt)
        if src_words < data_cfg["min_length"] or tgt_words < data_cfg["min_length"]:
            skipped += 1
            continue
        if max(src_words, tgt_words) > data_cfg["max_words"]:
            skipped += 1
            continue

        ratio = src_words / tgt_words
        if not data_cfg["length_ratio_min"] <= ratio <= data_cfg["length_ratio_max"]:
            skipped += 1
            continue

        key = (src, tgt)
        if key in seen:
            skipped += 1
            continue
        seen.add(key)

        rows.append({"src": src, "tgt": tgt, "src_lang": "en", "tgt_lang": "dua"})
        if args.limit and len(rows) >= args.limit:
            break

    if not rows:
        raise SystemExit("No pair survived filtering; check the raw dataset.")

    random.shuffle(rows)
    total = len(rows)
    n_test = int(total * data_cfg["test_fraction"])
    n_val = int(total * data_cfg["val_fraction"])
    test = rows[:n_test]
    val = rows[n_test : n_test + n_val]
    train = rows[n_test + n_val :]

    out_dir = Path(args.out_dir)
    write_jsonl(out_dir / "train.jsonl", train)
    write_jsonl(out_dir / "val.jsonl", val)
    write_jsonl(out_dir / "test.jsonl", test)
    print(
        f"kept {total} pairs ({skipped} skipped) -> "
        f"train={len(train)} val={len(val)} test={len(test)}"
    )


if __name__ == "__main__":
    main()
