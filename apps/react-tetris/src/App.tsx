import {
  BOARD_HEIGHT,
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
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { io, type Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001";
const COLORS = ["transparent", "#38d9ff", "#4f6cff", "#ff9f43", "#ffd93d", "#4ce0a0", "#b36bff", "#ff5576"];

function freshGame(): GameState {
  return { ...createInitialState(), status: "playing" };
}

function drawBoard(canvas: HTMLCanvasElement, game: GameState): void {
  const context = canvas.getContext("2d");
  if (context === null) return;

  const cellSize = canvas.width / BOARD_WIDTH;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#080b18";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const drawCell = (x: number, y: number, color: string, alpha = 1): void => {
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
    context.globalAlpha = 1;
  };

  game.board.forEach((row, y) => row.forEach((cell, x) => {
    if (cell !== 0) drawCell(x, y, COLORS[cell] ?? "#ffffff");
  }));

  const ghost = getGhostPiece(game.board, game.current);
  getPieceCells(ghost).forEach(({ x, y }) => drawCell(x, y, COLORS[{ I: 1, J: 2, L: 3, O: 4, S: 5, T: 6, Z: 7 }[ghost.kind]]!, 0.2));
  getPieceCells(game.current).forEach(({ x, y }) => drawCell(x, y, COLORS[{ I: 1, J: 2, L: 3, O: 4, S: 5, T: 6, Z: 7 }[game.current.kind]]!));

  context.strokeStyle = "rgba(255,255,255,0.045)";
  for (let x = 0; x <= BOARD_WIDTH; x += 1) {
    context.beginPath(); context.moveTo(x * cellSize, 0); context.lineTo(x * cellSize, canvas.height); context.stroke();
  }
  for (let y = 0; y <= BOARD_HEIGHT; y += 1) {
    context.beginPath(); context.moveTo(0, y * cellSize); context.lineTo(canvas.width, y * cellSize); context.stroke();
  }
}

export function App() {
  const [game, setGame] = useState<GameState>(freshGame);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [notice, setNotice] = useState("서버에 연결하는 중…");
  const [nickname, setNickname] = useState("Player");
  const [roomCode, setRoomCode] = useState("LOBBY");
  const [chatText, setChatText] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socket = useMemo<Socket<ServerToClientEvents, ClientToServerEvents>>(
    () => io(SOCKET_URL, { autoConnect: false }),
    [],
  );

  useEffect(() => {
    const onConnect = () => setNotice("서버 연결됨");
    const onDisconnect = () => setNotice("서버 연결 끊김");
    const onRoom = (value: RoomSnapshot) => setRoom(value);
    const onChat = (message: ChatMessage) => setMessages((current) => [...current.slice(-49), message]);
    const onError = (message: string) => setNotice(message);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("roomState", onRoom);
    socket.on("chat", onChat);
    socket.on("serverError", onError);
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("roomState", onRoom);
      socket.off("chat", onChat);
      socket.off("serverError", onError);
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    let frameId = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      if (now - previous >= 700) {
        setGame((current) => current.status === "playing" ? softDrop(current) : current);
        previous = now;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const actions: Partial<Record<string, (state: GameState) => GameState>> = {
        ArrowLeft: (state) => movePiece(state, -1, 0),
        ArrowRight: (state) => movePiece(state, 1, 0),
        ArrowDown: (state) => softDrop(state),
        ArrowUp: (state) => rotatePiece(state),
        Space: (state) => hardDrop(state),
        KeyC: (state) => holdPiece(state),
      };
      const action = actions[event.code];
      if (action !== undefined) {
        event.preventDefault();
        setGame((current) => current.status === "playing" ? action(current) : current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const frameId = requestAnimationFrame(() => drawBoard(canvas, game));
    return () => cancelAnimationFrame(frameId);
  }, [game]);

  useEffect(() => {
    if (room !== null && socket.connected) {
      socket.emit("boardState", {
        cells: packBoard(game.board), score: game.score, lines: game.lines, status: game.status,
      });
    }
  }, [game, room, socket]);

  const joinRoom = (event: FormEvent) => {
    event.preventDefault();
    socket.emit("joinRoom", { roomId: roomCode, nickname }, (result) => {
      setNotice(result.ok ? `${result.room?.roomId ?? roomCode} 방 참가 완료` : result.error ?? "방 참가 실패");
      if (result.room !== undefined) setRoom(result.room);
    });
  };

  const sendChat = (event: FormEvent) => {
    event.preventDefault();
    if (chatText.trim() === "") return;
    socket.emit("chat", chatText);
    setChatText("");
  };

  return (
    <main className="shell">
      <header className="hero">
        <div><span className="eyebrow">REACT CLIENT</span><h1>r-tetris</h1></div>
        <p className="status">{notice}</p>
      </header>

      <section className="game-layout">
        <aside className="panel stats">
          <div><span>HOLD</span><strong>{game.hold ?? "—"}</strong></div>
          <div><span>SCORE</span><strong>{game.score.toLocaleString()}</strong></div>
          <div><span>LINES</span><strong>{game.lines}</strong></div>
          <button type="button" onClick={() => setGame(freshGame())}>새 게임</button>
        </aside>

        <section className="board-wrap" aria-label="테트리스 게임 보드">
          <canvas ref={canvasRef} width={300} height={600} />
          {game.status === "game-over" && <div className="overlay">GAME OVER</div>}
        </section>

        <aside className="panel next">
          <span>NEXT</span>
          {game.next.slice(0, 3).map((piece, index) => <strong key={`${piece}-${index}`}>{piece}</strong>)}
          <small>← → 이동<br />↑ 회전 · ↓ 내리기<br />Space 즉시 내리기<br />C Hold</small>
        </aside>

        <aside className="panel social">
          <form onSubmit={joinRoom} className="join-form">
            <input aria-label="닉네임" value={nickname} maxLength={20} onChange={(event) => setNickname(event.target.value)} />
            <input aria-label="방 코드" value={roomCode} maxLength={24} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} />
            <button>방 참가</button>
          </form>
          <p className="players">접속자 {room?.players.length ?? 0}/5 · {room?.players.map((player) => player.nickname).join(", ") || "대기 중"}</p>
          <div className="messages" aria-live="polite">
            {messages.map((message) => <p key={message.id}><b>{message.nickname}</b> {message.text}</p>)}
          </div>
          <form onSubmit={sendChat} className="chat-form">
            <input aria-label="채팅 메시지" value={chatText} maxLength={200} placeholder="메시지 입력" onChange={(event) => setChatText(event.target.value)} />
            <button>전송</button>
          </form>
        </aside>
      </section>
    </main>
  );
}
