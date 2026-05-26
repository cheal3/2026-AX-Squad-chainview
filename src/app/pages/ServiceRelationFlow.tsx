import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Server,
  ShieldAlert,
  Users,
} from "lucide-react";
import { usePortalData } from "../PortalDataStore";
import {
  codeLabels,
  type ImportanceCode,
  type ServiceStatusCode,
} from "../mockData";

type ServiceNodeData = {
  label: string;
  code: string;
  category: string;
  statusCode: ServiceStatusCode;
  importanceCode: ImportanceCode;
  ownerGroup: string;
  serverCount: number;
  focused: boolean;
  connected: boolean;
  compact: boolean;
  dimmed: boolean;
  relationCount: number;
  lane: number;
};

type LaneNodeData = {
  label: string;
  lane: number;
};

type GraphNodeData = ServiceNodeData | LaneNodeData;
type GraphMode = "focused" | "all";

const NODE_WIDTH = 240;
const COMPACT_NODE_WIDTH = 188;
const X_SPACING = 440;
const Y_SPACING = 180;
const FULL_X_SPACING = 248;
const FULL_Y_SPACING = 118;
const DEPENDS_ON_COLOR = "#475569";
const IMPACT_COLOR = "#2563eb";
const MUTED_EDGE_COLOR = "#cbd5e1";

function connectsAdjacentLane(
  relation: { sourceServiceId: number; targetServiceId: number },
  laneByServiceId: Map<number, number>
) {
  const sourceLane = laneByServiceId.get(relation.sourceServiceId);
  const targetLane = laneByServiceId.get(relation.targetServiceId);

  if (sourceLane === undefined || targetLane === undefined) {
    return false;
  }

  return Math.abs(sourceLane - targetLane) === 1;
}

export function ServiceRelationFlow() {
  const { services, relations, owners } = usePortalData();
  const [focusedServiceId, setFocusedServiceId] = useState<number>(
    services[0]?.serviceId ?? 0
  );
  const [graphMode, setGraphMode] = useState<GraphMode>("focused");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | ServiceStatusCode>(
    "ALL"
  );
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<GraphNodeData> | null>(null);

  const ownerByServiceId = useMemo(
    () =>
      new Map(
        owners.map((owner) => [owner.serviceId, owner.ownerName])
      ),
    [owners]
  );

  const activeRelations = useMemo(
    () =>
      relations.filter(
        (relation) =>
          relation.relationStatusCode === "ACTIVE" &&
          relation.sourceServiceId !== relation.targetServiceId
      ),
    [relations]
  );

  const connectedServiceIds = useMemo(() => {
    const connected = new Set<number>();
    activeRelations.forEach((relation) => {
      if (relation.sourceServiceId === focusedServiceId) {
        connected.add(relation.targetServiceId);
      }
      if (relation.targetServiceId === focusedServiceId) {
        connected.add(relation.sourceServiceId);
      }
    });
    return connected;
  }, [activeRelations, focusedServiceId]);

  const relationCountByServiceId = useMemo(() => {
    const counts = new Map<number, number>();
    activeRelations.forEach((relation) => {
      counts.set(
        relation.sourceServiceId,
        (counts.get(relation.sourceServiceId) ?? 0) + 1
      );
      counts.set(
        relation.targetServiceId,
        (counts.get(relation.targetServiceId) ?? 0) + 1
      );
    });
    return counts;
  }, [activeRelations]);

  const filteredSearchServices = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return services
      .filter((service) => {
        if (
          statusFilter !== "ALL" &&
          service.statusCode !== statusFilter
        ) {
          return false;
        }

        if (!normalized) {
          return true;
        }

        return [
          service.serviceName,
          service.serviceCode,
          service.categoryPath.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .slice(0, 12);
  }, [query, services, statusFilter]);

  const { visibleServiceIds, laneByServiceId } = useMemo(() => {
    const visible = new Set<number>([focusedServiceId]);
    const laneMap = new Map<number, number>([[focusedServiceId, 0]]);
    const receivingServices: number[] = [];
    const sendingServices: number[] = [];

    activeRelations.forEach((relation) => {
      if (
        relation.targetServiceId === focusedServiceId &&
        !visible.has(relation.sourceServiceId) &&
        !receivingServices.includes(relation.sourceServiceId)
      ) {
        receivingServices.push(relation.sourceServiceId);
      }

      if (
        relation.sourceServiceId === focusedServiceId &&
        !visible.has(relation.targetServiceId) &&
        !sendingServices.includes(relation.targetServiceId)
      ) {
        sendingServices.push(relation.targetServiceId);
      }
    });

    receivingServices.forEach((serviceId) => {
      visible.add(serviceId);
      laneMap.set(serviceId, -1);
    });

    sendingServices.forEach((serviceId) => {
      visible.add(serviceId);
      laneMap.set(serviceId, 1);
    });

    return { visibleServiceIds: visible, laneByServiceId: laneMap };
  }, [activeRelations, focusedServiceId]);

  const laneNodes = useMemo<Node<LaneNodeData>[]>(() => {
    const nodes: Node<LaneNodeData>[] = [];
    for (let lane = -1; lane <= 1; lane += 1) {
      nodes.push({
        id: `lane-${lane}`,
        type: "laneNode",
        position: {
          x: lane * X_SPACING - (X_SPACING - NODE_WIDTH) / 2,
          y: -1700,
        },
        data: { label: getLaneLabel(lane), lane },
        draggable: false,
        selectable: false,
        focusable: false,
        zIndex: -10,
      });
    }
    return nodes;
  }, []);

  const serviceNodes = useMemo<Node<ServiceNodeData>[]>(() => {
    const visibleServices = services.filter((service) => {
      if (statusFilter !== "ALL" && service.statusCode !== statusFilter) {
        return false;
      }

      return graphMode === "all" || visibleServiceIds.has(service.serviceId);
    });

    if (graphMode === "all") {
      const sortedServices = [...visibleServices].sort((first, second) =>
        [
          first.categoryPath[0],
          first.categoryPath[1],
          first.serviceName,
          first.serviceCode,
        ]
          .join(" ")
          .localeCompare(
            [
              second.categoryPath[0],
              second.categoryPath[1],
              second.serviceName,
              second.serviceCode,
            ].join(" "),
            "ko"
          )
      );
      const columns = Math.min(
        16,
        Math.max(6, Math.ceil(Math.sqrt(sortedServices.length * 1.55)))
      );
      const rows = Math.max(1, Math.ceil(sortedServices.length / columns));

      return sortedServices.map((service, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const connected =
          service.serviceId === focusedServiceId ||
          connectedServiceIds.has(service.serviceId);

        return {
          id: String(service.serviceId),
          type: "serviceNode",
          position: {
            x: (column - (columns - 1) / 2) * FULL_X_SPACING,
            y: (row - (rows - 1) / 2) * FULL_Y_SPACING,
          },
          data: {
            label: service.serviceName,
            code: service.serviceCode,
            category: service.categoryPath.join(" / "),
            statusCode: service.statusCode,
            importanceCode: service.importanceCode ?? "NORMAL",
            ownerGroup: ownerByServiceId.get(service.serviceId) ?? "미지정",
            serverCount: service.serverId ? 1 : 0,
            focused: service.serviceId === focusedServiceId,
            connected,
            compact: true,
            dimmed: !connected,
            relationCount: relationCountByServiceId.get(service.serviceId) ?? 0,
            lane: 0,
          },
        };
      });
    }

    const laneCounts = visibleServices.reduce<Map<number, number>>(
      (acc, service) => {
        const lane = laneByServiceId.get(service.serviceId) ?? 0;
        acc.set(lane, (acc.get(lane) ?? 0) + 1);
        return acc;
      },
      new Map()
    );
    const laneSeen = new Map<number, number>();

    return visibleServices.map((service) => {
      const lane = laneByServiceId.get(service.serviceId) ?? 0;
      const laneIndex = laneSeen.get(lane) ?? 0;
      const laneCount = laneCounts.get(lane) ?? 1;
      const connected =
        service.serviceId === focusedServiceId ||
        connectedServiceIds.has(service.serviceId);
      laneSeen.set(lane, laneIndex + 1);

      return {
        id: String(service.serviceId),
        type: "serviceNode",
        position: {
          x: lane * X_SPACING,
          y: (laneIndex - (laneCount - 1) / 2) * Y_SPACING,
        },
        data: {
          label: service.serviceName,
          code: service.serviceCode,
          category: service.categoryPath.join(" / "),
          statusCode: service.statusCode,
          importanceCode: service.importanceCode ?? "NORMAL",
          ownerGroup: ownerByServiceId.get(service.serviceId) ?? "미지정",
          serverCount: service.serverId ? 1 : 0,
          focused: service.serviceId === focusedServiceId,
          connected,
          compact: false,
          dimmed: false,
          relationCount: relationCountByServiceId.get(service.serviceId) ?? 0,
          lane,
        },
      };
    });
  }, [
    focusedServiceId,
    connectedServiceIds,
    graphMode,
    laneByServiceId,
    ownerByServiceId,
    relationCountByServiceId,
    services,
    statusFilter,
    visibleServiceIds,
  ]);

  const edges = useMemo<Edge[]>(() => {
    const displayedServiceIds = new Set(
      services
        .filter((service) => {
          if (!visibleServiceIds.has(service.serviceId)) {
            return false;
          }
          return statusFilter === "ALL" || service.statusCode === statusFilter;
        })
        .map((service) => service.serviceId)
    );

    return activeRelations
      .filter(
        (relation) =>
          displayedServiceIds.has(relation.sourceServiceId) &&
          displayedServiceIds.has(relation.targetServiceId) &&
          (graphMode === "all" || connectsAdjacentLane(relation, laneByServiceId))
      )
      .map((relation) => {
        const directlyConnected =
          relation.sourceServiceId === focusedServiceId ||
          relation.targetServiceId === focusedServiceId;
        const stroke =
          relation.sourceServiceId === focusedServiceId
            ? IMPACT_COLOR
            : directlyConnected
              ? DEPENDS_ON_COLOR
              : MUTED_EDGE_COLOR;

        return {
          id: String(relation.relationId),
          source: String(relation.sourceServiceId),
          target: String(relation.targetServiceId),
          type: graphMode === "all" ? "smoothstep" : "default",
          className: directlyConnected
            ? "chainview-flow-edge chainview-flow-edge-active"
            : "chainview-flow-edge chainview-flow-edge-muted",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: stroke,
          },
          style: {
            stroke,
            strokeWidth: directlyConnected ? 2.6 : 1.15,
            opacity: directlyConnected ? 0.9 : graphMode === "all" ? 0.16 : 0.45,
          },
        };
      });
  }, [
    activeRelations,
    focusedServiceId,
    graphMode,
    laneByServiceId,
    services,
    statusFilter,
    visibleServiceIds,
  ]);

  const nodes = useMemo<Node<GraphNodeData>[]>(
    () => (graphMode === "all" ? [...serviceNodes] : [...laneNodes, ...serviceNodes]),
    [graphMode, laneNodes, serviceNodes]
  );
  const nodeTypes = useMemo(
    () => ({ laneNode: LaneNode, serviceNode: ServiceNode }),
    []
  );

  const selectFocusedService = (serviceId: number) => {
    setFocusedServiceId(serviceId);
    setQuery("");
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!flowInstance) {
        return;
      }

      if (graphMode === "all") {
        flowInstance.fitView({
          padding: 0.18,
          duration: 800,
        });
        return;
      }

      flowInstance.setCenter(NODE_WIDTH / 2, 0, {
        zoom: 0.86,
        duration: 800,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [flowInstance, focusedServiceId, graphMode, nodes]);

  return (
    <div className="min-h-[calc(100vh-136px)] space-y-5">
      <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-950">서비스 관계도</h3>
              <p className="mt-1 text-sm text-slate-500">
                {graphMode === "all"
                  ? "전체 서비스를 간략 노드로 표시하고 선택 노드와 연결된 선만 강조합니다."
                  : "선택 노드 기준 수신 서비스는 왼쪽, 송신 서비스는 오른쪽에 표시합니다."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  onClick={() => setGraphMode("focused")}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                    graphMode === "focused"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  기준 서비스 보기
                </button>
                <button
                  onClick={() => setGraphMode("all")}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                    graphMode === "all"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  전체 서비스 보기
                </button>
              </div>
              <button
                onClick={() => setFiltersOpen((current) => !current)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {filtersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {filtersOpen ? "검색 접기" : "검색 열기"}
              </button>
            </div>
          </div>

          {graphMode === "all" && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                표시 서비스 {serviceNodes.length}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1">
                전체 관계 {edges.length}
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-600">
                선택 연결 {connectedServiceIds.size}
              </span>
            </div>
          )}

          {filtersOpen && (
            <>
              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,1fr)_180px]">
                <label className="relative block">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="서비스명, 코드, 분류 검색"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="relative block">
                  <Filter
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as "ALL" | ServiceStatusCode)
                    }
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">전체 상태</option>
                    {Object.entries(codeLabels.serviceStatus).map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3 max-h-32 overflow-auto rounded-lg border border-slate-200 bg-white">
                {filteredSearchServices.length > 0 ? (
                  filteredSearchServices.map((service) => (
                    <button
                      key={service.serviceId}
                      onClick={() => selectFocusedService(service.serviceId)}
                      className={`block w-full px-4 py-2 text-left text-sm hover:bg-blue-50 ${
                        service.serviceId === focusedServiceId
                          ? "bg-blue-50 font-semibold text-blue-600"
                          : "text-slate-700"
                      }`}
                    >
                      {service.serviceName} · {service.serviceCode}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-slate-500">
                    검색 조건에 맞는 서비스가 없습니다.
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-[clamp(500px,62vh,720px)]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onInit={(instance) => setFlowInstance(instance)}
              onNodeClick={(_, node) => {
                if (node.type !== "serviceNode") {
                  return;
                }
                selectFocusedService(Number(node.id));
              }}
              minZoom={0.18}
              maxZoom={1.4}
              className="relative z-[1]"
            >
              <Background gap={24} size={1.1} color="#dbe4f0" />
              <Controls />
            </ReactFlow>
          </div>
        </section>
      </div>

      <style>{`
        .chainview-flow-node {
          width: ${NODE_WIDTH}px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: #fff;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
          color: #0f172a;
          padding: 14px 16px;
        }

        .chainview-flow-node-focused {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15),
            0 14px 30px rgba(37, 99, 235, 0.16);
        }

        .chainview-flow-node-connected {
          border-color: rgba(37, 99, 235, 0.45);
        }

        .chainview-flow-node-compact {
          width: ${COMPACT_NODE_WIDTH}px;
          min-height: 76px;
          padding: 10px 12px;
          border-radius: 10px;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
        }

        .chainview-flow-node-dimmed {
          opacity: 0.46;
          box-shadow: none;
        }

        .chainview-lane-node {
          width: ${X_SPACING}px;
          height: 3400px;
          border-left: 1px solid rgba(148, 163, 184, 0.28);
          border-right: 1px solid rgba(148, 163, 184, 0.28);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 26px;
          pointer-events: none;
          background: rgba(248, 250, 252, 0.72);
          color: #475569;
        }

        .chainview-lane-center {
          background: rgba(239, 246, 255, 0.62);
        }

        .chainview-lane-label {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.3);
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
        }

        .react-flow__node-laneNode {
          z-index: -10 !important;
        }

        .react-flow__edge-path {
          stroke-linecap: round;
        }

        .chainview-flow-edge-active path {
          stroke-dasharray: 12 10;
          animation: chainview-edge-flow 1.05s linear infinite;
        }

        .chainview-flow-edge-muted path {
          stroke-dasharray: 2 8;
        }

        @keyframes chainview-edge-flow {
          from {
            stroke-dashoffset: 22;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}

function ServiceNode({ data }: { data: ServiceNodeData }) {
  if (data.compact) {
    return (
      <div
        className={`chainview-flow-node chainview-flow-node-compact ${
          data.focused ? "chainview-flow-node-focused" : ""
        } ${data.connected ? "chainview-flow-node-connected" : ""} ${
          data.dimmed ? "chainview-flow-node-dimmed" : ""
        }`}
      >
        <Handle type="target" position={Position.Left} />
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-black text-slate-950">
              {data.label}
            </div>
            <div className="mt-1 truncate text-[11px] font-semibold text-blue-600">
              {data.code}
            </div>
          </div>
          <StatusPill statusCode={data.statusCode} compact />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500">
          <span className="truncate">{data.category.split(" / ")[0]}</span>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5">
            관계 {data.relationCount}
          </span>
        </div>
        <Handle type="source" position={Position.Right} />
      </div>
    );
  }

  return (
    <div
      className={`chainview-flow-node ${
        data.focused ? "chainview-flow-node-focused" : ""
      } ${data.connected ? "chainview-flow-node-connected" : ""}`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-950">
            {data.label}
          </div>
          <div className="mt-1 truncate text-xs font-medium text-blue-600">
            {data.code}
          </div>
        </div>
        <StatusPill statusCode={data.statusCode} />
      </div>
      <div className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
        {data.category}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <ShieldAlert size={12} />
          {codeLabels.importance[data.importanceCode]}
        </span>
        <span className="inline-flex items-center gap-1">
          <Server size={12} />
          {data.serverCount}
        </span>
        <span className="col-span-2 inline-flex items-center gap-1 truncate">
          <Users size={12} />
          {data.ownerGroup}
        </span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function LaneNode({ data }: { data: LaneNodeData }) {
  return (
    <div
      className={`chainview-lane-node ${
        data.lane === 0 ? "chainview-lane-center" : ""
      }`}
    >
      <div className="chainview-lane-label">{data.label}</div>
    </div>
  );
}

function StatusPill({
  statusCode,
  compact = false,
}: {
  statusCode: ServiceStatusCode;
  compact?: boolean;
}) {
  const className =
    statusCode === "NORMAL"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : statusCode === "INCIDENT" || statusCode === "INACTIVE"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`shrink-0 rounded-md border font-semibold ${className} ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"
      }`}
    >
      {codeLabels.serviceStatus[statusCode]}
    </span>
  );
}

function getLaneLabel(lane: number) {
  if (lane === 0) {
    return "선택 서비스";
  }
  if (lane < 0) {
    return "수신 서비스";
  }
  return "송신 서비스";
}
