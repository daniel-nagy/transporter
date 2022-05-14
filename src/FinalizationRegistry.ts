declare namespace globalThis {
  interface FinalizationRegistry<T> {
    register<R, U>(weakRef: R, strongRef: T, unregisterToken?: U): void;
  }

  interface FinalizationRegistryConstructor<T = any> {
    new (callBack: (heldValue: T) => void): FinalizationRegistry<T>;
  }

  const FinalizationRegistry: FinalizationRegistryConstructor | undefined;
}

export function createRegistry<T>(
  callback: (heldValue: T) => void
): globalThis.FinalizationRegistry<T> | null {
  return globalThis.FinalizationRegistry
    ? new globalThis.FinalizationRegistry(callback)
    : null;
}
