import { NextRequest } from 'next/server'

// 用 127.0.0.1 而非 localhost:Node fetch 对 localhost 会先试 IPv6 ::1,
// 后端只监听 IPv4 时会等到超时才回落到 127.0.0.1,导致每次请求卡 ~19s。
const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

async function proxy(request: NextRequest, path: string[]) {
  const url = `${BACKEND}/api/${path.join('/')}${request.nextUrl.search}`

  const headers: Record<string, string> = {}
  const ct = request.headers.get('content-type')
  if (ct) headers['content-type'] = ct
  const accept = request.headers.get('accept')
  if (accept) headers['accept'] = accept

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'follow',
    // 快速失败:后端未启动/无响应时最多等 10s,不再长时间挂起拖慢切页
    signal: AbortSignal.timeout(10000),
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text()
  }

  let res: Response
  try {
    res = await fetch(url, init)
  } catch (e) {
    // 连接被拒/超时:立即返回 503,让前端 catch 走空态,而不是干等
    const reason = e instanceof Error && e.name === 'TimeoutError' ? '后端响应超时' : '后端未启动或不可达'
    return new Response(JSON.stringify({ detail: reason }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    })
  }

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
