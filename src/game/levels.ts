import {
  pengesatLagjjaEEkraneve,
  pengesatQytetiISloganeve,
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

export const qytetiISloganeve: LevelDefinition = {
  id: "qyteti-i-sloganeve",
  name: "Qyteti i Sloganeve",
  phase: "Faza 1",
  intro: "Prek per te nisur",
  objective: "Prek per te kercyer mbi pengesa dhe zbulo 8 genjeshtra.",
  targetExposure: 8,
  speed: 260,
  gravityY: 2380,
  jumpVelocity: -740,
  obstacleDelayMs: 1400,
  gateGap: 190,
  skyColor: 0x9bdff0,
  groundColor: 0xc7d2a2,
  obstacleColor: 0xd94d64,
  zbulime: pengesatQytetiISloganeve.slogane,
  politikanet: pengesatQytetiISloganeve.njerez,
  ministrite: pengesatQytetiISloganeve.ministri,
  pengesaToke: pengesatQytetiISloganeve.pengesaToke,
  rreziqeAjri: pengesatQytetiISloganeve.rreziqeAjri,
  dokumente: pengesatQytetiISloganeve.dokumente,
};

export const lagjjaEEkraneve: LevelDefinition = {
  id: "lagjja-e-ekraneve",
  name: "Lagjja e Ekraneve",
  phase: "Faza 2",
  intro: "Prek per te prishur sinjalin",
  objective: "Kercej mes kamerave dhe zbulo 10 lajme te rreme.",
  targetExposure: 10,
  speed: 280,
  gravityY: 2480,
  jumpVelocity: -760,
  obstacleDelayMs: 1300,
  gateGap: 182,
  skyColor: 0xb8c0ff,
  groundColor: 0xa8dadc,
  obstacleColor: 0x263238,
  zbulime: pengesatLagjjaEEkraneve.slogane,
  politikanet: pengesatLagjjaEEkraneve.njerez,
  ministrite: pengesatLagjjaEEkraneve.ministri,
  pengesaToke: pengesatLagjjaEEkraneve.pengesaToke,
  rreziqeAjri: pengesatLagjjaEEkraneve.rreziqeAjri,
  dokumente: pengesatLagjjaEEkraneve.dokumente,
};

export const levels = [qytetiISloganeve, lagjjaEEkraneve] as const;

export function getLevel(levelId: string) {
  return levels.find((level) => level.id === levelId) ?? qytetiISloganeve;
}
