/**
 * Email service using EmailJS for real email sending
 * In production, this would be replaced with Firebase Functions or a proper email service
 */

import emailjs from '@emailjs/browser';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// EmailJS configuration
const EMAILJS_CONFIG = {
  serviceId: process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID || 'your-service-id',
  templateId: process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID || 'your-template-id',
  publicKey: process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY || 'your-public-key',
};

/**
 * Send email using EmailJS
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (__DEV__) {
    console.log('📧 EMAIL SENT (Development Mode):');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('HTML Content:', options.html);
    console.log('---');
  }
  
  try {
    // Check if EmailJS is configured
    if (!EMAILJS_CONFIG.serviceId || EMAILJS_CONFIG.serviceId === 'your-service-id') {
      console.log('EmailJS not configured, using development mode');
      return true; // Return true in development
    }
    
    // Send email using EmailJS
    const templateParams = {
      to_email: options.to,
      code: options.html, // The code is passed directly
      user_email: options.to,
    };
    
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    );
    
    console.log('Email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    
    // In development, still return true so flow continues
    if (__DEV__) {
      console.log('Email failed but continuing in development mode');
      return true;
    }
    
    return false;
  }
}

/**
 * Generate verification email HTML
 */
export function generateVerificationEmailHTML(code: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 32px;">WeSplit</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">Your verification code</p>
      </div>
      
      <div style="padding: 40px; background: #f9f9f9;">
        <h2 style="color: #333; margin-bottom: 20px;">Hello!</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          You requested a verification code for your WeSplit account. Use the code below to complete your verification:
        </p>
        
        <div style="background: white; border: 2px solid #667eea; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0;">
          <h1 style="color: #667eea; font-size: 48px; margin: 0; letter-spacing: 10px; font-family: 'Courier New', monospace;">${code}</h1>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
          <p style="color: #999; font-size: 12px;">
            © 2024 WeSplit. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Send verification code email
 */
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const html = generateVerificationEmailHTML(code);
  
  return sendEmail({
    to: email,
    subject: 'WeSplit Verification Code',
    html: code // Pass the code directly for EmailJS template
  });
} 