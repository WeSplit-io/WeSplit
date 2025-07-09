const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Environment variables (in production, these should be set properly)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

// Email configuration (configure for production)
const emailTransporter = process.env.NODE_ENV === 'production' 
  ? nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
      }
    })
  : null; // Skip email transporter in development

// In-memory store for verification codes (in production, use Redis)
const verificationCodes = new Map();
const refreshTokens = new Map();

class AuthService {
  // Generate secure verification code
  generateVerificationCode() {
    return crypto.randomInt(1000, 9999).toString();
  }

  // Generate JWT token
  generateToken(userId, email) {
    return jwt.sign(
      { userId, email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  // Generate refresh token
  generateRefreshToken(userId) {
    const refreshToken = crypto.randomBytes(32).toString('hex');
    refreshTokens.set(refreshToken, {
      userId,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
    });
    return refreshToken;
  }

  // Send verification email
  async sendVerificationEmail(email, code) {
    // In development, skip actual email sending and just log the code
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n🔐 [DEV] EMAIL VERIFICATION CODE FOR ${email}: ${code}`);
      console.log('📧 Email sending skipped in development mode');
      console.log('📱 Use this code in your mobile app to continue\n');
      return true;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@wesplit.com',
      to: email,
      subject: 'WeSplit - Email Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #A5EA15;">WeSplit Email Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #A5EA15; font-size: 32px; letter-spacing: 4px;">${code}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `
    };

    try {
      await emailTransporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      // In development, still return true so flow continues
      if (process.env.NODE_ENV !== 'production') {
        console.log('Email failed but continuing in development mode');
        return true;
      }
      return false;
    }
  }

  // Store verification code with expiration
  storeVerificationCode(email, code) {
    verificationCodes.set(email, {
      code,
      expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes
      attempts: 0
    });
  }

  // Verify code with rate limiting
  verifyCode(email, code) {
    const storedData = verificationCodes.get(email);
    
    if (!storedData) {
      return { success: false, error: 'No verification code found' };
    }

    if (Date.now() > storedData.expiresAt) {
      verificationCodes.delete(email);
      return { success: false, error: 'Verification code expired' };
    }

    if (storedData.attempts >= 3) {
      verificationCodes.delete(email);
      return { success: false, error: 'Too many attempts. Please request a new code.' };
    }

    if (storedData.code !== code) {
      storedData.attempts++;
      return { success: false, error: 'Invalid verification code' };
    }

    // Code is valid
    verificationCodes.delete(email);
    return { success: true };
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return { success: true, data: decoded };
    } catch (error) {
      return { success: false, error: 'Invalid token' };
    }
  }

  // Refresh access token
  refreshAccessToken(refreshToken) {
    const tokenData = refreshTokens.get(refreshToken);
    
    if (!tokenData) {
      return { success: false, error: 'Invalid refresh token' };
    }

    if (Date.now() > tokenData.expiresAt) {
      refreshTokens.delete(refreshToken);
      return { success: false, error: 'Refresh token expired' };
    }

    // Generate new access token
    const newAccessToken = this.generateToken(tokenData.userId, tokenData.email);
    
    return { 
      success: true, 
      accessToken: newAccessToken,
      refreshToken: refreshToken // Keep same refresh token
    };
  }

  // Logout (invalidate refresh token)
  logout(refreshToken) {
    refreshTokens.delete(refreshToken);
    return { success: true };
  }

  // Clean up expired tokens and codes (run periodically)
  cleanupExpired() {
    const now = Date.now();
    
    // Clean verification codes
    for (const [email, data] of verificationCodes.entries()) {
      if (now > data.expiresAt) {
        verificationCodes.delete(email);
      }
    }

    // Clean refresh tokens
    for (const [token, data] of refreshTokens.entries()) {
      if (now > data.expiresAt) {
        refreshTokens.delete(token);
      }
    }
  }
}

module.exports = new AuthService(); 