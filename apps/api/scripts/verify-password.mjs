const encoder = new TextEncoder();
const pbkdf2Algorithm = "SHA-256";

const base64Url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

async function verify(password, encodedHash) {
  const [algorithm, iterationsRaw, saltRaw, hashRaw] = encodedHash.split("$");
  const iterations = Number.parseInt(iterationsRaw, 10);
  const salt = fromBase64Url(saltRaw);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const expectedBytes = fromBase64Url(hashRaw);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: pbkdf2Algorithm }, key, expectedBytes.length * 8);
  const derived = base64Url(new Uint8Array(bits));
  console.log("match", derived === hashRaw);
}

await verify("admin", process.argv[2]);
