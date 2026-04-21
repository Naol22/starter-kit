import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchScanCompletedNotification } from "@/lib/notifications";

// GET /api/notify?userId=clinic-demo&unread=true
// Returns the notification inbox for a clinic user, newest first.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") ?? "clinic-demo";
    const unreadOnly = searchParams.get("unread") === "true";

    const notifications = await prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (err) {
    console.error("Notification fetch error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/notify
// External trigger endpoint. Accepts { scanId, status, userId? } and fires a
// notification when a scan is marked complete. Verifies the scan exists before
// dispatching — so malformed clients can't poison the inbox with phantom scans.
// Returns 202 Accepted because the DB write is detached from the response.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { scanId, status, userId } = body ?? {};

    if (!scanId || typeof scanId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid scanId" },
        { status: 400 }
      );
    }

    if (status !== "completed") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    dispatchScanCompletedNotification({
      scanId,
      userId: typeof userId === "string" ? userId : undefined,
    });

    return NextResponse.json({ ok: true, queued: true }, { status: 202 });
  } catch (err) {
    console.error("Notification trigger error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH /api/notify
// Flip a notification's read flag. Body: { id, read }.
export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, read } = body ?? {};

    if (!id || typeof id !== "string" || typeof read !== "boolean") {
      return NextResponse.json(
        { error: "Missing id or read flag" },
        { status: 400 }
      );
    }

    const updated = await prisma.notification
      .update({ where: { id }, data: { read } })
      .catch(() => null);

    if (!updated) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ notification: updated });
  } catch (err) {
    console.error("Notification update error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
