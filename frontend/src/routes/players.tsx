import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/players")({
  component: PlayersPage,
});

type Player = {
  playerId: number;
  playerName: string;
  playerNickname: string | null;
  totalMatches: number;
  totalGoals: number;
  totalAssists: number;
};

async function fetchPlayers() {
  const res = await fetch("/api/players?limit=10");
  if (!res.ok) throw new Error("Failed to fetch players");
  return res.json();
}

function PlayerSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col h-full">
        <Skeleton className="h-5 w-3/4 mb-3 min-h-[2.5rem]" />
        <div className="flex gap-2 mt-auto">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

function PlayersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["players"],
    queryFn: fetchPlayers,
  });

  return (
    <div className="container mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Players</h1>
        <p className="text-muted-foreground">
          Top goal scorers from the database
        </p>
      </div>

      {error && (
        <div className="text-destructive">
          Error loading players: {(error as Error).message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => <PlayerSkeleton key={i} />)
          : data?.data?.map((player: Player) => (
              <Card
                key={player.playerId}
                className="hover:bg-accent/50 transition-colors"
              >
                <CardContent className="p-4 flex flex-col h-full">
                  <h3 className="text-sm font-semibold text-foreground mb-3 line-clamp-2 min-h-[2.5rem]">
                    {player.playerName}
                  </h3>
                  <div className="flex gap-2 mt-auto">
                    <Badge variant="secondary" className="text-xs">
                      {player.totalGoals} goals
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {player.totalMatches} matches
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
