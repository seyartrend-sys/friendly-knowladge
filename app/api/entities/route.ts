import { NextResponse } from "next/server";
import { isAuthorized, unauthorizedResponse } from "@/lib/auth";
import { createEntity } from "@/lib/repository";
import type { CreateEntityPayload, EntityKind } from "@/lib/types";

const allowedTypes = new Set<EntityKind>([
  "topic",
  "note",
  "source",
  "project",
]);

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();
  try {
    const payload = (await request.json()) as CreateEntityPayload;
    if (!allowedTypes.has(payload.type) || !payload.title?.trim()) {
      return NextResponse.json(
        { error: "نوع العنصر والعنوان مطلوبان." },
        { status: 400 },
      );
    }
    const entity = await createEntity(payload);
    return NextResponse.json({ entity }, { status: 201 });
  } catch (error) {
    console.error("entity creation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذّر حفظ العنصر." },
      { status: 500 },
    );
  }
}
