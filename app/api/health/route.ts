import { NextResponse } from "next/server";
import { healthCheck } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await healthCheck();
    return NextResponse.json({ status: health.status });
  } catch (error) {
    console.error("health check failed", error);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
