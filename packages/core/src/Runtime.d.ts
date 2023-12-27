/**
 * This file contains type decorations that are assumed to be provided by the
 * JavaScript runtime. These need to be explicitly declared since Transporter
 * does not assume a specific JavaScript runtime. This is evident by
 * `"types": [],` in the tsconfig file.
 */

declare module crypto {
  export function randomUUID(): string;
}

declare const console: {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
};

type TimerId = number;
type TimerObject = Record<unknown, unknown>;

declare function clearTimeout(id: TimerId | TimerObject);

declare function setTimeout(
  callback: () => void,
  ms?: number
): TimerId | TimerObject;

declare function queueMicrotask(callback: () => void): void;
