# Core Decisions

## 확정된 전제

- Madi는 `macOS 단독` 데스크톱 노트 앱을 목표로 합니다.
- 제품 방향은 `Heynote식 상위 블록 구분`과 `Notion식 Markdown 편집 경험`의 결합입니다.
- 상위 레벨은 블록 중심 구조를 유지합니다.
- 전체 구조는 `헥사고날 아키텍처`를 사용합니다.
- 순수 단일 `.md` 문서 모델로 모든 것을 설명하려는 접근은 피합니다.
- 별도 preview pane 중심 UX는 피합니다.
- Markdown 블록은 단순 preview 전용이 아니라 직접 편집 가능한 경험을 지향합니다.
- 앱 셸은 `Tauri`를 사용합니다.
- 주 구현 언어는 `TypeScript + Rust`입니다.
- 프런트엔드 UI 프레임워크는 `React + TypeScript`입니다.
- 저장 방식은 `SQLite canonical`입니다.
- 문서 데이터 모델은 `Document -> ordered Blocks` 구조입니다.
- 블록 순서는 문서별 `integer position`으로 저장합니다.
- 프런트엔드는 Tauri `invoke`를 통해 Rust command facade만 호출하고, SQLite 접근은 Rust 계층이 담당합니다.
- 저장은 기본적으로 자동 저장이며, `Cmd+S`는 즉시 저장/flush 동작으로 지원합니다.
- 삭제는 별도 확인 모달 없이 바로 처리합니다.
- 앱 종료 전에는 한 번 더 저장/flush 합니다.
- 별도 복구 UI는 v1에서 두지 않습니다.
- 기존 앱 코드를 포크하지는 않지만, 에디터와 렌더링에는 오픈소스 라이브러리를 사용합니다.

## 블록 종류 및 에디터

- 1차 블록 종류는 `Markdown + Code + Text` 3종입니다.
- Markdown 블록은 `BlockNote 기반` 편집기를 사용합니다.
- Text 블록은 `plain textarea 기반` 편집기를 사용합니다.
- Code 블록은 `plain textarea + highlight.js 기반 구문 강조` 편집기를 사용합니다.
- Markdown 블록의 canonical 저장 형식은 `normalized Markdown string`입니다.
- Code 블록의 canonical 저장 형식은 `plain string + language metadata`입니다.
- Text 블록의 canonical 저장 형식은 `plain string`입니다.

## 편집 UX

- `Cmd+A`는 3단계로 동작합니다: (1) 블록 내 텍스트 전체 선택 → (2) 블록 자체 선택 → (3) 전체 블록 선택.
- 블록 복사/잘라내기/붙여넣기는 블록 단위로 동작하며, 블록 메타데이터(kind, language)를 커스텀 클립보드 포맷으로 보존합니다.
- 빈 블록에 붙여넣으면 해당 블록에 덮어쓰기, 데이터가 있는 블록에 붙여넣으면 아래에 새 블록 삽입합니다.
- 마우스 드래그로 블록 다중 선택이 가능합니다 (marquee 선택).
- Markdown 블록은 clipboard 기반 붙여넣기를 지원합니다.
- Code 블록과 Text 블록의 붙여넣기는 `plain string` 기준으로 처리합니다.

## 프런트엔드 아키텍처

- 공통 상태 관리 로직은 `services/documentStateService.ts`에 집중합니다.
- 클립보드 로직은 `services/clipboardService.ts`로 분리합니다.
- 컨트롤러는 비즈니스 오퍼레이션을 orchestrate하고, 서비스는 공통 패턴(에러 처리, 상태 업데이트)을 제공합니다.
- 에러 처리는 `executeWithErrorHandling` 패턴으로 통일합니다.
- 문서 상태 업데이트는 `updateDocumentState`, `setDocumentWithFocus` 등 서비스 함수를 통해 수행합니다.

## 디자인

- macOS Liquid Glass 스타일을 채택합니다 (`backdrop-filter: blur`, 반투명 배경, 부드러운 둥근 모서리).
- 블록 추가/제거 시 `framer-motion` 기반 레이아웃 애니메이션을 적용합니다.
- 블록 선택은 전체 테두리(border + box-shadow glow)로 표시합니다.
- 업데이트는 설정창 보조 UI와 별도로 헤더 우측의 작은 pill/button으로 노출합니다.
- 앱 초기 로딩이 끝나면 업데이트를 한 번 확인하고, 이후 6시간 간격으로 다시 확인합니다.
- 새 버전이 발견되면 백그라운드 다운로드를 먼저 진행하고, 다운로드 완료 후 재시작/적용 버튼을 노출합니다.
- 설정창의 업데이트 영역은 `최신 버전`, `확인 중`, `다운로드 중`, `준비됨`, `오류`를 짧은 상태 칩으로 보여줍니다.
- iCloud 상태는 `꺼짐`, `동기화 중`, `최근 동기화 ...`, `동기화 기록 없음`, `오류`로 드러냅니다.

## 미정인 항목

- 문서 전체를 하나의 거대한 editor로 합치는 방향을 배제할지 여부는 아직 결정하지 않았습니다.
- 세부 모듈 경계, 포트/어댑터 배치, DB 스키마 상세 컬럼 구조는 아직 확정하지 않았습니다.

## 현재 선호하지만 확정하지 않은 방향

- 기존 scratchpad 앱을 조금씩 덧대는 식으로 본질을 바꾸는 접근
- 블록 구분감이 약해져 Heynote식 장점이 사라지는 방향

## Gotchas

- "Markdown 지원"을 곧바로 "정적 preview 추가"로 해석하지 않습니다.
- "Notion식"을 곧바로 "문서 전체 WYSIWYG"로 해석하지 않습니다.
- 저장 포맷, 블록 모델, 에디터 선택처럼 되돌리기 비싼 결정을 임의로 확정하지 않습니다.
