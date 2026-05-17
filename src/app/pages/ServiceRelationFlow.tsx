import { useMemo, useState } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Activity, Focus, GitBranch, Search } from "lucide-react";
import { usePortalData } from "../PortalDataStore";
import { codeLabels } from "../mockData";

type ServiceNodeData = {
  label: string;
  code: string;
  category: string;
  selected: boolean;
};

export function ServiceRelationFlow() {
  const { services, relations } = usePortalData();
  const [focusedServiceId, setFocusedServiceId] = useState<number>(
    services[0]?.serviceId ?? 0
  );
  const [depth, setDepth] = useState(1);
  const [query, setQuery] = useState("");
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

  const { visibleServiceIds, depthByServiceId } = useMemo(() => {
    const visible = new Set<number>([focusedServiceId]);
    const levelMap = new Map<number, number>([[focusedServiceId, 0]]);
    let frontier = [focusedServiceId];

    for (let level = 1; level <= depth; level += 1) {
      const next = new Set<number>();

      frontier.forEach((serviceId) => {
        relations.forEach((relation) => {
          if (relation.sourceServiceId === serviceId) {
            next.add(relation.targetServiceId);
          }
          if (relation.targetServiceId === serviceId) {
            next.add(relation.sourceServiceId);
          }
        });
      });

      frontier = Array.from(next).filter((serviceId) => !visible.has(serviceId));
      frontier.forEach((serviceId) => {
        visible.add(serviceId);
        levelMap.set(serviceId, level);
      });
    }

    return { visibleServiceIds: visible, depthByServiceId: levelMap };
  }, [depth, focusedServiceId, relations]);

  const nodes = useMemo<Node<ServiceNodeData>[]>(() => {
    return services
      .filter((service) => visibleServiceIds.has(service.serviceId))
      .map((service, index) => {
        const serviceDepth = depthByServiceId.get(service.serviceId) ?? 0;
        const peersBefore = services
          .filter((item) => visibleServiceIds.has(item.serviceId))
          .slice(0, index)
          .filter((item) => depthByServiceId.get(item.serviceId) === serviceDepth)
          .length;

        return {
          id: String(service.serviceId),
          type: "serviceNode",
          position: {
            x: 80 + serviceDepth * 340,
            y: 80 + peersBefore * 170,
          },
          data: {
            label: service.serviceName,
            code: service.serviceCode,
            category: service.categoryPath.join(" / "),
            selected: focusedServiceId === service.serviceId,
          },
        };
      });
  }, [depthByServiceId, focusedServiceId, services, visibleServiceIds]);

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
          visibleServiceIds.has(relation.targetServiceId)
      )
      .map((relation) => {
        const source = services.find(
          (service) => service.serviceId === relation.sourceServiceId
        );
        const target = services.find(
          (service) => service.serviceId === relation.targetServiceId
        );
        const isFocused =
          focusedServiceId === relation.sourceServiceId ||
          focusedServiceId === relation.targetServiceId;

        return {
          id: String(relation.relationId),
          source: String(relation.sourceServiceId),
          target: String(relation.targetServiceId),
          animated: isFocused && relation.relationStatusCode === "ACTIVE",
          label: `${codeLabels.relationType[relation.relationTypeCode]} · ${
            relation.mandatoryYn === "Y" ? "필수" : "선택"
          }`,
          type: relation.sourceServiceId === relation.targetServiceId ? "step" : "smoothstep",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: relation.mandatoryYn === "Y" ? "#f60" : "#64748b",
          },
          style: {
            stroke: relation.mandatoryYn === "Y" ? "#f60" : "#64748b",
            strokeWidth: relation.mandatoryYn === "Y" ? 2.5 : 1.8,
          },
          labelStyle: {
            fill: "#334155",
            fontSize: 12,
            fontWeight: 600,
          },
          data: {
            sourceName: source?.serviceName,
            targetName: target?.serviceName,
          },
        };
      });
  }, [focusedServiceId, relations, services, visibleServiceIds]);

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

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              서비스 관계도
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              선택한 서비스를 기준으로 의존 대상과 이 서비스를 호출하는 출발
              서비스를 함께 보여줍니다.
            </p>
          </div>

          <div className="w-full max-w-xl space-y-3">
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
            <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard icon={GitBranch} label="기준 서비스 관계" value={focusedRelationCount} />
        <SummaryCard icon={Activity} label="활성 관계" value={activeCount} />
        <SummaryCard icon={Focus} label="필수 관계" value={mandatoryCount} />
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="h-[620px]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => selectService(Number(node.id))}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.4}
            maxZoom={1.5}
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
      <Handle type="source" position={Position.Right} />
    </div>
  );
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
