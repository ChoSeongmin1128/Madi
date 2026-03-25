---
name: git-workflow
description: Use this skill when writing commit messages, naming branches, preparing pull requests, or summarizing repository changes in the expected Git workflow format.
---

# Git Workflow

이 skill은 저장소 변경을 Git 단위로 정리할 때 사용합니다.

다음 상황에서 먼저 사용합니다.
- 커밋 메시지를 작성할 때
- 브랜치 이름을 정할 때
- PR 제목이나 본문 형식을 맞출 때
- 변경 사항을 사용자나 리뷰어에게 짧게 정리할 때
- 커밋, 태그, 릴리스 순서를 정리할 때

다음 상황에서는 이 skill을 우선 사용하지 않습니다.
- 제품 구조나 아키텍처 결정을 내릴 때
- 로컬 환경이나 툴체인 전제를 확인할 때
- README 갱신 여부를 판단할 때

핵심 규칙과 예시는 `references/commit-and-pr-rules.md`를 기준으로 따릅니다.
트리거 예시는 `references/trigger-cases.md`를 기준으로 따릅니다.

주의:
- 이 저장소의 Git 규칙 자체를 바꿔야 할 것 같으면 먼저 사용자에게 질문합니다.
- 강제 도구(`commitlint`, hook)는 아직 도입하지 않았으므로, 현재 1차 기준 source of truth는 이 skill입니다.
