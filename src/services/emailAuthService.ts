/**
 * Mock email authentication service.
 * Replace with real backend or Firebase integration later.
 */

const CODE_LENGTH = 4;
const CODE_EXPIRY_SECONDS = 120;

// In-memory store for demo only
const codeStore: Record<string, { code: string; expiresAt: number }> = {};

export async function sendVerificationCode(email: string): Promise<void> {
  // Generate a random 4-digit code
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = Date.now() + CODE_EXPIRY_SECONDS * 1000;
  codeStore[email] = { code, expiresAt };
  // TODO: Integrate with real email backend (e.g., Firebase, SendGrid, custom API)
  // For now, just log the code for demo
  console.log(`[MOCK] Sent code ${code} to ${email}`);
  return Promise.resolve();
}

export async function verifyCode(email: string, code: string): Promise<boolean> {
  const entry = codeStore[email];
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) return false;
  return entry.code === code;
}

// Optionally, expose a way to clear codes (for testing)
export function clearCode(email: string) {
  delete codeStore[email];
} 