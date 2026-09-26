import os, json, random
from collections import defaultdict

CLASSES = ['Gloves', 'Hard_hat', 'Mask', 'Person', 'Safety_boots', 'Vest']
DS = "dataset"
SPLITS = ["valid", "test"]

def yolo_to_box(cx, cy, w, h):
    x = (cx - w/2) * 100
    y = (cy - h/2) * 100
    return {"x": round(max(0,x),1), "y": round(max(0,y),1), "w": round(w*100,1), "h": round(h*100,1)}

records = []
for split in SPLITS:
    img_dir = f"{DS}/{split}/images"
    lbl_dir = f"{DS}/{split}/labels"
    for fname in os.listdir(lbl_dir):
        path = os.path.join(lbl_dir, fname)
        img_name = fname.rsplit(".", 1)[0] + ".jpg"
        img_path = os.path.join(img_dir, img_name)
        if not os.path.exists(img_path):
            continue
        boxes_by_class = defaultdict(list)
        with open(path) as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) != 5: continue
                cls, cx, cy, w, h = int(parts[0]), *map(float, parts[1:])
                boxes_by_class[CLASSES[cls]].append(yolo_to_box(cx, cy, w, h))

        person_boxes = boxes_by_class.get("Person", [])
        if not person_boxes:
            continue  # only interested in images with a person to judge compliance

        has_hardhat = "Hard_hat" in boxes_by_class
        has_vest = "Vest" in boxes_by_class
        has_gloves = "Gloves" in boxes_by_class
        has_boots = "Safety_boots" in boxes_by_class
        has_mask = "Mask" in boxes_by_class

        n_people = len(person_boxes)
        violations = []
        for i, pbox in enumerate(person_boxes):
            missing = []
            if not has_hardhat: missing.append(("Hard Hat", "critical"))
            if not has_vest: missing.append(("Safety Vest", "medium"))
            for item, sev in missing:
                violations.append({"label": f"No {item} Detected", "severity": sev, "box": pbox})

        records.append({
            "split": split,
            "img_path": img_path,
            "img_name": img_name,
            "classes_present": sorted(boxes_by_class.keys()),
            "n_people": n_people,
            "violations": violations,
            "clear": len(violations) == 0
        })

print(f"Total usable person-images: {len(records)}")
clear = [r for r in records if r["clear"]]
violating = [r for r in records if not r["clear"]]
print(f"Clear (fully compliant): {len(clear)}  |  Violating: {len(violating)}")

random.seed(42)
random.shuffle(clear)
random.shuffle(violating)

# pick a good mix: 2 clear + 4 violating (variety of missing items)
picked = clear[:2] + violating[:6]
random.shuffle(picked)

with open("picked.json", "w") as f:
    json.dump(picked, f, indent=2)

for r in picked:
    print(r["img_name"], r["classes_present"], "VIOLATIONS:" if not r["clear"] else "CLEAR", [v["label"] for v in r["violations"]])
