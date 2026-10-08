# r-tetris 기본 베이스 구축 기록

이 문서는 `REQUIREMENTS.md`와 `PROMPT_GUIDE.md`를 기준으로 기본 개발 환경을 만들 때의 작업순서, 사용 명령, 구성 결정을 한곳에 정리한 기록이다.

## 1. 확인한 로컬 환경

| 항목 | 값 |
| --- | --- |
| 운영 환경 | Windows / PowerShell |
| Node.js | 24.19.0 |
| pnpm | 11.25.0 |
| 작업 브랜치 | `dev` |
| 패키지 구조 | pnpm workspace 모노레포 |

`npm`은 현재 PATH에서 사용할 수 없지만 pnpm이 설치되어 있으므로 모든 설치·실행 명령은 pnpm으로 통일한다.

## 2. 요구사항을 구조로 옮긴 기준

```text
r-tetris/
├─ apps/
│  ├─ react-tetris/       # React + Canvas 클라이언트
│  └─ vue-tetris/         # Vue 3 + Canvas 클라이언트
├─ packages/
│  ├─ tetris-core/        # UI에 의존하지 않는 순수 TypeScript 게임 규칙과 공통 타입
│  └─ websocket-server/   # 최대 5명 방, 보드 동기화, 공격 줄, 채팅 서버
├─ package.json
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

- 게임 계산과 화면 렌더링을 분리한다.
- 모든 패키지에 TypeScript strict 규칙을 적용하고 `any`를 사용하지 않는다.
- 클라이언트 렌더링은 `requestAnimationFrame`과 Canvas를 사용한다.
- 네트워크에서는 전체 UI 상태가 아니라 압축 가능한 보드 셀과 필수 이벤트만 전달한다.
- 브라우저 이벤트, 애니메이션 프레임, 소켓 연결은 종료 시 반드시 정리한다.

## 3. 작업순서

### 단계 1 — 저장소와 도구 확인

```powershell
node --version
pnpm --version
git status --short --branch
```

목적: 실제 작업 경로, 현재 브랜치, 런타임과 패키지 관리자를 먼저 고정한다.

### 단계 2 — 모노레포 뼈대 구성

루트 `package.json`, `pnpm-workspace.yaml`, 공통 `tsconfig.base.json`, `.gitignore`를 만든다.

### 단계 3 — 공용 게임 코어 구성

보드·블록·플레이어·채팅 타입과 이동, 회전, 충돌, 드롭, 줄 제거를 순수 함수로 구현하고 단위 테스트를 둔다.

### 단계 4 — WebSocket 서버 구성

Socket.IO 서버에 방 생성/참가, 최대 5명 제한, 채팅, 보드 상태, 공격 줄 이벤트를 구성한다.

### 단계 5 — React와 Vue 클라이언트 구성

두 앱 모두 공용 코어를 사용하고, Canvas 보드와 반응형 게임/채팅 레이아웃을 제공한다.

### 단계 6 — 설치 및 검증

```powershell
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

모든 명령이 통과해야 기본 베이스 구성이 끝난 것으로 본다.

## 4. 개발 실행 명령

전체 앱과 서버를 함께 실행한다.

```powershell
pnpm dev
```

각 항목을 따로 실행할 수도 있다.

```powershell
pnpm --filter @r-tetris/server dev
pnpm --filter @r-tetris/react-app dev
pnpm --filter @r-tetris/vue-app dev
```

기본 접속 주소는 다음과 같다.

- React: `http://localhost:5173`
- Vue: `http://localhost:5174`
- WebSocket/상태 확인: `http://localhost:3001/health`

## 5. 환경 변수

서버는 값을 지정하지 않아도 로컬 기본값으로 실행된다.

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `PORT` | `3001` | WebSocket/HTTP 서버 포트 |
| `CLIENT_ORIGINS` | `http://localhost:5173,http://localhost:5174` | 쉼표로 구분한 허용 출처 |
| `VITE_SOCKET_URL` | `http://localhost:3001` | 각 프런트엔드가 접속할 서버 |

프런트엔드 값을 바꿀 때는 해당 앱 폴더에 `.env.local`을 만들고 다음처럼 지정한다.

```dotenv
VITE_SOCKET_URL=http://localhost:3001
```

## 6. 현재 베이스와 다음 구현 경계

이번 기본 베이스는 빌드 가능한 구조, 공용 게임 규칙, 네트워크 이벤트, Canvas 렌더링 진입점까지 제공한다. 실제 대전 완성 단계에서는 다음을 순서대로 확장한다.

1. 키 입력과 게임 루프를 코어 상태 전이 함수에 연결
2. Hold/Next 3개와 점수·레벨 규칙 완성
3. 줄 제거/Hard Drop 애니메이션과 AudioContext 사운드 추가
4. 로비 UI와 방 생성·참가 흐름 연결
5. 공격 줄 상쇄 및 승패 판정의 서버 권한 처리
6. 모바일 터치 조작과 다중 기기 실전 테스트

## 7. 문제 해결 메모

- PowerShell 실행 정책 때문에 `pnpm.ps1` 실행이 막히면 `pnpm.cmd`를 사용한다.
- 포트가 사용 중이면 `PORT`와 각 앱의 Vite 포트를 서로 겹치지 않게 변경한다.
- 의존성 오류가 나면 저장소 루트에서 `pnpm install`을 다시 실행한다.
