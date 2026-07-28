import { NextResponse } from "next/server";
import { isAuthorized, unauthorizedResponse } from "@/lib/auth";
import { getDashboardData } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();
  try {
    return NextResponse.json(await getDashboardData());
  } catch (error) {
    console.error("bootstrap failed", error);
    return NextResponse.json(
      { error: "تعذّر تحميل مساحة المعرفة. تحقق من إعداد قاعدة البيانات." },
      { status: 500 },
    );
  }
}
