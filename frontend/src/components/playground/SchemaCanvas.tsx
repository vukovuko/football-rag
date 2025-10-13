import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  Handle,
  Position,
  useReactFlow,
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";
import {
  KeyIcon,
  Link2Icon,
  CheckCircleIcon,
  HelpCircleIcon,
  MenuIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import TableList from "./TableList";

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
  dagreGraph.setGraph({
    rankdir: "LR",
    ranksep: 150,
    nodesep: 120,
    marginx: 50,
    marginy: 50,
  });

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
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{
          background: "#6366f1",
          width: 10,
          height: 10,
          border: "2px solid white",
          left: -5,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{
          background: "#6366f1",
          width: 10,
          height: 10,
          border: "2px solid white",
          right: -5,
        }}
      />

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

// Component for drawer and controls inside ReactFlow
function SchemaControls({
  selectedTable,
  onTableSelect,
}: {
  selectedTable: string | null;
  onTableSelect: (tableName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { fitView, getNode } = useReactFlow();

  const handleTableClick = (tableName: string) => {
    onTableSelect(tableName);
    setOpen(false);

    // Focus on the selected node
    setTimeout(() => {
      const node = getNode(tableName);
      if (node) {
        fitView({
          nodes: [node],
          duration: 500,
          padding: 0.5,
        });
      }
    }, 100);
  };

  return (
    <>
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

      {/* Drawer trigger button */}
      <div className="absolute top-4 left-4 z-10">
        <Drawer open={open} onOpenChange={setOpen} direction="left">
          <DrawerTrigger asChild>
            <Button variant="outline" size="icon">
              <MenuIcon className="h-4 w-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-full w-80 fixed bottom-0 left-0 right-auto mt-0">
            <DrawerHeader>
              <DrawerTitle>Database Tables</DrawerTitle>
              <DrawerDescription>
                Click a table to focus on it in the schema viewer
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto flex-1 px-4">
              <TableList
                onTableSelect={handleTableClick}
                selectedTable={selectedTable}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}

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

  const nodeTypes = useMemo(() => ({ table: TableNode }), []);

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
          sourceHandle: "source",
          target: fk.referencedTable,
          targetHandle: "target",
          type: "smoothstep",
          animated: false,
          style: {
            stroke: "#555555",
            strokeWidth: 1.5,
            strokeOpacity: 0.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#555555",
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

  // Update node and edge selection state
  useEffect(() => {
    if (!selectedTable) {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: { ...node.data, isSelected: false, isConnected: false },
        }))
      );
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          style: {
            stroke: "#555555",
            strokeWidth: 1.5,
            strokeOpacity: 0.5,
          },
          animated: false,
        }))
      );
      return;
    }

    // Use callback form to avoid dependency on edges
    setEdges((eds) => {
      const connectedEdges = eds.filter(
        (edge) => edge.source === selectedTable || edge.target === selectedTable
      );
      const connectedEdgeIds = new Set(connectedEdges.map((e) => e.id));
      const connectedTableIds = new Set(
        connectedEdges.flatMap((edge) => [edge.source, edge.target])
      );

      // Update nodes
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

      // Return updated edges
      return eds.map((edge) => ({
        ...edge,
        style: connectedEdgeIds.has(edge.id)
          ? { stroke: "#6366f1", strokeWidth: 2.5, strokeOpacity: 1 }
          : { stroke: "#555555", strokeWidth: 1.5, strokeOpacity: 0.3 },
        animated: connectedEdgeIds.has(edge.id),
      }));
    });
  }, [selectedTable, setNodes, setEdges]);

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
    <div
      className="w-full h-full bg-background"
      style={
        {
          "--xy-edge-stroke-default": "#555555",
          "--xy-edge-stroke-width-default": "1.5px",
        } as React.CSSProperties
      }
    >
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
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "#555555", strokeWidth: 1.5, strokeOpacity: 0.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#555555" },
        }}
        connectionLineStyle={{ stroke: "#555555", strokeWidth: 1.5 }}
      >
        <SchemaControls
          selectedTable={selectedTable}
          onTableSelect={onTableSelect}
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
