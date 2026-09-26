# ArtiSafeSight — PPE Detection Model

This folder holds everything needed to train a **real YOLOv8 PPE-detection model**
on the provided dataset and plug it into the backend for live inference.

## Dataset

Put the Roboflow "PPE Detection v14 (YOLOv8)" export here as `dataset/`, with
the structure Roboflow already gives you:

```
ml/dataset/
├── data.yaml
├── train/images, train/labels
├── valid/images, valid/labels
└── test/images,  test/labels
```

Classes (from `data.yaml`): `Gloves, Hard_hat, Mask, Person, Safety_boots, Vest`

## ✅ Model status: trained and plugged in

`ml/model/best.pt` is a **YOLOv8s** model, trained for the full 50 epochs at
`imgsz=640`, `batch=8` on this exact dataset. Validation results:

| Metric | Value |
|---|---|
| mAP50 | 0.889 |
| mAP50-95 | 0.621 |
| Precision | 0.855 |
| Recall | 0.874 |

`backend/routes/detect.js` finds this file automatically, so the "Analyze
photo" feature (Live Cameras page) runs **real live inference** already —
no extra setup needed. The steps below are only if you want to retrain from
scratch (e.g. more epochs, a different dataset, or a smaller/faster model
variant like `yolov8n.pt`).

## 1. Train the model (on a GPU machine / Colab)

```bash
pip install ultralytics
python train_model.py --data dataset/data.yaml --epochs 80 --imgsz 640 --model yolov8n.pt
```

This fine-tunes a YOLOv8-nano checkpoint on the PPE dataset. On a free Colab
T4 GPU, 80 epochs on ~1,500 images takes roughly 30–60 minutes. Increase
`--epochs` or switch to `yolov8s.pt` for better accuracy once you're happy
with the pipeline.

The trained weights land at `runs/detect/train/weights/best.pt`.

## 2. Plug the trained model into the backend

Copy the weights here:

```bash
cp runs/detect/train/weights/best.pt ml/model/best.pt
```

That's it — `backend/routes/detect.js` looks for `ml/model/best.pt` and calls
`detect_image.py` on it. As soon as the file exists, the "Analyze photo"
feature in the dashboard (Live Cameras page) switches from "no model loaded"
to real inference, with no other code changes needed.

## 3. Run inference manually (for testing)

```bash
pip install ultralytics
python detect_image.py --weights model/best.pt --source /path/to/photo.jpg
```

Prints JSON: a list of `{label, confidence, box}` — the same shape the
backend/frontend already expect (box is `{x, y, w, h}` as **percentages** of
image width/height, so it drops straight into `CameraCard`'s overlay).

## Files

- `analyze_dataset.py` — turns raw YOLO labels into the rule-based
  "missing PPE" violations currently powering the dashboard's mock cameras.
- `train_model.py` — fine-tunes YOLOv8 on the dataset.
- `detect_image.py` — runs a trained model on one image, outputs JSON in the
  app's detection format.
- `requirements.txt` — `ultralytics` (pulls in torch, opencv, etc.)
