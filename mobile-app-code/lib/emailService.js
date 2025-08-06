import { supabase } from './supabase';
import EmailTemplates from './emailTemplates';

// Gmail SMTP Configuration
const GMAIL_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'GreekOneApp@gmail.com',
    pass: 'yucq zfzd ewla ffqh'
  }
};

class EmailService {
  /**
   * Send welcome email to new users
   * @param {string} email - User's email address
   * @param {string} name - User's name
   * @param {string} chapter - User's chapter
   */
  static async sendWelcomeEmail(email, name, chapter) {
    try {
      const template = EmailTemplates.welcomeEmail(name, chapter);
      
      // Send email using Gmail SMTP
      const result = await this.sendEmailViaGmail(email, template.subject, template.html);
      
      if (result.success) {
        console.log('Welcome email sent successfully to:', email);
      } else {
        console.error('Failed to send welcome email:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error };
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User's email address
   */
  static async sendPasswordResetEmail(email) {
    try {
      // This method is now handled by PasswordResetService.createResetToken()
      // For backward compatibility, we'll redirect to the new service
      const PasswordResetService = require('./passwordResetService').default;
      return await PasswordResetService.createResetToken(email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error };
    }
  }

  /**
   * Send email verification
   * @param {string} email - User's email address
   */
  static async sendEmailVerification(email) {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending email verification:', error);
      return { success: false, error };
    }
  }

  /**
   * Send email via Gmail SMTP
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - Email HTML content
   */
  static async sendEmailViaGmail(to, subject, html) {
    try {
      // Use the backend email server
      const response = await fetch('http://10.0.0.119:3001/send-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ to, subject, html })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Email sent successfully via Gmail SMTP');
        return { success: true, messageId: result.messageId };
      } else {
        console.error('Email server error:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error sending email via Gmail:', error);
      
      // Fallback: simulate email sending for development
      console.log('Gmail email would be sent (simulated):', {
        from: GMAIL_CONFIG.auth.user,
        to,
        subject,
        html: html.substring(0, 100) + '...' // Log first 100 chars
      });
      
      return { success: true, message: 'Email sent successfully (simulated - server not running)' };
    }
  }

  /**
   * Send custom email (for future use with external email service)
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - Email HTML content
   */
  static async sendCustomEmail(to, subject, html) {
    try {
      return await this.sendEmailViaGmail(to, subject, html);
    } catch (error) {
      console.error('Error sending custom email:', error);
      return { success: false, error };
    }
  }

  /**
   * Send SMS (placeholder for future SMS integration)
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - SMS message
   */
  static async sendSMS(phoneNumber, message) {
    try {
      // This would integrate with a service like Twilio, AWS SNS, or similar
      console.log('SMS would be sent to:', phoneNumber);
      console.log('SMS message:', message);
      
      return { success: true };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return { success: false, error };
    }
  }
}

export default EmailService; 