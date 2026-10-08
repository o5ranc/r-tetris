# 프로젝트 개발 지침 (AI 참조용)

## 1. 기술 스택 (Tech Stack)
- **Language:** TypeScript (Strict 모드 활성화)
- **Frontend:** React.js and Vue 3 and Typescript를 제공하는 모노레포 관리 + HTML5 Canvas (테트리스 렌더링 최적화용)
- **Styling:** Tailwind CSS (or CSS Modules)
- **Multiplayer/Chat:** WebSockets (or Socket.io)
- **State Management:** React Context or Zustand (상태 최적화용)

## 2. 코드 개발 원칙 (Coding Principles)
- **컴포넌트 및 로직 분리:** 테트리스 게임 코어 로직(점수 계산, 블록 이동, 충돌 검사)은 UI(렌더링)와 완벽히 분리된 순수 함수/클래스로 작성할 것.
- **타입 안정성:** 모든 데이터 구조(Block, Board, Player, Message)는 인터페이스(Interface) 또는 타입(Type)을 명확히 정의할 것. `any` 사용 금지.
- **반응형 웹이면서 모바일 화면도 최적화** 아이폰, 안드로이드, 태블릿 기기에서 쉽게 접근 용이한 깨지지 않는 컴포넌트와 보기편한 배치를 원함.
- **최적화:** 
  - 게임 루프는 `requestAnimationFrame`을 사용할 것.
  - 멀티플레이 환경에서 잦은 렌더링으로 인한 버벅임이 없도록 실시간 보드 데이터 전송 시 압축 또는 최적화된 포맷을 사용할 것.
  - 효과음(Audio Context 또는 가벼운 라이브러리) 및 애니메이션 처리 시 메모리 누수가 없도록 Clean-up 함수를 반드시 포함할 것.