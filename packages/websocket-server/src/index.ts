import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import type {
  BoardSnapshot,
  ClientToServerEvents,
  JoinRoomResult,
  PlayerSummary,
  RoomSnapshot,
  ServerToClientEvents,
} from "@r-tetris/core";
import { Server } from "socket.io";

const MAX_PLAYERS = 5;
const BOARD_CELL_COUNT = 200;
const DEFAULT_PORT = 3001;

interface SocketData {
  nickname?: string;
  roomId?: string;
}

interface RoomState {
  readonly players: Map<string, PlayerSummary>;
}

const rooms = new Map<string, RoomState>();
const allowedOrigins = (process.env.CLIENT_ORIGINS ?? "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  response.writeHead(404).end();
});

const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
  cors: { origin: allowedOrigins },
  transports: ["websocket", "polling"],
});

function snapshotRoom(roomId: string, room: RoomState): RoomSnapshot {
  return { roomId, players: [...room.players.values()] };
}

function isValidBoardSnapshot(snapshot: Omit<BoardSnapshot, "playerId">): boolean {
  return (
    snapshot !== null &&
    typeof snapshot === "object" &&
    snapshot.cells instanceof Uint8Array &&
    snapshot.cells.length === BOARD_CELL_COUNT &&
    snapshot.cells.every((cell) => cell <= 7) &&
    Number.isFinite(snapshot.score) &&
    Number.isInteger(snapshot.lines)
  );
}

function leaveCurrentRoom(socketId: string, roomId: string): void {
  const room = rooms.get(roomId);
  if (room === undefined) {
    return;
  }

  room.players.delete(socketId);
  io.to(roomId).emit("playerLeft", socketId);
  if (room.players.size === 0) {
    rooms.delete(roomId);
  } else {
    io.to(roomId).emit("roomState", snapshotRoom(roomId, room));
  }
}

io.on("connection", (socket) => {
  socket.on("joinRoom", async (payload, reply) => {
    const roomId = payload.roomId.trim().toUpperCase();
    const nickname = payload.nickname.trim();
    let result: JoinRoomResult;

    if (!/^[A-Z0-9-]{2,24}$/.test(roomId)) {
      result = { ok: false, error: "방 코드는 영문, 숫자, 하이픈 2~24자로 입력하세요." };
      reply(result);
      return;
    }
    if (nickname.length < 1 || nickname.length > 20) {
      result = { ok: false, error: "닉네임은 1~20자로 입력하세요." };
      reply(result);
      return;
    }

    const previousRoomId = socket.data.roomId;
    if (previousRoomId !== undefined && previousRoomId !== roomId) {
      await socket.leave(previousRoomId);
      leaveCurrentRoom(socket.id, previousRoomId);
    }

    const room = rooms.get(roomId) ?? { players: new Map<string, PlayerSummary>() };
    if (!room.players.has(socket.id) && room.players.size >= MAX_PLAYERS) {
      reply({ ok: false, error: "이 방은 최대 인원 5명에 도달했습니다." });
      return;
    }

    rooms.set(roomId, room);
    socket.data.roomId = roomId;
    socket.data.nickname = nickname;
    room.players.set(socket.id, { id: socket.id, nickname });
    await socket.join(roomId);

    const roomSnapshot = snapshotRoom(roomId, room);
    reply({ ok: true, room: roomSnapshot });
    io.to(roomId).emit("roomState", roomSnapshot);
  });

  socket.on("boardState", (snapshot) => {
    const roomId = socket.data.roomId;
    if (roomId === undefined || !isValidBoardSnapshot(snapshot)) {
      socket.emit("serverError", "유효하지 않은 보드 상태입니다.");
      return;
    }
    socket.to(roomId).emit("boardState", { ...snapshot, playerId: socket.id });
  });

  socket.on("garbage", (lines) => {
    const roomId = socket.data.roomId;
    if (roomId === undefined || !Number.isInteger(lines) || lines < 1 || lines > 4) {
      socket.emit("serverError", "공격 줄은 1~4줄이어야 합니다.");
      return;
    }
    socket.to(roomId).emit("garbage", lines, socket.id);
  });

  socket.on("chat", (rawText) => {
    const roomId = socket.data.roomId;
    const nickname = socket.data.nickname;
    const text = rawText.trim();
    if (roomId === undefined || nickname === undefined || text.length < 1 || text.length > 200) {
      socket.emit("serverError", "채팅 메시지는 1~200자로 입력하세요.");
      return;
    }
    io.to(roomId).emit("chat", {
      id: randomUUID(),
      playerId: socket.id,
      nickname,
      text,
      sentAt: new Date().toISOString(),
    });
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (roomId !== undefined) {
      leaveCurrentRoom(socket.id, roomId);
    }
  });
});

const parsedPort = Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULT_PORT;

httpServer.listen(port, () => {
  console.log(`r-tetris server listening on http://localhost:${port}`);
});

function shutdown(): void {
  io.close(() => httpServer.close());
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
