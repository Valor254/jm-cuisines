import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

const SITE = "/jm-cuisines.html";

export const Route = createFileRoute("/")({
  component: Index,
});

// The portfolio ships as a standalone vanilla HTML/CSS/JS file in /public.
// This route hands the visitor straight to it.
function Index() {
  useEffect(() => {
    window.location.replace(SITE);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="text-center text-sm text-muted-foreground">
        Loading{" "}
        <a href={SITE} className="underline">
          JM Cuisines
        </a>
        …
      </p>
    </div>
  );
}
