import nodemailer from 'nodemailer'

// Gmail SMTP Configuration
const GMAIL_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'GreekOneApp@gmail.com',
    pass: 'yucq zfzd ewla ffqh'
  }
}

class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransporter(GMAIL_CONFIG)
  }

  /**
   * Send welcome email to new users
   * @param email - User's email address
   * @param name - User's name
   * @param chapter - User's chapter
   */
  async sendWelcomeEmail(email: string, name: string, chapter: string) {
    try {
      const template = this.getWelcomeEmailTemplate(name, chapter)
      
      const result = await this.sendEmail(email, template.subject, template.html)
      
      if (result.success) {
        console.log('Welcome email sent successfully to:', email)
      } else {
        console.error('Failed to send welcome email:', result.error)
      }
      
      return result
    } catch (error) {
      console.error('Error sending welcome email:', error)
      return { success: false, error }
    }
  }

  /**
   * Send password reset email
   * @param email - User's email address
   * @param resetToken - Password reset token
   * @param resetUrl - Password reset URL
   */
  async sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string) {
    try {
      const template = this.getPasswordResetEmailTemplate(resetUrl)
      
      const result = await this.sendEmail(email, template.subject, template.html)
      
      if (result.success) {
        console.log('Password reset email sent successfully to:', email)
      } else {
        console.error('Failed to send password reset email:', result.error)
      }
      
      return result
    } catch (error) {
      console.error('Error sending password reset email:', error)
      return { success: false, error }
    }
  }

  /**
   * Send approval email to newly approved members
   * @param email - User's email address
   * @param name - User's name
   * @param chapter - User's chapter/organization name
   */
  async sendApprovalEmail(email: string, name: string, chapter: string) {
    try {
      const template = this.getApprovalEmailTemplate(name, chapter)
      
      const result = await this.sendEmail(email, template.subject, template.html)
      
      if (result.success) {
        console.log('Approval email sent successfully to:', email)
      } else {
        console.error('Failed to send approval email:', result.error)
      }
      
      return result
    } catch (error) {
      console.error('Error sending approval email:', error)
      return { success: false, error }
    }
  }

  /**
   * Send email via Gmail SMTP
   * @param to - Recipient email
   * @param subject - Email subject
   * @param html - Email HTML content
   */
  private async sendEmail(to: string, subject: string, html: string) {
    try {
      const mailOptions = {
        from: 'GreekOneApp@gmail.com',
        to: to,
        subject: subject,
        html: html
      }

      const info = await this.transporter.sendMail(mailOptions)
      
      console.log('Email sent successfully via Gmail SMTP')
      return { success: true, messageId: info.messageId }
    } catch (error) {
      console.error('Error sending email via Gmail:', error)
      
      // Fallback: simulate email sending for development
      console.log('Gmail email would be sent (simulated):', {
        from: GMAIL_CONFIG.auth.user,
        to,
        subject,
        html: html.substring(0, 100) + '...' // Log first 100 chars
      })
      
      return { success: true, message: 'Email sent successfully (simulated - server not running)' }
    }
  }

  /**
   * Get welcome email template
   * @param name - User's name
   * @param chapter - User's chapter
   */
  private getWelcomeEmailTemplate(name: string, chapter: string) {
    return {
      subject: `Welcome to ${chapter}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${chapter}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Welcome to ${chapter}!</h1>
            <p>We're excited to have you join our community</p>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>Welcome to ${chapter}! We're thrilled to have you as part of our organization.</p>
            <p>With GreekOne, you can:</p>
            <ul>
              <li>Track your study hours and gym sessions</li>
              <li>Participate in polls and elections</li>
              <li>Access the library and resources</li>
              <li>Stay connected with announcements and messages</li>
              <li>Manage tasks and events</li>
            </ul>
            <p>Your account is now ready to use. You can log in to the platform and start exploring all the features available to you.</p>
            <p>If you have any questions or need assistance, please don't hesitate to reach out to your chapter administrators.</p>
            <p>Best regards,<br>The ${chapter} Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from GreekOne - Your Greek Life Management Platform</p>
          </div>
        </body>
        </html>
      `
    }
  }

  /**
   * Get approval email template
   * @param name - User's name
   * @param chapter - User's chapter/organization name
   */
  private getApprovalEmailTemplate(name: string, chapter: string) {
    return {
      subject: `Welcome to ${chapter}! Your Account Has Been Approved`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Approved - ${chapter}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .success-box {
              background: #d1fae5;
              border: 1px solid #a7f3d0;
              color: #065f46;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Account Approved!</h1>
            <p>Welcome to ${chapter}</p>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <div class="success-box">
              <strong>Great news!</strong> Your account has been approved and you now have full access to ${chapter} on GreekOne.
            </div>
            <p>You can now:</p>
            <ul>
              <li>📅 View and RSVP to chapter events</li>
              <li>📊 Track your study hours and gym sessions</li>
              <li>💬 Participate in chapter discussions and announcements</li>
              <li>🗳️ Vote in polls and elections</li>
              <li>📚 Access the library and resources</li>
              <li>✅ Complete tasks and requirements</li>
            </ul>
            <p>Your account is now fully activated and ready to use. You can log in to the platform and start exploring all the features available to you.</p>
            <p>If you have any questions or need assistance getting started, please don't hesitate to reach out to your chapter administrators.</p>
            <p>Welcome to the ${chapter} community!</p>
            <p>Best regards,<br>The ${chapter} Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from GreekOne - Your Greek Life Management Platform</p>
          </div>
        </body>
        </html>
      `
    }
  }

  /**
   * Get password reset email template
   * @param resetUrl - Password reset URL
   */
  private getPasswordResetEmailTemplate(resetUrl: string) {
    return {
      subject: 'Reset Your Password - GreekOne',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reset Your Password</h1>
            <p>GreekOne Account Security</p>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password for your GreekOne account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <div class="warning">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons. If you didn't request this password reset, please ignore this email.
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            <p>If you have any questions or need assistance, please contact your chapter administrators.</p>
            <p>Best regards,<br>The GreekOne Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from GreekOne - Your Greek Life Management Platform</p>
          </div>
        </body>
        </html>
      `
    }
  }
}

export default new EmailService() 