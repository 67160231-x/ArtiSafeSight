"""
Run a trained YOLOv8 PPE model on a single image and print JSON detections
in the exact shape ArtiSafeSight's frontend expects:

    [{ "label": "Hard_hat", "confidence": 0.93,
       "box": { "x": 41.2, "y": 12.0, "w": 20.1, "h": 55.4 } }, ...]

box.x/y are the top-left corner and box.w/h the width/height, all expressed
as **percentages** of the image dimensions (so they drop straight into
CameraCard's CSS overlay, which positions boxes with left/top/width/height %).

Also derives compliance violations the same way analyze_dataset.py does:
a Person box with no overlapping Hard_hat/Vest box => "No Hard Hat/Vest
Detected" alert, positioned at the person's box.

Usage:
    python detect_image.py --weights model/best.pt --source photo.jpg
"""
import argparse
import json
import sys


def boxes_overlap(a, b, threshold=0.1):
    """Rough IoU-ish overlap check between two {x,y,w,h} percent boxes."""
    ax1, ay1, ax2, ay2 = a["x"], a["y"], a["x"] + a["w"], a["y"] + a["h"]
    bx1, by1, bx2, by2 = b["x"], b["y"], b["x"] + b["w"], b["y"] + b["h"]
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    b_area = max(1e-6, b["w"] * b["h"])
    return (inter / b_area) > threshold


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--weights", required=True, help="Path to trained .pt weights")
    parser.add_argument("--source", required=True, help="Path to an image file")
    parser.add_argument("--conf", type=float, default=0.35, help="Confidence threshold")
    parser.add_argument(
        "--face-weights",
        default=None,
        help="Optional path to a face-detection .pt (e.g. model/face.pt). "
        "When given, adds a 'faces' array to the output for client-side blurring.",
    )
    args = parser.parse_args()

    try:
        from ultralytics import YOLO
    except ImportError:
        print(json.dumps({"error": "ultralytics not installed. Run: pip install ultralytics"}))
        sys.exit(1)

    model = YOLO(args.weights)
    results = model.predict(source=args.source, conf=args.conf, verbose=False)
    r = results[0]

    img_w, img_h = r.orig_shape[1], r.orig_shape[0]
    names = r.names

    raw = []
    for box in r.boxes:
        cls_id = int(box.cls[0])
        label = names[cls_id]
        conf = float(box.conf[0])
        x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]
        raw.append({
            "label": label,
            "confidence": round(conf, 3),
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
    if args.face_weights:
        try:
            face_model = YOLO(args.face_weights)
            face_results = face_model.predict(source=args.source, conf=0.3, verbose=False)
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

    print(json.dumps({"raw_detections": raw, "violations": violations, "faces": faces}))


if __name__ == "__main__":
    main()