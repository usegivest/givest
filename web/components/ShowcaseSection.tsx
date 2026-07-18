import Link from "next/link";
import Dashboard from "@/components/Dashboard";

const SHOWCASE_VIDEO = "/media/showcase.mp4";

export default function ShowcaseSection({
  scrollProgress,
}: {
  scrollProgress: number;
}) {
  const fadeStart = 0.35;
  const fadeEnd = 0.75;
  const t = Math.min(
    Math.max((scrollProgress - fadeStart) / (fadeEnd - fadeStart), 0),
    1,
  );
  const opacity = t;
  const scale = 0.88 + t * 0.12;

  return (
    <section
      id="how"
      className="relative flex min-h-screen items-center justify-center px-6 will-change-transform md:px-16 lg:px-24"
      style={{
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "center top",
        zIndex: 20,
      }}
    >
      <div className="relative mx-auto min-h-[480px] w-full max-w-7xl overflow-hidden rounded-2xl sm:min-h-[560px] sm:rounded-3xl md:min-h-[680px]">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={SHOWCASE_VIDEO}
          poster="/media/showcase.jpg"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        <div className="relative z-10 flex h-full min-h-[480px] flex-col items-end sm:min-h-[560px] md:min-h-[680px] md:flex-row md:items-stretch">
          <div className="flex w-full flex-col justify-end p-4 sm:p-5 md:w-1/2 md:p-8">
            <h2 className="text-2xl leading-tight font-medium tracking-tighter text-gray-900 sm:text-3xl md:text-[2.75rem] md:leading-[1.15] md:text-white">
              Your Stock Drop,
              <br />
              Faster and Clearer
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-gray-600 md:text-base md:text-white/70">
              Buy real stock tokens, lock them in escrow, and share a claim
              link. The recipient gets stocks in one click with zero gas.
            </p>
            <Link
              href="/send"
              className="mt-6 inline-block rounded-full border border-white/30 bg-white/10 px-6 py-2.5 text-sm font-semibold text-gray-900 backdrop-blur-sm transition hover:bg-white/20 md:text-white"
            >
              Send a Drop
            </Link>
          </div>

          <div className="mt-auto flex w-full origin-bottom-right scale-[0.75] items-end justify-end sm:scale-[0.85] md:mt-0 md:w-1/2 md:scale-100">
            <Dashboard />
          </div>
        </div>
      </div>
    </section>
  );
}
