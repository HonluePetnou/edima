"""Local CTranslate2 sidecar for the fine-tuned M2M100 Duala model.

The Node server (apps/server) forwards already-masked text here. This process
never receives real amounts, names or dates: it only sees the {{Vn}} tokens
produced by the extension's protect-values step, and must return them intact.

Run from the repository root:

    uvicorn server:app --app-dir ml/inference --port 8000

The model directory defaults to ml/models/m2m100_dua_ct2 and can be overridden
with EDIMA_MODEL_DIR.
"""

from __future__ import annotations

import logging
import os
import re
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import ctranslate2
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from transformers import M2M100Tokenizer

logger = logging.getLogger("edima.sidecar")

MODEL_DIR = Path(
    os.environ.get(
        "EDIMA_MODEL_DIR",
        Path(__file__).resolve().parents[1] / "models" / "m2m100_dua_ct2",
    )
).resolve()

SOURCE_LANG = "fr"
TARGET_LANG = "dua"
DEVICE = os.environ.get("EDIMA_DEVICE", "cpu")
COMPUTE_TYPE = os.environ.get("EDIMA_COMPUTE_TYPE", "int8")
BEAM_SIZE = int(os.environ.get("EDIMA_BEAM_SIZE", "4"))
MAX_DECODING_LENGTH = int(os.environ.get("EDIMA_MAX_DECODING_LENGTH", "256"))

MASKED_TOKEN_RE = re.compile(r"\{\{V\d+\}\}")
LANGUAGE_TOKEN_RE = re.compile(r"^__[a-z]{2,3}__$")
COMBINING_MARK_RE = re.compile(r"\s+([\u0300-\u036f])")
SPACE_BEFORE_PUNCT_RE = re.compile(r"\s+([.,;:!?])")
SPACE_BEFORE_APOSTROPHE_RE = re.compile(r"\s+([’'])")

_translator: Optional[ctranslate2.Translator] = None
_tokenizer: Optional[M2M100Tokenizer] = None
_target_prefix: Optional[list[list[str]]] = None
_load_lock = threading.Lock()


class TranslateRequest(BaseModel):
    masked: str = Field(min_length=1)
    language: str = Field(pattern=r"^(ewo|dua)$")


class TranslateResponse(BaseModel):
    translated: Optional[str] = None


def _load() -> None:
    global _translator, _tokenizer, _target_prefix

    if _translator is not None:
        return

    with _load_lock:
        if _translator is not None:
            return

        if not MODEL_DIR.exists():
            raise RuntimeError(f"model directory not found: {MODEL_DIR}")

        translator = ctranslate2.Translator(str(MODEL_DIR), device=DEVICE, compute_type=COMPUTE_TYPE)
        # The converter writes `extra_special_tokens` as a list, which newer
        # transformers releases reject; `__dua__` is still registered through
        # added_tokens_decoder, so an empty mapping is enough.
        tokenizer = M2M100Tokenizer.from_pretrained(
            str(MODEL_DIR),
            extra_special_tokens={},
            local_files_only=True,
        )
        tokenizer.src_lang = SOURCE_LANG

        target_id = tokenizer.convert_tokens_to_ids(f"__{TARGET_LANG}__")
        if target_id is None or target_id == tokenizer.unk_token_id:
            raise RuntimeError(f"__{TARGET_LANG}__ token is missing from the tokenizer")

        _translator = translator
        _tokenizer = tokenizer
        _target_prefix = [[f"__{TARGET_LANG}__"]]
        logger.info("loaded %s (%s/%s)", MODEL_DIR, DEVICE, COMPUTE_TYPE)


def _source_tokens(text: str) -> list[str]:
    assert _tokenizer is not None

    ids = _tokenizer.encode(text)
    source_id = _tokenizer.convert_tokens_to_ids(f"__{SOURCE_LANG}__")
    if source_id is None or source_id == _tokenizer.unk_token_id:
        raise RuntimeError(f"__{SOURCE_LANG}__ token is missing from the tokenizer")
    if not ids or ids[0] != source_id:
        ids = [source_id, *ids]
    return _tokenizer.convert_ids_to_tokens(ids)


def _clean(text: str) -> str:
    # SentencePiece inserts a space before combining diacritics in Duala
    # (e.g. "le ̱" instead of "le̱"), and before punctuation.
    text = COMBINING_MARK_RE.sub(r"\1", text)
    text = SPACE_BEFORE_PUNCT_RE.sub(r"\1", text)
    text = SPACE_BEFORE_APOSTROPHE_RE.sub(r"\1", text)
    return re.sub(r"\s+", " ", text).strip()


def _masked_tokens_intact(source: str, translated: str) -> bool:
    return sorted(MASKED_TOKEN_RE.findall(source)) == sorted(MASKED_TOKEN_RE.findall(translated))


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        _load()
    except Exception as exc:  # keep /health up so operators can diagnose
        logger.warning("model not loaded at startup: %s", exc)
    yield


app = FastAPI(title="Edima M2M100 sidecar", version="0.1.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, object]:
    return {"ok": True, "model_loaded": _translator is not None, "model_dir": str(MODEL_DIR)}


@app.post("/translate", response_model=TranslateResponse)
def translate(req: TranslateRequest) -> TranslateResponse:
    if req.language != TARGET_LANG:
        raise HTTPException(status_code=503, detail="language_not_supported")

    try:
        _load()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"model_unavailable: {exc}") from exc

    assert _translator is not None
    assert _tokenizer is not None
    assert _target_prefix is not None

    try:
        results = _translator.translate_batch(
            [_source_tokens(req.masked)],
            target_prefix=_target_prefix,
            beam_size=BEAM_SIZE,
            max_decoding_length=MAX_DECODING_LENGTH,
        )
        hypothesis = [token for token in results[0].hypotheses[0] if not LANGUAGE_TOKEN_RE.match(token)]
        target_ids = _tokenizer.convert_tokens_to_ids(hypothesis)
        translated = _clean(_tokenizer.decode(target_ids, skip_special_tokens=True))
    except Exception:
        logger.exception("translation failed")
        return TranslateResponse(translated=None)

    if not translated or not _masked_tokens_intact(req.masked, translated):
        return TranslateResponse(translated=None)

    return TranslateResponse(translated=translated)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=os.environ.get("EDIMA_HOST", "127.0.0.1"), port=int(os.environ.get("PORT", "8000")))
