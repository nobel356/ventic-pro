export async function runNonBlockingEffect(
  effect: () => Promise<void>,
  options?: {
    onError?: (error: unknown) => void;
  },
) {
  try {
    await effect();

    return {
      ok: true as const,
    };
  } catch (error) {
    options?.onError?.(error);

    return {
      ok: false as const,
      error,
    };
  }
}
