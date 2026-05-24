// Enums
export type RoomState = 'Lobby' | 'Picking' | 'Playing' | 'Ended';
export type GamePhase = 'Idle' | 'DrawerAnswering' | 'Stealing' | 'Revealing';
export type WinType = 'Row' | 'Column';

// Room
export interface CreateRoomRequest { hostName: string }
export interface CreateRoomResponse { roomCode: string; hostId: string; hostName: string }

export interface JoinRoomRequest { clientId: string | null; playerName: string }
export interface JoinRoomResponse {
  playerId: string; roomCode: string; name: string; playerCount: number
}

export interface RoomDto {
  code: string; hostId: string; state: RoomState;
  playerCount: number; createdAt: string;
}

export interface PlayerDto {
  id: string; name: string; isHost: boolean; cardId: string | null;
  online: boolean; markedNumbers: number[];
}

export interface CardDto {
  id: string; grid: number[][]; ownerId: string | null; isAvailable: boolean;
}

// Question (KHÔNG có correctIndex)
export interface QuestionDto {
  id: string; text: string; options: string[]; type: 'Normal' | 'Redemption';
}

// Game
export interface GameStateDto {
  roomCode: string;
  phase: GamePhase;
  currentDrawerId: string | null;
  currentSlotId: string | null;
  deadline: string | null;
  calledNumbers: number[];
  remainingSlots: number;
  lockedSlots: number;
  answeredPositions: number[];
  lockedPositions: number[];
  currentSpunNumber: number | null;
}

export interface SpinWheelRequest { hostId: string }
export interface SpinWheelResponse {
  spunNumber: number; question: QuestionDto;
  firstAnswererId: string; deadline: string;
}

export interface SubmitAnswerRequest { playerId: string; answerIndex: number }
export interface SubmitAnswerResponse {
  isCorrect: boolean; correctIndex: number; nextPhase: GamePhase; calledNumber: number | null;
}

export interface KinhVerifyResult {
  isValid: boolean; winType: WinType; winIndex: number; reason: string | null;
}
