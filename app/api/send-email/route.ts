// app/api/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import EmailService from '../../../lib/email-service' // Adjust path to your email service

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, subject, html, type, name, chapter, resetUrl } = body

    console.log('Received email request:', { to, type, name, chapter })

    if (!to || !type) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: to, type' 
      }, { status: 400 })
    }

    let result

    // Route to appropriate email method based on type
    switch (type) {
      case 'welcome':
        if (!name || !chapter) {
          return NextResponse.json({ 
            success: false, 
            error: 'Missing required fields for welcome email: name, chapter' 
          }, { status: 400 })
        }
        result = await EmailService.sendWelcomeEmail(to, name, chapter)
        break

      case 'approval':
        if (!name || !chapter) {
          return NextResponse.json({ 
            success: false, 
            error: 'Missing required fields for approval email: name, chapter' 
          }, { status: 400 })
        }
        result = await EmailService.sendApprovalEmail(to, name, chapter)
        break

      case 'password-reset':
        if (!resetUrl) {
          return NextResponse.json({ 
            success: false, 
            error: 'Missing required fields for password reset email: resetUrl' 
          }, { status: 400 })
        }
        result = await EmailService.sendPasswordResetEmail(to, 'token', resetUrl)
        break

      case 'custom':
        if (!subject || !html) {
          return NextResponse.json({ 
            success: false, 
            error: 'Missing required fields for custom email: subject, html' 
          }, { status: 400 })
        }
        result = await EmailService.sendEmail(to, subject, html)
        break

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid email type. Must be: welcome, approval, password-reset, or custom' 
        }, { status: 400 })
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
      
      return NextResponse.json(response)
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'error' in result ? result.error : 'Unknown error' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}