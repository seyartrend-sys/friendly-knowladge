import { NextResponse } from "next/server";
import {
  authReady,
  createSessionToken,
  developmentBypassEnabled,
  expiredSessionCookie,
  isAuthorized,
  passwordMatches,
  sessionCookie,
} from "@/lib/auth";

type Attempt = { count: number; resetAt: number };
const globalAuth = globalThis as unknown as {
  nusuqLoginAttempts?: Map<string, Attempt>;
};
globalAuth.nusuqLoginAttempts ??= new Map();

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown-client"
  );
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const attempts = globalAuth.nusuqLoginAttempts!;
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 0, resetAt: now + 10 * 60_000 });
    return false;
  }
  return current.count >= 8;
}

function recordFailure(key: string) {
  const attempts = globalAuth.nusuqLoginAttempts!;
  const current = attempts.get(key) ?? {
    count: 0,
    resetAt: Date.now() + 10 * 60_000,
  };
  current.count += 1;
  attempts.set(key, current);
}

export async function GET(request: Request) {
  return NextResponse.json({
    authenticated: isAuthorized(request),
    configured: authReady(),
    developmentBypass: developmentBypassEnabled(),
  });
}

export async function POST(request: Request) {
  if (!authReady()) {
    return NextResponse.json(
      { error: "المصادقة غير مكتملة. أضف APP_PASSWORD وAUTH_SECRET." },
      { status: 503 },
    );
  }
  if (developmentBypassEnabled()) {
    return NextResponse.json({ authenticated: true, developmentBypass: true });
  }
  const key = clientKey(request);
  if (isRateLimited(key)) {
    return NextResponse.json(
      { error: "محاولات كثيرة. حاول بعد عشر دقائق." },
      { status: 429 },
    );
  }
  const body = (await request.json()) as { password?: string };
  if (!passwordMatches(body.password ?? "")) {
    recordFailure(key);
    return NextResponse.json({ error: "كلمة المرور غير صحيحة." }, { status: 401 });
  }
  globalAuth.nusuqLoginAttempts!.delete(key);
  const response = NextResponse.json({ authenticated: true });
  response.headers.set("Set-Cookie", sessionCookie(createSessionToken()));
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.headers.set("Set-Cookie", expiredSessionCookie());
  return response;
}
