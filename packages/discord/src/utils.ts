const te = new TextEncoder();
const td = new TextDecoder();

// 32-byte hex → Uint8Array
const hexToBytes = (hex: string) =>
  new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));

async function importKey(hex: string) {
  return crypto.subtle.importKey(
    "raw",
    hexToBytes(hex),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encrypt(plain: string, keyHex: string): Promise<string> {
  const key = await importKey(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    te.encode(plain)
  );
  // Web Crypto はタグを暗号文末尾に付けて返すのでそのまま連結
  const out = new Uint8Array(iv.length + cipher.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...out));
}

export async function decrypt(token: string, keyHex: string): Promise<string> {
  const data = Uint8Array.from(atob(token), (c) => c.charCodeAt(0));
  const iv = data.slice(0, 12);
  const cipher = data.slice(12); // タグ込み
  const key = await importKey(keyHex);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipher
  );
  return td.decode(plain);
}

export function createRandomHex(length: number): string {
  const array = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
