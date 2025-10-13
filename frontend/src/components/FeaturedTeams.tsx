import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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
  const res = await fetch("/api/teams?limit=5");
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

export default function FeaturedTeams() {
  const { data, isLoading } = useQuery({
    queryKey: ["teams-home"],
    queryFn: fetchTeams,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-foreground">Teams</h2>
        <Link to="/teams" search={{ page: 1, search: "" }}>
          <Button>View all</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))
          : data?.data?.map((team: Team) => (
              <Link
                key={team.teamId}
                to="/teams/$teamId"
                params={{ teamId: team.teamId.toString() }}
              >
                <Card className="hover:bg-accent/50 transition-colors h-full">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {team.teamName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {team.country?.name || "Unknown"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>
    </div>
  );
}
