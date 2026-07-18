import Navbar from "@/components/Navbar";

export default function AppPageShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-[1] bg-white/40 backdrop-blur-[2px]" />
      <Navbar />
      <main className="relative z-10 mx-auto w-full max-w-4xl px-6 pt-32 pb-20">
        {children}
      </main>
      {footer && (
        <footer className="relative z-10 pb-10 text-center text-xs text-gray-500">
          {footer}
        </footer>
      )}
    </div>
  );
}
