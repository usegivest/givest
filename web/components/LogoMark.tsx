export default function LogoMark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 256 0 L 256 128 A 128 128 0 1 1 128 0 Z M 128 176 A 48 48 0 1 0 128 80 A 48 48 0 0 0 128 176 Z"
        fill="currentColor"
      />
    </svg>
  );
}
