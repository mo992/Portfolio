# Document Classification

Product name: **Document Classification** (hyphenated: `document-classification`).
Python package: `document_classification` (underscores — Python forbids hyphens in `import`).

## Responsibility

Given an image, decide whether it should be treated as a **document** (OCR flow) or a **general image** (defect / object detection flow). The classifier fronts the rest of the server.

## Classes (one per module)

| Module | Class | Concern |
|---|---|---|
| `gemini_client.py` | `GeminiVisionClient` | HTTP POST → Google Gemini `generateContent` API. Returns raw text only. |
| `local_vlm_client.py` | `SmolVLMClient` | Local VLM fallback (SmolVLM-500M-Instruct). Used when `GOOGLE_API_KEY` is unset. Lazy-loads weights on first call. |
| `classifier.py` | `DocumentImageClassifier` | Prompts the MLLM, parses the JSON reply into `ClassifyResult(label, confidence, reasoning)`. |
| `dispatcher.py` | `ClassificationDispatcher` | Routes a classified image to the right next step: YOLO for images, frontend document pipeline for documents. |
| `router.py` | `APIRouter` factory | HTTP endpoints: `POST /classify`, `POST /classify/dispatch`, `GET /classify/health`. |
| `ui.py` | `APIRouter` factory | Serves the static upload page. |

Composition happens in `server/app/main.py` — each class is instantiated once and injected into the routers.

## Endpoints

- `POST /classify` — body `{ imageBase64, mediaType }` → `{ label, confidence, reasoning }`.
- `POST /classify/dispatch` — same body; also runs YOLO when `label == 'image'` and returns the detections inline. When `label == 'document'`, returns a redirect hint pointing at the frontend document flow.
- `GET /classify/health` — `{ configured, model, dependencies }`.
- `GET /classify/ui` — HTML demo: upload → dispatch → either visit `/detect/ui` or be told to open the frontend doc scene.

## Configuration

| Env | Default | Required |
|---|---|---|
| `GOOGLE_API_KEY` (or `GEMINI_API_KEY`) | — | no — when unset, the classifier falls back to a local SmolVLM model |
| `GEMINI_MODEL` | `gemini-2.5-flash` | no |
| `LOCAL_VLM_MODEL` | `HuggingFaceTB/SmolVLM-500M-Instruct` | no — override the local fallback's HF repo |
| `FRONTEND_URL` | `http://localhost:5173` | no |

### Fallback behaviour

When `GOOGLE_API_KEY` is unset, `_get_vision_client()` in `app/main.py` returns a `SmolVLMClient` instead of `GeminiVisionClient`. The first `/classify` request then **lazy-loads** ~1 GB of SmolVLM weights from Hugging Face — this takes 2–5 minutes the first time and is logged. Subsequent requests are served from the in-process model (no network). Load + inference are wrapped in `asyncio.to_thread` so the event loop isn't blocked.

## Testing

`pytest document_classification/tests -q` — injects a fake Gemini client, exercises all parse branches, hits the router end-to-end. The fallback path is covered by `tests/test_routes.py::test_classify_without_api_key_uses_local_fallback`, which injects a fake `SmolVLMClient` so CI doesn't download real weights.
