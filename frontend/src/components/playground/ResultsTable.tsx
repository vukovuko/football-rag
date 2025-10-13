import { useState } from "react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import Papa from "papaparse";
import type { QueryResult } from "@/routes/playground";

interface ResultsTableProps {
  result: QueryResult;
}

const ROWS_PER_PAGE = 50;

export default function ResultsTable({ result }: ResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState<"json" | "csv" | null>(null);

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No results to display
      </div>
    );
  }

  const totalPages = Math.ceil(result.rowCount / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = Math.min(startIndex + ROWS_PER_PAGE, result.rowCount);
  const paginatedRows = result.rows.slice(startIndex, endIndex);

  const handleExportJSON = () => {
    setIsExporting("json");
    try {
      const json = JSON.stringify(result.rows, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `query-results-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.rowCount} rows as JSON`);
    } catch (error) {
      toast.error("Failed to export JSON");
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportCSV = () => {
    setIsExporting("csv");
    try {
      const csv = Papa.unparse(result.rows);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `query-results-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.rowCount} rows as CSV`);
    } catch (error) {
      toast.error("Failed to export CSV");
    } finally {
      setIsExporting(null);
    }
  };

  if (result.rowCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-muted-foreground text-lg mb-2">
          No results found
        </div>
        <div className="text-sm text-muted-foreground">
          Query executed successfully but returned 0 rows
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background min-w-0">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-2 bg-card">
        <div className="text-xs md:text-sm text-muted-foreground flex-shrink-0">
          Showing {startIndex + 1}-{endIndex} of {result.rowCount} rows
          <span className="mx-2">•</span>
          {result.executionTime}ms
        </div>
        <div className="flex-1 hidden md:block"></div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={handleExportJSON}
            disabled={isExporting !== null}
            size="sm"
            variant="outline"
            className="gap-2 text-xs"
          >
            {isExporting === "json" ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <DownloadIcon className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Export </span>JSON
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={isExporting !== null}
            size="sm"
            variant="outline"
            className="gap-2 text-xs"
          >
            {isExporting === "csv" ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <DownloadIcon className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Export </span>CSV
          </Button>
        </div>
      </div>

      {/* Table - with horizontal scroll */}
      <div className="flex-1 min-w-0 overflow-x-auto overflow-y-auto">
        <table className="min-w-max caption-bottom text-base">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {result.columns.map((col) => (
                <TableHead
                  key={col.name}
                  className="font-semibold whitespace-nowrap min-w-[140px] text-sm"
                >
                  {col.name}
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    ({col.type})
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {result.columns.map((col) => (
                  <TableCell
                    key={col.name}
                    className="font-mono text-sm whitespace-nowrap min-w-[140px]"
                  >
                    {row[col.name] === null ? (
                      <span className="text-muted-foreground italic">NULL</span>
                    ) : typeof row[col.name] === "object" ? (
                      <span className="text-muted-foreground">
                        {JSON.stringify(row[col.name])}
                      </span>
                    ) : (
                      String(row[col.name])
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-card">
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            size="sm"
            variant="outline"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            size="sm"
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
