---
name: readme-maintenance
description: Use this skill when deciding whether README.md should change, when updating README content after meaningful repository changes, or when keeping human-facing documentation aligned with the current product direction.
---

# README Maintenance

이 skill은 사람용 루트 문서인 `README.md`의 갱신 기준과 작성 원칙을 다룹니다.

다음 상황에서 먼저 사용합니다.
- 현재 작업이 README를 건드려야 하는지 판단할 때
- 루트 README를 실제로 수정할 때
- 제품 방향이나 사용법 변경이 사람용 문서에 반영돼야 하는지 점검할 때

다음 상황에서는 이 skill을 우선 사용하지 않습니다.
- Git 메시지 형식만 정리할 때
- 제품 아키텍처 자체를 결정할 때
- 환경 스택을 새로 선택할 때

세부 기준은 `references/readme-policy.md`를 기준으로 따릅니다.
트리거 예시는 `references/trigger-cases.md`를 기준으로 따릅니다.

주의:
- README는 모든 변경에서 갱신하지 않습니다.
- README, skill, AGENTS, subagent 정의를 개선하고 싶으면 먼저 사용자에게 질문합니다.
