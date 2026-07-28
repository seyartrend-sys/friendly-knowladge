import { NextResponse } from "next/server";
import { answerWithKnowledge } from "@/lib/ai";
import { isAuthorized, unauthorizedResponse } from "@/lib/auth";
import { recentContext, saveChatExchange } from "@/lib/repository";
import type { ChatMessage } from "@/lib/types";

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();
  try {
    const body = (await request.json()) as {
      message?: string;
      history?: ChatMessage[];
    };
    const message = body.message?.trim() ?? "";
    if (!message || message.length > 5000) {
      return NextResponse.json(
        { error: "اكتب رسالة بين 1 و5000 حرف." },
        { status: 400 },
      );
    }
    const context = await recentContext(message);
    const answer = await answerWithKnowledge(
      message,
      context,
      Array.isArray(body.history) ? body.history : [],
    );
    const exchange = await saveChatExchange(
      message,
      answer.content,
      answer.provider,
    );
    return NextResponse.json({
      ...exchange,
      context,
      provider: answer.provider,
    });
  } catch (error) {
    console.error("chat failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `تعذّر الوصول إلى المساعد: ${error.message}`
            : "تعذّر الوصول إلى المساعد.",
      },
      { status: 502 },
    );
  }
}
