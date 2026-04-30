---
name: desktop-env
description: Use this skill when you need repository-specific environment facts such as pnpm usage, macOS-only assumptions, local setup expectations, or toolchain constraints for Madi.
---

# Desktop Env

이 skill은 Madi 작업에 필요한 환경 사실과 로컬 전제를 다룹니다.

다음 상황에서 먼저 사용합니다.
- 설치나 실행 명령을 제안할 때
- 패키지 매니저를 선택해야 할 때
- macOS 전용 제약을 고려해야 할 때
- 새로운 툴체인이나 런타임을 도입할지 판단할 때

다음 상황에서는 이 skill을 우선 사용하지 않습니다.
- 커밋 메시지나 PR 형식을 정리할 때
- 제품 UX 원칙을 정의할 때
- 저장 포맷이나 블록 모델을 결정할 때

세부 환경 사실과 주의점은 `references/environment-facts.md`를 기준으로 따릅니다.
트리거 예시는 `references/trigger-cases.md`를 기준으로 따릅니다.

주의:
- 저장소에 아직 실제 앱 스캐폴드가 없으면, 툴체인을 기정사실처럼 문서화하지 않습니다.
- 새 코어 스택을 도입하거나 환경 규칙을 바꿔야 할 것 같으면 먼저 사용자에게 질문합니다.
