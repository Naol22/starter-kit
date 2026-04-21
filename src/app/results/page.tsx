import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import MessageSidebar from "@/components/MessageSidebar";

// Server-rendered results dashboard. In a real product `patientId` would come
// from the authenticated session; the challenge doesn't scope auth, so we
// stub a single demo patient.
const DEMO_PATIENT_ID = "demo-patient";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: { scanId?: string };
}) {
  const scan = searchParams.scanId
    ? await prisma.scan
        .findUnique({ where: { id: searchParams.scanId } })
        .catch(() => null)
    : null;

  return (
    <main className="min-h-screen bg-black text-white sm:pr-96">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <header className="flex items-center gap-3">
          <CheckCircle2 className="text-green-500" size={28} />
          <div>
            <h1 className="text-2xl font-bold">Scan results</h1>
            <p className="text-sm text-zinc-500">
              {scan
                ? `Scan ${scan.id.slice(0, 8)} · ${scan.status}`
                : "Most recent scan"}
            </p>
          </div>
        </header>

        <section className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
          <h2 className="font-semibold mb-2">AI summary</h2>
          <p className="text-sm text-zinc-300">
            Your scan has been received. A DentalScan clinician will review
            your images and send feedback shortly. You can ask them anything
            using the chat on the right.
          </p>
        </section>

        <section className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
          <h2 className="font-semibold mb-2">Next steps</h2>
          <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside">
            <li>We&apos;ll email you when the clinician finishes their review.</li>
            <li>Messages here go straight to the clinic inbox.</li>
            <li>You can run a follow-up scan any time.</li>
          </ul>
        </section>

        <Link
          href="/"
          className="inline-block text-sm text-blue-400 hover:text-blue-300"
        >
          ← New scan
        </Link>
      </div>

      <MessageSidebar patientId={DEMO_PATIENT_ID} />
    </main>
  );
}
