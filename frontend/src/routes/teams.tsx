import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/teams")({
  component: TeamsPage,
});

type Team = {
  teamId: number;
  teamName: string;
  teamGender: "male" | "female";
  country: {
    id: number;
    name: string;
  } | null;
};

async function fetchTeams() {
  const res = await fetch("/api/teams?limit=10");
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

function TeamSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </CardContent>
    </Card>
  );
}

function TeamsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  return (
    <div className="container mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Teams</h1>
        <p className="text-muted-foreground">
          Football teams from around the world
        </p>
      </div>

      {error && (
        <div className="text-destructive">
          Error loading teams: {(error as Error).message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => <TeamSkeleton key={i} />)
          : data?.data?.map((team: Team) => (
              <Card
                key={team.teamId}
                className="hover:bg-accent/50 transition-colors"
              >
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {team.teamName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {team.country?.name || "Unknown"}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
