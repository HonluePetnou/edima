"""Download the base model and the MT560 EN-DUA corpus.

BOUQuET is optional (gated dataset, evaluation only): pass --with-bouquet after
accepting its terms on the Hugging Face page.
"""
from __future__ import annotations

import argparse

from common import DATA_DIR, MODELS_DIR, ensure_dirs, load_config


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default=None, help="Path to the YAML config.")
    parser.add_argument(
        "--with-bouquet",
        action="store_true",
        help="Also download the gated BOUQuET dua_Latn/fra_Latn configs.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    raw_dir = DATA_DIR / "raw"
    base_model = config["model"]["base"]
    model_dir = MODELS_DIR / base_model.split("/")[-1]
    ensure_dirs(raw_dir, model_dir)

    from huggingface_hub import snapshot_download

    print(f"[1/2] Model {base_model} -> {model_dir}")
    snapshot_download(repo_id=base_model, local_dir=str(model_dir))
    print("      done")

    from datasets import load_dataset

    mt560_id = config["data"]["mt560"]
    mt560_dir = raw_dir / "mt560_en_dua"
    print(f"[2/2] Dataset {mt560_id} -> {mt560_dir}")
    dataset = load_dataset(mt560_id)
    dataset.save_to_disk(str(mt560_dir))
    sizes = {name: len(split) for name, split in dataset.items()}
    print(f"      splits: {sizes}")

    if args.with_bouquet:
        bouquet_id = config["data"].get("bouquet", "facebook/bouquet")
        bouquet_dir = raw_dir / "bouquet"
        for lang in ("dua_Latn", "fra_Latn"):
            print(f"[+] BOUQuET {lang} -> {bouquet_dir / lang}")
            try:
                split = load_dataset(bouquet_id, lang)
                split.save_to_disk(str(bouquet_dir / lang))
                print(f"    rows: {len(split)}")
            except Exception as exc:  # gated / unauthenticated / offline
                print(f"    skipped {lang}: {exc}")

    print("All downloads finished.")


if __name__ == "__main__":
    main()
