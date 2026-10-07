"""Convert trained YOLOv8 .pt weights to the ONNX files the Node backend loads.
Needs a machine with Python + `pip install ultralytics onnx onnxslim` (NOT needed on Render).

  python export_onnx.py
  -> backend/models/ppe_hat_vest_nano.onnx   (classes: Hard_hat, Vest)
  -> backend/models/person_yolov8n.onnx      (stock COCO yolov8n, Person = class 0)

To swap in a newly trained PPE model: put it in ml/model/, change PPE_PT below,
keep the class order Hard_hat=0, Vest=1 (or edit PPE_CLASSES in backend/services/detector.js).
"""
import shutil
from pathlib import Path
from ultralytics import YOLO

HERE = Path(__file__).parent
OUT = HERE.parent / "backend" / "models"
OUT.mkdir(exist_ok=True)
PPE_PT = HERE / "model" / "ppe_hat_vest_nano.pt"
PERSON_PT = HERE / "model" / "yolov8n.pt"

for src, dst in [(PPE_PT, "ppe_hat_vest_nano.onnx"), (PERSON_PT, "person_yolov8n.onnx")]:
    p = YOLO(str(src)).export(format="onnx", imgsz=640, opset=12, simplify=True, dynamic=False, batch=1)
    shutil.copy(p, OUT / dst)
    print("wrote", OUT / dst)
