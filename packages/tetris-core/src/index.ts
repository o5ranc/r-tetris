export * from "./network.js";
export * from "./types.js";

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  type Board,
  type Cell,
  type FilledCell,
  type GameState,
  type PieceKind,
  type Point,
  type Rotation,
  type Tetromino,
} from "./types.js";

const PIECE_CELLS: Record<PieceKind, FilledCell> = {
  I: 1,
  J: 2,
  L: 3,
  O: 4,
  S: 5,
  T: 6,
  Z: 7,
};

const SHAPES: Record<PieceKind, readonly (readonly Point[])[]> = {
  I: [
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
    [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
    [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }],
  ],
  J: [
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  ],
  L: [
    [{ x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  ],
  O: [
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  ],
  S: [
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
    [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  ],
  T: [
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  ],
  Z: [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }],
  ],
};

const PIECE_KINDS: readonly PieceKind[] = ["I", "J", "L", "O", "S", "T", "Z"];

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () => Array<Cell>(BOARD_WIDTH).fill(0));
}

export function createSevenBag(random: () => number = Math.random): PieceKind[] {
  const bag = [...PIECE_KINDS];
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [bag[index], bag[target]] = [bag[target] as PieceKind, bag[index] as PieceKind];
  }
  return bag;
}

export function spawnPiece(kind: PieceKind): Tetromino {
  return { kind, position: { x: 3, y: 0 }, rotation: 0 };
}

export function createInitialState(random: () => number = Math.random): GameState {
  const queue = [...createSevenBag(random), ...createSevenBag(random)];
  const first = queue.shift();
  if (first === undefined) {
    throw new Error("Unable to create a tetromino queue.");
  }

  return {
    board: createEmptyBoard(),
    current: spawnPiece(first),
    hold: null,
    next: queue,
    canHold: true,
    score: 0,
    lines: 0,
    status: "idle",
  };
}

export function getPieceCells(piece: Tetromino): readonly Point[] {
  const shape = SHAPES[piece.kind][piece.rotation];
  if (shape === undefined) {
    throw new Error(`Missing shape for ${piece.kind} rotation ${piece.rotation}.`);
  }
  return shape.map(({ x, y }) => ({ x: x + piece.position.x, y: y + piece.position.y }));
}

export function collides(board: Board, piece: Tetromino): boolean {
  return getPieceCells(piece).some(({ x, y }) => {
    if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) {
      return true;
    }
    return y >= 0 && board[y]?.[x] !== 0;
  });
}

export function movePiece(state: GameState, dx: number, dy: number): GameState {
  const moved: Tetromino = {
    ...state.current,
    position: { x: state.current.position.x + dx, y: state.current.position.y + dy },
  };
  return collides(state.board, moved) ? state : { ...state, current: moved };
}

export function rotatePiece(state: GameState, direction: 1 | -1 = 1): GameState {
  const rotation = ((state.current.rotation + direction + 4) % 4) as Rotation;
  for (const offset of [0, -1, 1, -2, 2]) {
    const rotated: Tetromino = {
      ...state.current,
      rotation,
      position: { x: state.current.position.x + offset, y: state.current.position.y },
    };
    if (!collides(state.board, rotated)) {
      return { ...state, current: rotated };
    }
  }
  return state;
}

export function getGhostPiece(board: Board, piece: Tetromino): Tetromino {
  let ghost = piece;
  while (true) {
    const candidate: Tetromino = {
      ...ghost,
      position: { x: ghost.position.x, y: ghost.position.y + 1 },
    };
    if (collides(board, candidate)) {
      return ghost;
    }
    ghost = candidate;
  }
}

export function clearCompletedLines(board: Board): { board: Board; linesCleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === 0));
  const linesCleared = BOARD_HEIGHT - remaining.length;
  const emptyRows = Array.from({ length: linesCleared }, () => Array<Cell>(BOARD_WIDTH).fill(0));
  return { board: [...emptyRows, ...remaining.map((row) => [...row])], linesCleared };
}

function withFreshQueue(queue: readonly PieceKind[], random: () => number): PieceKind[] {
  return queue.length < 7 ? [...queue, ...createSevenBag(random)] : [...queue];
}

export function lockPiece(state: GameState, random: () => number = Math.random): GameState {
  const board = state.board.map((row) => [...row]);
  for (const { x, y } of getPieceCells(state.current)) {
    if (y >= 0 && board[y] !== undefined) {
      board[y][x] = PIECE_CELLS[state.current.kind];
    }
  }

  const cleared = clearCompletedLines(board);
  const queue = withFreshQueue(state.next, random);
  const nextKind = queue.shift();
  if (nextKind === undefined) {
    throw new Error("Tetromino queue unexpectedly became empty.");
  }
  const current = spawnPiece(nextKind);
  const status = collides(cleared.board, current) ? "game-over" : state.status;

  return {
    ...state,
    board: cleared.board,
    current,
    next: queue,
    canHold: true,
    score: state.score + [0, 100, 300, 500, 800][cleared.linesCleared]!,
    lines: state.lines + cleared.linesCleared,
    status,
  };
}

export function softDrop(state: GameState, random: () => number = Math.random): GameState {
  const moved = movePiece(state, 0, 1);
  return moved === state ? lockPiece(state, random) : { ...moved, score: moved.score + 1 };
}

export function hardDrop(state: GameState, random: () => number = Math.random): GameState {
  const ghost = getGhostPiece(state.board, state.current);
  const distance = ghost.position.y - state.current.position.y;
  return lockPiece({ ...state, current: ghost, score: state.score + distance * 2 }, random);
}

export function holdPiece(state: GameState, random: () => number = Math.random): GameState {
  if (!state.canHold) {
    return state;
  }

  if (state.hold !== null) {
    return { ...state, current: spawnPiece(state.hold), hold: state.current.kind, canHold: false };
  }

  const queue = withFreshQueue(state.next, random);
  const nextKind = queue.shift();
  if (nextKind === undefined) {
    throw new Error("Tetromino queue unexpectedly became empty.");
  }
  return {
    ...state,
    current: spawnPiece(nextKind),
    hold: state.current.kind,
    next: queue,
    canHold: false,
  };
}

