import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { SearchIcon } from "lucide-react";
import { useState, useEffect } from "react";

const ITEMS_PER_PAGE = 20;

export const Route = createFileRoute("/teams")({
  component: TeamsPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      page: Number(search?.page ?? 1),
      search: (search?.search as string) || "",
    };
  },
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

type TeamsResponse = {
  success: boolean;
  data: Team[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

async function fetchTeams(
  page: number,
  search: string
): Promise<TeamsResponse> {
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
  const res = await fetch(
    `/api/teams?limit=${ITEMS_PER_PAGE}&offset=${offset}${searchParam}`
  );
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
  const navigate = useNavigate();
  const { page = 1, search = "" } = Route.useSearch();
  const [inputValue, setInputValue] = useState(search);

  const { data, isLoading, error } = useQuery({
    queryKey: ["teams", page, search],
    queryFn: () => fetchTeams(page, search),
  });

  // Sync input value with URL search param when navigating back
  useEffect(() => {
    setInputValue(search);
  }, [search]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== search) {
        navigate({ to: "/teams", search: { page: 1, search: inputValue } });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const totalPages = data ? Math.ceil(data.meta.total / ITEMS_PER_PAGE) : 0;

  const handlePageChange = (newPage: number) => {
    navigate({ to: "/teams", search: { page: newPage, search } });
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
    <div className="container mx-auto py-4 px-4 md:py-8 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Teams</h1>
        <p className="text-muted-foreground mb-4">
          {data
            ? `Showing ${data.meta.offset + 1}-${Math.min(
                data.meta.offset + ITEMS_PER_PAGE,
                data.meta.total
              )} of ${data.meta.total} teams`
            : "Football teams from around the world"}
        </p>

        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search teams..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {error && (
        <div className="text-destructive">
          Error loading teams: {(error as Error).message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        {isLoading
          ? Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <TeamSkeleton key={i} />
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
