<script setup lang="ts">
import {
  BOARD_WIDTH,
  createInitialState,
  getGhostPiece,
  getPieceCells,
  hardDrop,
  holdPiece,
  movePiece,
  packBoard,
  rotatePiece,
  softDrop,
  type ChatMessage,
  type ClientToServerEvents,
  type GameState,
  type RoomSnapshot,
  type ServerToClientEvents,
} from "@r-tetris/core";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001";
const COLORS = ["transparent", "#38d9ff", "#4f6cff", "#ff9f43", "#ffd93d", "#4ce0a0", "#b36bff", "#ff5576"];
const PIECE_COLOR = { I: 1, J: 2, L: 3, O: 4, S: 5, T: 6, Z: 7 } as const;

function freshGame(): GameState {
  return { ...createInitialState(), status: "playing" };
}

const game = ref<GameState>(freshGame());
const room = ref<RoomSnapshot | null>(null);
const messages = ref<readonly ChatMessage[]>([]);
const notice = ref("서버에 연결하는 중…");
const nickname = ref("Player");
const roomCode = ref("LOBBY");
const chatText = ref("");
const canvas = ref<HTMLCanvasElement | null>(null);
const socket = io<ServerToClientEvents, ClientToServerEvents>(SOCKET_URL, { autoConnect: false });
let frameId = 0;
let previousTick = 0;

function drawBoard(): void {
  const element = canvas.value;
  const context = element?.getContext("2d");
  if (element === null || element === undefined || context === null || context === undefined) return;
  const cellSize = element.width / BOARD_WIDTH;
  context.clearRect(0, 0, element.width, element.height);
  context.fillStyle = "#080b18";
  context.fillRect(0, 0, element.width, element.height);

  const drawCell = (x: number, y: number, color: string, alpha = 1): void => {
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
    context.globalAlpha = 1;
  };

  game.value.board.forEach((row, y) => row.forEach((cell, x) => {
    if (cell !== 0) drawCell(x, y, COLORS[cell] ?? "#ffffff");
  }));
  const ghost = getGhostPiece(game.value.board, game.value.current);
  getPieceCells(ghost).forEach(({ x, y }) => drawCell(x, y, COLORS[PIECE_COLOR[ghost.kind]]!, 0.2));
  getPieceCells(game.value.current).forEach(({ x, y }) => drawCell(x, y, COLORS[PIECE_COLOR[game.value.current.kind]]!));
}

function tick(now: number): void {
  if (now - previousTick >= 700) {
    if (game.value.status === "playing") game.value = softDrop(game.value);
    previousTick = now;
  }
  frameId = requestAnimationFrame(tick);
}

function onKeyDown(event: KeyboardEvent): void {
  const actions: Partial<Record<string, (state: GameState) => GameState>> = {
    ArrowLeft: (state) => movePiece(state, -1, 0),
    ArrowRight: (state) => movePiece(state, 1, 0),
    ArrowDown: (state) => softDrop(state),
    ArrowUp: (state) => rotatePiece(state),
    Space: (state) => hardDrop(state),
    KeyC: (state) => holdPiece(state),
  };
  const action = actions[event.code];
  if (action !== undefined && game.value.status === "playing") {
    event.preventDefault();
    game.value = action(game.value);
  }
}

function joinRoom(): void {
  socket.emit("joinRoom", { roomId: roomCode.value, nickname: nickname.value }, (result) => {
    notice.value = result.ok ? `${result.room?.roomId ?? roomCode.value} 방 참가 완료` : result.error ?? "방 참가 실패";
    if (result.room !== undefined) room.value = result.room;
  });
}

function sendChat(): void {
  if (chatText.value.trim() === "") return;
  socket.emit("chat", chatText.value);
  chatText.value = "";
}

function resetGame(): void {
  game.value = freshGame();
}

const onConnect = () => { notice.value = "서버 연결됨"; };
const onDisconnect = () => { notice.value = "서버 연결 끊김"; };
const onRoom = (value: RoomSnapshot) => { room.value = value; };
const onChat = (message: ChatMessage) => { messages.value = [...messages.value.slice(-49), message]; };
const onServerError = (message: string) => { notice.value = message; };

watch(game, async () => {
  await nextTick();
  drawBoard();
  if (room.value !== null && socket.connected) {
    socket.emit("boardState", {
      cells: packBoard(game.value.board), score: game.value.score, lines: game.value.lines, status: game.value.status,
    });
  }
});

onMounted(() => {
  socket.on("connect", onConnect);
  socket.on("disconnect", onDisconnect);
  socket.on("roomState", onRoom);
  socket.on("chat", onChat);
  socket.on("serverError", onServerError);
  socket.connect();
  window.addEventListener("keydown", onKeyDown);
  previousTick = performance.now();
  frameId = requestAnimationFrame(tick);
  drawBoard();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId);
  window.removeEventListener("keydown", onKeyDown);
  socket.off("connect", onConnect);
  socket.off("disconnect", onDisconnect);
  socket.off("roomState", onRoom);
  socket.off("chat", onChat);
  socket.off("serverError", onServerError);
  socket.disconnect();
});
</script>

<template>
  <main class="shell">
    <header class="hero">
      <div><span class="eyebrow">VUE CLIENT</span><h1>r-tetris</h1></div>
      <p class="status">{{ notice }}</p>
    </header>

    <section class="game-layout">
      <aside class="panel stats">
        <div><span>HOLD</span><strong>{{ game.hold ?? "—" }}</strong></div>
        <div><span>SCORE</span><strong>{{ game.score.toLocaleString() }}</strong></div>
        <div><span>LINES</span><strong>{{ game.lines }}</strong></div>
        <button type="button" @click="resetGame">새 게임</button>
      </aside>

      <section class="board-wrap" aria-label="테트리스 게임 보드">
        <canvas ref="canvas" width="300" height="600" />
        <div v-if="game.status === 'game-over'" class="overlay">GAME OVER</div>
      </section>

      <aside class="panel next">
        <span>NEXT</span>
        <strong v-for="(piece, index) in game.next.slice(0, 3)" :key="`${piece}-${index}`">{{ piece }}</strong>
        <small>← → 이동<br>↑ 회전 · ↓ 내리기<br>Space 즉시 내리기<br>C Hold</small>
      </aside>

      <aside class="panel social">
        <form class="join-form" @submit.prevent="joinRoom">
          <input v-model="nickname" aria-label="닉네임" maxlength="20">
          <input v-model="roomCode" aria-label="방 코드" maxlength="24" @input="roomCode = roomCode.toUpperCase()">
          <button>방 참가</button>
        </form>
        <p class="players">접속자 {{ room?.players.length ?? 0 }}/5 · {{ room?.players.map((player) => player.nickname).join(", ") || "대기 중" }}</p>
        <div class="messages" aria-live="polite">
          <p v-for="message in messages" :key="message.id"><b>{{ message.nickname }}</b> {{ message.text }}</p>
        </div>
        <form class="chat-form" @submit.prevent="sendChat">
          <input v-model="chatText" aria-label="채팅 메시지" maxlength="200" placeholder="메시지 입력">
          <button>전송</button>
        </form>
      </aside>
    </section>
  </main>
</template>

