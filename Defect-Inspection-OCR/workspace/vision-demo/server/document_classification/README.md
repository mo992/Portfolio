# Document Classification

產品名稱:**Document Classification**(連字符:`document-classification`)。
Python package:`document_classification`(底線 — Python 不允許 import 名稱含連字符)。

## 職責

接收影像,判定其應導向 **document** 流程(OCR pipeline)或 **general image** 流程(瑕疵 / 物件偵測 pipeline)。本模組為 server 對外請求的前置分類層。

## Class 架構(單一模組單一 class)

| Module | Class | 職責 |
|---|---|---|
| `gemini_client.py` | `GeminiVisionClient` | 對 Google Gemini `generateContent` API 發送 HTTP POST,回傳純文字 response。 |
| `local_vlm_client.py` | `SmolVLMClient` | Local VLM fallback(SmolVLM-500M-Instruct);於 `GOOGLE_API_KEY` 未設定時啟用,首次呼叫時 lazy load 權重。 |
| `classifier.py` | `DocumentImageClassifier` | 對 MLLM 發送 prompt,將 JSON response 解析為 `ClassifyResult(label, confidence, reasoning)`。 |
| `dispatcher.py` | `ClassificationDispatcher` | 依分類結果分派下游處理:image 導向 YOLO,document 導向前端 document pipeline。 |
| `router.py` | `APIRouter` factory | HTTP endpoints:`POST /classify`、`POST /classify/dispatch`、`GET /classify/health`。 |
| `ui.py` | `APIRouter` factory | 提供靜態上傳頁面。 |

各 class 於 `server/app/main.py` 統一組裝,以 dependency injection 方式注入 router。

## Endpoints

- `POST /classify` — request body `{ imageBase64, mediaType }`,回傳 `{ label, confidence, reasoning }`。
- `POST /classify/dispatch` — request body 同上;當 `label == 'image'` 時觸發 YOLO 偵測並於 response 中 inline 回傳結果,當 `label == 'document'` 時回傳前端 document flow 的 redirect 資訊。
- `GET /classify/health` — 回傳 `{ configured, model, dependencies }`。
- `GET /classify/ui` — HTML demo 頁面:上傳 → dispatch → 依分類結果導向 `/detect/ui` 或前端 document 頁面。

## 設定

| Env | 預設 | 必填 |
|---|---|---|
| `GOOGLE_API_KEY`(或 `GEMINI_API_KEY`) | — | 否,未設定時 fallback 至 local SmolVLM |
| `GEMINI_MODEL` | `gemini-2.5-flash` | 否 |
| `LOCAL_VLM_MODEL` | `HuggingFaceTB/SmolVLM-500M-Instruct` | 否,可覆寫 local fallback 的 HF repo |
| `FRONTEND_URL` | `http://localhost:5173` | 否 |

### Fallback 機制

`GOOGLE_API_KEY` 未設定時,`app/main.py` 中的 `_get_vision_client()` 回傳 `SmolVLMClient` 取代 `GeminiVisionClient`。首次 `/classify` request 觸發 SmolVLM 權重 lazy load(自 Hugging Face 下載,約 1 GB),首次載入耗時約 2–5 分鐘,過程記錄於 log。後續 request 由 in-process model 處理,不再涉及網路 I/O。權重載入與 inference 均以 `asyncio.to_thread` 包裝,避免阻塞 event loop。

## 測試

`pytest document_classification/tests -q` — 注入 fake Gemini client,涵蓋所有 parse 分支與 end-to-end router 測試。Fallback 路徑於 `tests/test_routes.py::test_classify_without_api_key_uses_local_fallback` 驗證,該測試注入 fake `SmolVLMClient`,避免 CI 環境實際下載權重。