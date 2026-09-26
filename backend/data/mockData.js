// In-memory mock data store. Detections below are NOT randomly invented —
// they are derived from the real PPE-Detection-v14 dataset (Roboflow, YOLOv8
// format, 6 classes: Gloves, Hard_hat, Mask, Person, Safety_boots, Vest).
// For each labeled image we take the ground-truth bounding boxes and apply a
// simple compliance rule: person detected + missing Hard_hat/Vest box in the
// same frame => a violation, positioned at that person's real bounding box.
// See /scripts/analyze_dataset.py for the generation logic and
// /scripts/train_model.py for how to train a real YOLOv8 model on this data
// so this whole module can eventually be replaced by live model inference.

let cameras = [
  {
    id: "cam-01",
    name: "North Entrance",
    zone: "Building A · Ground Floor",
    status: "live",
    timestamp: "14:21:05",
    image: "ppe/cam1.jpg",
    detections: [
      { id: "d11", label: "No Hard Hat Detected", severity: "critical", box: { x: 41.5, y: 14.5, w: 18.8, h: 85.1 } }
    ]
  },
  {
    id: "cam-02",
    name: "Loading Bay",
    zone: "Building A · Loading Dock",
    status: "live",
    timestamp: "14:20:41",
    image: "ppe/cam2.jpg",
    detections: [
      { id: "d21", label: "No Hard Hat Detected", severity: "critical", box: { x: 47.7, y: 33.6, w: 23.4, h: 65.9 } }
    ]
  },
  {
    id: "cam-03",
    name: "Assembly Floor",
    zone: "Building B · Zone 2",
    status: "live",
    timestamp: "14:19:58",
    image: "ppe/cam3.jpg",
    detections: [
      { id: "d31", label: "No Hard Hat Detected", severity: "critical", box: { x: 41.9, y: 15.1, w: 18.8, h: 84.4 } },
      { id: "d32", label: "No Safety Vest Detected", severity: "medium", box: { x: 41.9, y: 15.1, w: 18.8, h: 84.4 } }
    ]
  },
  {
    id: "cam-04",
    name: "East Corridor",
    zone: "Building B · Level 3",
    status: "live",
    timestamp: "14:22:04",
    image: "ppe/cam4.jpg",
    detections: [
      { id: "d41", label: "No Safety Vest Detected", severity: "medium", box: { x: 13.0, y: 11.3, w: 61.4, h: 88.8 } }
    ]
  },
  {
    id: "cam-05",
    name: "Chemical Storage",
    zone: "Building C · Restricted",
    status: "clear",
    timestamp: "14:20:25",
    image: "ppe/cam5.jpg",
    detections: [

    ]
  },
  {
    id: "cam-06",
    name: "South Perimeter",
    zone: "Building C · Exterior",
    status: "clear",
    timestamp: "14:20:00",
    image: "ppe/cam6.jpg",
    detections: [

    ]
  },
  {
    id: "cam-07",
    name: "Warehouse Bay 2",
    zone: "Building A · Storage",
    status: "live",
    timestamp: "14:18:47",
    image: "ppe/cam7.jpg",
    detections: [
      { id: "d71", label: "No Hard Hat Detected", severity: "critical", box: { x: 32.3, y: 13.6, w: 24.2, h: 85.7 } }
    ]
  },
  {
    id: "cam-08",
    name: "Rooftop Access",
    zone: "Building B · Level 5",
    status: "live",
    timestamp: "14:19:12",
    image: "ppe/cam8.jpg",
    detections: [
      { id: "d81", label: "No Hard Hat Detected", severity: "critical", box: { x: 34.4, y: 21.8, w: 18.5, h: 75.2 } },
      { id: "d82", label: "No Safety Vest Detected", severity: "medium", box: { x: 34.4, y: 21.8, w: 18.5, h: 75.2 } }
    ]
  }
];

let alerts = [
  { id: "a1", title: "No Hard Hat Detected", location: "North Entrance · cam-01", severity: "critical", time: "10:42:08", acknowledged: true },
  { id: "a2", title: "No Hard Hat Detected", location: "Loading Bay · cam-02", severity: "critical", time: "10:39:41", acknowledged: false },
  { id: "a3", title: "No Hard Hat Detected", location: "Assembly Floor · cam-03", severity: "critical", time: "10:37:56", acknowledged: false },
  { id: "a4", title: "No Safety Vest Detected", location: "Assembly Floor · cam-03", severity: "medium", time: "10:34:12", acknowledged: true },
  { id: "a5", title: "No Safety Vest Detected", location: "East Corridor · cam-04", severity: "medium", time: "10:31:02", acknowledged: false },
  { id: "a6", title: "No Hard Hat Detected", location: "Warehouse Bay 2 · cam-07", severity: "critical", time: "10:27:58", acknowledged: false },
  { id: "a7", title: "No Hard Hat Detected", location: "Rooftop Access · cam-08", severity: "critical", time: "10:24:30", acknowledged: true },
  { id: "a8", title: "No Safety Vest Detected", location: "Rooftop Access · cam-08", severity: "medium", time: "10:21:08", acknowledged: false }
];

function getStats() {
  const totalCameras = cameras.length;
  const liveCameras = cameras.filter((c) => c.status === "live").length;
  const dailyWarnings = alerts.length;
  const acknowledged = alerts.filter((a) => a.acknowledged).length;
  const complianceRate = (
    100 - (dailyWarnings === 0 ? 0 : (dailyWarnings / (totalCameras * 12)) * 100)
  ).toFixed(1);

  return {
    activeCameras: { value: liveCameras, total: totalCameras },
    dailyWarnings: { value: dailyWarnings, deltaVsYesterday: -8.4 },
    complianceRate: { value: Number(complianceRate), deltaVsYesterday: 2.1 },
    acknowledgedToday: acknowledged
  };
}

let settings = {
  hardhat: true,
  vest: true,
  proximity: true,
  email: false,
  faceBlur: false
};

export function listCameras() {
  return cameras;
}

export function getCamera(id) {
  return cameras.find((c) => c.id === id) || null;
}

export function listAlerts(filter = "all") {
  if (filter === "all") return alerts;
  return alerts.filter((a) => a.severity === filter);
}

export function acknowledgeAlert(id) {
  const alert = alerts.find((a) => a.id === id);
  if (!alert) return null;
  alert.acknowledged = true;
  return alert;
}

export function addDetection(cameraId, detection) {
  const camera = cameras.find((c) => c.id === cameraId);
  if (!camera) return null;
  const newDetection = { id: `d${Date.now()}`, ...detection };
  camera.detections.push(newDetection);
  camera.status = "live";
  camera.timestamp = new Date().toLocaleTimeString("en-GB");

  alerts.unshift({
    id: `a${Date.now()}`,
    title: detection.label,
    location: `${camera.name} · ${camera.id}`,
    severity: detection.severity,
    time: new Date().toLocaleTimeString("en-GB"),
    acknowledged: false
  });

  return newDetection;
}

export function getSettings() {
  return settings;
}

export function updateSettings(patch) {
  settings = { ...settings, ...patch };
  return settings;
}

export { getStats };
