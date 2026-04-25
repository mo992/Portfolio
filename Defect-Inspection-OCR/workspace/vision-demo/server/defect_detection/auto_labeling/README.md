# Autodistill-Labeling

原始影像 → 自動打標(GroundingDINO + SAM)→ YOLO 權重。

## 模組組成

| Module | Class | 職責 |
|---|---|---|
| `label.py` | `AutoLabeler` | 用 GroundingDINO/SAM 跑一個資料夾的影像,輸出 YOLO labels + `data.yaml`。 |
| `voc_to_yolo.py` | `VocToYolo` | 把 Pascal VOC (XML) 標註轉成 YOLO 資料集(`images/`、`labels/`、`data.yaml`),含 train/val 切分。 |
| `train.py` | `YoloTrainer` | 用該資料集 fine-tune `ultralytics.YOLO`,回傳 `best.pt`。 |
| `export.py` | `WeightsExporter` | 把 `best.pt` 複製到固定路徑,可選輸出 ONNX。 |
| `pipeline.py` | `AutodistillPipeline` | 把上面三個階段串成 end-to-end pipeline。 |
| `cli.py` | — | `python -m defect_detection.autodistill_labeling.cli …` |

## 安裝重型相依套件(一次性)

```bash
cd server
pip install -r defect_detection/autodistill_labeling/requirements.txt
```

會裝 `autodistill`、`autodistill-grounded-sam`、`supervision`。第一次跑打標時
會再下載 GroundingDINO + SAM 權重(約 1–2 GB)到 HF/torch cache。

## Workflow A — 你有原始(未標註)影像

預期的 source layout:

```
dataset/raw/
├── img001.jpg
├── img002.jpg
└── …
```
1. 寫 ontology(prompt → class name):

```json
   // ontology.json
   {
     "a visible scratch on metal surface": "scratch",
     "a rust spot": "rust",
     "a dent or deformation": "dent"
   }
```

2. End-to-end 跑一次:

```bash
   python -m defect_detection.autodistill_labeling.cli label-and-train \
       --images      ./dataset/raw \
       --ontology    ./ontology.json \
       --dataset-out ./dataset/labeled \
       --weights-out ./weights/custom.pt \
       --base yolov8n.pt --epochs 50 --device cpu
```

   Stage 1 產生 `./dataset/labeled/{images,labels,data.yaml}`。
   Stage 2 訓練,輸出在 `runs/detect/autodistill/weights/best.pt`。
   Stage 3 把 `best.pt` 複製到 `./weights/custom.pt`。

## Workflow B — 你的資料集已經標好(YOLO / Roboflow 匯出)

預期 layout:
```
dataset/
├── data.yaml
├── images/{train,val,test}/…
└── labels/{train,val,test}/…
```
跳過打標、直接訓練:

```bash
python -m defect_detection.autodistill_labeling.cli train \
    --data        ./dataset/data.yaml \
    --weights-out ./weights/custom.pt \
    --epochs 50 --device cpu
```

如果是 **COCO** 格式,先用 Roboflow 或
`supervision.DetectionDataset.from_coco(...).as_yolo(...)` 轉換,再走 workflow B。

## Workflow C — 你的資料集是 Pascal VOC (XML)

### XML + 影像怎麼放?

放在同一個資料夾下即可,支援兩種 layout:

**Layout 1 — 平鋪(最簡單,XML 跟影像同 stem):**
```
dataset/voc/
├── img001.jpg
├── img001.xml
├── img002.png
├── img002.xml
└── …
```

**Layout 2 — 經典 VOC(分開放):**

```
dataset/voc/
├── Annotations/
│   ├── img001.xml
│   └── img002.xml
└── JPEGImages/
    ├── img001.jpg
    └── img002.png
```
Converter 會優先在 `Annotations/` 找 XML,沒有就 fallback 到全域遞迴掃。
影像副檔名 `.jpg/.jpeg/.png/.bmp` 都接受。

### 一鍵 VOC → YOLO → 訓練 → 權重

```bash
python -m defect_detection.autodistill_labeling.cli voc-and-train \
    --source      ./dataset/voc \
    --dataset-out ./dataset/yolo \
    --weights-out ./weights/custom.pt \
    --val-split 0.2 --epochs 50 --device cpu
```

### 或者只做轉換(訓練前先檢查資料集)

```bash
python -m defect_detection.autodistill_labeling.cli voc-to-yolo \
    --source ./dataset/voc --out ./dataset/yolo --val-split 0.2
```

輸出:
```
dataset/yolo/
├── data.yaml               ← points at images/train + images/val
├── images/{train,val}/…    ← copied from your source
└── labels/{train,val}/…    ← YOLO-format .txt (class_id cx cy w h, normalized)
```
Class 是從 XML 的 `<object><name>` 自動掃出來、寫進 `data.yaml:names`。
要固定 class 順序,在 Python 裡指定即可:
`VocToYolo(classes=['scratch','rust']).convert(...)` — 不在清單裡的 class 會被丟掉。

轉完之後就可以照 workflow B 訓練:

```bash
python -m defect_detection.autodistill_labeling.cli train \
    --data ./dataset/yolo/data.yaml --weights-out ./weights/custom.pt
```

## 把訓練好的權重接到 server

拿到 `./weights/custom.pt` 後,讓 YOLO detector 指向它:

```bash
export YOLO_WEIGHTS=/abs/path/to/weights/custom.pt
uvicorn app.main:app --port 8000
```

`YoloDetector`(`defect_detection/yolo_detector/detector.py`)在初始化時會
讀 `YOLO_WEIGHTS`,不用改 code。

## GPU 加速

加 `--device 0`(或 `cuda:0`),並裝對應的 torch GPU wheel。CPU 訓練大概比
GPU 慢 10–30 倍。200 張 × 50 epochs 大致時間:

| device | 約略時間 |
|---|---|
| CPU(筆電) | 30–60 min |
| 1× T4 / RTX 3060 | 3–8 min |

## 雜項

- Autodistill 對使用者來說是一層黑箱,底下接 GroundingDINO + SAM。
  box/text threshold 設太低會產出雜訊很多的 labels;預設值
  (0.35 / 0.25)是合理的起點,要調可以從
  `AutoLabeler(... box_threshold=..., text_threshold=...)` 進去。
- 這個模組**不會被 `app/main.py` import**,純粹是離線工具。
  uvicorn server 沒裝這些重型套件也能正常起。