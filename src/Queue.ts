export class Queue<T> {
  private _state: T[] = [];

  drain(callback: (item: T) => void) {
    while (this._state.length) {
      this.pop(callback);
    }
  }

  pop = (callback: (item: T) => void) => {
    callback(this._state.pop() as T);
  };

  push = (item: T) => {
    this._state.unshift(item);
  };
}
