// usage: node scripts/run_detect.mjs img1.jpg img2.jpg ...   -> prints JSON per image
import fs from "fs";
import { loadModels, detect } from "../services/detector.js";
await loadModels();
const out = {};
for (const f of process.argv.slice(2)) {
  const r = await detect(fs.readFileSync(f));
  out[f] = { dets: r.raw_detections.map(d => [d.label, d.confidence, d.box.x, d.box.y, d.box.w, d.box.h]), viol: r.violations.map(v=>v.label), ms: r.meta.inference_ms };
}
console.log(JSON.stringify(out));
