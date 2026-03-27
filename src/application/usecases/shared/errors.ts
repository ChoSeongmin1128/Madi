export function normalizeErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function normalizeBootstrapErrorMessage(error: unknown, fallback: string) {
  const message = normalizeErrorMessage(error, fallback);

  if (
    message.includes('저장된 ') ||
    message.includes('앱 저장소를 초기화하지 못했습니다') ||
    message.includes('앱 데이터 디렉터리') ||
    message.includes('창 초기 설정을 적용하지 못했습니다')
  ) {
    return message;
  }

  if (
    message.includes('database error:') ||
    message.includes('serialization error:') ||
    message.includes('io error:')
  ) {
    return '저장소를 읽지 못했습니다. 앱을 다시 실행해 주세요.';
  }

  return message || fallback;
}

export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  onError: (message: string) => void,
  fallback: string,
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    onError(normalizeErrorMessage(error, fallback));
    return undefined;
  }
}
