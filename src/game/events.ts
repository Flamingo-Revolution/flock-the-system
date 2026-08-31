export type ActivePowerUp = {
  type: "makiato" | "shield" | "magnet";
  remainingMs: number;
  totalMs: number;
};

export type GameStats = {
  levelId: string;
  levelName: string;
  score: number;
  exposure: number;
  targetExposure: number;
  progress: number; // 0 to 1
  lives: number;
  combo: number;
  status: "ready" | "playing" | "paused" | "won" | "lost";
  message: string;
  lastHitAntagonist?: "edi" | "sali";
  isEndless?: boolean;
  activePowerUp?: ActivePowerUp;
  unlockedGoldenSkin?: boolean;
};

export type GameCallbacks = {
  onStatsChange: (stats: GameStats) => void;
  onLevelComplete: (levelId: string, score: number) => void;
};

export type GameCommand =
  | "start"
  | "pause"
  | "restart"
  | "continue_endless"
  | "toggle_golden_skin";

export const GAME_COMMAND_EVENT = "flamingoja-e-fundit:command";
