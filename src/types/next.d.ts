declare module 'next/server' {
  import { NextRequest as BaseNextRequest, NextResponse as BaseNextResponse } from 'next/dist/server/web/spec-extension/request';
  export type NextRequest = BaseNextRequest;
  export type NextResponse<T = any> = BaseNextResponse<T>;
  export { NextResponse };
}

declare module 'next/headers' {
  export function cookies(): {
    get(name: string): { value: string } | undefined;
    set(options: { name: string; value: string; [key: string]: any }): void;
  };
} 