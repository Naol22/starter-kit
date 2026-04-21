import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/messaging?threadId=... | ?patientId=...
// Resolves the thread (latest for a patient if no threadId is given) and
// returns its messages in chronological order.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");
    const patientId = searchParams.get("patientId");

    if (!threadId && !patientId) {
      return NextResponse.json(
        { error: "Provide threadId or patientId" },
        { status: 400 }
      );
    }

    let effectiveThreadId = threadId;
    if (!effectiveThreadId && patientId) {
      const existing = await prisma.thread.findFirst({
        where: { patientId },
        orderBy: { updatedAt: "desc" },
      });
      effectiveThreadId = existing?.id ?? null;
    }

    if (!effectiveThreadId) {
      // No thread yet — that's a valid state for a fresh patient.
      return NextResponse.json({ threadId: null, messages: [] });
    }

    const messages = await prisma.message.findMany({
      where: { threadId: effectiveThreadId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ threadId: effectiveThreadId, messages });
  } catch (err) {
    console.error("Messaging GET error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/messaging
// Body: { threadId?, patientId?, content, sender }
// Find-or-create the thread, append the message, and bump the thread's
// updatedAt — all in one transaction so a mid-flight failure cannot leave
// behind a thread with no message (or vice versa).
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { threadId, patientId, content, sender } = body ?? {};

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Message content required" },
        { status: 400 }
      );
    }
    if (sender !== "patient" && sender !== "dentist") {
      return NextResponse.json({ error: "Invalid sender" }, { status: 400 });
    }
    if (!threadId && !patientId) {
      return NextResponse.json(
        { error: "threadId or patientId is required" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let thread = threadId
        ? await tx.thread.findUnique({ where: { id: threadId } })
        : null;

      if (!thread) {
        if (!patientId || typeof patientId !== "string") {
          throw new Error("patientId required when thread does not exist");
        }
        thread = await tx.thread.create({ data: { patientId } });
      }

      const message = await tx.message.create({
        data: {
          threadId: thread.id,
          content: content.trim(),
          sender,
        },
      });

      // Touch the thread so ordering by updatedAt surfaces active conversations.
      await tx.thread.update({
        where: { id: thread.id },
        data: { updatedAt: new Date() },
      });

      return { thread, message };
    });

    return NextResponse.json(
      { threadId: result.thread.id, message: result.message },
      { status: 201 }
    );
  } catch (err) {
    console.error("Messaging POST error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
