declare module 'next/server' {
  import type { NextRequest as BaseNextRequest } from 'next/dist/server/web/spec-extension/request'
  export type { NextRequest } from 'next/dist/server/web/spec-extension/request'
  export { NextResponse } from 'next/dist/server/web/spec-extension/response'

  export interface NextRequest extends Request {
    nextUrl: URL;
  }
} 