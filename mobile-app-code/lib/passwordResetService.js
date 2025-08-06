import { supabase } from './supabase';
import CryptoJS from 'crypto-js';
import EmailService from './emailService';
import EmailTemplates from './emailTemplates';

class PasswordResetService {
  /**
   * Generate a secure random token
   * @returns {string} - 32 character random token
   */
  static generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Create a password reset token for a user
   * @param {string} email - User's email address
   * @returns {Object} - Result with success status and token info
   */
  static async createResetToken(email) {
    try {
      // Find the user by email
      const { data: user, error: userError } = await supabase
        .from('members')
        .select('id, email, name')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (userError || !user) {
        return { 
          success: false, 
          error: 'No account found with this email address' 
        };
      }

      // Generate a unique token
      const token = this.generateToken();
      
      // Set expiration (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Store the token in the database
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          token: token,
          expires_at: expiresAt.toISOString()
        });

      if (tokenError) {
        console.error('Error creating reset token:', tokenError);
        return { 
          success: false, 
          error: 'Failed to create reset token' 
        };
      }

      // Send password reset email
      const resetLink = `greekone://reset-password?token=${token}`;
      const template = EmailTemplates.passwordResetEmail(user.name);
      
      // Replace placeholder with actual reset link
      const emailHtml = template.html.replace('{{RESET_LINK}}', resetLink);
      
      const emailResult = await EmailService.sendCustomEmail(
        user.email,
        template.subject,
        emailHtml
      );

      if (!emailResult.success) {
        console.error('Failed to send reset email:', emailResult.error);
        return { 
          success: false, 
          error: 'Failed to send reset email' 
        };
      }

      return { 
        success: true, 
        message: 'Password reset email sent successfully',
        token: token // Only for development/testing
      };

    } catch (error) {
      console.error('Error in createResetToken:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred' 
      };
    }
  }

  /**
   * Validate a password reset token
   * @param {string} token - The reset token to validate
   * @returns {Object} - Result with success status and user info
   */
  static async validateResetToken(token) {
    try {
      const { data: resetToken, error } = await supabase
        .from('password_reset_tokens')
        .select(`
          id,
          user_id,
          expires_at,
          used_at,
          members!inner(id, email, name)
        `)
        .eq('token', token)
        .single();

      if (error || !resetToken) {
        return { 
          success: false, 
          error: 'Invalid or expired reset token' 
        };
      }

      // Check if token is expired
      if (new Date(resetToken.expires_at) < new Date()) {
        return { 
          success: false, 
          error: 'Reset token has expired' 
        };
      }

      // Check if token has already been used
      if (resetToken.used_at) {
        return { 
          success: false, 
          error: 'Reset token has already been used' 
        };
      }

      return { 
        success: true, 
        user: resetToken.members,
        tokenId: resetToken.id
      };

    } catch (error) {
      console.error('Error in validateResetToken:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred' 
      };
    }
  }

  /**
   * Reset password using a valid token
   * @param {string} token - The reset token
   * @param {string} newPassword - The new password
   * @returns {Object} - Result with success status
   */
  static async resetPassword(token, newPassword) {
    try {
      // Validate the token first
      const validation = await this.validateResetToken(token);
      
      if (!validation.success) {
        return validation;
      }

      // Hash the new password
      const hashedPassword = CryptoJS.SHA256(newPassword).toString();

      // Update the user's password
      const { error: updateError } = await supabase
        .from('members')
        .update({ password_hash: hashedPassword })
        .eq('id', validation.user.id);

      if (updateError) {
        console.error('Error updating password:', updateError);
        return { 
          success: false, 
          error: 'Failed to update password' 
        };
      }

      // Mark the token as used
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', validation.tokenId);

      if (tokenError) {
        console.error('Error marking token as used:', tokenError);
        // Don't fail the password reset if we can't mark the token as used
      }

      return { 
        success: true, 
        message: 'Password reset successfully' 
      };

    } catch (error) {
      console.error('Error in resetPassword:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred' 
      };
    }
  }

  /**
   * Clean up expired tokens (can be called periodically)
   * @returns {Object} - Result with number of tokens cleaned up
   */
  static async cleanupExpiredTokens() {
    try {
      const { data, error } = await supabase
        .from('password_reset_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error cleaning up expired tokens:', error);
        return { 
          success: false, 
          error: 'Failed to clean up expired tokens' 
        };
      }

      return { 
        success: true, 
        message: `Cleaned up ${data?.length || 0} expired tokens` 
      };

    } catch (error) {
      console.error('Error in cleanupExpiredTokens:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred' 
      };
    }
  }
}

export default PasswordResetService; 