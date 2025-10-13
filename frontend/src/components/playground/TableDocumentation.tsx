import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KeyIcon, Link2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

type SchemaColumn = {
  name: string;
  type: string;
  nullable: boolean;
  default: any;
  isPrimaryKey: boolean;
  isUnique: boolean;
};

type SchemaTable = {
  name: string;
  rowCount: number;
  columns: SchemaColumn[];
  foreignKeys: {
    columnName: string;
    referencedTable: string;
    referencedColumn: string;
  }[];
};

type SchemaResponse = {
  success: boolean;
  data: {
    tables: SchemaTable[];
  };
};

async function fetchSchema(): Promise<SchemaResponse> {
  const res = await fetch("/api/playground/schema");
  if (!res.ok) throw new Error("Failed to fetch schema");
  return res.json();
}

export default function TableDocumentation() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["playground-schema"],
    queryFn: fetchSchema,
    staleTime: 5 * 60 * 1000,
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive p-4 text-center">
        Error loading schema: {(error as Error).message}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading database schema...
      </div>
    );
  }

  const tables = data?.data.tables || [];
  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="container max-w-7xl py-4 sm:py-6 px-3 sm:px-4 lg:px-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Database Schema Documentation
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Complete reference of all tables, columns, data types, and
            relationships in the database.
          </p>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Input
            type="text"
            placeholder="Search tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 sm:max-w-sm"
          />
          <Badge
            variant="secondary"
            className="self-start sm:self-center text-sm"
          >
            {filteredTables.length}{" "}
            {filteredTables.length === 1 ? "table" : "tables"}
          </Badge>
        </div>

        {/* Tables */}
        <div className="space-y-6">
          {filteredTables.map((table) => (
            <Card key={table.name} id={table.name}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-xl sm:text-2xl font-mono break-all">
                      {table.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {table.rowCount.toLocaleString()} rows
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-0">
                {/* Columns */}
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                    Columns
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden lg:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[180px]">
                              Column
                            </TableHead>
                            <TableHead className="min-w-[120px]">
                              Data Type
                            </TableHead>
                            <TableHead className="min-w-[140px]">
                              Constraints
                            </TableHead>
                            <TableHead className="min-w-[100px]">
                              Default
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {table.columns.map((col) => (
                            <TableRow key={col.name}>
                              <TableCell className="font-mono font-medium">
                                <div className="flex items-center gap-2">
                                  {col.isPrimaryKey && (
                                    <KeyIcon className="h-4 w-4 text-primary flex-shrink-0" />
                                  )}
                                  {!col.isPrimaryKey &&
                                    table.foreignKeys?.some(
                                      (fk) => fk.columnName === col.name
                                    ) && (
                                      <Link2Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    )}
                                  <span className="break-all">{col.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm text-muted-foreground">
                                {col.type}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap items-center gap-1">
                                  {col.isPrimaryKey && (
                                    <Badge
                                      variant="default"
                                      className="text-xs"
                                    >
                                      PK
                                    </Badge>
                                  )}
                                  {col.isUnique && !col.isPrimaryKey && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      UNIQUE
                                    </Badge>
                                  )}
                                  {col.nullable ? (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      NULL
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      NOT NULL
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm text-muted-foreground">
                                {col.default !== null
                                  ? String(col.default)
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile/Tablet Card Layout */}
                    <div className="lg:hidden divide-y">
                      {table.columns.map((col) => (
                        <div key={col.name} className="p-3 sm:p-4 space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                              {col.isPrimaryKey && (
                                <KeyIcon className="h-4 w-4 text-primary" />
                              )}
                              {!col.isPrimaryKey &&
                                table.foreignKeys?.some(
                                  (fk) => fk.columnName === col.name
                                ) && (
                                  <Link2Icon className="h-4 w-4 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-mono font-semibold text-sm sm:text-base break-all">
                                {col.name}
                              </p>
                              <p className="font-mono text-xs sm:text-sm text-muted-foreground mt-0.5">
                                {col.type}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pl-6">
                            {col.isPrimaryKey && (
                              <Badge variant="default" className="text-xs">
                                PK
                              </Badge>
                            )}
                            {col.isUnique && !col.isPrimaryKey && (
                              <Badge variant="secondary" className="text-xs">
                                UNIQUE
                              </Badge>
                            )}
                            {col.nullable ? (
                              <Badge variant="outline" className="text-xs">
                                NULL
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                NOT NULL
                              </Badge>
                            )}
                          </div>
                          {col.default !== null && (
                            <div className="pl-6">
                              <p className="text-xs text-muted-foreground">
                                Default:{" "}
                                <span className="font-mono">
                                  {String(col.default)}
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Foreign Keys */}
                {table.foreignKeys && table.foreignKeys.length > 0 && (
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                      Foreign Key Relationships
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      {/* Desktop Table */}
                      <div className="hidden sm:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Column</TableHead>
                              <TableHead>References</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {table.foreignKeys.map((fk, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono text-sm">
                                  {fk.columnName}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  <a
                                    href={`#${fk.referencedTable}`}
                                    className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Link2Icon className="h-3 w-3" />
                                    {fk.referencedTable}.{fk.referencedColumn}
                                  </a>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Card Layout */}
                      <div className="sm:hidden divide-y">
                        {table.foreignKeys.map((fk, idx) => (
                          <div key={idx} className="p-3 space-y-1">
                            <p className="font-mono text-sm font-medium">
                              {fk.columnName}
                            </p>
                            <a
                              href={`#${fk.referencedTable}`}
                              className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1 text-sm font-mono"
                            >
                              <Link2Icon className="h-3 w-3 flex-shrink-0" />
                              <span className="break-all">
                                {fk.referencedTable}.{fk.referencedColumn}
                              </span>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
