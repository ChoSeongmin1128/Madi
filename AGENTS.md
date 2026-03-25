# Repository Instructions

## Purpose
- MinNote는 macOS 단독 데스크톱 앱입니다.
- 현재 제품 방향은 Heynote식 상위 블록 구분과 Notion식 Markdown 편집 경험을 함께 탐색하는 것입니다.

## Constraints
- 작업 중 `AGENTS.md`, `README.md`, skill 문서, subagent 정의에서 개선하거나 보완할 내용이 보이면 먼저 사용자에게 질문합니다.
- 사용자 승인 없이 문서 구조, skill 구조, subagent 구조를 임의로 바꾸지 않습니다.
- 질문은 되돌리기 비싸거나 구조에 영향을 주는 결정 위주로 하고, 과도하게 세분화된 정책은 기본값을 제안한 뒤 필요할 때만 확인합니다.

## Environment
- 이 저장소는 `pnpm`을 사용합니다. 패키지 매니저와 명령 예시는 `pnpm` 기준으로 다룹니다.
- 이 저장소는 `macOS 단독` 개발 전제를 가집니다.

## Versioning
- 버전 작업을 할 때는 아래 파일을 항상 함께 확인하고 같은 버전으로 맞춥니다.
- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`의 `name = "minnote"` 패키지 항목
- 버전 변경 작업을 사용자에게 보고하거나 문서화할 때는 위 체크리스트를 빠뜨리지 않고 명시합니다.

## Release Rules
- 커밋 전에는 최소한 `pnpm exec tsc -b --pretty false`, `pnpm test:run`, `cargo check --no-default-features` 결과를 확인합니다.
- 태그는 검증이 끝난 커밋에서만 생성하며 형식은 `vX.Y.Z`를 사용합니다.
- 태그 푸시 전에는 워크트리가 clean인지 확인합니다.
- 릴리스 워크플로우는 `hosted runner`와 `self-hosted macOS runner` 2단계로 유지합니다.
- hosted runner는 공증된 `.app`과 updater 산출물(`.app.tar.gz`, `.sig`, `latest.json`)만 책임집니다.
- self-hosted runner는 DMG 생성, DMG 서명/공증/검증, release publish를 책임집니다.
- DMG가 GitHub Release에 첨부되기 전까지는 배포 완료로 간주하지 않습니다.
- DMG 생성 기준 스크립트와 좌표는 `scripts/create-dmg.sh`와 `src-tauri/tauri.conf.json`을 source of truth로 봅니다.

## Routing
- 커밋 메시지, 브랜치 이름, PR 제목/본문, 변경 요약 형식이 필요할 때는 `git-workflow` skill을 먼저 참고합니다.
- 로컬 개발 환경, 실행/빌드 전제, 패키지 매니저 정책이 필요할 때는 `desktop-env` skill을 먼저 참고합니다.
- 제품 구조, 블록 모델, 저장 포맷, 이전 의사결정 맥락이 필요할 때는 `product-architecture` skill을 먼저 참고합니다.
- 편집 UX, 블록 구분, Markdown 상호작용 원칙이 필요할 때는 `ui-product` skill을 먼저 참고합니다.
- `README.md`를 갱신하거나 README 반영 여부를 판단할 때는 `readme-maintenance` skill을 먼저 참고합니다.
