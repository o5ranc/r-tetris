import type { Board, GameStatus } from "./types.js";

export interface PlayerSummary {
  readonly id: string;
  readonly nickname: string;
}

export interface BoardSnapshot {
  readonly playerId: string;
  readonly cells: Uint8Array;
  readonly score: number;
  readonly lines: number;
  readonly status: GameStatus;
}

export interface ChatMessage {
  readonly id: string;
  readonly playerId: string;
  readonly nickname: string;
  readonly text: string;
  readonly sentAt: string;
}

export interface RoomSnapshot {
  readonly roomId: string;
  readonly players: readonly PlayerSummary[];
}

export interface JoinRoomPayload {
  readonly roomId: string;
  readonly nickname: string;
}

export interface JoinRoomResult {
  readonly ok: boolean;
  readonly room?: RoomSnapshot;
  readonly error?: string;
}

export interface ClientToServerEvents {
  joinRoom: (payload: JoinRoomPayload, reply: (result: JoinRoomResult) => void) => void;
  boardState: (snapshot: Omit<BoardSnapshot, "playerId">) => void;
  garbage: (lines: number) => void;
  chat: (text: string) => void;
}

export interface ServerToClientEvents {
  roomState: (room: RoomSnapshot) => void;
  boardState: (snapshot: BoardSnapshot) => void;
  garbage: (lines: number, fromPlayerId: string) => void;
  chat: (message: ChatMessage) => void;
  playerLeft: (playerId: string) => void;
  serverError: (message: string) => void;
}

export function packBoard(board: Board): Uint8Array {
  return Uint8Array.from(board.flat());
}

export function unpackBoard(cells: Uint8Array, width = 10, height = 20): Board {
  if (cells.length !== width * height) {
    throw new Error(`Invalid board payload: expected ${width * height} cells, received ${cells.length}.`);
  }

  const board: Board = [];
  for (let y = 0; y < height; y += 1) {
    board.push(Array.from(cells.slice(y * width, (y + 1) * width)) as Board[number]);
  }
  return board;
}

