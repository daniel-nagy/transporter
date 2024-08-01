function hex(bits: number) {
  if (bits > 53) throw new Error("bits must be less than or equal to 53");

  return Math.floor(Math.random() * (2 ** bits - 1))
    .toString(16)
    .padStart(Math.ceil(bits / 4), "0");
}

/**
 * Generates a v4 UUID. This implementation generates exactly 122 bits of random
 * data and concatenates the version and variant.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc9562#name-uuid-version-4
 */
function v4Fallback(): string {
  const a = hex(48);
  const b = hex(12);
  const c = `${hex(31)}${hex(31)}`;

  return `${a.slice(0, 8)}-${a.slice(8)}-4${b}-a${c.slice(0, 3)}-${c.slice(
    3,
    15
  )}`;
}

export const v4 =
  typeof crypto !== "undefined" && typeof crypto.randomUUID !== "undefined"
    ? crypto.randomUUID.bind(crypto)
    : v4Fallback;
