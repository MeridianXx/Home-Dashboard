type LogoProps = {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Inicio brand symbol — outline house with center dot.
 * Uses primary brand color (#475bc2) for both light and dark themes.
 */
export default function Logo({ size = 24, className, style }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#475bc2"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-label="inicio"
      role="img"
    >
      <path d="M3 11 L12 3 L21 11 L21 20 Q21 21 20 21 L4 21 Q3 21 3 20 Z" />
      <circle cx="12" cy="15" r="2.5" fill="#475bc2" stroke="none" />
    </svg>
  );
}
