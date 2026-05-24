import { api } from './client';
import type {
  CreateRoomRequest, CreateRoomResponse,
  JoinRoomRequest, JoinRoomResponse,
  RoomDto, PlayerDto, CardDto, GameStateDto, KinhVerifyResult, SpinWheelResponse,
} from '../types';

export const roomsApi = {
  create: (req: CreateRoomRequest) =>
    api.post<CreateRoomResponse>('/Rooms', req).then(r => r.data),

  get: (code: string) =>
    api.get<RoomDto>(`/Rooms/${code}`).then(r => r.data),

  join: (code: string, req: JoinRoomRequest) =>
    api.post<JoinRoomResponse>(`/Rooms/${code}/join`, req).then(r => r.data),

  getAvailableCards: (code: string) =>
    api.get<CardDto[]>(`/Rooms/${code}/cards/available`).then(r => r.data),

  pickCard: (code: string, cardId: string, playerId: string) =>
    api.post<{ cardId: string; grid: number[][]; success: boolean }>(
      `/Rooms/${code}/cards/${cardId}/pick`,
      null,
      { params: { playerId } }
    ).then(r => r.data),

  getPlayers: (code: string) =>
    api.get<PlayerDto[]>(`/Rooms/${code}/players`).then(r => r.data),

  // Game
  getGameState: (code: string) =>
    api.get<GameStateDto>(`/Rooms/${code}/game/state`).then(r => r.data),

  startGame: (code: string, initiatorId: string) =>
    api.post<GameStateDto>(
      `/Rooms/${code}/game/start`, null, { params: { initiatorId } }
    ).then(r => r.data),

  spinWheel: (code: string, hostId: string) =>
    api.post<SpinWheelResponse>(`/Rooms/${code}/game/spin-wheel`, { hostId }).then(r => r.data),

  selectAnswerer: (code: string, hostId: string, playerId: string) =>
    api.post(`/Rooms/${code}/game/select-answerer`, { hostId, playerId }).then(r => r.data),

  submitAnswer: (code: string, playerId: string, answerIndex: number) =>
    api.post(`/Rooms/${code}/game/submit-answer`, { playerId, answerIndex }).then(r => r.data),

  skipSlot: (code: string, hostId: string) =>
    api.post(`/Rooms/${code}/game/skip-slot`, { hostId }).then(r => r.data),

  claimKinh: (code: string, playerId: string) =>
    api.post<KinhVerifyResult>(`/Rooms/${code}/game/claim-kinh`, { playerId }).then(r => r.data),

  unpickCard: (code: string, playerId: string) =>
    api.delete(`/Rooms/${code}/cards/pick`, { params: { playerId } }).then(r => r.data),

  getAllCards: (code: string) =>
    api.get<CardDto[]>(`/Rooms/${code}/cards`).then(r => r.data),
};
