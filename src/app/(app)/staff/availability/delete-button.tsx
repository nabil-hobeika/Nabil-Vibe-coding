"use client";

import { useTransition } from "react";

export function DeleteButton({
  id,
  action,
  label = "Remove",
}: {
  id: string;
  action: (id: string) => Promise<void>;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => action(id))}
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      {pending ? "..." : label}
    </button>
  );
}
