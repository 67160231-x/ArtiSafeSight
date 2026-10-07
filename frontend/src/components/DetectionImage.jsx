import { useState } from "react";

// Shows media inside a 16:9 frame WITHOUT cropping it, and gives children a coordinate
// space that matches the media exactly. Bounding boxes from the model are percentages of
// the original frame, so they only line up if the overlay has the same size as the
// displayed picture (object-cover would crop and shift every box).
const FRAME_RATIO = 16 / 9;

function fit(ratio) {
  return ratio >= FRAME_RATIO
    ? { w: 100, h: (FRAME_RATIO / ratio) * 100 }
    : { w: (ratio / FRAME_RATIO) * 100, h: 100 };
}

/** Generic fitted frame: `ratio` = width/height of the media (falls back to fill). */
export function FitFrame({ ratio, className = "", frame, children }) {
  const f = ratio ? fit(ratio) : { w: 100, h: 100 };
  return (
    <div className={`relative aspect-video bg-black overflow-hidden ${className}`}>
      <div
        className="absolute"
        style={{
          left: `${(100 - f.w) / 2}%`,
          top: `${(100 - f.h) / 2}%`,
          width: `${f.w}%`,
          height: `${f.h}%`
        }}
      >
        {children}
      </div>
      {frame}
    </div>
  );
}

export default function DetectionImage({ src, alt, width, height, className = "", imgClassName = "", frame, children }) {
  const [natural, setNatural] = useState(null);
  const w = width || natural?.w;
  const h = height || natural?.h;
  return (
    <FitFrame ratio={w && h ? w / h : null} className={className} frame={frame}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`block h-full w-full ${imgClassName}`}
        onLoad={(e) => setNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
      />
      {children}
    </FitFrame>
  );
}
