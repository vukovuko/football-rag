import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-foreground mb-4">Football RAG</h1>
      <p className="text-muted-foreground">12M+ events ready to explore</p>
    </div>
  );
}
