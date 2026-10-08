import { describe, expect, it } from "vitest";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  clearCompletedLines,
  createEmptyBoard,
  createInitialState,
  getGhostPiece,
  holdPiece,
  movePiece,
  packBoard,
  spawnPiece,
  unpackBoard,
} from "./index.js";

describe("tetris core", () => {
  it("creates a 10 x 20 empty board", () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(BOARD_HEIGHT);
    expect(board.every((row) => row.length === BOARD_WIDTH && row.every((cell) => cell === 0))).toBe(true);
  });

  it("does not move a piece outside the board", () => {
    let state = createInitialState(() => 0.5);
    for (let index = 0; index < BOARD_WIDTH; index += 1) {
      state = movePiece(state, -1, 0);
    }
    expect(state.current.position.x).toBeGreaterThanOrEqual(0);
  });

  it("places the ghost piece on the floor", () => {
    const ghost = getGhostPiece(createEmptyBoard(), spawnPiece("O"));
    expect(ghost.position.y).toBe(18);
  });

  it("clears a completed line", () => {
    const board = createEmptyBoard();
    board[BOARD_HEIGHT - 1] = Array(BOARD_WIDTH).fill(1);
    const result = clearCompletedLines(board);
    expect(result.linesCleared).toBe(1);
    expect(result.board[0]?.every((cell) => cell === 0)).toBe(true);
  });

  it("allows hold only once before a piece locks", () => {
    const state = createInitialState(() => 0.5);
    const held = holdPiece(state, () => 0.5);
    expect(held.hold).toBe(state.current.kind);
    expect(holdPiece(held, () => 0.5)).toBe(held);
  });

  it("packs and unpacks board cells", () => {
    const board = createEmptyBoard();
    board[0]![0] = 7;
    expect(unpackBoard(packBoard(board))).toEqual(board);
  });
});
