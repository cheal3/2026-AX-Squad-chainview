import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Activity, Focus, GitBranch, Search } from "lucide-react";
import { usePortalData } from "../PortalDataStore";

type ServiceNodeData = {
  label: string;
  code: string;
  category: string;
  selected: boolean;
  laneLabel: string;
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 96;
const X_SPACING = 560;
const Y_SPACING = 240;
const DEPENDENCY_COLOR = "#f60";
const DEPENDENT_COLOR = "#2563eb";

export function ServiceRelationFlow() {
  const { services, relations } = usePortalData();
  const [focusedServiceId, setFocusedServiceId] = useState<number>(
    services[0]?.serviceId ?? 0
  );
  const [depth, setDepth] = useState(2);
  const [query, setQuery] = useState("");
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<ServiceNodeData> | null>(null);
  const focusedService =
    services.find((service) => service.serviceId === focusedServiceId) ??
    services[0];
  const filteredServices = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return services.slice(0, 8);
    }
    return services
      .filter((service) =>
        [
          service.serviceName,
          service.serviceCode,
          service.categoryPath.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      )
      .slice(0, 12);
  }, [query, services]);

  const { visibleServiceIds, laneByServiceId } = useMemo(() => {
    const visible = new Set<number>([focusedServiceId]);
    const laneMap = new Map<number, number>([[focusedServiceId, 0]]);
    let dependencyFrontier = [focusedServiceId];
    let dependentFrontier = [focusedServiceId];

    for (let level = 1; level <= depth; level += 1) {
      const nextDependencies = new Set<number>();
      const nextDependents = new Set<number>();

      dependencyFrontier.forEach((serviceId) => {
        relations.forEach((relation) => {
          if (relation.sourceServiceId === serviceId) {
            nextDependencies.add(relation.targetServiceId);
          }
        });
      });

      dependentFrontier.forEach((serviceId) => {
        relations.forEach((relation) => {
          if (relation.targetServiceId === serviceId) {
            nextDependents.add(relation.sourceServiceId);
          }
        });
      });

      dependencyFrontier = Array.from(nextDependencies).filter(
        (serviceId) => !visible.has(serviceId)
      );
      dependencyFrontier.forEach((serviceId) => {
        visible.add(serviceId);
        laneMap.set(serviceId, level);
      });

      dependentFrontier = Array.from(nextDependents).filter(
        (serviceId) => !visible.has(serviceId)
      );
      dependentFrontier.forEach((serviceId) => {
        visible.add(serviceId);
        laneMap.set(serviceId, -level);
      });
    }

    return { visibleServiceIds: visible, laneByServiceId: laneMap };
  }, [depth, focusedServiceId, relations]);

  const nodes = useMemo<Node<ServiceNodeData>[]>(() => {
    const visibleServices = services.filter((service) =>
      visibleServiceIds.has(service.serviceId)
    );
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
            selected: focusedServiceId === service.serviceId,
            laneLabel: getLaneLabel(lane),
          },
        };
      });
  }, [focusedServiceId, laneByServiceId, services, visibleServiceIds]);

  const nodeTypes = useMemo(
    () => ({
      serviceNode: ServiceNode,
    }),
    []
  );

  const edges = useMemo<Edge[]>(() => {
    return relations
      .filter(
        (relation) =>
          visibleServiceIds.has(relation.sourceServiceId) &&
          visibleServiceIds.has(relation.targetServiceId) &&
          (relation.sourceServiceId === focusedServiceId ||
            relation.targetServiceId === focusedServiceId)
      )
      .map((relation) => {
        const dependencyEdge = relation.sourceServiceId === focusedServiceId;
        const stroke = dependencyEdge ? DEPENDENCY_COLOR : DEPENDENT_COLOR;

        return {
          id: String(relation.relationId),
          source: String(relation.sourceServiceId),
          target: String(relation.targetServiceId),
          animated: relation.relationStatusCode === "ACTIVE",
          label: "",
          type:
            relation.sourceServiceId === relation.targetServiceId
              ? "step"
              : "smoothstep",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: stroke,
          },
          style: {
            stroke,
            strokeWidth: relation.mandatoryYn === "Y" ? 3 : 2,
            opacity: relation.mandatoryYn === "Y" ? 0.9 : 0.62,
          },
        };
      });
  }, [
    focusedServiceId,
    relations,
    services,
    visibleServiceIds,
  ]);

  const activeCount = relations.filter(
    (relation) => relation.relationStatusCode === "ACTIVE"
  ).length;
  const mandatoryCount = relations.filter(
    (relation) => relation.mandatoryYn === "Y"
  ).length;
  const focusedRelationCount = edges.length;

  const selectService = (serviceId: number) => {
    setFocusedServiceId(serviceId);
    setQuery("");
  };

  const laneLabels = useMemo(() => {
    const labels: { lane: number; label: string }[] = [];
    for (let lane = -depth; lane <= depth; lane += 1) {
      labels.push({ lane, label: getLaneLabel(lane) });
    }
    return labels;
  }, [depth]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      flowInstance?.setCenter(NODE_WIDTH / 2, NODE_HEIGHT / 2, {
        zoom: 0.9,
        duration: 1200,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [flowInstance, focusedServiceId, nodes]);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              서비스 관계도
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              선택한 서비스를 기준으로 의존 대상과 이 서비스를 호출하는 출발
              서비스를 함께 보여줍니다.
            </p>
          </div>

          <div className="w-full space-y-3">
            <label className="relative block">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="서비스명 또는 코드 검색"
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#f60]"
              />
            </label>
            <div className="max-h-32 overflow-auto rounded-lg border border-gray-200 bg-white">
              {filteredServices.map((service) => (
                <button
                  key={service.serviceId}
                  onClick={() => selectService(service.serviceId)}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-orange-50 ${
                    service.serviceId === focusedServiceId
                      ? "bg-orange-50 font-semibold text-[#f60]"
                      : "text-gray-700"
                  }`}
                >
                  {service.serviceName} · {service.serviceCode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard icon={GitBranch} label="기준 서비스 관계" value={focusedRelationCount} />
        <SummaryCard icon={Activity} label="활성 관계" value={activeCount} />
        <SummaryCard icon={Focus} label="필수 관계" value={mandatoryCount} />
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="relative h-[680px]">
          <div className="absolute left-4 top-4 z-10 rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-sm text-gray-600 shadow-sm">
            기준 노드 직접 관계만 선으로 표시
          </div>
          <div className="absolute right-4 top-4 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white/95 px-3 py-2 shadow-sm">
            <span className="text-sm font-medium text-gray-700">Depth</span>
            {[1, 2, 3, 4].map((item) => (
              <button
                key={item}
                onClick={() => setDepth(item)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  depth === item
                    ? "bg-[#f60] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="absolute inset-y-0 left-1/2 top-0 z-0 flex -translate-x-1/2 pointer-events-none">
            {laneLabels.map((item) => (
              <div
                key={item.lane}
                className={`flex w-[560px] justify-center border-x border-gray-200/70 pt-16 text-xs font-semibold ${
                  item.lane === 0
                    ? "bg-orange-50/55 text-[#f60]"
                    : item.lane < 0
                      ? "bg-blue-50/40 text-blue-700"
                      : "bg-orange-50/30 text-orange-700"
                }`}
              >
                {item.label}
              </div>
            ))}
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={(instance) => {
              setFlowInstance(instance);
              instance.setCenter(NODE_WIDTH / 2, NODE_HEIGHT / 2, {
                zoom: 0.9,
                duration: 0,
              });
            }}
            onNodeClick={(_, node) => selectService(Number(node.id))}
            minZoom={0.25}
            maxZoom={1.6}
            className="relative z-[1]"
          >
            <Background gap={24} size={1.2} color="#dbe4f0" />
            <MiniMap
              nodeColor={(node) =>
                node.data.selected ? "#f60" : "#94a3b8"
              }
              maskColor="rgba(241, 245, 249, 0.72)"
            />
            <Controls />
          </ReactFlow>
        </div>
      </section>

      <style>{`
        .chainview-flow-node {
          min-width: 190px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: #fff;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
          color: #0f172a;
          padding: 14px 16px;
          width: ${NODE_WIDTH}px;
        }

        .react-flow__edge-path {
          stroke-linecap: round;
        }

        .react-flow__edge-textbg {
          filter: drop-shadow(0 2px 5px rgba(15, 23, 42, 0.12));
        }

        .chainview-flow-node-selected {
          border-color: #f60;
          box-shadow: 0 0 0 4px rgba(255, 102, 0, 0.16),
            0 14px 30px rgba(255, 102, 0, 0.2);
          animation: chainview-node-pulse 1.8s ease-in-out infinite;
        }

        .react-flow__edge.animated path {
          stroke-dasharray: 8 6;
          animation-duration: 0.75s;
        }

        @keyframes chainview-node-pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.025);
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
        data.selected ? "chainview-flow-node-selected" : ""
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="text-sm font-semibold text-gray-900">{data.label}</div>
      <div className="mt-1 text-xs font-medium text-[#f60]">{data.code}</div>
      <div className="mt-2 text-xs text-gray-500 leading-relaxed">
        {data.category}
      </div>
      <div className="mt-3 inline-flex rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
        {data.laneLabel}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function getLaneLabel(lane: number) {
  if (lane === 0) {
    return "기준";
  }
  if (lane > 0) {
    return `의존 ${lane} depth`;
  }
  return `종속 ${Math.abs(lane)} depth`;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof GitBranch;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="p-3 rounded-lg bg-orange-50 text-[#f60]">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
