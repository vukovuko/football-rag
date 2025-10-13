import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftIcon } from "lucide-react";

export const Route = createFileRoute("/teams_/$teamId")({
  component: TeamDetailPage,
});

async function fetchTeamComprehensive(teamId: string) {
  const res = await fetch(`/api/teams/${teamId}/comprehensive`);
  if (!res.ok) throw new Error("Failed to fetch team");
  return res.json();
}

function TeamDetailPage() {
  const { teamId } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["team-comprehensive", teamId],
    queryFn: () => fetchTeamComprehensive(teamId),
  });

  const teamData = data?.data;

  if (error) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="text-destructive">
          Error loading team: {(error as Error).message}
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
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="text-muted-foreground">Team not found</div>
      </div>
    );
  }

  const {
    team,
    matchStats,
    squad,
    topScorers,
    topAssisters,
    competitionsPlayed,
    disciplinaryRecord,
    performanceStats,
  } = teamData;

  const winRate =
    matchStats.total_matches > 0
      ? ((matchStats.wins / matchStats.total_matches) * 100).toFixed(1)
      : "0.0";

  const goalsPerMatch =
    matchStats.total_matches > 0
      ? (matchStats.goals_scored / matchStats.total_matches).toFixed(2)
      : "0.00";

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
            {team.teamName}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mt-1">
            {team.country?.name || "Unknown"} • {team.teamGender}
          </p>
        </div>
      </div>

      {/* Match Record Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{matchStats.total_matches}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Wins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {matchStats.wins}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {winRate}% win rate
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Goals Scored</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{matchStats.goals_scored}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {goalsPerMatch} per match
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Goals Conceded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {matchStats.goals_conceded}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Record */}
        <Card>
          <CardHeader>
            <CardTitle>Record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-muted-foreground">Wins</span>
              <span className="font-semibold text-green-600">
                {matchStats.wins}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-muted-foreground">Draws</span>
              <span className="font-semibold">{matchStats.draws}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Losses</span>
              <span className="font-semibold text-red-600">
                {matchStats.losses}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Goal Difference */}
        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-muted-foreground">For</span>
              <span className="font-semibold text-green-600">
                {matchStats.goals_scored}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-muted-foreground">Against</span>
              <span className="font-semibold text-red-600">
                {matchStats.goals_conceded}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Difference</span>
              <span
                className={`font-semibold ${matchStats.goals_scored - matchStats.goals_conceded >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {matchStats.goals_scored - matchStats.goals_conceded >= 0
                  ? "+"
                  : ""}
                {matchStats.goals_scored - matchStats.goals_conceded}
              </span>
            </div>
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
              <span className="font-semibold">
                {disciplinaryRecord.yellow_cards}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Red Cards</span>
              <span className="font-semibold text-red-600">
                {disciplinaryRecord.red_cards}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Performance Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">
                Total Passes
              </span>
              <span className="font-semibold">
                {performanceStats.total_passes || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Total Shots</span>
              <span className="font-semibold">
                {performanceStats.total_shots || 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">
                Total Dribbles
              </span>
              <span className="font-semibold">
                {performanceStats.total_dribbles || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pressures</span>
              <span className="font-semibold">
                {performanceStats.total_pressures || 0}
              </span>
            </div>
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

        {/* Top Scorers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Scorers</CardTitle>
          </CardHeader>
          <CardContent>
            {topScorers.length > 0 ? (
              <div className="space-y-2">
                {topScorers.map((scorer: any) => (
                  <Link
                    key={scorer.player_id}
                    to="/players/$playerId"
                    params={{ playerId: scorer.player_id.toString() }}
                    search=""
                    className="flex justify-between items-center p-2 rounded hover:bg-accent transition-colors"
                  >
                    <span className="text-sm">{scorer.player_name}</span>
                    <Badge variant="secondary">{scorer.goals} goals</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No scorer data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Squad List */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Squad (Top 10 by Appearances)</CardTitle>
        </CardHeader>
        <CardContent>
          {squad.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {squad.map((player: any) => (
                <Link
                  key={player.playerId}
                  to="/players/$playerId"
                  params={{ playerId: player.playerId.toString() }}
                  search=""
                  className="flex justify-between items-center p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <div>
                    <div className="font-medium">{player.playerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {player.appearances} apps • {player.goals} goals •{" "}
                      {player.assists} assists
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No squad data</div>
          )}
        </CardContent>
      </Card>

      {/* Top Assisters */}
      {topAssisters.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Top Assisters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {topAssisters.map((assister: any) => (
                <Link
                  key={assister.player_id}
                  to="/players/$playerId"
                  params={{ playerId: assister.player_id.toString() }}
                  search=""
                  className="flex justify-between items-center p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <span className="text-sm">{assister.player_name}</span>
                  <Badge variant="secondary">{assister.assists} assists</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
