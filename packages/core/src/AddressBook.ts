type Address = string;
type Scope = string;

declare global {
  namespace Transporter {
    /**
     * The address book is used to keep a record of all server addresses. Every
     * server must have a globally unique address. A server address is a lot
     * like a port number. It is used to route request to the correct server.
     *
     * The address book is a global singleton. The same address book is used
     * by all versions of transporter in the current execution context.
     *
     * You can inspect the address book from the `Transporter` namespace in the
     * global scope.
     */
    export const addressBook: Map<Scope, Map<Address, void>>;
  }
}

if (typeof globalThis.Transporter === "undefined")
  globalThis.Transporter = {
    addressBook: new Map()
  };

export class UniqueAddressError extends Error {
  readonly name = "UniqueAddressError";
}

const { addressBook } = Transporter;

/**
 * Adds an address to the address book.
 *
 * @throws {UniqueAddressError} If the address already exists.
 */
export function add(scope: Scope, address: Address) {
  const map = addressBook.get(scope) ?? new Map();

  if (map.has(address))
    throw new UniqueAddressError(
      `The address "${address}" has already been claimed.`
    );

  addressBook.set(scope, map.set(address, undefined));
}

/**
 * Removes an address from the address book.
 */
export function release(scope: Scope, address: Address) {
  const map = addressBook.get(scope) ?? new Map();
  map.delete(address);
  addressBook.set(scope, map);
}
