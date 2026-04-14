import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * PNG favicon fallback — used by Safari on macOS which doesn't support SVG favicons.
 * Modern browsers (Chrome, Firefox, Edge) prefer the SVG icon.svg instead.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#475bc2"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M3 11 L12 3 L21 11 L21 20 Q21 21 20 21 L4 21 Q3 21 3 20 Z" />
          <circle cx="12" cy="15" r="2.5" fill="#475bc2" stroke="none" />
        </svg>
      </div>
    ),
    size,
  );
}
