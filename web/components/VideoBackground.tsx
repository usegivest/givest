"use client";

const VIDEO_URL = "/media/home-bg.mp4";

/** Mounted once in the root layout so navigation never remounts the video. */
export default function VideoBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: "scale(var(--bg-zoom, 1.08))",
          transformOrigin: "center center",
        }}
      >
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={VIDEO_URL}
          poster="/media/home-bg.jpg"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
      </div>
    </div>
  );
}
