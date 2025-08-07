import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/supabase-api'

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Reset password using token
    const resetResult = await api.resetPasswordWithToken(token, newPassword)
    
    if (!resetResult.success) {
      return NextResponse.json(
        { error: resetResult.error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Password reset successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error in reset password API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
