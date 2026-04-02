const SECRET_PHRASE = "snippai-model-secret-v1";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((item) => {
    binary += String.fromCharCode(item);
  });
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getAesKey(): Promise<CryptoKey> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(SECRET_PHRASE));
  return crypto.subtle.importKey("raw", hashBuffer, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptText(text: string): Promise<string> {
  if (!text) {
    return "";
  }

  const key = await getAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(text)
  );

  return `${toBase64(iv)}:${toBase64(new Uint8Array(encrypted))}`;
}

export async function decryptText(cipherText: string): Promise<string> {
  if (!cipherText) {
    return "";
  }

  const [ivBase64, dataBase64] = cipherText.split(":");
  if (!ivBase64 || !dataBase64) {
    return "";
  }

  try {
    const key = await getAesKey();
    const iv = fromBase64(ivBase64);
    const data = fromBase64(dataBase64);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return decoder.decode(decrypted);
  } catch {
    return "";
  }
}
