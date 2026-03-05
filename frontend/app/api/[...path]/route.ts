import { NextRequest } from "next/server";
import { getBackendApp } from "@/lib/server/backend-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toInjectHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

async function handle(request: NextRequest) {
  const app = await getBackendApp();
  const method = request.method.toUpperCase();
  const url = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const headers = toInjectHeaders(request);
  const hasBody = method !== "GET" && method !== "HEAD";

  const payload = hasBody ? Buffer.from(await request.arrayBuffer()) : undefined;

  const response = await app.inject({
    method,
    url,
    headers,
    payload
  });

  const outHeaders = new Headers();
  for (const [key, value] of Object.entries(response.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) outHeaders.append(key, item);
      continue;
    }
    outHeaders.set(key, String(value));
  }

  return new Response(response.rawPayload, {
    status: response.statusCode,
    headers: outHeaders
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function PUT(request: NextRequest) {
  return handle(request);
}

export async function PATCH(request: NextRequest) {
  return handle(request);
}

export async function DELETE(request: NextRequest) {
  return handle(request);
}

