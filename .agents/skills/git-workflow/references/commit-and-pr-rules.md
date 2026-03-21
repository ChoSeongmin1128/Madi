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

예시:

```text
feat: 블록 편집기 초기 문서 구조 추가
docs: README에 현재 제품 방향 정리
chore: repo-local skill 골격 추가
```

## 브랜치 이름

- 권장 형식: `<type>/<short-kebab-topic>`
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
