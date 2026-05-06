type LogoProps = {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Björk brand symbol — outline house with center dot.
 * Uses Warm Home accent (terracotta #C96F4A) for both light and dark themes.
 */
export default function Logo({ size = 24, className, style }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#C96F4A"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-label="Björk"
      role="img"
    >
      <path d="M3 11 L12 3 L21 11 L21 20 Q21 21 20 21 L4 21 Q3 21 3 20 Z" />
      <circle cx="12" cy="15" r="2.5" fill="#C96F4A" stroke="none" />
    </svg>
  );
}
