export function normalizeErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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
