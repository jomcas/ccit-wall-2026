/**
 * Email Service Utility
 * 
 * Provides email functionality using Mailgun SMTP.
 * Used for password reset emails and other transactional emails.
 */

import nodemailer from 'nodemailer';
import { logger } from './logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

const EMAIL_CONFIG = {
  host: process.env.MAILGUN_SMTP_HOST || 'smtp.mailgun.org',
  port: parseInt(process.env.MAILGUN_SMTP_PORT || '587', 10),
  secure: process.env.MAILGUN_SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.MAILGUN_SMTP_USER || '',
    pass: process.env.MAILGUN_SMTP_PASS || '',
  },
};

const EMAIL_FROM = process.env.EMAIL_FROM || 'CCIT Wall <noreply@ccitwall.com>';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// =============================================================================
// TRANSPORTER
// =============================================================================

let transporter: nodemailer.Transporter | null = null;

/**
 * Get or create the email transporter
 */
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    // Check if email is configured
    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
      logger.warn('Email not configured. Set MAILGUN_SMTP_USER and MAILGUN_SMTP_PASS environment variables.');
      // Create a dummy transporter that logs instead of sending
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    } else {
      transporter = nodemailer.createTransport(EMAIL_CONFIG);
    }
  }
  return transporter;
}

// =============================================================================
// EMAIL INTERFACES
// =============================================================================

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// =============================================================================
// EMAIL SENDING FUNCTIONS
// =============================================================================

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<SendEmailResult> {
  try {
    const transport = getTransporter();
    
    const mailOptions = {
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transport.sendMail(mailOptions);
    
    // If using jsonTransport (no email config), log the email
    if (!EMAIL_CONFIG.auth.user) {
      logger.info('Email would be sent (email not configured)', {
        to: options.to,
        subject: options.subject,
      });
      // In development, you can see the full email in the logs
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Email content', { message: JSON.parse(info.message) });
      }
      return { success: true, messageId: 'dev-mode' };
    }

    logger.info('Email sent successfully', {
      to: options.to,
      subject: options.subject,
      messageId: info.messageId,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to send email', error instanceof Error ? error : new Error(errorMessage), {
      to: options.to,
      subject: options.subject,
    });
    return { success: false, error: errorMessage };
  }
}

// =============================================================================
// PASSWORD RESET EMAIL
// =============================================================================

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  userName?: string
): Promise<SendEmailResult> {
  const resetUrl = `${CLIENT_URL}/reset-password/${resetToken}`;
  const expiresIn = '1 hour';

  const subject = 'Password Reset Request - CCIT Wall';
  
  const text = `
Hello${userName ? ` ${userName}` : ''},

You requested a password reset for your CCIT Wall account.

Please click the following link to reset your password:
${resetUrl}

This link will expire in ${expiresIn}.

If you did not request this password reset, please ignore this email. Your password will remain unchanged.

Best regards,
The CCIT Wall Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">CCIT Wall</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1a365d; margin-top: 0;">Password Reset Request</h2>
    
    <p>Hello${userName ? ` <strong>${userName}</strong>` : ''},</p>
    
    <p>You requested a password reset for your CCIT Wall account.</p>
    
    <p>Click the button below to reset your password:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">This link will expire in <strong>${expiresIn}</strong>.</p>
    
    <p style="color: #6b7280; font-size: 14px;">If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">CCIT Wall - College of Computing and Information Technologies</p>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({ to: email, subject, text, html });
}

// =============================================================================
// VERIFY EMAIL CONNECTION
// =============================================================================

/**
 * Verify email configuration is working
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transport = getTransporter();
    
    if (!EMAIL_CONFIG.auth.user) {
      logger.info('Email verification skipped - no credentials configured');
      return true; // Allow app to run without email in dev
    }

    await transport.verify();
    logger.info('Email service connected successfully');
    return true;
  } catch (error) {
    logger.error('Email service connection failed', error instanceof Error ? error : new Error('Unknown error'));
    return false;
  }
}
