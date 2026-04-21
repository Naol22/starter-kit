import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchScanCompletedNotification } from "@/lib/notifications";

// POST /api/scan
// Persists the completed Scan record and triggers the "scan completed"
// notification asynchronously. The notification dispatch is detached from the
// request/response cycle — callers get a fast response and a scanId they can
// use to render the results dashboard.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const imageCount =
      typeof body?.imageCount === "number" ? body.imageCount : 0;

    if (imageCount < 1) {
      return NextResponse.json(
        { error: "No images attached to scan" },
        { status: 400 }
      );
    }

    const scan = await prisma.scan.create({
      data: { status: "completed" },
    });

    // Fire-and-forget: does NOT block the response.
    dispatchScanCompletedNotification({ scanId: scan.id });

    return NextResponse.json({ scanId: scan.id }, { status: 201 });
  } catch (err) {
    console.error("Scan upload error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
