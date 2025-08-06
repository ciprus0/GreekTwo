import { NextRequest, NextResponse } from 'next/server'
import emailService from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const { email, name, chapter } = await request.json()

    if (!email || !name || !chapter) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name, chapter' },
        { status: 400 }
      )
    }

    // Send approval email
    const result = await emailService.sendApprovalEmail(email, name, chapter)

    if (result.success) {
      return NextResponse.json(
        { message: 'Approval email sent successfully' },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        { error: 'Failed to send approval email', details: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error sending approval email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
