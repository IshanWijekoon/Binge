const encoder = new TextEncoder();
const iterations = 100000;

const base64Url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return `pbkdf2_sha256$${iterations}$${base64Url(salt)}$${base64Url(new Uint8Array(bits))}`;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("hash-password.mjs")) {
  const password = process.argv[2] ?? process.env.ADMIN_PASSWORD ?? "admin";
  console.log(await hashPassword(password));
}
