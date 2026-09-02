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

## Why the dashboard doesn't use a live model yet

Training YOLOv8 needs a GPU (or a lot of patience on CPU) — this sandbox only
has 1 CPU core, so a real training run has to happen somewhere else:
your own machine, a cloud GPU box, or a free Google Colab notebook.

Until a trained model exists, the dashboard's camera tiles use **real images
and real ground-truth boxes from this dataset** (see `analyze_dataset.py`) so
the bounding boxes you see are 100% accurate to the photos — they're just not
being produced by a live model yet.

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
