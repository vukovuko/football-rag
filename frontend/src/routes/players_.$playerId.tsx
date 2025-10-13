import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeftIcon } from "lucide-react";

export const Route = createFileRoute("/players_/$playerId")({
  component: PlayerDetailPage,
});

type Player = {
  playerId: number;
  playerName: string;
  playerNickname: string | null;
  totalMatches: number;
  totalGoals: number;
  totalAssists: number;
  totalYellowCards: number;
  totalRedCards: number;
  totalMinutesPlayed: string;
};

async function fetchPlayer(playerId: string) {
  const res = await fetch(`/api/players/${playerId}`);
  if (!res.ok) throw new Error("Failed to fetch player");
  return res.json();
}

function PlayerDetailPage() {
  const { playerId } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["player", playerId],
    queryFn: () => fetchPlayer(playerId),
  });

  const player: Player | undefined = data?.data;

  if (error) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="text-destructive">
          Error loading player: {(error as Error).message}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="text-muted-foreground">Player not found</div>
      </div>
    );
  }

  const minutesPlayed = parseFloat(player.totalMinutesPlayed);

  return (
    <div className="container mx-auto py-8 px-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          className="hover:bg-accent"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold text-foreground">
            {player.playerName}
          </h1>
          {player.playerNickname && (
            <p className="text-lg text-muted-foreground mt-1">
              "{player.playerNickname}"
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Career Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-muted-foreground">Matches Played</span>
              <span className="font-semibold text-foreground">
                {player.totalMatches}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-muted-foreground">Goals</span>
              <span className="font-semibold text-foreground">
                {player.totalGoals}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-muted-foreground">Assists</span>
              <span className="font-semibold text-foreground">
                {player.totalAssists}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Minutes Played</span>
              <span className="font-semibold text-foreground">
                {minutesPlayed.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Discipline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-muted-foreground">Yellow Cards</span>
              <span className="font-semibold text-foreground">
                {player.totalYellowCards}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-muted-foreground">Red Cards</span>
              <span className="font-semibold text-foreground">
                {player.totalRedCards}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Goals per Match</span>
              <span className="font-semibold text-foreground">
                {player.totalMatches > 0
                  ? (player.totalGoals / player.totalMatches).toFixed(2)
                  : "0.00"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
