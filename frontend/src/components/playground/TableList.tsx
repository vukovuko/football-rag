import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, TableIcon } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type Table = {
  name: string;
  rowCount: number;
  columns: any[];
};

type SchemaResponse = {
  success: boolean;
  data: {
    tables: Table[];
    totalTables: number;
    totalColumns: number;
  };
};

async function fetchSchema(): Promise<SchemaResponse> {
  const res = await fetch("/api/playground/schema");
  if (!res.ok) throw new Error("Failed to fetch schema");
  return res.json();
}

interface TableListProps {
  onTableSelect: (tableName: string) => void;
  selectedTable: string | null;
}

export default function TableList({
  onTableSelect,
  selectedTable,
}: TableListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["playground-schema"],
    queryFn: fetchSchema,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const filteredTables =
    data?.data.tables.filter((table) =>
      table.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  if (error) {
    return (
      <div className="p-4 text-destructive text-sm">
        Error loading schema: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground mb-2">Tables</h2>
        {data && (
          <div className="text-xs text-muted-foreground mb-3">
            {data.data.totalTables} tables, {data.data.totalColumns} columns
          </div>
        )}

        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Table list */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTables.map((table) => (
              <button
                key={table.name}
                onClick={() => onTableSelect(table.name)}
                className={`w-full text-left p-2 rounded-md transition-colors flex items-center gap-2 group ${
                  selectedTable === table.name
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-foreground"
                }`}
              >
                <TableIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {table.name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{table.columns.length} cols</span>
                    <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                      {table.rowCount.toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!isLoading && filteredTables.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            {searchTerm ? "No tables found" : "No tables in database"}
          </div>
        )}
      </div>
    </div>
  );
}
