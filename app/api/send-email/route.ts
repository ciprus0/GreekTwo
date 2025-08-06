// pages/api/send-email.ts (or app/api/send-email/route.ts)
import { NextApiRequest, NextApiResponse } from 'next'
import EmailService from '../../../lib/email-service' // Adjust path to your email service

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    const { to, subject, html, type, name, chapter, resetUrl } = req.body

    if (!to || !type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, type' 
      })
    }

    let result

    // Route to appropriate email method based on type
    switch (type) {
      case 'welcome':
        if (!name || !chapter) {
          return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields for welcome email: name, chapter' 
          })
        }
        result = await EmailService.sendWelcomeEmail(to, name, chapter)
        break

      case 'approval':
        if (!name || !chapter) {
          return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields for approval email: name, chapter' 
          })
        }
        result = await EmailService.sendApprovalEmail(to, name, chapter)
        break

      case 'password-reset':
        if (!resetUrl) {
          return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields for password reset email: resetUrl' 
          })
        }
        result = await EmailService.sendPasswordResetEmail(to, 'token', resetUrl)
        break

      case 'custom':
        if (!subject || !html) {
          return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields for custom email: subject, html' 
          })
        }
        result = await EmailService.sendEmail(to, subject, html)
        break

      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid email type. Must be: welcome, approval, password-reset, or custom' 
        })
    }

    if (result.success) {
      const response: any = { 
        success: true, 
        message: 'Email sent successfully' 
      }
      
      if ('messageId' in result) {
        response.messageId = result.messageId
      } else if ('message' in result) {
        response.messageId = result.message
      }
      
      res.json(response)
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'error' in result ? result.error : 'Unknown error' 
      })
    }

  } catch (error) {
    console.error('Error sending email:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}