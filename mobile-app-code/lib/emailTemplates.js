export const EmailTemplates = {
    /**
     * Welcome email template
     */
    welcomeEmail: (name, chapter) => ({
      subject: 'Welcome to GreekOne!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>Welcome to GreekOne</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F87171 0%, #FB7185 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #F87171; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to GreekOne!</h1>
              <p>Your Greek Life Management Platform</p>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Welcome to GreekOne! We're excited to have you join the ${chapter} chapter and become part of our growing community.</p>
              <p>With GreekOne, you'll have access to:</p>
              <ul>
                <li>📅 Event management and scheduling</li>
                <li>📊 House points and hours tracking</li>
                <li>💬 Chapter messaging and announcements</li>
                <li>📚 Study resources and academic tracking</li>
                <li>🏋️ Gym and fitness tracking</li>
                <li>🗳️ Polls and voting systems</li>
              </ul>
              <p>Your account has been successfully created and you can now access all these features through our mobile app.</p>
              <p>If you have any questions or need assistance getting started, please don't hesitate to reach out to our support team.</p>
              <p>Best regards,<br><strong>The GreekOne Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2024 GreekOne. All rights reserved.</p>
              <p>This email was sent to you because you signed up for GreekOne.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }),
  
    /**
     * Password reset email template
     */
    passwordResetEmail: (name) => ({
      subject: 'Reset Your GreekOne Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F87171 0%, #FB7185 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #F87171; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
              <p>GreekOne Account Security</p>
            </div>
            <div class="content">
              <h2>Hi ${name || 'there'},</h2>
              <p>We received a request to reset your password for your GreekOne account.</p>
              <p>Click the button below to reset your password:</p>
              <div style="text-align: center;">
                <a href="{{RESET_LINK}}" class="button">Reset Password</a>
              </div>
              <div class="warning">
                <strong>Important:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, you can safely ignore this email</li>
                  <li>For security, this link can only be used once</li>
                </ul>
              </div>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #F87171;">{{RESET_LINK}}</p>
              <p>If you have any questions, please contact our support team.</p>
              <p>Best regards,<br><strong>The GreekOne Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2024 GreekOne. All rights reserved.</p>
              <p>This email was sent to you because you requested a password reset.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }),
  
    /**
     * Email verification template
     */
    emailVerification: (name) => ({
      subject: 'Verify Your GreekOne Email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F87171 0%, #FB7185 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #F87171; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
              <p>Complete Your GreekOne Registration</p>
            </div>
            <div class="content">
              <h2>Hi ${name || 'there'},</h2>
              <p>Thanks for signing up for GreekOne! To complete your registration, please verify your email address.</p>
              <div style="text-align: center;">
                <a href="{{VERIFICATION_LINK}}" class="button">Verify Email</a>
              </div>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #F87171;">{{VERIFICATION_LINK}}</p>
              <p>Once verified, you'll have full access to all GreekOne features.</p>
              <p>Best regards,<br><strong>The GreekOne Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2024 GreekOne. All rights reserved.</p>
              <p>This email was sent to you because you signed up for GreekOne.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }),
  
    /**
     * Chapter invitation template
     */
    chapterInvitation: (inviterName, chapterName, inviteeName) => ({
      subject: `You're Invited to Join ${chapterName} on GreekOne`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Chapter Invitation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F87171 0%, #FB7185 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #F87171; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Chapter Invitation</h1>
              <p>Join ${chapterName} on GreekOne</p>
            </div>
            <div class="content">
              <h2>Hi ${inviteeName},</h2>
              <p>${inviterName} has invited you to join the ${chapterName} chapter on GreekOne!</p>
              <p>GreekOne is a comprehensive platform for managing Greek life activities, including:</p>
              <ul>
                <li>📅 Event planning and coordination</li>
                <li>📊 Member tracking and analytics</li>
                <li>💬 Chapter communication</li>
                <li>📚 Academic support</li>
                <li>🏋️ Fitness tracking</li>
              </ul>
              <div style="text-align: center;">
                <a href="{{INVITATION_LINK}}" class="button">Accept Invitation</a>
              </div>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #F87171;">{{INVITATION_LINK}}</p>
              <p>We look forward to having you join the ${chapterName} community!</p>
              <p>Best regards,<br><strong>The GreekOne Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2024 GreekOne. All rights reserved.</p>
              <p>This email was sent to you because you were invited to join a chapter on GreekOne.</p>
            </div>
          </div>
        </body>
        </html>
      `
    })
  };
  
  export default EmailTemplates; 