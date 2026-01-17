/**
 * Email Service for Deletion Verification
 */

export async function sendDeleteVerificationEmail(email, code) {
  // TODO: Implement with SendGrid or similar service
  // For now, this is a placeholder
}

export function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}
