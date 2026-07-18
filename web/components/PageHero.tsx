export default function PageHero({
  title,
  accent,
  subtitle,
}: {
  title: string;
  accent: string;
  subtitle: string;
}) {
  return (
    <header className="animate-fade-rise mb-10 text-center">
      <h1 className="text-[2.25rem] leading-none font-medium tracking-tighter text-gray-900 sm:text-[3rem] md:text-[3.5rem]">
        {title}{" "}
        <span className="text-zinc-400">{accent}</span>
      </h1>
      <p className="animate-fade-rise-delay mx-auto mt-6 max-w-lg text-base leading-relaxed text-gray-500">
        {subtitle}
      </p>
    </header>
  );
}
