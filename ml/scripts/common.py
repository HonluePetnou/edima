"""Shared paths, config loading and text helpers for the Edima ML pipeline.

Every script imports from this module so that paths and the duala language
token handling stay consistent across the whole pipeline.
"""
from __future__ import annotations

import json
import os
import random
import unicodedata
from pathlib import Path
from typing import Any, Iterable

import yaml

# ml/ is the pipeline root; its parent is the repository root.
ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
CONFIG_DIR = ROOT / "configs"
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"
OUT_DIR = ROOT / "out"

DEFAULT_CONFIG = CONFIG_DIR / "m2m100_dua.yaml"
GLOSSARY_TERMS = REPO_ROOT / "packages" / "shared" / "data" / "glossary" / "terms.json"

TARGET_LANG = "dua"
DEFAULT_SOURCE_LANG = "en"


def load_config(path: str | os.PathLike[str] | None = None) -> dict[str, Any]:
    config_path = Path(path) if path else DEFAULT_CONFIG
    with config_path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def ensure_dirs(*paths: Path) -> None:
    for path in paths:
        path.mkdir(parents=True, exist_ok=True)


def set_seed(seed: int) -> None:
    random.seed(seed)
    try:
        import numpy as np

        np.random.seed(seed)
    except ImportError:
        pass
    try:
        import torch

        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
    except ImportError:
        pass


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
            count += 1
    return count


def normalize_text(text: str) -> str:
    """NFC + whitespace normalization; keeps the combining Duala diacritics."""
    text = unicodedata.normalize("NFC", str(text))
    return " ".join(text.split())


def count_words(text: str) -> int:
    return len(text.split())


def resolve_device(preferred: str | None = None) -> str:
    if preferred:
        return preferred
    import torch

    if torch.cuda.is_available():
        return "cuda"
    mps = getattr(torch.backends, "mps", None)
    if mps is not None and mps.is_available():
        return "mps"
    return "cpu"


def register_dua_token(
    tokenizer: Any,
    dua_token: str = "__dua__",
    lang_code: str = TARGET_LANG,
) -> int:
    """Re-register the Duala language token after loading a saved tokenizer.

    M2M100's tokenizer rebuilds ``lang_code_to_id`` from a hard-coded language
    list on every load, so a token added during training is not automatically
    mapped to a language code. Call this right after ``from_pretrained``.
    """
    token_id = tokenizer.convert_tokens_to_ids(dua_token)
    if token_id is None or token_id == tokenizer.unk_token_id:
        raise ValueError(
            f"{dua_token} is not in the tokenizer vocabulary; run 03_add_dua_token.py first."
        )
    tokenizer.lang_token_to_id[dua_token] = token_id
    tokenizer.id_to_lang_token[token_id] = dua_token
    tokenizer.lang_code_to_token[lang_code] = dua_token
    tokenizer.lang_code_to_id[lang_code] = token_id
    return token_id
