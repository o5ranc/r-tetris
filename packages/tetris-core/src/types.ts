export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export type EmptyCell = 0;
export type FilledCell = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Cell = EmptyCell | FilledCell;
export type Board = Cell[][];

export type PieceKind = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
export type Rotation = 0 | 1 | 2 | 3;
export type GameStatus = "idle" | "countdown" | "playing" | "paused" | "game-over";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Tetromino {
  readonly kind: PieceKind;
  readonly position: Point;
  readonly rotation: Rotation;
}

export interface GameState {
  readonly board: Board;
  readonly current: Tetromino;
  readonly hold: PieceKind | null;
  readonly next: readonly PieceKind[];
  readonly canHold: boolean;
  readonly score: number;
  readonly lines: number;
  readonly status: GameStatus;
}

