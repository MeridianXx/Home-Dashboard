import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFBF0",
        }}
      >
        <svg
          width="150"
          height="150"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#C96F4A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M3 11 L12 3 L21 11 L21 20 Q21 21 20 21 L4 21 Q3 21 3 20 Z" />
          <circle cx="12" cy="15" r="2.5" fill="#C96F4A" stroke="none" />
        </svg>
      </div>
    ),
    size,
  );
}
