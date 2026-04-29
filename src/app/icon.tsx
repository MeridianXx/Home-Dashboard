import { ImageResponse } from "next/og";

export const contentType = "image/png";

/**
 * Genererar PNG-ikoner i flera storlekar:
 *   /icon/32   — favicon-fallback för browsers som inte stöder /icon.svg
 *   /icon/192  — PWA-standard, krävs av iOS "Lägg till på hemskärmen"-dialogen
 *                när "Öppna som webbapp" är på (annars faller iOS tillbaka till
 *                en autogenererad bokstavsikon på theme_color-bakgrund)
 *   /icon/512  — PWA-standard, splash screen och stor app-list-vy
 */
export function generateImageMetadata() {
  return [
    { contentType: "image/png", size: { width: 32, height: 32 }, id: "32" },
    { contentType: "image/png", size: { width: 192, height: 192 }, id: "192" },
    { contentType: "image/png", size: { width: 512, height: 512 }, id: "512" },
  ];
}

export default async function Icon({
  id,
}: {
  // Next.js 16: id kommer som Promise (se generate-image-metadata docs)
  id: Promise<string | number>;
}) {
  const iconId = await id;
  const size = parseInt(String(iconId), 10);
  // Husikonen får ~83 % av canvas (matchar apple-icon.tsx:s 150/180-proportion).
  // För 32×32 favicon låter vi den fylla mer (~88 %) så strecken syns.
  const innerScale = size <= 32 ? 0.88 : 0.83;
  const innerSize = Math.round(size * innerScale);
  // Strokebredd skalas med storlek så att linjen är ungefär lika "tjock" visuellt
  // i alla varianter (1.5 vid 32px → 12 vid 512px).
  const strokeWidth = Math.max(1.5, Math.round((size / 512) * 12));

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
          width={innerSize}
          height={innerSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#C96F4A"
          strokeWidth={(strokeWidth * 24) / innerSize}
          strokeLinecap="round"
          strokeLinejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M3 11 L12 3 L21 11 L21 20 Q21 21 20 21 L4 21 Q3 21 3 20 Z" />
          <circle cx="12" cy="15" r="2.5" fill="#C96F4A" stroke="none" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
