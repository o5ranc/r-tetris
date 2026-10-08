# r-tetris

# 2026-10-08
1. AI 참조용 마크다운(.md) 파일 2개 root에 생성 후 구현 필요 기능 정리
- PROMPT_GUIDE.md (AI 행동 지침 및 기술 스택 설정)
  • AI가 코드를 짤 때 절대 타협해서는 안 되는 기술적 규칙 작성
- REQUIREMENTS.md (게임 기능 요구사항 요구서)
  • 테트리스 기능, 멀티플레이 방식, 애니메이션, 채팅 등 구현해야 할 기능을 정리

2. 프로젝트 구조 잡기
rFamTetris
├── package.json
├── pnpm-workspace.yaml       <-- 모노레포 관리 파일
├── PROMPT_GUIDE.md           <-- AI 가이드라인 1
├── REQUIREMENTS.md           <-- AI 가이드라인 2
│
├── packages/                 <-- 공유 패키지 폴더
│   ├── tetris-core/          <-- [공통] 순수 TS로 작성된 테트리스 게임 엔진 & 데이터 타입
│   └── websocket-server/     <-- [공통] 5인 멀티플레이 및 채팅을 담당할 Node.js 서버
│
└── apps/                     <-- 각 프레임워크별 프론트엔드 앱
    ├── react-tetris/         <-- [React] Vite + React + TypeScript (+ tetris-core 의존성)
    └── vue-tetris/           <-- [Vue] Vite + Vue 3 + TypeScript (+ tetris-core 의존성)


[점차적 확장]
1. **방(Room) 시스템:** 방 만들기, 방 참여하기 (최대 5명 제한).
