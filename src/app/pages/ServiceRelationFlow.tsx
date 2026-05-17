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
import { Activity, Focus, GitBranch } from "lucide-react";
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
  const focusedService =
    services.find((service) => service.serviceId === focusedServiceId) ??
    services[0];

  const visibleServiceIds = useMemo(() => {
    const connected = new Set<number>([focusedServiceId]);
    relations.forEach((relation) => {
      if (relation.sourceServiceId === focusedServiceId) {
        connected.add(relation.targetServiceId);
      }
      if (relation.targetServiceId === focusedServiceId) {
        connected.add(relation.sourceServiceId);
      }
    });
    return connected;
  }, [focusedServiceId, relations]);

  const nodes = useMemo<Node<ServiceNodeData>[]>(() => {
    return services
      .filter((service) => visibleServiceIds.has(service.serviceId))
      .map((service, index) => ({
        id: String(service.serviceId),
        type: "serviceNode",
        position: {
          x: 120 + (index % 3) * 320,
          y: 90 + Math.floor(index / 3) * 210,
        },
        data: {
          label: service.serviceName,
          code: service.serviceCode,
          category: service.categoryPath.join(" / "),
          selected: focusedServiceId === service.serviceId,
        },
      }));
  }, [focusedServiceId, visibleServiceIds]);

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
  const focusedRelationCount = focusedService
    ? relations.filter(
        (relation) =>
          relation.sourceServiceId === focusedService.serviceId ||
          relation.targetServiceId === focusedService.serviceId
      ).length
    : 0;

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

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={focusedServiceId}
              onChange={(event) =>
                setFocusedServiceId(Number(event.target.value))
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f60]"
            >
              {services.map((service) => (
                <option key={service.serviceId} value={service.serviceId}>
                  {service.serviceName} 기준
                </option>
              ))}
            </select>
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
