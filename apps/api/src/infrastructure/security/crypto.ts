const encoder = new TextEncoder();
const pbkdf2Iterations = 100000;
const pbkdf2Algorithm = "SHA-256";

export const randomToken = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
};

export const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const hmacSha256Hex = async (secret: string, value: string): Promise<string> => {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: pbkdf2Iterations,
      hash: pbkdf2Algorithm,
    },
    key,
    256,
  );
  return `pbkdf2_sha256$${pbkdf2Iterations}$${base64Url(salt)}$${base64Url(new Uint8Array(bits))}`;
};

export const verifyPasswordHash = async (password: string, encodedHash: string): Promise<boolean> => {
  const [algorithm, iterationsRaw, saltRaw, hashRaw] = encodedHash.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationsRaw || !saltRaw || !hashRaw) {
    return false;
  }

  const iterations = Number.parseInt(iterationsRaw, 10);
  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  const salt = fromBase64Url(saltRaw);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const expectedBytes = fromBase64Url(hashRaw);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: pbkdf2Algorithm,
    },
    key,
    expectedBytes.length * 8,
  );
  return timingSafeEqual(base64Url(new Uint8Array(bits)), hashRaw);
};

export const timingSafeEqual = (left: string, right: string): boolean => {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= leftBytes[index]! ^ rightBytes[index]!;
  }
  return diff === 0;
};

const base64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
};

const fromBase64Url = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};
