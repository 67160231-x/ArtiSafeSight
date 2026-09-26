"""
Persistent inference server — loads the PPE model ONCE at startup and keeps
it in memory, instead of re-loading torch + the weight files on every single
request the way the old one-shot CLI script (detect_image.py) did when it
was spawned fresh for each /api/detect call.

The face-blur model is intentionally NOT loaded here at startup. Face blur
is an opt-in setting most users leave off, so eagerly loading a second YOLO
model (torch + weights) into the same 512MB Render container just to sit
idle was the single biggest avoidable memory cost. Instead, face.pt is
lazy-loaded on the first request that actually asks for it (faceBlur=true)
and then stays cached in memory for the rest of the process's life — so the
common case (face blur off) never pays that RAM cost at all.

Run with:
    python ml/inference_server.py
Listens on 127.0.0.1:<INFERENCE_PORT env var, default 5001> — internal only,
never exposed to the internet. backend/routes/detect.js forwards uploaded
images here over local HTTP instead of spawning a new Python process per
request.
"""
import os
import sys
import threading
from io import BytesIO

from flask import Flask, request, jsonify
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from detect_image import boxes_overlap  # reuse the exact same overlap logic

from ultralytics import YOLO

ML_DIR = os.path.dirname(os.path.abspath(__file__))
WEIGHTS_PATH = os.path.join(ML_DIR, "model", "best.pt")
FACE_WEIGHTS_PATH = os.path.join(ML_DIR, "model", "face.pt")

# Mobile photos routinely come in at 3000-4000px on the long side. None of
# that extra resolution helps a 640px-input YOLO model, and decoding +
# preprocessing a full-size image spikes RAM far more than the model weights
# themselves do. Downscale (preserving aspect ratio) before any inference.
MAX_UPLOAD_DIMENSION = 1280

app = Flask(__name__)

ppe_model = None
face_model = None
face_model_lock = threading.Lock()


def load_ppe_model():
    global ppe_model
    if os.path.exists(WEIGHTS_PATH):
        print("[inference_server] Loading PPE model...", flush=True)
        ppe_model = YOLO(WEIGHTS_PATH)
    else:
        print(f"[inference_server] WARNING: {WEIGHTS_PATH} not found — /detect will 503", flush=True)
    print("[inference_server] Ready.", flush=True)


def get_face_model():
    """Lazily load face.pt on first use, then reuse it for the rest of the
    process's life. Thread-safe against concurrent first requests."""
    global face_model
    if face_model is not None:
        return face_model
    if not os.path.exists(FACE_WEIGHTS_PATH):
        return None
    with face_model_lock:
        if face_model is None:  # re-check: another thread may have loaded it while we waited
            print("[inference_server] Lazy-loading face model (first faceBlur request)...", flush=True)
            face_model = YOLO(FACE_WEIGHTS_PATH)
            print("[inference_server] Face model ready.", flush=True)
    return face_model


def downscale(img):
    """Shrink in place so the longest side is at most MAX_UPLOAD_DIMENSION.
    No-op for images already smaller than that. Aspect ratio is preserved,
    so box percentages computed against the resized image are identical to
    what they'd be against the original."""
    img.thumbnail((MAX_UPLOAD_DIMENSION, MAX_UPLOAD_DIMENSION), Image.LANCZOS)
    return img


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "modelReady": ppe_model is not None,
        "faceModelReady": face_model is not None,
        "faceModelAvailable": os.path.exists(FACE_WEIGHTS_PATH)
    })


@app.route("/detect", methods=["POST"])
def detect():
    if ppe_model is None:
        return jsonify({
            "error": "No trained model found yet.",
            "detail": "ml/model/best.pt was missing when the inference server started.",
            "modelReady": False
        }), 503

    if "image" not in request.files:
        return jsonify({"error": "No image file in request (field name: 'image')"}), 400

    want_face_blur = request.form.get("faceBlur") == "true"

    try:
        conf = float(request.form.get("conf", 0.35))
        img_bytes = request.files["image"].read()
        img = Image.open(BytesIO(img_bytes)).convert("RGB")
        img = downscale(img)
    except Exception as e:
        return jsonify({"error": "Could not read uploaded image", "detail": str(e)}), 400

    try:
        results = ppe_model.predict(source=img, conf=conf, verbose=False)
        r = results[0]
        img_w, img_h = r.orig_shape[1], r.orig_shape[0]
        names = r.names

        raw = []
        for box in r.boxes:
            cls_id = int(box.cls[0])
            label = names[cls_id]
            bconf = float(box.conf[0])
            x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]
            raw.append({
                "label": label,
                "confidence": round(bconf, 3),
                "box": {
                    "x": round(x1 / img_w * 100, 1),
                    "y": round(y1 / img_h * 100, 1),
                    "w": round((x2 - x1) / img_w * 100, 1),
                    "h": round((y2 - y1) / img_h * 100, 1),
                },
            })

        people = [d for d in raw if d["label"] == "Person"]
        ppe_by_type = {
            "Hard_hat": [d for d in raw if d["label"] == "Hard_hat"],
            "Vest": [d for d in raw if d["label"] == "Vest"],
        }
        violations = []
        for person in people:
            for item, sev, text in [
                ("Hard_hat", "critical", "No Hard Hat Detected"),
                ("Vest", "medium", "No Safety Vest Detected"),
            ]:
                covered = any(boxes_overlap(person["box"], d["box"]) for d in ppe_by_type[item])
                if not covered:
                    violations.append({"label": text, "severity": sev, "box": person["box"]})

        faces = []
        if want_face_blur:
            model = get_face_model()
            if model is not None:
                try:
                    face_results = model.predict(source=img, conf=0.3, verbose=False)
                    fr = face_results[0]
                    for box in fr.boxes:
                        x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]
                        faces.append({
                            "confidence": round(float(box.conf[0]), 3),
                            "box": {
                                "x": round(x1 / img_w * 100, 1),
                                "y": round(y1 / img_h * 100, 1),
                                "w": round((x2 - x1) / img_w * 100, 1),
                                "h": round((y2 - y1) / img_h * 100, 1),
                            },
                        })
                except Exception:
                    pass  # face blur is a nice-to-have; never fail the whole request over it

        return jsonify({"raw_detections": raw, "violations": violations, "faces": faces})
    except Exception as e:
        return jsonify({"error": "Inference failed", "detail": str(e)}), 500


if __name__ == "__main__":
    load_ppe_model()
    port = int(os.environ.get("INFERENCE_PORT", 5001))
    app.run(host="127.0.0.1", port=port, threaded=True)

