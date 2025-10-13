import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SchemaCanvas from "@/components/playground/SchemaCanvas";
import QueryEditor from "@/components/playground/QueryEditor";
import ResultsTable from "@/components/playground/ResultsTable";
import TableDocumentation from "@/components/playground/TableDocumentation";

export const Route = createFileRoute("/playground")({
  component: PlaygroundPage,
});

export type QueryResult = {
  rows: Record<string, any>[];
  columns: { name: string; type: string }[];
  rowCount: number;
  executionTime: number;
} | null;

function PlaygroundPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableToInsert, setTableToInsert] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState("query");
  const [hasAutoRun, setHasAutoRun] = useState(false);

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
  };

  const handleTableDoubleClick = (tableName: string) => {
    setTableToInsert(tableName);
    // Reset after a short delay to allow the effect to trigger
    setTimeout(() => setTableToInsert(null), 100);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Center area - Tabs for Schema/Query */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col h-full min-w-0"
          >
            <div className="bg-card px-4">
              <TabsList className="bg-transparent">
                <TabsTrigger value="query">Query Editor</TabsTrigger>
                <TabsTrigger value="tables">Tables</TabsTrigger>
                <TabsTrigger value="schema">Schema Viewer</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="query"
              className="flex-1 m-0 flex flex-col min-w-0 overflow-hidden"
            >
              {/* Query Editor - takes 50% when results shown, full height otherwise */}
              <div
                className={
                  queryResult
                    ? "h-1/2 min-h-0 flex-shrink-0 min-w-0 overflow-hidden"
                    : "flex-1 min-w-0 overflow-hidden"
                }
              >
                <QueryEditor
                  onQueryResult={setQueryResult}
                  isExecuting={isExecuting}
                  setIsExecuting={setIsExecuting}
                  insertTableName={tableToInsert}
                  autoRun={!hasAutoRun}
                  onAutoRunComplete={() => setHasAutoRun(true)}
                />
              </div>

              {/* Results Table - takes 50% when present */}
              {queryResult && (
                <div className="h-1/2 min-h-0 flex-shrink-0 min-w-0 overflow-hidden">
                  <ResultsTable result={queryResult} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="tables" className="flex-1 m-0 overflow-hidden">
              <TableDocumentation />
            </TabsContent>

            <TabsContent value="schema" className="flex-1 m-0 p-0">
              <SchemaCanvas
                selectedTable={selectedTable}
                onTableSelect={handleTableSelect}
                onTableDoubleClick={handleTableDoubleClick}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
