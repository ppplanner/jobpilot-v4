import { NextRequest } from 'next/server'

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

async function proxy(request: NextRequest, path: string[]) {
  const url = `${BACKEND}/api/${path.join('/')}${request.nextUrl.search}`

  const headers: Record<string, string> = {}
  const ct = request.headers.get('content-type')
  if (ct) headers['content-type'] = ct
  const accept = request.headers.get('accept')
  if (accept) headers['accept'] = accept

  const init: RequestInit = { method: request.method, headers, redirect: 'follow' }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text()
  }

  const res = await fetch(url, init)

  const resHeaders = new Headers()
  const resCt = res.headers.get('content-type')
  if (resCt) resHeaders.set('content-type', resCt)

  return new Response(res.body, { status: res.status, headers: resHeaders })
}

type Ctx = { params: Promise<{ path: string[] }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path)
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path)
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path)
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path)
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path)
}
