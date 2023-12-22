// An implementation of an auto-correcting timer. It is possible for frames to
// be dropped if the thread is suspended or blocked for longer than the duration
// of a frame. The thread will be suspended for example when the app is in the
// background.
//
// Original author: Jake Archibald
// Source code: https://gist.github.com/jakearchibald/cb03f15670817001b1157e62a076fe95
// Fun video about JavaScript timers: https://youtu.be/MCi6AZMkxcU

export class IntervalError extends Error {
  readonly name = "IntervalError";
}

/**
 * A wrapper around `setTimeout` that returns a controller that can cancel the
 * scheduled callback.
 */
export function schedule(
  time: number,
  callback: () => void
): { cancel(): void } {
  const id = setTimeout(callback, time);
  return { cancel: () => clearTimeout(id) };
}

export type Input = {
  callback(time: number): void;
  interval: number;
};

export type Output = {
  stop(): void;
};

/**
 * Creates an auto-correcting timer and returns a controller that can stop the
 * timer. The callback will be called at every interval with the current time in
 * milliseconds.
 *
 * @throws {IntervalError} If the interval is less than or equal to `0`.
 */
export function timer({ callback, interval }: Input): Output {
  if (interval <= 0) {
    throw new IntervalError(`[timer] invalid interval: ${interval}`);
  }

  const controller = {
    abort() {
      this.aborted = true;
    },
    aborted: false
  };

  const start = Date.now();

  const frame = (time: number) => {
    if (controller.aborted) return;
    callback(time);
    scheduleFrame(time);
  };

  const scheduleFrame = (time: number) => {
    const elapsed = time - start;
    const roundedElapsed = Math.round(elapsed / interval) * interval;
    const targetNext = start + roundedElapsed + interval;
    const delay = targetNext - Date.now();

    setTimeout(() => frame(Date.now()), delay);
  };

  scheduleFrame(start);

  return { stop: () => controller.abort() };
}
