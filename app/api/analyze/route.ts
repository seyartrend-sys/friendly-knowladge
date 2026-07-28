import { NextResponse } from "next/server";
import { analyzeKnowledge } from "@/lib/ai";
import { isAuthorized, unauthorizedResponse } from "@/lib/auth";

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();
  const body = (await request.json()) as { text?: string };
  const text = body.text?.trim() ?? "";
  if (!text || text.length > 20_000) {
    return NextResponse.json(
      { error: "أضف نصاً بين 1 و20,000 حرف." },
      { status: 400 },
    );
  }
  return NextResponse.json(await analyzeKnowledge(text));
}
