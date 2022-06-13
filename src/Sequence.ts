export class Sequence<T> {
  static of<T>(value: T) {
    return new Sequence(value);
  }

  constructor(private _value: T) {}

  fold(): T {
    return this._value;
  }

  pipe<U>(callback: (value: T) => U) {
    return Sequence.of(callback(this._value));
  }

  tap(callback: (value: T) => void) {
    callback(this._value);
    return this;
  }
}
