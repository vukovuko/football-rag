import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Player = {
  playerId: number;
  playerName: string;
  playerNickname: string | null;
  totalMatches: number;
  totalGoals: number;
  totalAssists: number;
};

async function fetchPlayers() {
  const res = await fetch("/api/players?limit=6");
  if (!res.ok) throw new Error("Failed to fetch players");
  return res.json();
}

export default function FeaturedPlayers() {
  const { data, isLoading } = useQuery({
    queryKey: ["players-home"],
    queryFn: fetchPlayers,
  });

  return (
    <div className="mb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-foreground">Players</h2>
        <Link to="/players" search={{ page: 1 }}>
          <Button>View all</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex flex-col h-full">
                  <Skeleton className="h-5 w-3/4 mb-3 min-h-[2.5rem]" />
                  <div className="flex gap-2 mt-auto">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))
          : data?.data?.map((player: Player) => (
              <Link
                key={player.playerId}
                to="/players/$playerId"
                params={{ playerId: player.playerId.toString() }}
              >
                <Card className="hover:bg-accent/50 transition-colors h-full">
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
              </Link>
            ))}
      </div>
    </div>
  );
}
