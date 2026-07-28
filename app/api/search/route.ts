import { NextResponse } from "next/server";
import { isAuthorized, unauthorizedResponse } from "@/lib/auth";
import { searchKnowledge } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length > 120) {
    return NextResponse.json({ error: "عبارة البحث طويلة جداً." }, { status: 400 });
  }
  try {
    return NextResponse.json({ results: await searchKnowledge(query), query });
  } catch (error) {
    console.error("search failed", error);
    return NextResponse.json({ error: "تعذّر إكمال البحث." }, { status: 500 });
  }
}
