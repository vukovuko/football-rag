import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftIcon } from "lucide-react";

export const Route = createFileRoute("/teams_/$teamId")({
  component: TeamDetailPage,
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

async function fetchTeam(teamId: string) {
  const res = await fetch(`/api/teams/${teamId}`);
  if (!res.ok) throw new Error("Failed to fetch team");
  return res.json();
}

function TeamDetailPage() {
  const { teamId } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => fetchTeam(teamId),
  });

  const team: Team | undefined = data?.data;

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
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="text-muted-foreground">Team not found</div>
      </div>
    );
  }

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
        <h1 className="text-4xl font-bold text-foreground">{team.teamName}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <span className="text-muted-foreground">Country</span>
            <span className="font-semibold text-foreground">
              {team.country?.name || "Unknown"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Gender</span>
            <Badge variant="secondary" className="capitalize">
              {team.teamGender}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
