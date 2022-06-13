import { SessionPort } from ".";
import { Subject } from "./Observable";

export function createMessageChannel(): [SessionPort, SessionPort] {
  const s1 = new Subject<string>();
  const s2 = new Subject<string>();

  return [link(s1, s2), link(s2, s1)];
}

function link(s1: Subject<string>, s2: Subject<string>): SessionPort {
  return {
    receive: s1.asObservable(),
    send: (message) => s2.next(message),
  };
}
