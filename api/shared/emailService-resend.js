import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@psychicchat.com';

/**
 * Send email verification email
 */
export async function sendEmailVerification(userEmail, verificationCode) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('Resend API key missing');
      throw new Error('Email service not configured');
    }

    const result = await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: 'Verify Your Email - Psychic Chat',
      html: `
        <h2>Verify Your Email</h2>
        <p>Welcome to Psychic Chat! Please verify your email address to complete registration.</p>
        <p>Your verification code is:</p>
        <h1 style="font-family: monospace; letter-spacing: 5px; font-size: 32px; color: #667eea;">
          ${verificationCode}
        </h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not create this account, please ignore this email.</p>
        <hr>
        <p style="color: #999; font-size: 12px;">Psychic Chat - Your Personal Astrology Guide</p>
      `
    });

    return {
      success: true,
      messageId: result.id
    };
  } catch (error) {
    console.error('Email verification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send password reset email with code
 */
export async function sendPasswordResetEmail(userEmail, resetCode) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('Resend API key missing');
      throw new Error('Email service not configured');
    }

    const result = await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: 'Reset Your Password - Psychic Chat',
      html: `
        <h2>Reset Your Password</h2>
        <p>We received a request to reset your password. If you did not make this request, please ignore this email.</p>
        <p>Your password reset code is:</p>
        <h1 style="font-family: monospace; letter-spacing: 5px; font-size: 32px; color: #667eea;">
          ${resetCode}
        </h1>
        <p>This code will expire in 15 minutes.</p>
        <p>Use this code to reset your password. You will need to confirm your new password.</p>
        <hr>
        <p style="color: #999; font-size: 12px;">Psychic Chat - Your Personal Astrology Guide</p>
      `
    });

    return {
      success: true,
      messageId: result.id
    };
  } catch (error) {
    console.error('Password reset email error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send 2FA code via email
 */
export async function send2FACodeEmail(userEmail, code) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('Resend API key missing');
      throw new Error('Email service not configured');
    }

    const result = await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: 'Two-Factor Authentication Code - Psychic Chat',
      html: `
        <h2>Two-Factor Authentication</h2>
        <p>Your two-factor authentication code is:</p>
        <h1 style="font-family: monospace; letter-spacing: 5px; font-size: 32px; color: #667eea;">
          ${code}
        </h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this code, please ignore this email.</p>
        <hr>
        <p style="color: #999; font-size: 12px;">Psychic Chat - Your Personal Astrology Guide</p>
      `
    });

    return {
      success: true,
      messageId: result.id
    };
  } catch (error) {
    console.error('2FA email error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
