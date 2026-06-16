import { useEffect, useMemo, useRef, useState } from "react";
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
  ChevronRight,
  FileText,
  GitBranch,
  PanelRightOpen,
  Search,
  Server,
  ShieldAlert,
  Users,
} from "lucide-react";
import { usePortalData } from "../PortalDataStore";
import { PageHeader } from "../components/PageHeader";
import {
  codeLabels,
  type ImportanceCode,
  type IncidentRecord,
  type ServerRecord,
  type ServiceRelationRecord,
  type ServiceRecord,
  type TechStackRecord,
} from "../mockData";

type ServiceNodeData = {
  serviceId: number;
  label: string;
  code: string;
  category: string;
  statusCode: keyof typeof codeLabels.serviceStatus;
  importanceCode: ImportanceCode;
  ownerGroup: string;
  serverCount: number;
  focused: boolean;
  connected: boolean;
  detailSelected: boolean;
  relationCount: number;
  lane: number;
  onMoveToFocus: (serviceId: number) => void;
  onOpenDetail: (serviceId: number) => void;
};

type LaneNodeData = {
  label: string;
  lane: number;
};

type GraphNodeData = ServiceNodeData | LaneNodeData;

const NODE_WIDTH = 240;
const X_SPACING = 470;
const Y_SPACING = 238;
const CHILD_Y_SPACING = 214;
const LANE_HEIGHT = 4600;
const DEPENDS_ON_COLOR = "#475569";
const IMPACT_COLOR = "#2563eb";
const MAX_RELATION_DEPTH = 2;
const RELATION_DETAIL_WIDTH = 340;
const RELATION_COLLAPSED_WIDTH = 112;
const RELATION_COLLAPSED_HEIGHT = 40;
const RELATION_WIDTH_ANIMATION_MS = 180;
const RELATION_HEIGHT_ANIMATION_MS = 300;
type TopControlMode = "select" | "search";

function centeredOffset(index: number, count: number, spacing: number) {
  return (index - (count - 1) / 2) * spacing;
}

function enforceVerticalGap(
  candidates: Array<{ serviceId: number; targetY: number }>,
  gap: number
) {
  const sorted = [...candidates].sort(
    (first, second) =>
      first.targetY - second.targetY || first.serviceId - second.serviceId
  );
  const result = new Map<number, number>();

  if (sorted.length === 0) {
    return result;
  }

  const positioned = sorted.map((candidate) => ({
    ...candidate,
    y: candidate.targetY,
  }));

  for (let index = 1; index < positioned.length; index += 1) {
    const previous = positioned[index - 1];
    const current = positioned[index];
    current.y = Math.max(current.y, previous.y + gap);
  }

  const targetCenter =
    (sorted[0].targetY + sorted[sorted.length - 1].targetY) / 2;
  const positionedCenter =
    (positioned[0].y + positioned[positioned.length - 1].y) / 2;
  const correction = positionedCenter - targetCenter;

  positioned.forEach((candidate) => {
    result.set(candidate.serviceId, candidate.y - correction);
  });

  return result;
}

export function ServiceRelationFlow({
  embedded = false,
  embeddedHeightClassName,
  frameless = false,
  hideDepthToggle = false,
  hideDetailPanel = false,
  hideTopControl = false,
  incidentMode = false,
  initialServiceId,
  onSelectService,
}: {
  embedded?: boolean;
  embeddedHeightClassName?: string;
  frameless?: boolean;
  hideDepthToggle?: boolean;
  hideDetailPanel?: boolean;
  hideTopControl?: boolean;
  incidentMode?: boolean;
  initialServiceId?: number;
  onSelectService?: (serviceId: number) => void;
} = {}) {
  const { services, relations, owners, servers, techStacks, incidents } =
    usePortalData();
  const activeIncident = useMemo<IncidentRecord | undefined>(() => {
    return (
      incidents.find(
        (incident) =>
          incident.incidentStatusCode !== "RESOLVED" &&
          (initialServiceId ? incident.serviceId === initialServiceId : true)
      ) ??
      incidents.find((incident) => incident.incidentStatusCode !== "RESOLVED")
    );
  }, [incidents, initialServiceId]);
  const initialFocusedServiceId =
    initialServiceId ?? activeIncident?.serviceId ?? services[0]?.serviceId ?? 0;
  const [focusedServiceId, setFocusedServiceId] = useState<number>(
    initialFocusedServiceId
  );
  const [query, setQuery] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPanelWide, setDetailPanelWide] = useState(false);
  const [detailServiceId, setDetailServiceId] = useState<number>(
    initialFocusedServiceId
  );
  const [relationDepth, setRelationDepth] = useState(1);
  const [topControlMode, setTopControlMode] =
    useState<TopControlMode>("select");
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<GraphNodeData> | null>(null);
  const userMovedViewportRef = useRef(false);
  const autoCenteredKeyRef = useRef("");

  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.serviceId, service])),
    [services]
  );
  const serverById = useMemo(
    () => new Map(servers.map((server) => [server.serverId, server])),
    [servers]
  );
  const ownersByServiceId = useMemo(() => {
    const next = new Map<number, string[]>();
    owners.forEach((owner) => {
      const serviceOwners = next.get(owner.serviceId) ?? [];
      serviceOwners.push(owner.ownerName);
      next.set(owner.serviceId, serviceOwners);
    });
    return next;
  }, [owners]);
  const ownerByServiceId = useMemo(
    () =>
      new Map(
        Array.from(ownersByServiceId.entries()).map(([serviceId, ownerNames]) => [
          serviceId,
          ownerNames.join(", "),
        ])
      ),
    [ownersByServiceId]
  );
  const techStacksByServiceId = useMemo(() => {
    const next = new Map<number, TechStackRecord[]>();
    techStacks.forEach((techStack) => {
      const serviceStacks = next.get(techStack.serviceId) ?? [];
      serviceStacks.push(techStack);
      next.set(techStack.serviceId, serviceStacks);
    });
    return next;
  }, [techStacks]);

  const activeRelations = useMemo(
    () =>
      relations.filter(
        (relation) =>
          relation.relationStatusCode === "ACTIVE" &&
          relation.sourceServiceId !== relation.targetServiceId
      ),
    [relations]
  );
  const activeIncidentServiceId =
    activeIncident?.serviceId ?? initialFocusedServiceId;
  const activeIncidentConnectedServiceIds = useMemo(() => {
    const connected = new Set<number>();
    activeRelations.forEach((relation) => {
      if (relation.sourceServiceId === activeIncidentServiceId) {
        connected.add(relation.targetServiceId);
      }
      if (relation.targetServiceId === activeIncidentServiceId) {
        connected.add(relation.sourceServiceId);
      }
    });
    return connected;
  }, [activeIncidentServiceId, activeRelations]);

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
    if (!normalized) {
      return [];
    }

    return services
      .filter((service) => {
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
  }, [query, services]);

  const {
    visibleRelationIds,
    visibleServiceIds,
    laneByServiceId,
    yByServiceId,
  } = useMemo(() => {
    const visible = new Set<number>([focusedServiceId]);
    const laneMap = new Map<number, number>([[focusedServiceId, 0]]);
    const parentByServiceId = new Map<number, number>();
    const relationIds = new Set<number>();
    const incomingByTarget = new Map<number, ServiceRelationRecord[]>();
    const outgoingBySource = new Map<number, ServiceRelationRecord[]>();

    activeRelations.forEach((relation) => {
      const incoming = incomingByTarget.get(relation.targetServiceId) ?? [];
      incoming.push(relation);
      incomingByTarget.set(relation.targetServiceId, incoming);

      const outgoing = outgoingBySource.get(relation.sourceServiceId) ?? [];
      outgoing.push(relation);
      outgoingBySource.set(relation.sourceServiceId, outgoing);
    });

    const compareServiceIds = (firstId: number, secondId: number) => {
      const firstName = serviceById.get(firstId)?.serviceName ?? "";
      const secondName = serviceById.get(secondId)?.serviceName ?? "";

      return (
        firstName.localeCompare(secondName, "ko") ||
        firstId - secondId
      );
    };

    const expandDirection = (
      direction: "incoming" | "outgoing",
      maxDepth: number
    ) => {
      const queue: Array<{
        depth: number;
        pathIds: number[];
        serviceId: number;
      }> = [{ depth: 0, pathIds: [focusedServiceId], serviceId: focusedServiceId }];

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current || current.depth >= maxDepth) {
          continue;
        }

        const candidates =
          direction === "incoming"
            ? incomingByTarget.get(current.serviceId) ?? []
            : outgoingBySource.get(current.serviceId) ?? [];

        candidates.forEach((relation) => {
          const nextServiceId =
            direction === "incoming"
              ? relation.sourceServiceId
              : relation.targetServiceId;

          if (
            current.pathIds.includes(nextServiceId)
          ) {
            return;
          }

          const nextDepth = current.depth + 1;
          const nextLane = direction === "incoming" ? -nextDepth : nextDepth;
          const previousLane = laneMap.get(nextServiceId);

          if (
            previousLane === undefined ||
            Math.abs(previousLane) > nextDepth
          ) {
            visible.add(nextServiceId);
            laneMap.set(nextServiceId, nextLane);
            parentByServiceId.set(nextServiceId, current.serviceId);
            relationIds.add(relation.relationId);

            if (nextDepth < maxDepth) {
              queue.push({
                serviceId: nextServiceId,
                depth: nextDepth,
                pathIds: [...current.pathIds, nextServiceId],
              });
            }
          } else if (previousLane === nextLane) {
            relationIds.add(relation.relationId);
          }
        });
      }
    };

    expandDirection("incoming", relationDepth);
    expandDirection("outgoing", relationDepth);

    activeRelations.forEach((relation) => {
      if (
        !visible.has(relation.sourceServiceId) ||
        !visible.has(relation.targetServiceId)
      ) {
        return;
      }

      const sourceLane = laneMap.get(relation.sourceServiceId);
      const targetLane = laneMap.get(relation.targetServiceId);

      if (
        sourceLane !== undefined &&
        targetLane !== undefined &&
        targetLane - sourceLane === 1
      ) {
        relationIds.add(relation.relationId);
      }
    });

    const laneGroups = new Map<number, number[]>();
    visible.forEach((serviceId) => {
      const lane = laneMap.get(serviceId) ?? 0;
      const laneServices = laneGroups.get(lane) ?? [];
      laneServices.push(serviceId);
      laneGroups.set(lane, laneServices);
    });

    const yMap = new Map<number, number>([[focusedServiceId, 0]]);

    for (let depth = 1; depth <= relationDepth; depth += 1) {
      [-depth, depth].forEach((lane) => {
        const laneServiceIds = [...(laneGroups.get(lane) ?? [])].sort(
          compareServiceIds
        );

        if (laneServiceIds.length === 0) {
          return;
        }

        const candidates: Array<{ serviceId: number; targetY: number }> = [];

        if (depth === 1) {
          laneServiceIds.forEach((serviceId, index) => {
            candidates.push({
              serviceId,
              targetY: centeredOffset(index, laneServiceIds.length, Y_SPACING),
            });
          });
        } else {
          const childIdsByParent = new Map<number, number[]>();

          laneServiceIds.forEach((serviceId) => {
            const parentId = parentByServiceId.get(serviceId) ?? focusedServiceId;
            const childIds = childIdsByParent.get(parentId) ?? [];
            childIds.push(serviceId);
            childIdsByParent.set(parentId, childIds);
          });

          Array.from(childIdsByParent.entries())
            .sort(([firstParentId], [secondParentId]) => {
              const yDifference =
                (yMap.get(firstParentId) ?? 0) -
                (yMap.get(secondParentId) ?? 0);

              return yDifference || compareServiceIds(firstParentId, secondParentId);
            })
            .forEach(([parentId, childIds]) => {
              const parentY = yMap.get(parentId) ?? 0;
              const sortedChildIds = [...childIds].sort(compareServiceIds);

              sortedChildIds.forEach((serviceId, index) => {
                candidates.push({
                  serviceId,
                  targetY:
                    parentY +
                    centeredOffset(index, sortedChildIds.length, CHILD_Y_SPACING),
                });
              });
            });
        }

        enforceVerticalGap(candidates, Y_SPACING).forEach((y, serviceId) => {
          yMap.set(serviceId, y);
        });
      });
    }

    return {
      visibleRelationIds: relationIds,
      visibleServiceIds: visible,
      laneByServiceId: laneMap,
      yByServiceId: yMap,
    };
  }, [activeRelations, focusedServiceId, relationDepth, serviceById]);

  const laneNodes = useMemo<Node<LaneNodeData>[]>(() => {
    const nodes: Node<LaneNodeData>[] = [];
    for (let lane = -relationDepth; lane <= relationDepth; lane += 1) {
      nodes.push({
        id: `lane-${lane}`,
        type: "laneNode",
        position: {
          x: lane * X_SPACING - (X_SPACING - NODE_WIDTH) / 2,
          y: -LANE_HEIGHT / 2,
        },
        data: { label: getLaneLabel(lane), lane },
        draggable: false,
        selectable: false,
        focusable: false,
        zIndex: -10,
      });
    }
    return nodes;
  }, [relationDepth]);

  const openServiceDetail = (serviceId: number) => {
    setDetailServiceId(serviceId);
    setDetailOpen(true);
    onSelectService?.(serviceId);
  };

  const moveToFocusedService = (serviceId: number) => {
    userMovedViewportRef.current = false;
    setFocusedServiceId(serviceId);
    setDetailOpen(false);
    setQuery("");
    onSelectService?.(serviceId);
  };

  const serviceNodes = useMemo<Node<ServiceNodeData>[]>(() => {
    const visibleServices = services.filter((service) => {
      return visibleServiceIds.has(service.serviceId);
    });

    return visibleServices.map((service) => {
      const lane = laneByServiceId.get(service.serviceId) ?? 0;
      const connected =
        service.serviceId === focusedServiceId ||
        connectedServiceIds.has(service.serviceId);

      return {
        id: String(service.serviceId),
        type: "serviceNode",
        position: {
          x: lane * X_SPACING,
          y: yByServiceId.get(service.serviceId) ?? 0,
        },
        data: {
          serviceId: service.serviceId,
          label: service.serviceName,
          code: service.serviceCode,
          category: service.categoryPath.join(" / "),
          statusCode: service.statusCode,
          importanceCode: service.importanceCode ?? "NORMAL",
          ownerGroup: ownerByServiceId.get(service.serviceId) ?? "미지정",
          serverCount: service.serverId ? 1 : 0,
          focused: service.serviceId === focusedServiceId,
          connected,
          detailSelected:
            detailOpen && detailServiceId === service.serviceId,
          relationCount: relationCountByServiceId.get(service.serviceId) ?? 0,
          lane,
          onMoveToFocus: moveToFocusedService,
          onOpenDetail: openServiceDetail,
        },
      };
    });
  }, [
    focusedServiceId,
    connectedServiceIds,
    detailOpen,
    detailServiceId,
    laneByServiceId,
    moveToFocusedService,
    openServiceDetail,
    onSelectService,
    ownerByServiceId,
    relationCountByServiceId,
    services,
    visibleServiceIds,
    yByServiceId,
  ]);

  const edges = useMemo<Edge[]>(() => {
    return activeRelations
      .filter(
        (relation) => {
          const sourceLane = laneByServiceId.get(relation.sourceServiceId);
          const targetLane = laneByServiceId.get(relation.targetServiceId);

          return (
            visibleRelationIds.has(relation.relationId) &&
            visibleServiceIds.has(relation.sourceServiceId) &&
            visibleServiceIds.has(relation.targetServiceId) &&
            sourceLane !== undefined &&
            targetLane !== undefined &&
            targetLane - sourceLane === 1
          );
        }
      )
      .map((relation) => {
        const sourceLane = laneByServiceId.get(relation.sourceServiceId) ?? 0;
        const targetLane = laneByServiceId.get(relation.targetServiceId) ?? 0;
        const directlyConnected =
          relation.sourceServiceId === focusedServiceId ||
          relation.targetServiceId === focusedServiceId;
        const stroke =
          sourceLane >= 0 && targetLane > sourceLane
            ? IMPACT_COLOR
            : DEPENDS_ON_COLOR;

        return {
          id: String(relation.relationId),
          source: String(relation.sourceServiceId),
          target: String(relation.targetServiceId),
          type: "default",
          className: directlyConnected
            ? "chainview-flow-edge chainview-flow-edge-active"
            : "chainview-flow-edge chainview-flow-edge-muted",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: stroke,
          },
          style: {
            stroke,
            strokeWidth: directlyConnected ? 2.6 : 1.75,
            opacity: directlyConnected ? 0.9 : 0.62,
          },
        };
      });
  }, [
    activeRelations,
    focusedServiceId,
    laneByServiceId,
    visibleRelationIds,
    visibleServiceIds,
  ]);

  const nodes = useMemo<Node<GraphNodeData>[]>(
    () => [...laneNodes, ...serviceNodes],
    [laneNodes, serviceNodes]
  );
  const nodeTypes = useMemo(
    () => ({ laneNode: LaneNode, serviceNode: ServiceNode }),
    []
  );
  const focusedService = serviceById.get(focusedServiceId) ?? services[0];
  const detailService =
    serviceById.get(detailServiceId) ?? focusedService ?? services[0];
  const detailServer = detailService
    ? serverById.get(detailService.serverId)
    : undefined;
  const detailOwners = detailService
    ? ownersByServiceId.get(detailService.serviceId) ?? []
    : [];
  const detailTechStacks = detailService
    ? techStacksByServiceId.get(detailService.serviceId) ?? []
    : [];
  const directIncomingCount = activeRelations.filter(
    (relation) => relation.targetServiceId === detailService?.serviceId
  ).length;
  const directOutgoingCount = activeRelations.filter(
    (relation) => relation.sourceServiceId === detailService?.serviceId
  ).length;
  const detailInIncidentScope =
    incidentMode && detailService
      ? detailService.serviceId === activeIncidentServiceId ||
        activeIncidentConnectedServiceIds.has(detailService.serviceId)
      : false;

  useEffect(() => {
    if (!incidentMode && !initialServiceId) {
      return;
    }

    setFocusedServiceId(initialFocusedServiceId);
    setDetailServiceId(initialFocusedServiceId);
    setDetailOpen(true);
    setRelationDepth(2);
    userMovedViewportRef.current = false;
  }, [incidentMode, initialFocusedServiceId, initialServiceId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!flowInstance) {
        return;
      }

      const expanded = relationDepth > 1;
      const autoCenterKey = `${focusedServiceId}:${relationDepth}`;

      if (
        userMovedViewportRef.current &&
        autoCenteredKeyRef.current === autoCenterKey
      ) {
        return;
      }

      flowInstance.setCenter(NODE_WIDTH / 2, 0, {
        zoom: expanded ? 0.52 : 0.86,
        duration: 800,
      });
      autoCenteredKeyRef.current = autoCenterKey;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [flowInstance, focusedServiceId, relationDepth]);

  const shellClassName = embedded
    ? "min-h-[680px]"
    : "mx-auto flex w-full max-w-[1600px] flex-col gap-5";
  const canvasClassName = embedded
    ? `relative ${embeddedHeightClassName ?? "h-[680px] min-h-[620px]"}`
    : "relative h-[calc(100vh-188px)] min-h-[620px]";

  return (
    <div className={shellClassName}>
      {!embedded && (
        <PageHeader
          description="선택 서비스를 기준으로 송신/수신 관계와 주변 depth를 확인합니다."
          icon={<GitBranch size={22} />}
          title={incidentMode ? "장애 영향도 그래프" : "관계 그래프"}
        />
      )}

      <section
        className={
          frameless
            ? "overflow-hidden bg-white"
            : "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        }
      >
        <div className={canvasClassName}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={(instance) => setFlowInstance(instance)}
            onMoveStart={(event) => {
              if (event) {
                userMovedViewportRef.current = true;
              }
            }}
            minZoom={0.18}
            maxZoom={1.4}
            className="relative z-[1]"
          >
            <Background gap={24} size={1.1} color="#dbe4f0" />
            <Controls />
          </ReactFlow>

          {focusedService && !hideTopControl && (
            <RelationTopControl
              detailOpen={detailPanelWide}
              focusedService={focusedService}
              mode={topControlMode}
              query={query}
              searchResults={filteredSearchServices}
              services={services}
              onModeChange={setTopControlMode}
              onQueryChange={setQuery}
              onSelectService={moveToFocusedService}
            />
          )}

          {detailService && !hideDetailPanel && (
            <RelationServiceDetailPanel
              open={detailOpen}
              incomingCount={directIncomingCount}
              incidentMode={detailInIncidentScope}
              incidentTitle={activeIncident?.title}
              impactCount={activeIncidentConnectedServiceIds.size}
              outgoingCount={directOutgoingCount}
              owners={detailOwners}
              server={detailServer}
              service={detailService}
              techStacks={detailTechStacks}
              onPanelWideChange={setDetailPanelWide}
              onOpenChange={setDetailOpen}
            />
          )}

          {!hideDepthToggle && (
            <RelationDepthToggle
              depth={relationDepth}
              onDepthChange={setRelationDepth}
            />
          )}
        </div>
      </section>

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

        .chainview-flow-node-detail-selected {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.2),
            0 14px 30px rgba(14, 165, 233, 0.18);
        }

        .chainview-lane-node {
          width: ${X_SPACING}px;
          height: ${LANE_HEIGHT}px;
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

function RelationTopControl({
  detailOpen,
  focusedService,
  mode,
  query,
  searchResults,
  services,
  onModeChange,
  onQueryChange,
  onSelectService,
}: {
  detailOpen: boolean;
  focusedService: ServiceRecord;
  mode: TopControlMode;
  query: string;
  searchResults: ServiceRecord[];
  services: ServiceRecord[];
  onModeChange: (mode: TopControlMode) => void;
  onQueryChange: (value: string) => void;
  onSelectService: (serviceId: number) => void;
}) {
  const [openCategoryLevel, setOpenCategoryLevel] = useState<number | null>(
    null
  );
  const selectedPath = focusedService.categoryPath.slice(0, 4);
  const compactCategory = selectedPath.length >= 4;
  const categoryOptions = useMemo(
    () =>
      Array.from({ length: 4 }, (_, level) => {
        const prefix = selectedPath.slice(0, level);
        const values = services
          .filter((service) =>
            prefix.every(
              (segment, index) => service.categoryPath[index] === segment
            )
          )
          .map((service) => service.categoryPath[level])
          .filter((segment): segment is string => Boolean(segment));

        return Array.from(new Set(values)).sort((first, second) =>
          first.localeCompare(second, "ko")
        );
      }),
    [selectedPath, services]
  );

  const selectCategory = (level: number, value: string) => {
    const prefix = selectedPath.slice(0, level);
    const nextService =
      services.find(
        (service) =>
          prefix.every(
            (segment, index) => service.categoryPath[index] === segment
          ) && service.categoryPath[level] === value
      ) ??
      services.find((service) => service.categoryPath[level] === value);

    if (nextService) {
      onSelectService(nextService.serviceId);
    }
    setOpenCategoryLevel(null);
  };

  const selectSearchResult = (serviceId: number) => {
    onSelectService(serviceId);
    onQueryChange("");
    onModeChange("select");
    setOpenCategoryLevel(null);
  };

  const switchMode = () => {
    const nextMode = mode === "select" ? "search" : "select";
    onModeChange(nextMode);
    setOpenCategoryLevel(null);
    if (nextMode === "select") {
      onQueryChange("");
    }
  };

  return (
    <div
      className="pointer-events-none absolute top-4 z-40 flex justify-center transition-[left,right] duration-300 ease-out"
      style={{
        left: 16,
        right: detailOpen ? RELATION_DETAIL_WIDTH + 32 : 16,
      }}
    >
      <div
        className={`pointer-events-auto mx-auto rounded-full border border-slate-300 bg-white/95 p-1.5 text-slate-900 shadow-sm transition-[width,box-shadow,transform] duration-300 ease-out ${
          mode === "search"
            ? "w-[min(440px,100%)] shadow-md"
            : compactCategory
              ? "w-[min(480px,100%)]"
              : "w-[min(560px,100%)]"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="relative min-h-11 flex-1 overflow-visible">
            <div
              className={`absolute inset-0 transition-all duration-300 ease-out ${
                mode === "select"
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-3 opacity-0"
              }`}
            >
              <div className="flex h-11 min-w-0 items-center overflow-hidden rounded-full bg-white px-2">
                {selectedPath.map((segment, index) => (
                  <span
                    key={`${segment}-${index}`}
                    className="flex min-w-0 items-center"
                  >
                    {index > 0 && (
                      <ChevronRight
                        size={18}
                        className="mx-1.5 shrink-0 text-slate-300"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setOpenCategoryLevel((current) =>
                          current === index ? null : index
                        )
                      }
                      className={`flex items-center gap-1 rounded-full px-1.5 py-1 text-sm font-black transition hover:bg-slate-50 ${
                        compactCategory ? "max-w-[76px]" : "max-w-[128px]"
                      } ${
                        index === selectedPath.length - 1
                          ? "text-slate-500"
                          : "text-slate-950"
                      }`}
                    >
                      <span className="min-w-0 truncate">{segment}</span>
                      <ChevronDown
                        size={14}
                        className={`shrink-0 text-slate-400 transition-transform ${
                          openCategoryLevel === index ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </span>
                ))}
              </div>

              {openCategoryLevel !== null && (
                <div className="absolute left-0 right-0 top-[calc(100%+10px)] max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {categoryOptions[openCategoryLevel].map((option) => {
                    const selected = option === selectedPath[openCategoryLevel];

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          selectCategory(openCategoryLevel, option)
                        }
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          selected
                            ? "bg-[#f2f7ff] text-[#1f6feb]"
                            : "text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <span className="min-w-0 truncate text-sm font-black">
                          {option}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ${
                            selected
                              ? "bg-white/15 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {openCategoryLevel + 1}단계
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div
              className={`absolute inset-0 transition-all duration-300 ease-out ${
                mode === "search"
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-3 opacity-0"
              }`}
            >
              <div className="relative">
                <label className="flex h-11 items-center gap-2 rounded-full bg-slate-50 px-4 focus-within:bg-white">
                  <Search size={18} className="shrink-0 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && searchResults[0]) {
                        selectSearchResult(searchResults[0].serviceId);
                      }
                    }}
                    placeholder="서비스명, 코드, 분류 검색"
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </label>

                {query.trim() && (
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    {searchResults.length > 0 ? (
                      searchResults.map((service) => (
                        <button
                          key={service.serviceId}
                          onClick={() => selectSearchResult(service.serviceId)}
                          className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            <GitBranch size={15} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-slate-900">
                              {service.serviceName}
                            </span>
                            <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                              {service.serviceCode} ·{" "}
                              {service.categoryPath.join(" / ")}
                            </span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs font-bold text-slate-400">
                        검색 결과가 없습니다.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={switchMode}
            className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#3182f6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1b64da]"
            title={mode === "select" ? "검색 모드로 변경" : "분류 모드로 변경"}
          >
            {mode === "select" ? <Search size={17} /> : <GitBranch size={17} />}
            <span>{mode === "select" ? "검색" : "분류"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function RelationDepthToggle({
  depth,
  onDepthChange,
}: {
  depth: number;
  onDepthChange: (depth: number) => void;
}) {
  const expanded = depth >= MAX_RELATION_DEPTH;
  const nextDepth = expanded ? 1 : MAX_RELATION_DEPTH;

  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 z-40 -translate-x-1/2">
      <button
        type="button"
        onClick={() => onDepthChange(nextDepth)}
        className={`pointer-events-auto flex h-11 min-w-[132px] items-center justify-center gap-2 rounded-full border px-5 text-sm font-black shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${
          expanded
            ? "border-[#3182f6] bg-[#3182f6] text-white hover:bg-[#1b64da]"
            : "border-slate-200 bg-white/95 text-slate-800 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <span>{expanded ? "Depth 축소" : "Depth 확장"}</span>
      </button>
    </div>
  );
}

function RelationServiceDetailPanel({
  open,
  incomingCount,
  incidentMode,
  incidentTitle,
  impactCount,
  outgoingCount,
  owners,
  server,
  service,
  techStacks,
  onPanelWideChange,
  onOpenChange,
}: {
  open: boolean;
  incomingCount: number;
  incidentMode?: boolean;
  incidentTitle?: string;
  impactCount: number;
  outgoingCount: number;
  owners: string[];
  server?: ServerRecord;
  service: ServiceRecord;
  techStacks: TechStackRecord[];
  onPanelWideChange: (wide: boolean) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [panelWide, setPanelWide] = useState(open);
  const [panelTall, setPanelTall] = useState(open);

  useEffect(() => {
    let frame = 0;
    let widthTimer = 0;
    let heightTimer = 0;

    if (open) {
      frame = window.requestAnimationFrame(() => {
        setPanelWide(true);
        onPanelWideChange(true);
        heightTimer = window.setTimeout(() => {
          setPanelTall(true);
        }, RELATION_WIDTH_ANIMATION_MS);
      });
    } else {
      setPanelTall(false);
      widthTimer = window.setTimeout(() => {
        setPanelWide(false);
        onPanelWideChange(false);
      }, RELATION_HEIGHT_ANIMATION_MS);
    }

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      if (widthTimer) {
        window.clearTimeout(widthTimer);
      }
      if (heightTimer) {
        window.clearTimeout(heightTimer);
      }
    };
  }, [onPanelWideChange, open]);

  return (
    <aside
      className={`absolute right-4 top-4 z-30 flex origin-top-right transform-gpu flex-col overflow-hidden border border-slate-200 bg-white/96 text-slate-900 transition-[width,max-height,box-shadow,border-radius,transform] ease-out ${
        panelTall
          ? "rounded-2xl shadow-xl"
          : "rounded-[22px] shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      } ${open ? "" : "cursor-pointer"}`}
      style={{
        width: panelWide ? RELATION_DETAIL_WIDTH : RELATION_COLLAPSED_WIDTH,
        maxHeight: panelTall
          ? "calc(100% - 32px)"
          : RELATION_COLLAPSED_HEIGHT,
        transitionDuration: `${panelWide && !panelTall ? RELATION_HEIGHT_ANIMATION_MS : RELATION_WIDTH_ANIMATION_MS}ms`,
      }}
      onClick={() => {
        if (!open) {
          onOpenChange(true);
        }
      }}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute right-0 top-0 flex h-10 w-[112px] items-center justify-center gap-1.5 px-3 text-sm font-black text-slate-800 transition-opacity duration-150 ${
          panelTall ? "opacity-0" : "opacity-100"
        }`}
      >
        <PanelRightOpen size={15} className="shrink-0 text-slate-600" />
        <span>상세</span>
      </div>

      <div
        className={`flex min-h-0 min-w-[340px] flex-1 flex-col transition-opacity duration-150 ${
          panelTall ? "opacity-100" : "opacity-0"
        }`}
      >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4">
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-600">선택 서비스 상세</div>
          <h3 className="mt-1 break-words text-lg font-black leading-tight">
            {service.serviceName}
          </h3>
          <div className="mt-1 text-xs font-bold text-slate-500">
            {service.serviceCode}
          </div>
        </div>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onOpenChange(false);
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
          title="상세 접기"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-400">상태</div>
              <div className="mt-1">
                <StatusPill statusCode={service.statusCode} />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-400">중요도</div>
              <div className="mt-1 text-sm font-black text-slate-800">
                {codeLabels.importance[service.importanceCode ?? "NORMAL"]}
              </div>
            </div>
          </div>
        </div>

        <RelationDetailItem
          label="분류"
          value={service.categoryPath.join(" / ")}
        />
        <RelationDetailItem
          label="배포 서버"
          value={server?.serverName ?? "서버 미지정"}
        />
        <RelationDetailItem
          label="담당"
          value={owners.length > 0 ? owners.join(", ") : "미지정"}
        />
        <RelationDetailItem
          label="엔드포인트"
          value={service.endpointUrl || "미입력"}
        />

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="text-xs font-semibold text-slate-400">수신</div>
            <div className="mt-1 text-lg font-black text-slate-900">
              {incomingCount}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="text-xs font-semibold text-slate-400">송신</div>
            <div className="mt-1 text-lg font-black text-slate-900">
              {outgoingCount}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-400">기술 스택</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {techStacks.length > 0 ? (
              techStacks.slice(0, 8).map((techStack) => (
                <span
                  key={techStack.techStackId}
                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600"
                >
                  {techStack.techName}
                </span>
              ))
            ) : (
              <span className="text-xs font-semibold text-slate-400">
                등록된 기술 스택이 없습니다.
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-400">설명</div>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
            {service.description || "등록된 설명이 없습니다."}
          </p>
        </div>

        {incidentMode ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs font-black text-slate-700">
              <ShieldAlert size={14} />
              장애 영향 감지
            </div>
            <div className="mt-2 text-sm font-black leading-5 text-slate-950">
              {incidentTitle ?? `${service.serviceName} 장애 영향 분석`}
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
              연계 관계 기준 직접/간접 영향 서비스 {impactCount}개가
              감지되었습니다. 서비스 처리 지연, 알림 전파, 담당자 ACK 상태를
              함께 확인해야 합니다.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ImpactBox label="직접 수신" value={incomingCount} />
              <ImpactBox label="직접 송신" value={outgoingCount} />
            </div>
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-black text-slate-700">
                <FileText size={14} />
                영향도 분석 결과
              </div>
              <div className="space-y-1.5 text-xs font-semibold leading-5 text-slate-600">
                <div>원인 추정: 장애 중심 서비스 응답 지연</div>
                <div>사용자 영향: 로그인/조회/배치 처리 지연 가능</div>
                <div>조치 방향: 담당 그룹 알림 후 타임라인에 조치 기록</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      </div>
    </aside>
  );
}

function ImpactBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] font-black text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-black text-slate-950">{value}</div>
    </div>
  );
}

function RelationDetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="text-xs font-semibold text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-bold leading-5 text-slate-800">
        {value}
      </div>
    </div>
  );
}

function ServiceNode({ data }: { data: ServiceNodeData }) {
  return (
    <div
      className={`chainview-flow-node ${
        data.focused ? "chainview-flow-node-focused" : ""
      } ${data.detailSelected ? "chainview-flow-node-detail-selected" : ""} ${
        data.connected ? "chainview-flow-node-connected" : ""
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-950">
            {data.label}
          </div>
          <div className="mt-1 truncate text-xs font-medium text-slate-500">
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
      <div className="nodrag nopan mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            data.onOpenDetail(data.serviceId);
          }}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-black text-slate-700 transition hover:bg-slate-100"
        >
          <PanelRightOpen size={13} />
          상세보기
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            data.onMoveToFocus(data.serviceId);
          }}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <ChevronRight size={13} />
          이동
        </button>
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
}: {
  statusCode: keyof typeof codeLabels.serviceStatus;
}) {
  const className =
    statusCode === "NORMAL"
      ? "border-slate-200 bg-slate-50 text-slate-700"
      : statusCode === "INCIDENT" || statusCode === "INACTIVE"
        ? "border-[#ffd1d6] bg-[#fff5f6] text-[#f04452]"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold ${className}`}
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
    return lane === -1 ? "수신 서비스" : `수신 ${Math.abs(lane)}뎁스`;
  }
  return lane === 1 ? "송신 서비스" : `송신 ${lane}뎁스`;
}
