export type TargetDefinition = {
  x: number;
  y: number;
  slogan: string;
  reveal: string;
  points: number;
};

export type BuildingDefinition = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  label?: string;
};

export type LevelDefinition = {
  id: string;
  name: string;
  phase: string;
  objective: string;
  intro: string;
  exposureToWin: number;
  worldWidth: number;
  hazardDelayMs: number;
  buildings: BuildingDefinition[];
  targets: TargetDefinition[];
};

export const cityOfSlogans: LevelDefinition = {
  id: "city-of-slogans",
  name: "City of Slogans",
  phase: "Phase 1",
  intro: "Press Enter to start",
  objective: "Expose every slogan board, then reach the exit marker.",
  exposureToWin: 100,
  worldWidth: 1320,
  hazardDelayMs: 1600,
  buildings: [
    { x: 170, y: 282, width: 110, height: 200, color: 0xefe7d3 },
    { x: 410, y: 250, width: 150, height: 265, color: 0xe8dfca, label: "MINISTRY" },
    { x: 635, y: 302, width: 120, height: 160, color: 0xf4e4c1 },
    { x: 940, y: 300, width: 150, height: 170, color: 0xd8e2dc, label: "KIOSK" },
    { x: 1135, y: 272, width: 130, height: 226, color: 0xf2d0a4 },
  ],
  targets: [
    {
      x: 165,
      y: 160,
      slogan: "BIG REFORM",
      reveal: "same queue",
      points: 100,
    },
    {
      x: 410,
      y: 170,
      slogan: "100% PROGRESS",
      reveal: "404 result",
      points: 125,
    },
    {
      x: 635,
      y: 220,
      slogan: "FAIR MEDIA",
      reveal: "mute button",
      points: 150,
    },
    {
      x: 520,
      y: 315,
      slogan: "FAST PERMIT",
      reveal: "try 2031",
      points: 175,
    },
    {
      x: 950,
      y: 210,
      slogan: "OPEN DATA",
      reveal: "pdf scan",
      points: 200,
    },
  ],
};

export const broadcastDistrict: LevelDefinition = {
  id: "broadcast-district",
  name: "Broadcast District",
  phase: "Phase 2",
  intro: "Press Enter to jam the broadcast",
  objective: "Expose 80% of the broadcast targets, then reach the exit marker.",
  exposureToWin: 80,
  worldWidth: 1500,
  hazardDelayMs: 1350,
  buildings: [
    { x: 180, y: 295, width: 130, height: 170, color: 0xdad7cd, label: "NEWS" },
    { x: 390, y: 250, width: 130, height: 260, color: 0xb8c0ff, label: "TV" },
    { x: 610, y: 305, width: 160, height: 150, color: 0xf1faee },
    { x: 845, y: 250, width: 120, height: 260, color: 0xa8dadc, label: "POLL" },
    { x: 1080, y: 285, width: 170, height: 190, color: 0xffddd2, label: "LIVE" },
    { x: 1310, y: 315, width: 120, height: 130, color: 0xe9edc9 },
  ],
  targets: [
    {
      x: 178,
      y: 205,
      slogan: "BREAKING",
      reveal: "old clip",
      points: 125,
    },
    {
      x: 390,
      y: 130,
      slogan: "LIVE TRUTH",
      reveal: "paid slot",
      points: 150,
    },
    {
      x: 615,
      y: 226,
      slogan: "NEW POLL",
      reveal: "sample: 7",
      points: 175,
    },
    {
      x: 845,
      y: 155,
      slogan: "CLEAR SIGNAL",
      reveal: "static",
      points: 200,
    },
    {
      x: 1080,
      y: 200,
      slogan: "FACT CHECK",
      reveal: "off air",
      points: 225,
    },
  ],
};

export const levels = [cityOfSlogans, broadcastDistrict] as const;

export function getLevel(levelId: string) {
  return levels.find((level) => level.id === levelId) ?? cityOfSlogans;
}
