# Multimodal Vision Platform

Plugin-based multimodal vision platform with Edge + Cloud inference, pipeline DAGs, and first-class evaluation.

## Day 1 status

- ✅ Core framework (ModelRegistry, PipelineRegistry, Backend abstraction)
- ✅ 4 backends wired: TransformersJS (functional), HF API, Anthropic, FastAPI (functional stubs)
- ✅ Pipeline engine with 5 reusable stages (incl. OpenCV.js binarization / adaptive thresholding) + parallel branches
- ✅ Zod-validated schemas: `Detection`, `AgentAction`, `DocumentField`
- ✅ 3 model plugins: `yolov8-seg`, `yolov8-text-lines`, `trocr-printed`
- ✅ 2 pipelines: `defect-detection` (edge), `document-understanding` (cloud TrOCR via `server/` FastAPI)
- ✅ 2 UI scenes: Defect Inspection, Document Understanding (uploads image, prints TrOCR output + raw JSON)
- ✅ Evaluation harness: IoU, precision/recall, edit-distance, layout-accuracy; `defect-mini` + `doc-mini` fixture datasets
- ✅ Reusable `YoloEngine` class + presets (`createYoloV8NanoSeg`, `createTextLineYolo`, `createDefectYolo`)

## Quickstart

```bash
pnpm install
pnpm dev          # localhost:5173
pnpm test         # vitest
pnpm typecheck
pnpm benchmark    # writes docs/reports/day-1-baseline.md
pnpm build
```

### Run the inference server (required for document-understanding)

```bash
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
WARMUP=1 uvicorn app.main:app --reload --port 8000
```

See [`server/README.md`](server/README.md) for contracts, Docker, and environment variables.

## Architecture at a glance

```
ModelSpec (plugin contract)
      │ registered in
      ▼
ModelRegistry ──► PipelineBuilder ──► Pipeline
      │                                    │
      ▼                                    ▼
InferenceBackend (Edge / Cloud)    Stages (preprocess, infer, validate, postprocess)
                                           │
                                           ▼
                                   Tracer + MetricsCollector
                                           │
                                           ▼
                                   Eval Harness (IoU, P/R, Edit distance)
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design, [`docs/ADD_NEW_MODEL.md`](docs/ADD_NEW_MODEL.md) for adding a new model, [`docs/EVALUATION.md`](docs/EVALUATION.md) for the eval harness, and [`docs/ROADMAP.md`](docs/ROADMAP.md) for what ships next.
