# Edima M2M100 sidecar

Local inference service for the fine-tuned M2M100 Duala model exported to
CTranslate2 (int8). The Node server (`apps/server`) calls it with already-masked
text; it never receives real amounts, names or dates.

## Prerequisites

- Python **3.10–3.12** (CTranslate2 does not publish wheels for every newer
  Python release yet).
- The exported model directory `ml/models/m2m100_dua_ct2/` (see below).

## Get the model

The model and its Hugging Face checkpoint are stored at:

```
https://huggingface.co/SupraJac/edima-m2m100-dua-ct2
```

From the repository root:

```powershell
huggingface-cli download SupraJac/edima-m2m100-dua-ct2 m2m100_dua_ct2.zip --local-dir .
Expand-Archive -Path "m2m100_dua_ct2.zip" -DestinationPath "D:\hackathon" -Force
Test-Path "ml\models\m2m100_dua_ct2\model.bin"
```

The zip contains the `edima/ml/models/m2m100_dua_ct2` path, so extract it in the
**parent** of the repository. `ml/models/` is git-ignored.

## Install and run

```powershell
python -m venv ml\inference\.venv
ml\inference\.venv\Scripts\pip install -r ml\inference\requirements.txt
ml\inference\.venv\Scripts\uvicorn server:app --app-dir ml\inference --port 8000
```

Then start the Node server in another terminal:

```powershell
pnpm dev:server
```

## Check it

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health

Invoke-RestMethod -Method Post http://127.0.0.1:8000/translate `
  -ContentType "application/json" `
  -Body '{"masked":"Le solde de votre compte est disponible.","language":"dua"}'
```

Expected response shape:

```json
{ "translated": "Ese le ná o we le bolane mo ni." }
```

If the model drops a `{{Vn}}` token, or the sidecar cannot translate, it returns
`{ "translated": null }` and the extension keeps the French original.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `EDIMA_MODEL_DIR` | `ml/models/m2m100_dua_ct2` | CTranslate2 model directory |
| `EDIMA_DEVICE` | `cpu` | `cpu` or `cuda` |
| `EDIMA_COMPUTE_TYPE` | `int8` | CTranslate2 compute type |
| `EDIMA_BEAM_SIZE` | `4` | Beam search width |
| `EDIMA_MAX_DECODING_LENGTH` | `256` | Maximum output tokens |
| `PORT` | `8000` | HTTP port when run with `python server.py` |

The Node server uses `EDIMA_SIDECAR_URL` (default `http://127.0.0.1:8000`) and
`EDIMA_SIDECAR_TIMEOUT_MS` (default `20000`).
