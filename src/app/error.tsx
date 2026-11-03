"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-20">
      <ErrorState
        title="Something went wrong"
        description="This page hit an unexpected problem. Your saved data is not affected."
        action={<Button variant="primary" onClick={reset}>Try again</Button>}
      />
    </main>
  );
}
