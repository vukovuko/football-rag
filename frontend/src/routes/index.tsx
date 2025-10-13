import { createFileRoute } from "@tanstack/react-router";
import FeaturedPlayers from "@/components/FeaturedPlayers";
import FeaturedTeams from "@/components/FeaturedTeams";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="container mx-auto py-6 px-4 md:py-12 md:px-6">
      <FeaturedPlayers />
      <FeaturedTeams />
    </div>
  );
}
