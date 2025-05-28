export interface Player {
  name: string;
  score: number;
  avatar: string; // avatar
}

export interface GameState {
  pits: number[];
  currentPlayer: number;
  players: Player[];
}

export interface PlayerScore {
  name: string;
  score: number;
}

export interface Announcement {
  id: string;
  content: string;
  date: string;
}

// WebSocket 消息类型
export interface OpponentMoveMessage {
  type: 'OPPONENT_MOVE';
  move: number;
  gameState: GameState;
}

export interface MatchFoundMessage {
  type: 'MATCH_FOUND';
  role: 'player1' | 'player2';
  opponent: any;
  gameId: string;
}

export interface WaitingMessage {
  type: 'WAITING';
}

export interface GameCreatedMessage {
  type: 'GAME_CREATED';
  gameId: string;
}

export type WebSocketMessage = 
  | OpponentMoveMessage
  | MatchFoundMessage
  | WaitingMessage
  | GameCreatedMessage;
