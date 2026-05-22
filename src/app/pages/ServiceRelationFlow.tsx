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
  lane: number;
};

type LaneNodeData = {
  label: string;
  lane: number;
};

const NODE_WIDTH = 240;
const X_SPACING = 440;
const Y_SPACING = 180;
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
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | ServiceStatusCode>(
    "ALL"
  );
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<ServiceNodeData> | null>(null);

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

    relations.forEach((relation) => {
      if (relation.relationStatusCode !== "ACTIVE") {
        return;
      }

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
  }, [focusedServiceId, relations]);

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
      if (!visibleServiceIds.has(service.serviceId)) {
        return false;
      }
      return statusFilter === "ALL" || service.statusCode === statusFilter;
    });
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
      const ownerGroup =
        owners.find((owner) => owner.serviceId === service.serviceId)
          ?.ownerName ?? "미지정";
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
          ownerGroup,
          serverCount: service.serverId ? 1 : 0,
          focused: service.serviceId === focusedServiceId,
          lane,
        },
      };
    });
  }, [
    focusedServiceId,
    laneByServiceId,
    owners,
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

    return relations
      .filter(
        (relation) =>
          relation.relationStatusCode === "ACTIVE" &&
          displayedServiceIds.has(relation.sourceServiceId) &&
          displayedServiceIds.has(relation.targetServiceId) &&
          connectsAdjacentLane(relation, laneByServiceId)
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
          type: "default",
          className: "chainview-flow-edge",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: stroke,
          },
          style: {
            stroke,
            strokeWidth: directlyConnected ? 2.8 : 1.6,
            opacity: directlyConnected ? 0.9 : 0.45,
          },
        };
      });
  }, [
    focusedServiceId,
    laneByServiceId,
    relations,
    services,
    statusFilter,
    visibleServiceIds,
  ]);

  const nodes = useMemo(
    () => [...laneNodes, ...serviceNodes],
    [laneNodes, serviceNodes]
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
      flowInstance?.setCenter(NODE_WIDTH / 2, 0, {
        zoom: 0.86,
        duration: 800,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [flowInstance, focusedServiceId, nodes]);

  return (
    <div className="min-h-[calc(100vh-136px)] space-y-5">
      <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-950">서비스 관계도</h3>
              <p className="mt-1 text-sm text-slate-500">
                선택 노드 기준 수신 서비스는 왼쪽, 송신 서비스는 오른쪽에 표시합니다.
              </p>
            </div>
            <button
              onClick={() => setFiltersOpen((current) => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {filtersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {filtersOpen ? "검색 접기" : "검색 열기"}
            </button>
          </div>

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
              onNodeClick={(_, node) => selectFocusedService(Number(node.id))}
              minZoom={0.28}
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

        .chainview-flow-edge path {
          stroke-dasharray: 12 10;
          animation: chainview-edge-flow 1.05s linear infinite;
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
  return (
    <div
      className={`chainview-flow-node ${
        data.focused ? "chainview-flow-node-focused" : ""
      }`}
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

function StatusPill({ statusCode }: { statusCode: ServiceStatusCode }) {
  const className =
    statusCode === "NORMAL"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : statusCode === "INCIDENT" || statusCode === "INACTIVE"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold ${className}`}>
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
