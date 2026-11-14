"""EXPERIMENTAL — branch experiment/invention-langue only.

Turns a raw Common Voice corpus (ml/data/common-voice/<lang>/) into a
multi-speaker TTS training set: resampled mono 16-bit WAVs + a metadata
file, in the "id|speaker|text" format both Piper's preprocessor and Coqui
TTS's formatter can read. Does NOT start any training, and does not pick
a toolkit for you — see README.md in this folder for why that choice
still needs a decision (no espeak-ng phonemizer exists for dua/wes, which
rules out Piper's default path).

Usage (from the repo root, using the venv set up for ml/inference):
    ml/inference/.venv/Scripts/python.exe ml/experiments/prepare-tts-dataset.py dua
    ml/inference/.venv/Scripts/python.exe ml/experiments/prepare-tts-dataset.py wes

Output under ml/experiments/tts-dataset/<lang>/ (gitignored — audio, not
code; regenerate from the corpus instead of committing it):
    wavs/<clip_id>.wav      — 22050 Hz, mono, 16-bit PCM
    metadata.csv            — "<clip_id>|<speaker_id>|<sentence>" per line
    metadata_train.csv      — 97% split
    metadata_val.csv        — 3% split
    speakers.csv            — speaker_id, total_hours, clip_count (sorted, most audio first)
"""

from __future__ import annotations

import csv
import random
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

import imageio_ffmpeg

REPO_ROOT = Path(__file__).resolve().parents[2]
TARGET_SR = 22050


def convert_clip(ffmpeg_exe: str, src_mp3: Path, dst_wav: Path) -> bool:
    if dst_wav.exists():
        return True
    dst_wav.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [ffmpeg_exe, "-y", "-i", str(src_mp3), "-ac", "1", "-ar", str(TARGET_SR), "-sample_fmt", "s16", str(dst_wav)],
        capture_output=True,
    )
    return result.returncode == 0 and dst_wav.exists()


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in ("dua", "wes"):
        print("usage: prepare-tts-dataset.py <dua|wes>")
        sys.exit(1)
    lang = sys.argv[1]

    corpus_dir = REPO_ROOT / "ml" / "data" / "common-voice" / lang
    out_dir = REPO_ROOT / "ml" / "experiments" / "tts-dataset" / lang
    clips_dir = corpus_dir / "clips"
    wavs_dir = out_dir / "wavs"

    durations_ms: dict[str, int] = {}
    with open(corpus_dir / "clip_durations.tsv", encoding="utf-8") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            durations_ms[row["clip"]] = int(row["duration[ms]"])

    rows: list[dict[str, str]] = []
    with open(corpus_dir / "validated.tsv", encoding="utf-8") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            rows.append(row)

    print(f"[{lang}] {len(rows)} clips validés dans la source — conversion en cours...")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    per_speaker_seconds: dict[str, float] = defaultdict(float)
    per_speaker_count: dict[str, int] = defaultdict(int)
    metadata: list[tuple[str, str, str]] = []  # (clip_id, speaker, text)
    failed = 0

    for i, row in enumerate(rows):
        clip_id = Path(row["path"]).stem
        speaker = row["client_id"][:16]  # short, still unique enough for grouping
        text = row["sentence"].strip()
        if not text:
            continue
        wav_path = wavs_dir / f"{clip_id}.wav"
        ok = convert_clip(ffmpeg_exe, clips_dir / row["path"], wav_path)
        if not ok:
            failed += 1
            continue
        metadata.append((clip_id, speaker, text))
        per_speaker_seconds[speaker] += durations_ms.get(row["path"], 0) / 1000
        per_speaker_count[speaker] += 1
        if (i + 1) % 1000 == 0:
            print(f"  ... {i + 1}/{len(rows)}")

    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "metadata.csv", "w", encoding="utf-8", newline="") as f:
        for clip_id, speaker, text in metadata:
            f.write(f"{clip_id}|{speaker}|{text}\n")

    random.Random(42).shuffle(metadata)
    split = max(1, int(len(metadata) * 0.03))
    val, train = metadata[:split], metadata[split:]
    for name, part in (("train", train), ("val", val)):
        with open(out_dir / f"metadata_{name}.csv", "w", encoding="utf-8", newline="") as f:
            for clip_id, speaker, text in part:
                f.write(f"{clip_id}|{speaker}|{text}\n")

    ranked = sorted(per_speaker_seconds.items(), key=lambda kv: -kv[1])
    with open(out_dir / "speakers.csv", "w", encoding="utf-8", newline="") as f:
        f.write("speaker_id,total_hours,clip_count\n")
        for speaker, seconds in ranked:
            f.write(f"{speaker},{seconds / 3600:.3f},{per_speaker_count[speaker]}\n")

    print(f"\n[{lang}] terminé : {len(metadata)} clips convertis, {failed} échecs de conversion.")
    print(f"  train={len(train)} val={len(val)}")
    print(f"  meilleur locuteur : {ranked[0][0]} — {ranked[0][1] / 3600:.2f} h, {per_speaker_count[ranked[0][0]]} clips")
    print(f"  -> {out_dir}")


if __name__ == "__main__":
    main()
