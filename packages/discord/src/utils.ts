export function createRandomHex(length: number): string {
  const array = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
