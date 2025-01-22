declare module 'next/server' {
  import { NextRequest as BaseNextRequest, NextResponse as BaseNextResponse } from 'next/dist/server/web/spec-extension/request';
  export type NextRequest = BaseNextRequest;
  export type NextResponse = BaseNextResponse;
  export { NextResponse } from 'next/dist/server/web/spec-extension/response';
}

declare module 'next/headers' {
  export function cookies(): {
    get(name: string): { value: string } | undefined;
    getAll(): Array<{ name: string; value: string }>;
  };
} 