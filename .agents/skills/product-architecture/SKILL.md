---
name: product-architecture
description: Use this skill when making product structure, block model, storage format, or architectural decisions for Madi, especially when balancing Heynote-like block separation with Notion-like Markdown editing.
---

# Product Architecture

이 skill은 Madi의 제품 구조와 핵심 의사결정 맥락을 다룹니다.

다음 상황에서 먼저 사용합니다.
- 블록 구조를 설계할 때
- 저장 포맷이나 데이터 모델을 논의할 때
- 기존 외부 앱을 수정할지 새로 만들지 판단할 때
- 편집기 아키텍처를 정할 때

다음 상황에서는 이 skill을 우선 사용하지 않습니다.
- 커밋/브랜치/PR 형식만 정리할 때
- 단순 README 갱신 여부만 판단할 때
- UI 카피나 시각 스타일 정도만 다룰 때

핵심 결정과 버린 접근은 `references/core-decisions.md`를 기준으로 따릅니다.
트리거 예시는 `references/trigger-cases.md`를 기준으로 따릅니다.

주의:
- 구조적 결정을 새로 추가하거나 뒤집어야 할 것 같으면 먼저 사용자에게 질문합니다.
- 일반적인 에디터 이론보다 이 저장소에서 이미 합의한 제품 방향을 우선합니다.
