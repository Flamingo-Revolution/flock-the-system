import {
  sheshiIRevolucionitPool,
  type AirHazard,
  type DocumentCollectible,
  type GroundObstacle,
  type MinistryObstacle,
  type PersonObstacle,
  type SloganObstacle,
} from "./obstacles";

export type ZbulimDefinition = SloganObstacle;
export type PolitikanDefinition = PersonObstacle;
export type DokumentDefinition = DocumentCollectible;

export type LevelDefinition = {
  id: string;
  name: string;
  phase: string;
  intro: string;
  objective: string;
  targetExposure: number;
  speed: number;
  gravityY: number;
  jumpVelocity: number;
  obstacleDelayMs: number;
  gateGap: number;
  skyColor: number;
  groundColor: number;
  obstacleColor: number;
  zbulime: ZbulimDefinition[];
  politikanet: PolitikanDefinition[];
  ministrite: MinistryObstacle[];
  pengesaToke: GroundObstacle[];
  rreziqeAjri: AirHazard[];
  dokumente: DokumentDefinition[];
};

export const sheshiIRevolucionit: LevelDefinition = {
  id: "sheshi-i-revolucionit",
  name: "Sheshi i Revolucionit",
  phase: "Revolucioni i Flamingove",
  intro: "Kliko për të nisur marshimin",
  objective: "Kërce mbi pengesat e regjimit dhe gris propagandën!",
  targetExposure: 35,
  speed: 295,
  gravityY: 2380,
  jumpVelocity: -740,
  obstacleDelayMs: 1450,
  gateGap: 190,
  skyColor: 0x93e4ef,
  groundColor: 0xc7d2a2,
  obstacleColor: 0xd94d64,
  zbulime: sheshiIRevolucionitPool.slogane,
  politikanet: sheshiIRevolucionitPool.njerez,
  ministrite: sheshiIRevolucionitPool.ministri,
  pengesaToke: sheshiIRevolucionitPool.pengesaToke,
  rreziqeAjri: sheshiIRevolucionitPool.rreziqeAjri,
  dokumente: sheshiIRevolucionitPool.dokumente,
};

export const levels = [sheshiIRevolucionit] as const;

export function getLevel(levelId?: string) {
  return levels[0];
}
