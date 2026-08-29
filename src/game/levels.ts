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
  intro: "Prek ekranin ose shtyp HAPESIRE per te hipur",
  objective: "Kerce mbi pengesat, ulu nen dronet, kap zyrtaret ne ajer, dhe zbulo 8 genjeshtra.",
  targetExposure: 8,
  speed: 300,
  gravityY: 1750,
  jumpVelocity: -640,
  obstacleDelayMs: 1250,
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
  intro: "Prek ekranin ose shtyp HAPESIRE per te nderprere transmetimin",
  objective: "Shmang antenat fluturuese, kap zyrtaret ne ajer, dhe zbulo 10 lajme te rreme.",
  targetExposure: 10,
  speed: 330,
  gravityY: 1820,
  jumpVelocity: -655,
  obstacleDelayMs: 1150,
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
