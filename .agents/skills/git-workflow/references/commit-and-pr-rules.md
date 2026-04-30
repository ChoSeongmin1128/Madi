# Git Workflow Rules

## 목적

이 저장소는 개인 레포이지만, 변경 이력을 읽기 쉽게 유지합니다. 커밋과 PR 설명은 짧고 일관되게 작성합니다.

## 커밋 메시지

- 기본 형식: `<type>: <summary>`
- 권장 `type`:
  - `feat`
  - `fix`
  - `docs`
  - `refactor`
  - `test`
  - `chore`
- `summary`는 한국어로 짧게 씁니다.
- 제목 끝에 마침표는 붙이지 않습니다.
- 한 커밋에는 한 가지 의도만 담는 것을 우선합니다.
- 커밋 전에는 최소한 `pnpm exec tsc -b --pretty false`, `pnpm test:run`, `cargo check --no-default-features` 결과를 확인합니다.

예시:

```text
feat: 블록 편집기 초기 문서 구조 추가
docs: README에 현재 제품 방향 정리
chore: repo-local skill 골격 추가
```

## 브랜치 이름

- 권장 형식: `<type>/<short-kebab-topic>`
- 별도 지시가 없으면 실제 작업과 릴리스 준비는 `main` 기준으로 진행합니다.
- 예시:
  - `feat/block-shell`
  - `docs/repo-bootstrap`
  - `refactor/editor-state`

## PR 제목과 본문

- PR 제목은 커밋 제목과 같은 형식을 권장합니다.
- PR 본문은 불필요한 서론 없이 변경 사항을 flat bullet로 적습니다.
- 가능하면 아래 내용을 포함합니다.
  - 무엇이 바뀌었는지
  - 왜 바꿨는지
  - 테스트했는지 또는 아직 못 했는지

예시:

```text
docs: 초기 Codex 문서 구조 추가

- 루트 AGENTS.md 추가
- README 초안 추가
- repo-local skills 5개 추가
- 아직 rules, subagents, hook은 도입하지 않음
```

## 변경 요약

- 사용자에게 최종 보고할 때는 파일 목록 나열보다 의도 중심으로 정리합니다.
- 테스트를 하지 못했으면 명확히 적습니다.
- 문서/skill 구조를 손댈 때는 사용자가 알아야 할 운영 변화가 있는지 같이 언급합니다.

## 태그와 릴리스

- 릴리스 태그는 검증이 끝난 커밋에서만 생성합니다.
- 태그 형식은 `vX.Y.Z`를 사용합니다.
- 태그 생성 전에는 워크트리가 clean인지 확인합니다.
- 버전 변경 시 아래 4개 파일을 같은 버전으로 맞춥니다.
  - `package.json`
  - `src-tauri/tauri.conf.json`
  - `src-tauri/Cargo.toml`
  - `src-tauri/Cargo.lock`의 `name = "madi"` 항목
- GitHub hosted runner는 공증된 `.app`과 updater 산출물(`.app.tar.gz`, `.sig`, `latest.json`)만 릴리스에 올립니다.
- self-hosted macOS runner는 DMG 생성, DMG 서명/공증/검증, release publish를 담당합니다.
- DMG가 release에 첨부되기 전까지는 배포 완료로 간주하지 않습니다.
- 자동 워크플로우가 불안정하면, 로컬에서 검증한 `.dmg`, `.app.tar.gz`, `.sig`, `latest.json`을 `gh release`로 직접 업로드하는 수동 릴리스 경로를 사용할 수 있습니다.
