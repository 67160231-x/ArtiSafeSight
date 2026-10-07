// Postinstall: onnxruntime-node ships ~800MB of binaries for every platform plus
// CUDA/TensorRT providers. We only run CPU inference on the current OS/arch, so
// delete the rest. Saves ~700MB of disk on Render's build and keeps deploys fast.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "onnxruntime-node", "bin", "napi-v3");
if (!fs.existsSync(root)) process.exit(0);

const keepPlatform = process.platform;
const keepArch = process.arch;
let freed = 0;

function size(p) {
  const st = fs.statSync(p);
  if (!st.isDirectory()) return st.size;
  return fs.readdirSync(p).reduce((n, f) => n + size(path.join(p, f)), 0);
}

for (const platform of fs.readdirSync(root)) {
  const pdir = path.join(root, platform);
  if (platform !== keepPlatform) {
    freed += size(pdir);
    fs.rmSync(pdir, { recursive: true, force: true });
    continue;
  }
  for (const arch of fs.readdirSync(pdir)) {
    const adir = path.join(pdir, arch);
    if (arch !== keepArch) {
      freed += size(adir);
      fs.rmSync(adir, { recursive: true, force: true });
      continue;
    }
    for (const f of fs.readdirSync(adir)) {
      if (/cuda|tensorrt/i.test(f)) {
        freed += size(path.join(adir, f));
        fs.rmSync(path.join(adir, f), { force: true });
      }
    }
  }
}
console.log(`[prune-ort] freed ${(freed / 1024 / 1024).toFixed(0)} MB`);
