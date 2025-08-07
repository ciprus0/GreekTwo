import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/supabase-api'
import emailService from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    console.log('Password reset request for email:', email)

    // Create password reset token
    const tokenResult = await api.createPasswordResetToken(email)
    console.log('Token creation result:', tokenResult)
    
    if (!tokenResult.success) {
      return NextResponse.json(
        { error: tokenResult.error },
        { status: 400 }
      )
    }

    // Generate reset URL
    const resetUrl = `${request.nextUrl.origin}/reset-password?token=${tokenResult.token}`
    console.log('Reset URL generated:', resetUrl)

    // Send password reset email
    const emailResult = await emailService.sendPasswordResetEmail(email, tokenResult.token, resetUrl)
    console.log('Email sending result:', emailResult)

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error)
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Password reset email sent successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error in password reset API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
