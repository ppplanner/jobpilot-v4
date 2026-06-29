import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const res = await fetch(`${BACKEND}/api/v1/resume/upload`, {
      method: 'POST',
      body: formData,
    })
    const json = await res.json()
    return NextResponse.json(json, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ detail: `文件转发失败：${err.message}` }, { status: 500 })
  }
}
