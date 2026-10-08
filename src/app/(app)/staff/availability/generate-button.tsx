"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateSlotsNowAction } from "./actions";

export function GenerateSlotsButton({ doctorUserId }: { doctorUserId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await generateSlotsNowAction(doctorUserId);
            setMessage(`Created ${result.created} new slot(s).`);
            router.refresh();
          })
        }
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Generating..." : "Generate slots now"}
      </button>
      {message && <span className="text-xs text-slate-500">{message}</span>}
    </div>
  );
}
