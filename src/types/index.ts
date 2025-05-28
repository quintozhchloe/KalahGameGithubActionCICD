// 游戏状态类型定义
export interface Player {
  name: string;
  score: number;
  avatar: string;
}

export interface GameState {
  pits: number[];
  currentPlayer: number;
  players: Player[];
}