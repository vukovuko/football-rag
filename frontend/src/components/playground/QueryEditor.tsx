import { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { Button } from "@/components/ui/button";
import { PlayIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import type { QueryResult } from "@/routes/playground";

interface QueryEditorProps {
  onQueryResult: (result: QueryResult) => void;
  isExecuting: boolean;
  setIsExecuting: (executing: boolean) => void;
  insertTableName: string | null;
  autoRun?: boolean;
}

const DEFAULT_QUERY = `SELECT * FROM players LIMIT 10;`;

const DANGEROUS_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "TRUNCATE",
  "ALTER",
  "CREATE",
  "GRANT",
  "REVOKE",
  "EXECUTE",
  "EXEC",
];

function validateQuery(query: string): { valid: boolean; error?: string } {
  const trimmed = query.trim();

  if (!trimmed) {
    return { valid: false, error: "Query cannot be empty" };
  }

  // Check for dangerous keywords
  const upperQuery = trimmed.toUpperCase();
  for (const keyword of DANGEROUS_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(trimmed)) {
      return {
        valid: false,
        error: `${keyword} operations are not allowed in playground mode`,
      };
    }
  }

  // Check for multiple statements
  const statements = trimmed.split(";").filter((s) => s.trim());
  if (statements.length > 1) {
    return {
      valid: false,
      error:
        "Multiple statements are not allowed. Execute one query at a time.",
    };
  }

  // Ensure query starts with SELECT or WITH
  if (!upperQuery.startsWith("SELECT") && !upperQuery.startsWith("WITH")) {
    return {
      valid: false,
      error: "Only SELECT queries are allowed in playground mode",
    };
  }

  return { valid: true };
}

async function executeQuery(query: string): Promise<QueryResult> {
  const res = await fetch("/api/playground/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || data.details || "Query execution failed");
  }

  return data.data;
}

export default function QueryEditor({
  onQueryResult,
  isExecuting,
  setIsExecuting,
  insertTableName,
  autoRun = false,
}: QueryEditorProps) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasAutoRun, setHasAutoRun] = useState(false);

  // Insert table name when double-clicked in schema canvas
  useEffect(() => {
    if (insertTableName) {
      setQuery((prev) => {
        // Insert at cursor or append
        return prev + (prev.endsWith("\n") ? "" : "\n") + insertTableName;
      });
    }
  }, [insertTableName]);

  const handleRunQuery = async () => {
    // Frontend validation
    const validation = validateQuery(query);
    if (!validation.valid) {
      setValidationError(validation.error || "Invalid query");
      toast.error(validation.error || "Invalid query");
      return;
    }

    setValidationError(null);
    setIsExecuting(true);

    try {
      const result = await executeQuery(query);
      onQueryResult(result);
      if (result) {
        toast.success(
          `Query executed in ${result.executionTime}ms, ${result.rowCount} rows returned`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Query execution failed";
      toast.error(errorMessage);
      onQueryResult(null);
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunQuery();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Auto-run query on mount if requested
  useEffect(() => {
    if (autoRun && !hasAutoRun && !isExecuting) {
      setHasAutoRun(true);
      handleRunQuery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card max-w-screen">
        <div className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">
          <span className="hidden sm:inline">Press </span>
          <kbd className="px-2 py-1 text-xs bg-muted rounded">
            Ctrl+Enter
          </kbd>{" "}
          <span className="hidden sm:inline">to run query</span>
        </div>
        <div className="flex-1"></div>
        <Button
          onClick={handleRunQuery}
          disabled={isExecuting}
          size="sm"
          className="gap-2 flex-shrink-0"
        >
          {isExecuting ? (
            <>
              <Spinner className="h-4 w-4" />
              <span className="hidden sm:inline">Running...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <PlayIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Run Query</span>
              <span className="sm:hidden">Run</span>
            </>
          )}
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={query}
          height="100%"
          extensions={[sql()]}
          onChange={(value) => {
            setQuery(value);
            setValidationError(null);
          }}
          theme={
            document.documentElement.classList.contains("dark")
              ? "dark"
              : "light"
          }
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
          }}
          style={{
            fontSize: "14px",
            height: "100%",
          }}
        />
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          {validationError}
        </div>
      )}
    </div>
  );
}
