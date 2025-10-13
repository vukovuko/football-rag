import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 20;

export const Route = createFileRoute("/players")({
  component: PlayersPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      page: Number(search?.page ?? 1),
    };
  },
});

type Player = {
  playerId: number;
  playerName: string;
  playerNickname: string | null;
  totalMatches: number;
  totalGoals: number;
  totalAssists: number;
};

type PlayersResponse = {
  success: boolean;
  data: Player[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

async function fetchPlayers(page: number): Promise<PlayersResponse> {
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const res = await fetch(
    `/api/players?limit=${ITEMS_PER_PAGE}&offset=${offset}`
  );
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
  const navigate = useNavigate();
  const { page = 1 } = Route.useSearch();

  const { data, isLoading, error } = useQuery({
    queryKey: ["players", page],
    queryFn: () => fetchPlayers(page),
  });

  const totalPages = data ? Math.ceil(data.meta.total / ITEMS_PER_PAGE) : 0;

  const handlePageChange = (newPage: number) => {
    navigate({ to: "/players", search: { page: newPage } });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "ellipsis", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(
          1,
          "ellipsis",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(
          1,
          "ellipsis",
          page - 1,
          page,
          page + 1,
          "ellipsis",
          totalPages
        );
      }
    }

    return pages;
  };

  return (
    <div className="container mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Players</h1>
        <p className="text-muted-foreground">
          {data
            ? `Showing ${data.meta.offset + 1}-${Math.min(
                data.meta.offset + ITEMS_PER_PAGE,
                data.meta.total
              )} of ${data.meta.total} players`
            : "Top goal scorers from the database"}
        </p>
      </div>

      {error && (
        <div className="text-destructive">
          Error loading players: {(error as Error).message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        {isLoading
          ? Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <PlayerSkeleton key={i} />
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

      {!isLoading && data && totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => page > 1 && handlePageChange(page - 1)}
                className={
                  page <= 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>

            {renderPageNumbers().map((pageNum, idx) =>
              pageNum === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => handlePageChange(pageNum as number)}
                    isActive={page === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                onClick={() => page < totalPages && handlePageChange(page + 1)}
                className={
                  page >= totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
