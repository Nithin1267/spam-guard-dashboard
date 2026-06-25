import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lovable App" },
      { name: "description", content: "Lovable Generated Project" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main
      data-lovable-blank-page-placeholder
      className="flex min-h-screen items-center justify-center bg-background px-4"
    >
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Start building
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          REPLACE this placeholder with your app's home page.
        </p>
      </div>
    </main>
  );
}
