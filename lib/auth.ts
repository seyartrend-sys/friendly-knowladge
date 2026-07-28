import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { NextResponse } from "next/server";

const COOKIE_NAME = "nusuq_session";
const SESSION_SECONDS = 60 * 60 * 24 * 14;

function configuredPassword(): string | null {
  return process.env.APP_PASSWORD?.trim() || null;
}

function authSecret(): string | null {
  return process.env.AUTH_SECRET?.trim() || null;
}

export function developmentBypassEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && !configuredPassword();
}

export function authReady(): boolean {
  return developmentBypassEnabled() || Boolean(configuredPassword() && authSecret());
}

export function passwordMatches(candidate: string): boolean {
  const expected = configuredPassword();
  if (!expected) return developmentBypassEnabled();
  const left = createHash("sha256").update(candidate).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function createSessionToken(): string {
  const secret = authSecret();
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
      scope: "personal-knowledge",
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function verifySessionToken(token: string): boolean {
  const secret = authSecret();
  if (!secret) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: number; scope?: string };
    return (
      data.scope === "personal-knowledge" &&
      typeof data.exp === "number" &&
      data.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

function readCookie(request: Request): string | null {
  const cookies = request.headers.get("cookie") ?? "";
  for (const item of cookies.split(";")) {
    const [name, ...rest] = item.trim().split("=");
    if (name === COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function isAuthorized(request: Request): boolean {
  if (developmentBypassEnabled()) return true;
  const token = readCookie(request);
  return token ? verifySessionToken(token) : false;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "يلزم تسجيل الدخول للوصول إلى مساحة المعرفة." },
    { status: 401 },
  );
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function expiredSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
