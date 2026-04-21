import { prisma } from "./prisma";

interface DispatchArgs {
  scanId: string;
  userId?: string;
}

// Fire-and-forget notification dispatch.
//
// The caller does NOT await this function — we detach the promise with
// `void (async () => {})()` so a slow or failing notification write can never
// block (or fail) the originating scan upload response. Errors are logged with
// context so they remain observable without propagating.
//
// In production this would hand off to a durable queue (Inngest / BullMQ /
// SQS); the in-process detach simulates that contract for the challenge.
export function dispatchScanCompletedNotification({
  scanId,
  userId = "clinic-demo",
}: DispatchArgs): void {
  void (async () => {
    try {
      await prisma.notification.create({
        data: {
          userId,
          scanId,
          title: "Scan completed",
          message: `Scan ${scanId} is ready for review.`,
        },
      });
    } catch (err) {
      console.error("Notification dispatch failed", { scanId, err });
    }
  })();
}
