# ML assets
`.pt` weights from the friend's PPE project (Hard_hat, Vest; mAP50 ≈ 0.96) plus stock yolov8n for people.
The backend runs the **ONNX** versions in `backend/models/` (no Python at runtime).
Re-generate them with `python export_onnx.py`.

## Face blur model
`backend/models/face_scrfd_500m.onnx` is the SCRFD-500M face detector from the InsightFace "buffalo_sc"
pack (2.5 MB). InsightFace's pretrained models are published for non-commercial research use, which is fine
for a course project; check the licence (or swap in another detector) before any commercial deployment.
