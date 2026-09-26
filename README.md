# ArtiSafeSight — Safety Monitoring Dashboard

A full-stack clone of the safety-monitoring dashboard: a dark, "safety-tech" themed
live camera wall with AI detection overlays, summary stats, and a violations feed —
backed by its own REST API.

```
artisafesight/
├── backend/     Express REST API (cameras, alerts, stats)
└── frontend/    React + Vite + Tailwind dashboard UI
```

## Run the backend

```bash
cd backend
npm install
npm start          # http://localhost:4000
```

Endpoints:
| Method | Path                          | Purpose                                |
|--------|-------------------------------|-----------------------------------------|
| GET    | `/api/health`                 | Health check                            |
| GET    | `/api/cameras`                | List all camera feeds + detections      |
| GET    | `/api/cameras/:id`            | Single camera detail                    |
| POST   | `/api/cameras/:id/detections` | Push a new AI detection to a camera     |
| GET    | `/api/alerts?severity=`       | List alerts (all/critical/high/medium)  |
| PATCH  | `/api/alerts/:id/acknowledge` | Acknowledge a violation                 |
| GET    | `/api/stats`                  | Dashboard summary numbers               |
| GET    | `/api/settings`               | Current detection toggle state          |
| PUT    | `/api/settings`               | Save detection toggle state             |
| POST   | `/api/detect`                 | Upload a photo, run the trained PPE model on it |

Data currently lives in `backend/data/mockData.js` as an in-memory store —
swap that one module for a real database layer (Postgres, Mongo, etc.) and
none of the route files need to change.

## Real PPE detection data (not random mock numbers)

The 8 camera tiles use **real photos and real ground-truth labels** pulled
from the "PPE Detection v14" Roboflow dataset (YOLOv8 format, classes:
`Gloves, Hard_hat, Mask, Person, Safety_boots, Vest`). For each photo, a
simple compliance rule (see `ml/analyze_dataset.py`) checks whether a
detected person also has an overlapping Hard_hat/Vest box in the same frame
— if not, that's a violation, positioned at the person's real bounding box.
So every bounding box you see on a camera tile is accurate to that photo.

## Live "Analyze a photo" feature

On the **Live Cameras** page there's an "Analyze a photo" panel: upload any
image and it's sent to `POST /api/detect`, which shells out to
`ml/detect_image.py` and runs a trained YOLOv8 model on it. Until a model is
trained (see `ml/README.md`), this correctly reports "no trained model
loaded yet" instead of pretending to detect anything — plug in
`ml/model/best.pt` and it starts doing real inference with zero code changes.

## Run the frontend

```bash
cd frontend
npm install
npm run dev         # http://localhost:5173
```

Vite proxies `/api/*` requests to `http://localhost:4000` (see `vite.config.js`),
so run the backend first, then the frontend. The dashboard polls the API every
15 seconds and lets you acknowledge violations from the side panel, which
calls the backend and updates the badge counts live.

## Theme

Dark navy base (`#05080d`–`#182233`) with a cyan-teal accent (`#3ee6c4`) for
"live"/safe states and amber/red for warnings and critical detections —
matching the reference design's safety/surveillance aesthetic. Bounding boxes
on each camera tile are driven by the `detections[].box` data from the API,
so real detection coordinates from a model can be dropped in directly.