// Mappar HA weather-condition → en Warm-glyph + svensk etikett.

import {
  CloudIcon,
  CloudRainIcon,
  CloudSnowIcon,
  FogIcon,
  MoonIcon,
  PartlyCloudyIcon,
  StormIcon,
  SunIcon,
  WindIcon,
} from "@/components/warm/icons/extra";

export type WeatherGlyph = (props: { size?: number; color?: string }) => JSX.Element;

const MAP: Record<string, WeatherGlyph> = {
  sunny: SunIcon,
  "clear-night": MoonIcon,
  partlycloudy: PartlyCloudyIcon,
  cloudy: CloudIcon,
  fog: FogIcon,
  rainy: CloudRainIcon,
  pouring: StormIcon,
  snowy: CloudSnowIcon,
  "snowy-rainy": CloudSnowIcon,
  hail: CloudSnowIcon,
  lightning: StormIcon,
  "lightning-rainy": StormIcon,
  windy: WindIcon,
  "windy-variant": WindIcon,
  exceptional: CloudIcon,
};

export function weatherGlyph(condition: string): WeatherGlyph {
  return MAP[condition] ?? CloudIcon;
}
