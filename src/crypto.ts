export async function encrypt(env: Env, str: string): Promise<string> {
  const publicKey = await crypto.subtle.importKey("jwk", JSON.parse(env.IMPORT_PUBLIC_KEY), {
    name: "RSA-OAEP",
    hash: "SHA-256"
  }, true, ["encrypt"]);
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.encrypt({
    name: "RSA-OAEP"
  }, publicKey, encoder.encode(str));
  return btoa(Array.from(new Uint8Array(buffer)).map(b => String.fromCharCode(b)).join(''))
}

export async function decrypt(env: Env, str: string): Promise<string> {
  const privateKey = await crypto.subtle.importKey("jwk", JSON.parse(env.IMPORT_PRIVATE_KEY), {
    name: "RSA-OAEP",
    hash: "SHA-256"
  }, true, ["decrypt"]);
  const decoder = new TextDecoder();
  const buffer = await crypto.subtle.decrypt({
    name: "RSA-OAEP"
  }, privateKey, Uint8Array.from(atob(str), c => c.charCodeAt(0)));
  return decoder.decode(buffer);
}