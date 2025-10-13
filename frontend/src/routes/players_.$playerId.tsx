import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftIcon } from "lucide-react";

export const Route = createFileRoute("/players_/$playerId")({
  component: PlayerDetailPage,
});

async function fetchPlayerComprehensive(playerId: string) {
  const res = await fetch(`/api/players/${playerId}/comprehensive`);
  if (!res.ok) throw new Error("Failed to fetch player");
  return res.json();
}

function PlayerDetailPage() {
  const { playerId } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["player-comprehensive", playerId],
    queryFn: () => fetchPlayerComprehensive(playerId),
  });

  const playerData = data?.data;

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(9)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!playerData) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="text-muted-foreground">Player not found</div>
      </div>
    );
  }

  const { player, positionsPlayed, teamsPlayedFor, competitionsPlayed, stats } =
    playerData;

  return (
    <div className="container mx-auto py-4 px-4 md:py-8 md:px-6">
      {/* Header */}
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
          <h1 className="text-2xl md:text-4xl font-bold text-foreground">
            {player.playerName}
          </h1>
          {player.playerNickname && (
            <p className="text-base md:text-lg text-muted-foreground mt-1">
              "{player.playerNickname}"
            </p>
          )}
        </div>
      </div>

      {/* Career Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{player.totalMatches}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{player.totalGoals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Assists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{player.totalAssists}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {parseFloat(player.totalMinutesPlayed).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Positions */}
        <Card>
          <CardHeader>
            <CardTitle>Positions Played</CardTitle>
          </CardHeader>
          <CardContent>
            {positionsPlayed.length > 0 ? (
              <div className="space-y-3">
                {positionsPlayed.map((pos: any) => (
                  <div
                    key={pos.positionId}
                    className="flex justify-between items-center border-b border-border pb-2 last:border-0"
                  >
                    <div>
                      <div className="font-medium">{pos.positionName}</div>
                      <div className="text-xs text-muted-foreground">
                        {pos.positionCategory}
                      </div>
                    </div>
                    <Badge variant="secondary">{pos.timesPlayed} matches</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No position data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Teams */}
        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
          </CardHeader>
          <CardContent>
            {teamsPlayedFor.length > 0 ? (
              <div className="space-y-3">
                {teamsPlayedFor.map((team: any) => (
                  <div
                    key={team.teamId}
                    className="flex justify-between items-center border-b border-border pb-2 last:border-0"
                  >
                    <div>
                      <div className="font-medium">{team.teamName}</div>
                      <div className="text-xs text-muted-foreground">
                        {team.teamGender}
                      </div>
                    </div>
                    <Badge variant="secondary">{team.matches} matches</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No team data</div>
            )}
          </CardContent>
        </Card>

        {/* Competitions */}
        <Card>
          <CardHeader>
            <CardTitle>Competitions</CardTitle>
          </CardHeader>
          <CardContent>
            {competitionsPlayed.length > 0 ? (
              <div className="space-y-3">
                {competitionsPlayed.map((comp: any) => (
                  <div
                    key={comp.competitionId}
                    className="border-b border-border pb-2 last:border-0"
                  >
                    <div className="font-medium">{comp.competitionName}</div>
                    <div className="text-xs text-muted-foreground">
                      {comp.seasons}
                    </div>
                    <Badge variant="secondary" className="mt-1">
                      {comp.matches} matches
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No competition data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Discipline */}
        <Card>
          <CardHeader>
            <CardTitle>Discipline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-muted-foreground">Yellow Cards</span>
              <span className="font-semibold">{player.totalYellowCards}</span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-muted-foreground">Red Cards</span>
              <span className="font-semibold">{player.totalRedCards}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Goals per Match</span>
              <span className="font-semibold">
                {player.totalMatches > 0
                  ? (player.totalGoals / player.totalMatches).toFixed(2)
                  : "0.00"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Passing Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Passing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">
                Total Passes
              </span>
              <span className="font-semibold">
                {stats.passing.total_passes || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Successful</span>
              <span className="font-semibold text-green-600">
                {stats.passing.successful_passes || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Failed</span>
              <span className="font-semibold text-red-600">
                {stats.passing.failed_passes || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Accuracy</span>
              <span className="font-semibold">
                {stats.passing.pass_accuracy || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Key Passes</span>
              <span className="font-semibold">
                {stats.passing.key_passes || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Shooting Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Shooting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Total Shots</span>
              <span className="font-semibold">
                {stats.shooting.total_shots || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Goals</span>
              <span className="font-semibold text-green-600">
                {stats.shooting.goals || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">On Target</span>
              <span className="font-semibold">
                {stats.shooting.shots_on_target || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Accuracy</span>
              <span className="font-semibold">
                {stats.shooting.shot_accuracy || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg xG</span>
              <span className="font-semibold">
                {stats.shooting.avg_xg || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Dribbling Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Dribbling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">
                Total Dribbles
              </span>
              <span className="font-semibold">
                {stats.dribbling.total_dribbles || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Successful</span>
              <span className="font-semibold text-green-600">
                {stats.dribbling.successful_dribbles || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Failed</span>
              <span className="font-semibold text-red-600">
                {stats.dribbling.failed_dribbles || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Success Rate
              </span>
              <span className="font-semibold">
                {stats.dribbling.dribble_success_rate || 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Duel Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Duels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Total Duels</span>
              <span className="font-semibold">
                {stats.duels.total_duels || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Won</span>
              <span className="font-semibold text-green-600">
                {stats.duels.duels_won || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Lost</span>
              <span className="font-semibold text-red-600">
                {stats.duels.duels_lost || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Win Rate</span>
              <span className="font-semibold">
                {stats.duels.duel_win_rate || 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Defensive Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Defensive Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">
                Interceptions
              </span>
              <span className="font-semibold">
                {stats.defensive.interceptions || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Blocks</span>
              <span className="font-semibold">
                {stats.defensive.blocks || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Clearances</span>
              <span className="font-semibold">
                {stats.defensive.clearances || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Pressures</span>
              <span className="font-semibold">
                {stats.defensive.pressure_events || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Fouls Won</span>
              <span className="font-semibold text-green-600">
                {stats.defensive.fouls_won || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Fouls Committed
              </span>
              <span className="font-semibold text-red-600">
                {stats.defensive.fouls_committed || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Goalkeeper Stats */}
        {stats.goalkeeper.goalkeeper_actions > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Goalkeeper</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-sm text-muted-foreground">Actions</span>
                <span className="font-semibold">
                  {stats.goalkeeper.goalkeeper_actions || 0}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-sm text-muted-foreground">Saves</span>
                <span className="font-semibold text-green-600">
                  {stats.goalkeeper.saves || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Goals Conceded
                </span>
                <span className="font-semibold text-red-600">
                  {stats.goalkeeper.goals_conceded || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
