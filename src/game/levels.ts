import {
  pengesatLagjjaEEkraneve,
  pengesatQytetiISloganeve,
  type MinistryObstacle,
  type PersonObstacle,
  type SloganObstacle,
} from "./obstacles";

export type ZbulimDefinition = SloganObstacle;
export type PolitikanDefinition = PersonObstacle;

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
};

export const qytetiISloganeve: LevelDefinition = {
  id: "qyteti-i-sloganeve",
  name: "Qyteti i Sloganeve",
  phase: "Faza 1",
  intro: "Prek per te nisur",
  objective: "Prek per te fluturuar mes pengesave dhe zbulo 8 genjeshtra.",
  targetExposure: 8,
  speed: 218,
  gravityY: 980,
  jumpVelocity: -345,
  obstacleDelayMs: 1520,
  gateGap: 172,
  skyColor: 0x9bdff0,
  groundColor: 0xc7d2a2,
  obstacleColor: 0xd94d64,
  zbulime: pengesatQytetiISloganeve.slogane,
  politikanet: pengesatQytetiISloganeve.njerez,
  ministrite: pengesatQytetiISloganeve.ministri,
};

export const lagjjaEEkraneve: LevelDefinition = {
  id: "lagjja-e-ekraneve",
  name: "Lagjja e Ekraneve",
  phase: "Faza 2",
  intro: "Prek per te prishur sinjalin",
  objective: "Fluturo mes antenave dhe zbulo 10 lajme te rreme.",
  targetExposure: 10,
  speed: 236,
  gravityY: 1010,
  jumpVelocity: -356,
  obstacleDelayMs: 1450,
  gateGap: 164,
  skyColor: 0xb8c0ff,
  groundColor: 0xa8dadc,
  obstacleColor: 0x263238,
  zbulime: pengesatLagjjaEEkraneve.slogane,
  politikanet: pengesatLagjjaEEkraneve.njerez,
  ministrite: pengesatLagjjaEEkraneve.ministri,
};

export const levels = [qytetiISloganeve, lagjjaEEkraneve] as const;

export function getLevel(levelId: string) {
  return levels.find((level) => level.id === levelId) ?? qytetiISloganeve;
}
