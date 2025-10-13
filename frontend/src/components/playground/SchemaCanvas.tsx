import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";
import {
  KeyIcon,
  Link2Icon,
  CheckCircleIcon,
  HelpCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

interface SchemaCanvasProps {
  selectedTable: string | null;
  onTableSelect: (tableName: string) => void;
  onTableDoubleClick: (tableName: string) => void;
}

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "TB", ranksep: 100, nodesep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 250, height: 200 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 125,
        y: nodeWithPosition.y - 100,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// Custom table node component
function TableNode({ data }: { data: any }) {
  const isSelected = data.isSelected;
  const isConnected = data.isConnected;

  return (
    <div
      className={`bg-card border-2 rounded-lg shadow-lg transition-all ${
        isSelected
          ? "border-primary"
          : isConnected
            ? "border-accent"
            : "border-border"
      }`}
      style={{
        width: 250,
        maxHeight: 400,
        color: "hsl(var(--foreground))",
      }}
    >
      {/* Table header */}
      <div
        className="px-3 py-2 border-b border-border font-semibold text-sm flex items-center justify-between"
        style={{ backgroundColor: "hsl(var(--muted))" }}
      >
        <span className="truncate">{data.label}</span>
        <Badge variant="secondary" className="text-xs">
          {data.rowCount.toLocaleString()}
        </Badge>
      </div>

      {/* Columns list */}
      <div className="overflow-y-auto max-h-80 text-xs">
        {data.columns.slice(0, 15).map((col: SchemaColumn, idx: number) => (
          <div
            key={idx}
            className="px-3 py-1.5 border-b border-border/50 hover:bg-accent/50 flex items-center gap-2"
          >
            <div className="flex items-center gap-1 flex-shrink-0">
              {col.isPrimaryKey && <KeyIcon className="h-3 w-3 text-primary" />}
              {!col.isPrimaryKey &&
                data.foreignKeys?.some(
                  (fk: any) => fk.columnName === col.name
                ) && <Link2Icon className="h-3 w-3 text-muted-foreground" />}
              {col.isUnique && !col.isPrimaryKey && (
                <CheckCircleIcon className="h-3 w-3 text-accent-foreground" />
              )}
              {col.nullable && (
                <HelpCircleIcon className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <span className="font-medium truncate flex-1">{col.name}</span>
            <span className="text-muted-foreground text-xs">{col.type}</span>
          </div>
        ))}
        {data.columns.length > 15 && (
          <div className="px-3 py-2 text-muted-foreground text-center">
            +{data.columns.length - 15} more columns...
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  table: TableNode,
};

export default function SchemaCanvas({
  selectedTable,
  onTableSelect,
  onTableDoubleClick,
}: SchemaCanvasProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["playground-schema"],
    queryFn: fetchSchema,
    staleTime: 5 * 60 * 1000,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Generate nodes and edges from schema
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!data?.data.tables) {
      return { initialNodes: [], initialEdges: [] };
    }

    const tables = data.data.tables;
    const generatedNodes: Node[] = tables.map((table) => ({
      id: table.name,
      type: "table",
      position: { x: 0, y: 0 },
      data: {
        label: table.name,
        rowCount: table.rowCount,
        columns: table.columns,
        foreignKeys: table.foreignKeys,
        isSelected: false,
        isConnected: false,
      },
    }));

    const generatedEdges: Edge[] = [];
    tables.forEach((table) => {
      table.foreignKeys.forEach((fk) => {
        generatedEdges.push({
          id: `${table.name}-${fk.columnName}-${fk.referencedTable}`,
          source: table.name,
          target: fk.referencedTable,
          label: fk.columnName,
          type: "smoothstep",
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "hsl(var(--muted-foreground))",
          },
          style: {
            stroke: "hsl(var(--muted-foreground))",
            strokeWidth: 1.5,
          },
        });
      });
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      generatedNodes,
      generatedEdges
    );

    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
  }, [data]);

  // Update nodes and edges when data changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Update node selection state
  useEffect(() => {
    if (!selectedTable) {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: { ...node.data, isSelected: false, isConnected: false },
        }))
      );
      return;
    }

    const connectedEdges = edges.filter(
      (edge) => edge.source === selectedTable || edge.target === selectedTable
    );
    const connectedTableIds = new Set(
      connectedEdges.flatMap((edge) => [edge.source, edge.target])
    );

    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isSelected: node.id === selectedTable,
          isConnected: connectedTableIds.has(node.id),
        },
      }))
    );
  }, [selectedTable, edges, setNodes]);

  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      onTableSelect(node.id);
    },
    [onTableSelect]
  );

  const onNodeDoubleClick = useCallback(
    (_: any, node: Node) => {
      onTableDoubleClick(node.id);
    },
    [onTableDoubleClick]
  );

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
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

  return (
    <div className="w-full h-full bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          style={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
          }}
        />
        <Background
          color="hsl(var(--muted-foreground))"
          gap={16}
          style={{ backgroundColor: "hsl(var(--background))" }}
        />
      </ReactFlow>
    </div>
  );
}
