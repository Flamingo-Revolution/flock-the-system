export type GameStats = {
  levelId: string;
  levelName: string;
  score: number;
  exposure: number;
  lives: number;
  combo: number;
  status: "ready" | "playing" | "paused" | "won" | "lost";
  message: string;
};

export type GameCallbacks = {
  onStatsChange: (stats: GameStats) => void;
  onLevelComplete: (levelId: string, score: number) => void;
};

export type GameCommand = "start" | "pause" | "restart";

export const GAME_COMMAND_EVENT = "flamingoja-e-fundit:command";
