import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
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
import { matchesSearchText, searchableText } from "../../utils/search";
import {
  codeLabels,
  type ImportanceCode,
  type IncidentRecord,
  type ServerRecord,
  type ServiceRelationRecord,
  type ServiceRecord,
  type TechStackRecord,
} from "../mockData";
import { chainViewApi } from "../chainViewApi";
import {
  infraNodesSnapshot,
  infraRelationsSnapshot,
} from "../infraSnapshot";

type ServiceNodeData = {
  compact: boolean;
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
  dimmed: boolean;
  detailSelected: boolean;
  hideActions: boolean;
  relationImpactPath?: string;
  relationImpactText?: string;
  relationCount: number;
  lane: number;
  onMoveToFocus: (serviceId: number) => void;
  onOpenDetail: (serviceId: number) => void;
  onSelectServiceNode: (serviceId: number) => void;
};

type LaneNodeData = {
  label: string;
  lane: number;
};

type ServerInfraNodeData = {
  connected: boolean;
  dimmed: boolean;
  focused: boolean;
  infraNodeId: number;
  kind: "server" | "infra";
  label: string;
  code: string;
  meta: string;
  onSelect: (infraNodeId: number) => void;
  statusCode?: keyof typeof codeLabels.serverStatus;
};

type GraphNodeData = ServiceNodeData | LaneNodeData | ServerInfraNodeData;

type RelationImpactSummary = {
  path: string;
  text: string;
};

function normalizeGraphLookupValue(value?: string | null) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

function inferInfraNodeCodeForServer(server?: ServerRecord) {
  if (!server) {
    return undefined;
  }

  const host = server.hostName.toLowerCase();
  const name = normalizeGraphLookupValue(server.serverName);

  if (/chn-prd-(web|was)0?1/.test(host)) return "X86-CHN-PRD-01";
  if (/chn-prd-(web|was)0?2/.test(host)) return "X86-CHN-PRD-02";
  if (/core-prd-was0?1/.test(host)) return "LPAR-WAS-01";
  if (/core-prd-was0?2/.test(host)) return "LPAR-WAS-02";
  if (/core-prd-batch/.test(host)) return "LPAR-BATCH-01";
  if (/dr-chn-web/.test(host)) return "LPAR-DR-WAS-01";
  if (/if-prd-/.test(host)) return "X86-IF-PRD-01";
  if (/db-prd-/.test(host)) return "ORA-RAC-PRD-01";
  if (/cmm-prd-|msg-prd-|mon-prd-|data-prd-/.test(host)) {
    return "X86-CMM-PRD-01";
  }

  if (name.includes("채널") && name.includes("1")) return "X86-CHN-PRD-01";
  if (name.includes("채널") && name.includes("2")) return "X86-CHN-PRD-02";
  if (name.includes("기간계") && name.includes("was") && name.includes("1")) {
    return "LPAR-WAS-01";
  }
  if (name.includes("기간계") && name.includes("was") && name.includes("2")) {
    return "LPAR-WAS-02";
  }
  if (name.includes("기간계") && name.includes("배치")) return "LPAR-BATCH-01";
  if (name.includes("대외계")) return "X86-IF-PRD-01";
  if (
    name.includes("인증") ||
    name.includes("공통") ||
    name.includes("메시징") ||
    name.includes("모니터링") ||
    name.includes("정보계")
  ) {
    return "X86-CMM-PRD-01";
  }

  return undefined;
}

const NODE_WIDTH = 240;
const X_SPACING = 470;
const Y_SPACING = 238;
const CHILD_Y_SPACING = 214;
const ALL_SERVICES_Y_SPACING = 88;
const ALL_SERVICES_CATEGORY_GAP = 36;
const ALL_MODE_INFRA_RIGHTMOST_X = 360;
const ALL_MODE_SERVICE_LEFTMOST_X = 760;
const LANE_HEIGHT = 4600;
const DEPENDS_ON_COLOR = "#475569";
const IMPACT_COLOR = "#2563eb";
const SERVICE_INFRA_COLOR = "#f59e0b";
const MAX_RELATION_DEPTH = 2;
const RELATION_DETAIL_WIDTH = 340;
const RELATION_COLLAPSED_WIDTH = 112;
const RELATION_COLLAPSED_HEIGHT = 40;
const RELATION_WIDTH_ANIMATION_MS = 180;
const RELATION_HEIGHT_ANIMATION_MS = 300;
type TopControlMode = "select" | "search";
type GraphViewMode = "all" | "service" | "infra";
type GraphModeTogglePlacement = "top-right" | "bottom-center";
type RelationLegendPlacement = "bottom-right" | "top-left";
type IncidentCanvasTone = "dark" | "light";

export type InfraGraphNodeRecord = {
  infraNodeId: number;
  nodeCode: string;
  nodeName: string;
  nodeTypeCode: string;
  nodeTypeName?: string;
  statusCode?: string;
  statusName?: string;
  locationLabel?: string;
  vendorModel?: string;
  serverCount?: number;
  updatedAt?: string;
};

type InfraGraphRelationRecord = {
  infraRelationId: number;
  sourceInfraNodeId: number;
  targetInfraNodeId: number;
  relationTypeCode: string;
};

const shouldUseRemoteInfraApi = () =>
  !import.meta.env.DEV && typeof window !== "undefined";

const normalizeInfraNode = (node: any): InfraGraphNodeRecord => ({
  infraNodeId: Number(node.infraNodeId ?? node.id),
  nodeCode: String(node.nodeCode ?? ""),
  nodeName: String(node.nodeName ?? ""),
  nodeTypeCode: String(node.nodeTypeCode ?? "INFRA"),
  nodeTypeName: node.nodeTypeName ? String(node.nodeTypeName) : undefined,
  statusCode: node.statusCode ? String(node.statusCode) : undefined,
  statusName: node.statusName ? String(node.statusName) : undefined,
  locationLabel: node.locationLabel ? String(node.locationLabel) : undefined,
  vendorModel: node.vendorModel ? String(node.vendorModel) : undefined,
  serverCount:
    node.serverCount === undefined || node.serverCount === null
      ? undefined
      : Number(node.serverCount),
  updatedAt: node.updatedAt ? String(node.updatedAt) : undefined,
});

const normalizeInfraRelation = (edge: any): InfraGraphRelationRecord => ({
  infraRelationId: Number(edge.infraEdgeId ?? edge.infraRelationId ?? edge.id),
  sourceInfraNodeId: Number(edge.fromNodeId ?? edge.sourceInfraNodeId),
  targetInfraNodeId: Number(edge.toNodeId ?? edge.targetInfraNodeId),
  relationTypeCode: String(edge.relationTypeCode ?? "LINK"),
});

async function fetchInfraGraphSnapshot() {
  const nodes = (await chainViewApi.infraNodes.list())
    .map(normalizeInfraNode)
    .filter((node) => node.infraNodeId);
  const edgeLists = await Promise.all(
    nodes.map((node) =>
      chainViewApi.infraNodes.edges(node.infraNodeId).catch(() => [])
    )
  );
  const relationById = new Map<number, InfraGraphRelationRecord>();

  edgeLists.flat().forEach((edge) => {
    const relation = normalizeInfraRelation(edge);
    if (
      !relation.infraRelationId ||
      !relation.sourceInfraNodeId ||
      !relation.targetInfraNodeId
    ) {
      return;
    }
    relationById.set(relation.infraRelationId, relation);
  });

  return {
    nodes,
    relations: [...relationById.values()].sort(
      (first, second) => first.infraRelationId - second.infraRelationId
    ),
  };
}

function centeredOffset(index: number, count: number, spacing: number) {
  return (index - (count - 1) / 2) * spacing;
}

function formatRelationImpactDescription(value: string | undefined) {
  const text = String(value ?? "").trim();
  if (!text || text === "-") {
    return "";
  }
  return text;
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
  autoCenter = true,
  embedded = false,
  embeddedHeightClassName,
  frameless = false,
  hideDepthToggle = false,
  hideDetailPanel = false,
  hideNodeActions = false,
  hideTopControl = false,
  highlightServiceId,
  initialFitView = false,
  initialFitZoom,
  initialInfraDepth = 0,
  initialRelationDepth,
  initialViewport,
  incidentMode = false,
  incidentCanvasTone = "dark",
  initialServiceId,
  legendPlacement = "bottom-right",
  modeTogglePlacement = "top-right",
  onSelectInfraNode,
  onSelectService,
  serviceFilter,
  showAllServices = false,
}: {
  autoCenter?: boolean;
  embedded?: boolean;
  embeddedHeightClassName?: string;
  frameless?: boolean;
  hideDepthToggle?: boolean;
  hideDetailPanel?: boolean;
  hideNodeActions?: boolean;
  hideTopControl?: boolean;
  highlightServiceId?: number;
  initialFitView?: boolean;
  initialFitZoom?: number;
  initialInfraDepth?: number;
  initialRelationDepth?: number;
  initialViewport?: { x: number; y: number; zoom: number };
  incidentMode?: boolean;
  incidentCanvasTone?: IncidentCanvasTone;
  initialServiceId?: number;
  legendPlacement?: RelationLegendPlacement;
  modeTogglePlacement?: GraphModeTogglePlacement;
  onSelectInfraNode?: (node?: InfraGraphNodeRecord) => void;
  onSelectService?: (serviceId: number) => void;
  serviceFilter?: (service: ServiceRecord) => boolean;
  showAllServices?: boolean;
} = {}) {
  const portalData = usePortalData();
  const stableDashboardDataRef = useRef(portalData);
  useEffect(() => {
    if (portalData.services.length > 0) {
      stableDashboardDataRef.current = portalData;
    }
  }, [portalData]);
  const dataSource = showAllServices
    ? stableDashboardDataRef.current.services.length > 0
      ? stableDashboardDataRef.current
      : portalData
    : portalData;
  const { services, relations, owners, servers, techStacks, incidents } =
    dataSource;
  const filteredServices = useMemo(
    () => (serviceFilter ? services.filter((service) => serviceFilter(service)) : services),
    [serviceFilter, services]
  );
  const allowedServiceIds = useMemo(
    () => new Set(filteredServices.map((service) => service.serviceId)),
    [filteredServices]
  );
  const activeIncident = useMemo<IncidentRecord | undefined>(() => {
    if (!incidentMode) {
      return undefined;
    }

    return (
      incidents.find(
        (incident) =>
          incident.incidentStatusCode !== "RESOLVED" &&
          (initialServiceId ? incident.serviceId === initialServiceId : true)
      ) ??
      incidents.find((incident) => incident.incidentStatusCode !== "RESOLVED")
    );
  }, [incidentMode, incidents, initialServiceId]);
  const initialFocusedServiceId =
    initialServiceId ?? activeIncident?.serviceId ?? filteredServices[0]?.serviceId ?? 0;
  const [focusedServiceId, setFocusedServiceId] = useState<number>(
    initialFocusedServiceId
  );
  const [query, setQuery] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPanelWide, setDetailPanelWide] = useState(false);
  const [detailServiceId, setDetailServiceId] = useState<number>(
    initialFocusedServiceId
  );
  const [selectedServiceNodeId, setSelectedServiceNodeId] = useState<
    number | null
  >(null);
  const [relationDepth, setRelationDepth] = useState(
    initialRelationDepth ?? (hideDepthToggle ? MAX_RELATION_DEPTH : 1)
  );
  const [graphViewMode, setGraphViewMode] = useState<GraphViewMode>(
    initialInfraDepth > 0 ? "infra" : showAllServices && !incidentMode ? "all" : "service"
  );
  const remoteInfraEnabled = shouldUseRemoteInfraApi();
  const [infraGraphNodes, setInfraGraphNodes] = useState<InfraGraphNodeRecord[]>(
    () => remoteInfraEnabled ? [] : infraNodesSnapshot.map(normalizeInfraNode)
  );
  const [infraGraphRelations, setInfraGraphRelations] = useState<
    InfraGraphRelationRecord[]
  >(() => remoteInfraEnabled ? [] : infraRelationsSnapshot.map(normalizeInfraRelation));
  const [infraGraphLoading, setInfraGraphLoading] = useState(remoteInfraEnabled);
  const [selectedInfraNodeId, setSelectedInfraNodeId] = useState<number | null>(
    null
  );
  const [topControlMode, setTopControlMode] =
    useState<TopControlMode>("select");
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<GraphNodeData> | null>(null);
  const userMovedViewportRef = useRef(false);
  const autoCenteredKeyRef = useRef("");
  const initialFitViewDoneRef = useRef(false);

  useEffect(() => {
    if (graphViewMode === "service") {
      setSelectedServiceNodeId(null);
    }
  }, [graphViewMode]);

  useEffect(() => {
    if (!shouldUseRemoteInfraApi()) {
      return;
    }

    let cancelled = false;

    fetchInfraGraphSnapshot()
      .then(({ nodes, relations }) => {
        if (cancelled) {
          return;
        }
        setInfraGraphNodes(nodes);
        setInfraGraphRelations(relations);
      })
      .catch((error) => {
        console.warn(
          "[ChainView API] infra graph load failed",
          error
        );
      })
      .finally(() => {
        if (!cancelled) {
          setInfraGraphLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedInfraConnectedNodeIds = useMemo(() => {
    const next = new Set<number>();

    if (!selectedInfraNodeId) {
      return next;
    }

    next.add(selectedInfraNodeId);
    infraGraphRelations.forEach((relation) => {
      if (relation.sourceInfraNodeId === selectedInfraNodeId) {
        next.add(relation.targetInfraNodeId);
      }
      if (relation.targetInfraNodeId === selectedInfraNodeId) {
        next.add(relation.sourceInfraNodeId);
      }
    });

    return next;
  }, [infraGraphRelations, selectedInfraNodeId]);

  const selectedInfraNode = useMemo(
    () =>
      selectedInfraNodeId
        ? infraGraphNodes.find(
            (node) => node.infraNodeId === selectedInfraNodeId
          )
        : undefined,
    [infraGraphNodes, selectedInfraNodeId]
  );
  const selectedInfraIncomingCount = useMemo(
    () =>
      selectedInfraNodeId
        ? infraGraphRelations.filter(
            (relation) => relation.targetInfraNodeId === selectedInfraNodeId
          ).length
        : 0,
    [infraGraphRelations, selectedInfraNodeId]
  );
  const selectedInfraOutgoingCount = useMemo(
    () =>
      selectedInfraNodeId
        ? infraGraphRelations.filter(
            (relation) => relation.sourceInfraNodeId === selectedInfraNodeId
          ).length
        : 0,
    [infraGraphRelations, selectedInfraNodeId]
  );

  const toggleSelectedInfraNode = useCallback((infraNodeId: number) => {
    setSelectedInfraNodeId((current) => {
      const next = current === infraNodeId ? null : infraNodeId;
      setDetailOpen(Boolean(next));
      if (next) {
        setSelectedServiceNodeId(null);
      }
      onSelectInfraNode?.(
        next
          ? infraGraphNodes.find((node) => node.infraNodeId === next)
          : undefined
      );
      return next;
    });
  }, [infraGraphNodes, onSelectInfraNode]);

  const toggleSelectedServiceNode = useCallback(
    (serviceId: number) => {
      if (incidentMode) {
        return;
      }
      setSelectedServiceNodeId((current) => {
        const next = current === serviceId ? null : serviceId;
        setDetailOpen(false);
        if (next) {
          setSelectedInfraNodeId(null);
          onSelectInfraNode?.(undefined);
          onSelectService?.(next);
        }
        return next;
      });
    },
    [incidentMode, onSelectInfraNode, onSelectService]
  );

  const handleGraphViewModeChange = useCallback(
    (mode: GraphViewMode) => {
      setGraphViewMode(mode);
      if (mode === "service") {
        setSelectedInfraNodeId(null);
        onSelectInfraNode?.(undefined);
      } else if (mode === "infra") {
        setSelectedServiceNodeId(null);
      } else {
        setSelectedServiceNodeId(null);
        setSelectedInfraNodeId(null);
        onSelectInfraNode?.(undefined);
      }
    },
    [onSelectInfraNode]
  );

  const handlePaneClick = useCallback(() => {
    if (incidentMode) {
      return;
    }
    if (graphViewMode === "infra") {
      setSelectedInfraNodeId(null);
      setDetailOpen(false);
      onSelectInfraNode?.(undefined);
      return;
    }

    if (graphViewMode === "all") {
      setSelectedInfraNodeId(null);
      setSelectedServiceNodeId(null);
      setDetailOpen(false);
      onSelectInfraNode?.(undefined);
      return;
    }

    setSelectedServiceNodeId(null);
    setDetailOpen(false);
  }, [graphViewMode, incidentMode, onSelectInfraNode]);

  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.serviceId, service])),
    [services]
  );
  const serverById = useMemo(
    () => new Map(servers.map((server) => [server.serverId, server])),
    [servers]
  );
  const serviceInfraTargetByServiceId = useMemo(() => {
    const infraById = new Map(
      infraGraphNodes.map((node) => [node.infraNodeId, node])
    );
    const infraByCode = new Map(
      infraGraphNodes.map((node) => [
        normalizeGraphLookupValue(node.nodeCode),
        node.infraNodeId,
      ])
    );
    const infraByName = new Map(
      infraGraphNodes.map((node) => [
        normalizeGraphLookupValue(node.nodeName),
        node.infraNodeId,
      ])
    );
    const next = new Map<number, number>();

    services.forEach((service) => {
      const server = serverById.get(service.serverId);
      if (!server) {
        return;
      }

      if (server.infraNodeId && infraById.has(server.infraNodeId)) {
        next.set(service.serviceId, server.infraNodeId);
        return;
      }

      const directCode = normalizeGraphLookupValue(server.infraNodeCode);
      const directName = normalizeGraphLookupValue(server.infraNodeName);
      const inferredCode = normalizeGraphLookupValue(
        inferInfraNodeCodeForServer(server)
      );

      const infraNodeId =
        infraByCode.get(directCode) ??
        infraByName.get(directName) ??
        infraByCode.get(inferredCode);

      if (infraNodeId) {
        next.set(service.serviceId, infraNodeId);
      }
    });

    return next;
  }, [infraGraphNodes, serverById, services]);
  const filteredInfraNodeIds = useMemo(() => {
    if (!serviceFilter) {
      return null;
    }

    const directNodeIds = new Set<number>();
    filteredServices.forEach((service) => {
      const infraNodeId = serviceInfraTargetByServiceId.get(service.serviceId);
      if (infraNodeId) directNodeIds.add(infraNodeId);
    });

    const visibleNodeIds = new Set(directNodeIds);
    infraGraphRelations.forEach((relation) => {
      if (directNodeIds.has(relation.sourceInfraNodeId)) {
        visibleNodeIds.add(relation.targetInfraNodeId);
      }
      if (directNodeIds.has(relation.targetInfraNodeId)) {
        visibleNodeIds.add(relation.sourceInfraNodeId);
      }
    });
    return visibleNodeIds;
  }, [filteredServices, infraGraphRelations, serviceFilter, serviceInfraTargetByServiceId]);
  const scopedInfraGraphNodes = useMemo(
    () =>
      filteredInfraNodeIds
        ? infraGraphNodes.filter((node) => filteredInfraNodeIds.has(node.infraNodeId))
        : infraGraphNodes,
    [filteredInfraNodeIds, infraGraphNodes]
  );
  const scopedInfraGraphRelations = useMemo(
    () =>
      filteredInfraNodeIds
        ? infraGraphRelations.filter(
            (relation) =>
              filteredInfraNodeIds.has(relation.sourceInfraNodeId) &&
              filteredInfraNodeIds.has(relation.targetInfraNodeId)
          )
        : infraGraphRelations,
    [filteredInfraNodeIds, infraGraphRelations]
  );
  const selectedServiceInfraNodeIds = useMemo(() => {
    const next = new Set<number>();
    if (!selectedServiceNodeId) {
      return next;
    }

    const infraNodeId = serviceInfraTargetByServiceId.get(selectedServiceNodeId);
    if (infraNodeId) {
      next.add(infraNodeId);
    }

    return next;
  }, [selectedServiceNodeId, serviceInfraTargetByServiceId]);
  const selectedInfraServiceIds = useMemo(() => {
    const next = new Set<number>();
    if (!selectedInfraNodeId) {
      return next;
    }

    serviceInfraTargetByServiceId.forEach((infraNodeId, serviceId) => {
      if (infraNodeId === selectedInfraNodeId) {
        next.add(serviceId);
      }
    });

    return next;
  }, [selectedInfraNodeId, serviceInfraTargetByServiceId]);
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
          relation.sourceServiceId !== relation.targetServiceId &&
          allowedServiceIds.has(relation.sourceServiceId) &&
          allowedServiceIds.has(relation.targetServiceId)
      ),
    [allowedServiceIds, relations]
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
    if (!query.trim()) {
      return [];
    }

    return filteredServices
      .filter((service) => {
        return matchesSearchText(
          searchableText(
            service.serviceName,
            service.serviceCode,
            service.categoryPath
          ),
          query
        );
      })
      .slice(0, 12);
  }, [filteredServices, query]);

  const {
    visibleRelationIds,
    visibleServiceIds,
    laneByServiceId,
    yByServiceId,
  } = useMemo(() => {
    if (showAllServices) {
      const laneMap = new Map<number, number>();
      const laneGroups = new Map<number, number[]>();
      const visible = new Set<number>();
      const relationIds = new Set<number>();
      const incomingCountByServiceId = new Map<number, number>();
      const outgoingBySource = new Map<number, number[]>();

      const compareServiceIds = (firstId: number, secondId: number) => {
        const firstService = serviceById.get(firstId);
        const secondService = serviceById.get(secondId);
        const firstCategory = firstService?.categoryPath.join(" / ") ?? "";
        const secondCategory = secondService?.categoryPath.join(" / ") ?? "";
        const firstName = firstService?.serviceName ?? "";
        const secondName = secondService?.serviceName ?? "";

        return (
          firstCategory.localeCompare(secondCategory, "ko") ||
          firstName.localeCompare(secondName, "ko") ||
          firstId - secondId
        );
      };

      filteredServices.forEach((service) => {
        visible.add(service.serviceId);
        incomingCountByServiceId.set(service.serviceId, 0);
        outgoingBySource.set(service.serviceId, []);
      });

      activeRelations.forEach((relation) => {
        if (
          visible.has(relation.sourceServiceId) &&
          visible.has(relation.targetServiceId)
        ) {
          relationIds.add(relation.relationId);
          outgoingBySource.set(relation.sourceServiceId, [
            ...(outgoingBySource.get(relation.sourceServiceId) ?? []),
            relation.targetServiceId,
          ]);
          incomingCountByServiceId.set(
            relation.targetServiceId,
            (incomingCountByServiceId.get(relation.targetServiceId) ?? 0) + 1
          );
        }
      });

      const queue = [...visible]
        .filter((serviceId) => (incomingCountByServiceId.get(serviceId) ?? 0) === 0)
        .sort(compareServiceIds);
      const roots = queue.length > 0 ? queue : [...visible].sort(compareServiceIds);

      roots.forEach((serviceId) => {
        if (!laneMap.has(serviceId)) {
          laneMap.set(serviceId, 0);
        }
      });

      const visitQueue = [...roots];
      while (visitQueue.length > 0) {
        const currentId = visitQueue.shift();
        if (!currentId) {
          continue;
        }

        const currentLane = laneMap.get(currentId) ?? 0;
        const targets = [...(outgoingBySource.get(currentId) ?? [])].sort(compareServiceIds);

        targets.forEach((targetId) => {
          const nextLane = Math.max(laneMap.get(targetId) ?? 0, currentLane + 1);
          if (nextLane !== laneMap.get(targetId)) {
            laneMap.set(targetId, nextLane);
            visitQueue.push(targetId);
          }
        });
      }

      visible.forEach((serviceId) => {
        if (!laneMap.has(serviceId)) {
          laneMap.set(serviceId, 0);
        }
      });

      const lanes = [...laneMap.values()];
      const laneOffset = lanes.length
        ? (Math.min(...lanes) + Math.max(...lanes)) / 2
        : 0;

      visible.forEach((serviceId) => {
        laneMap.set(serviceId, (laneMap.get(serviceId) ?? 0) - laneOffset);
        const lane = laneMap.get(serviceId) ?? 0;
        laneGroups.set(lane, [...(laneGroups.get(lane) ?? []), serviceId]);
      });

      const yMap = new Map<number, number>();
      const minLane = Math.min(...laneGroups.keys());
      laneGroups.forEach((serviceIds, lane) => {
        const sorted = [...serviceIds].sort(compareServiceIds);
        const categoryOffsets = new Map<string, number>();
        let categoryCount = 0;
        const laneStagger =
          sorted.length === 1
            ? (Math.round(lane - minLane) % 2 === 0 ? -88 : 88)
            : 0;

        sorted.forEach((serviceId, index) => {
          const categoryKey =
            serviceById.get(serviceId)?.categoryPath.slice(0, 2).join(" / ") ??
            "";

          if (!categoryOffsets.has(categoryKey)) {
            categoryOffsets.set(categoryKey, categoryCount);
            categoryCount += 1;
          }

          const categoryOffset = categoryOffsets.get(categoryKey) ?? 0;
          yMap.set(
            serviceId,
            centeredOffset(index, sorted.length, ALL_SERVICES_Y_SPACING) +
              categoryOffset * ALL_SERVICES_CATEGORY_GAP +
              laneStagger
          );
        });
      });

      return {
        visibleRelationIds: relationIds,
        visibleServiceIds: visible,
        laneByServiceId: laneMap,
        yByServiceId: yMap,
      };
    }

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
        Math.abs(targetLane - sourceLane) === 1
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
  }, [
    activeRelations,
    filteredServices,
    focusedServiceId,
    relationDepth,
    serviceById,
    showAllServices,
  ]);

  const laneNodes = useMemo<Node<LaneNodeData>[]>(() => {
    const nodes: Node<LaneNodeData>[] = [];
    const lanes = showAllServices
      ? [0, 1, 2, 3, 4]
      : Array.from(
          { length: relationDepth * 2 + 1 },
          (_, index) => index - relationDepth
        );

    lanes.forEach((lane) => {
      nodes.push({
        id: `lane-${lane}`,
        type: "laneNode",
        position: {
          x: lane * X_SPACING - (X_SPACING - NODE_WIDTH) / 2,
          y: -LANE_HEIGHT / 2,
        },
        data: {
          label: showAllServices
            ? getAllServicesLaneLabel(lane)
            : getLaneLabel(lane),
          lane,
        },
        draggable: false,
        selectable: false,
        focusable: false,
        zIndex: -10,
      });

    });
    return nodes;
  }, [relationDepth, showAllServices]);

  const openServiceDetail = (serviceId: number) => {
    setDetailServiceId(serviceId);
    setDetailOpen(true);
  };

  const moveToFocusedService = (serviceId: number) => {
    userMovedViewportRef.current = false;
    setFocusedServiceId(serviceId);
    setDetailOpen(false);
    setQuery("");
    setSelectedServiceNodeId(serviceId);
    onSelectInfraNode?.(undefined);
    onSelectService?.(serviceId);
  };

  const relationImpactByServiceId = useMemo(() => {
    const impactMap = new Map<number, RelationImpactSummary[]>();

    activeRelations.forEach((relation) => {
      if (!visibleRelationIds.has(relation.relationId)) {
        return;
      }

      const impactText = formatRelationImpactDescription(relation.description);
      if (!impactText) {
        return;
      }

      const sourceLane = laneByServiceId.get(relation.sourceServiceId);
      const targetLane = laneByServiceId.get(relation.targetServiceId);
      if (sourceLane === undefined || targetLane === undefined) {
        return;
      }

      let impactedServiceId =
        Math.abs(targetLane) >= Math.abs(sourceLane)
          ? relation.targetServiceId
          : relation.sourceServiceId;

      if (impactedServiceId === focusedServiceId) {
        impactedServiceId =
          relation.sourceServiceId === focusedServiceId
            ? relation.targetServiceId
            : relation.sourceServiceId;
      }

      const sourceService = serviceById.get(relation.sourceServiceId);
      const targetService = serviceById.get(relation.targetServiceId);
      const summary = {
        path: `${sourceService?.serviceName ?? relation.sourceServiceId} → ${targetService?.serviceName ?? relation.targetServiceId}`,
        text: impactText,
      };
      const current = impactMap.get(impactedServiceId) ?? [];
      if (!current.some((item) => item.text === summary.text && item.path === summary.path)) {
        impactMap.set(impactedServiceId, [...current, summary]);
      }
    });

    return impactMap;
  }, [activeRelations, focusedServiceId, laneByServiceId, serviceById, visibleRelationIds]);

  const serviceNodes = useMemo<Node<ServiceNodeData>[]>(() => {
    const visibleServices = filteredServices.filter((service) => {
      return visibleServiceIds.has(service.serviceId);
    });
    const allMode = graphViewMode === "all";
    const allModeMinServiceLane = allMode && visibleServices.length > 0
      ? Math.min(
          ...visibleServices.map(
            (service) => laneByServiceId.get(service.serviceId) ?? 0
          )
        )
      : 0;
    const hasSelectedInfraInAllMode =
      allMode && Boolean(selectedInfraNodeId);
    const highlightedServiceId = incidentMode || hasSelectedInfraInAllMode
      ? null
      : showAllServices
        ? selectedServiceNodeId
        : selectedServiceNodeId ?? focusedServiceId;
    const highlightedConnectedServiceIds = new Set<number>();

    activeRelations.forEach((relation) => {
      if (!highlightedServiceId) {
        return;
      }

      if (relation.sourceServiceId === highlightedServiceId) {
        highlightedConnectedServiceIds.add(relation.targetServiceId);
      }

      if (relation.targetServiceId === highlightedServiceId) {
        highlightedConnectedServiceIds.add(relation.sourceServiceId);
      }
    });

    return visibleServices.map((service) => {
      const lane = laneByServiceId.get(service.serviceId) ?? 0;
      const connectedByService =
        Boolean(highlightedServiceId) &&
        (service.serviceId === highlightedServiceId ||
          highlightedConnectedServiceIds.has(service.serviceId));
      const connectedByInfra =
        hasSelectedInfraInAllMode &&
        selectedInfraServiceIds.has(service.serviceId);
      const connected = connectedByService || connectedByInfra;
      const focused =
        (Boolean(highlightedServiceId) &&
          service.serviceId === highlightedServiceId) ||
        connectedByInfra;
      const dimmed =
        (Boolean(highlightedServiceId) || hasSelectedInfraInAllMode) &&
        !connected;

      return {
        id: String(service.serviceId),
        type: "serviceNode",
        position: {
          x: allMode
            ? ALL_MODE_SERVICE_LEFTMOST_X +
              (lane - allModeMinServiceLane) * X_SPACING
            : lane * X_SPACING,
          y: yByServiceId.get(service.serviceId) ?? 0,
        },
        data: {
          serviceId: service.serviceId,
          compact: showAllServices,
          label: service.serviceName,
          code: service.serviceCode,
          category: service.categoryPath.join(" / "),
          statusCode: showAllServices ? "NORMAL" : service.statusCode,
          importanceCode: service.importanceCode ?? "NORMAL",
          ownerGroup: ownerByServiceId.get(service.serviceId) ?? "미지정",
          serverCount: service.serverId ? 1 : 0,
          focused,
          connected,
          dimmed,
          detailSelected:
            !showAllServices &&
            detailOpen &&
            detailServiceId === service.serviceId,
          relationCount: relationCountByServiceId.get(service.serviceId) ?? 0,
          lane,
          hideActions: hideNodeActions,
          relationImpactPath: relationImpactByServiceId.get(service.serviceId)?.[0]?.path,
          relationImpactText: relationImpactByServiceId.get(service.serviceId)?.[0]?.text,
          onMoveToFocus: moveToFocusedService,
          onOpenDetail: openServiceDetail,
          onSelectServiceNode: toggleSelectedServiceNode,
        },
      };
    });
  }, [
    focusedServiceId,
    activeRelations,
    detailOpen,
    detailServiceId,
    graphViewMode,
    incidentMode,
    laneByServiceId,
    highlightServiceId,
    hideNodeActions,
    moveToFocusedService,
    openServiceDetail,
    onSelectService,
    ownerByServiceId,
    relationCountByServiceId,
    relationImpactByServiceId,
    filteredServices,
    selectedServiceNodeId,
    selectedInfraNodeId,
    selectedInfraServiceIds,
    showAllServices,
    toggleSelectedServiceNode,
    visibleServiceIds,
    yByServiceId,
  ]);

  const topologyNodes = useMemo<Node<ServerInfraNodeData>[]>(() => {
    if (graphViewMode === "service") {
      return [];
    }
    const allMode = graphViewMode === "all";

    const nodeById = new Map(
      scopedInfraGraphNodes.map((node) => [node.infraNodeId, node])
    );
    const outgoing = new Map<number, number[]>();
    const indegree = new Map<number, number>();

    scopedInfraGraphNodes.forEach((node) => {
      outgoing.set(node.infraNodeId, []);
      indegree.set(node.infraNodeId, 0);
    });

    scopedInfraGraphRelations.forEach((relation) => {
      if (
        !nodeById.has(relation.sourceInfraNodeId) ||
        !nodeById.has(relation.targetInfraNodeId)
      ) {
        return;
      }

      outgoing.set(relation.sourceInfraNodeId, [
        ...(outgoing.get(relation.sourceInfraNodeId) ?? []),
        relation.targetInfraNodeId,
      ]);
      indegree.set(
        relation.targetInfraNodeId,
        (indegree.get(relation.targetInfraNodeId) ?? 0) + 1
      );
    });

    const laneByNodeId = new Map<number, number>();
    const queue = scopedInfraGraphNodes
      .filter((node) => (indegree.get(node.infraNodeId) ?? 0) === 0)
      .sort((first, second) =>
        first.nodeName.localeCompare(second.nodeName, "ko") ||
        first.infraNodeId - second.infraNodeId
      )
      .map((node) => node.infraNodeId);

    if (!queue.length && scopedInfraGraphNodes[0]) {
      queue.push(scopedInfraGraphNodes[0].infraNodeId);
    }

    queue.forEach((nodeId) => laneByNodeId.set(nodeId, 0));

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) continue;
      const currentLane = laneByNodeId.get(currentId) ?? 0;

      (outgoing.get(currentId) ?? []).forEach((targetId) => {
        const nextLane = Math.max(laneByNodeId.get(targetId) ?? 0, currentLane + 1);
        if (nextLane !== laneByNodeId.get(targetId)) {
          laneByNodeId.set(targetId, nextLane);
          queue.push(targetId);
        }
      });
    }

    scopedInfraGraphNodes.forEach((node) => {
      if (!laneByNodeId.has(node.infraNodeId)) {
        laneByNodeId.set(node.infraNodeId, 0);
      }
    });

    const groups = new Map<number, InfraGraphNodeRecord[]>();
    scopedInfraGraphNodes.forEach((node) => {
      const lane = laneByNodeId.get(node.infraNodeId) ?? 0;
      groups.set(lane, [...(groups.get(lane) ?? []), node]);
    });

    const INFRA_X_SPACING = 430;
    const INFRA_Y_SPACING = 148;
    const infraLanes = [...groups.keys()];
    const minInfraLane = infraLanes.length ? Math.min(...infraLanes) : 0;
    const maxInfraLane = infraLanes.length ? Math.max(...infraLanes) : 0;
    const nodes: Node<ServerInfraNodeData>[] = [];

    Array.from(groups.entries())
      .sort(([firstLane], [secondLane]) => firstLane - secondLane)
      .forEach(([lane, groupNodes]) => {
        const sortedNodes = [...groupNodes].sort(
          (first, second) =>
            first.nodeTypeCode.localeCompare(second.nodeTypeCode, "ko") ||
            first.nodeName.localeCompare(second.nodeName, "ko") ||
            first.infraNodeId - second.infraNodeId
        );

        sortedNodes.forEach((node, index) => {
          const connectedToSelectedService =
            allMode && selectedServiceInfraNodeIds.has(node.infraNodeId);
          const hasSelectedServiceInAllMode =
            allMode && Boolean(selectedServiceNodeId);
          const hasSelectedInfraInAllMode =
            allMode && Boolean(selectedInfraNodeId);
          const connectedToSelectedInfra =
            allMode && selectedInfraConnectedNodeIds.has(node.infraNodeId);
          nodes.push({
            id: `infra-${node.infraNodeId}`,
            type: "serverInfraNode",
            position: {
              x: allMode
                ? ALL_MODE_INFRA_RIGHTMOST_X -
                  (maxInfraLane - lane) * INFRA_X_SPACING
                : lane * INFRA_X_SPACING,
              y:
                centeredOffset(index, sortedNodes.length, INFRA_Y_SPACING) +
                (sortedNodes.length === 1
                  ? (Math.round(lane - minInfraLane) % 2 === 0 ? -72 : 72)
                  : 0),
            },
            data: {
              connected:
                allMode
                  ? (!hasSelectedServiceInAllMode &&
                      !hasSelectedInfraInAllMode) ||
                    connectedToSelectedService ||
                    connectedToSelectedInfra
                  : selectedInfraConnectedNodeIds.has(node.infraNodeId),
              dimmed:
                allMode
                  ? (hasSelectedServiceInAllMode ||
                      hasSelectedInfraInAllMode) &&
                    !connectedToSelectedService &&
                    !connectedToSelectedInfra
                  : Boolean(selectedInfraNodeId) &&
                    !selectedInfraConnectedNodeIds.has(node.infraNodeId),
              focused: allMode
                ? connectedToSelectedService ||
                  selectedInfraNodeId === node.infraNodeId
                : selectedInfraNodeId === node.infraNodeId,
              infraNodeId: node.infraNodeId,
              kind: "infra",
              label: node.nodeName,
              code: node.nodeCode,
              meta: node.nodeTypeCode,
              onSelect: toggleSelectedInfraNode,
            },
            draggable: false,
          });
        });
      });

    return nodes;
  }, [
    graphViewMode,
    scopedInfraGraphNodes,
    scopedInfraGraphRelations,
    selectedInfraConnectedNodeIds,
    selectedInfraNodeId,
    selectedServiceInfraNodeIds,
    selectedServiceNodeId,
  ]);
  const topologyNodePositionById = useMemo(
    () =>
      new Map(
        topologyNodes.map((node) => [
          node.id,
          { x: node.position.x, y: node.position.y },
        ])
      ),
    [topologyNodes]
  );

  const edges = useMemo<Edge[]>(() => {
    const serviceRelationEdges = activeRelations
      .filter(
        (relation) => {
          const sourceLane = laneByServiceId.get(relation.sourceServiceId);
          const targetLane = laneByServiceId.get(relation.targetServiceId);

          if (
            !visibleRelationIds.has(relation.relationId) ||
            !visibleServiceIds.has(relation.sourceServiceId) ||
            !visibleServiceIds.has(relation.targetServiceId) ||
            sourceLane === undefined ||
            targetLane === undefined
          ) {
            return false;
          }

          return showAllServices || Math.abs(targetLane - sourceLane) === 1;
        }
      )
      .map((relation) => {
        const sourceLane = laneByServiceId.get(relation.sourceServiceId) ?? 0;
        const targetLane = laneByServiceId.get(relation.targetServiceId) ?? 0;
        const highlightedServiceId = showAllServices
          ? selectedServiceNodeId
          : selectedServiceNodeId ?? highlightServiceId ?? focusedServiceId;
        const hasInfraHighlight =
          graphViewMode === "all" && selectedInfraServiceIds.size > 0;
        const sourceInInfraScope = selectedInfraServiceIds.has(
          relation.sourceServiceId
        );
        const targetInInfraScope = selectedInfraServiceIds.has(
          relation.targetServiceId
        );
        const hasHighlight =
          !incidentMode && (Boolean(highlightedServiceId) || hasInfraHighlight);
        const directlyConnected =
          !incidentMode &&
          ((Boolean(highlightedServiceId) &&
            (relation.sourceServiceId === highlightedServiceId ||
              relation.targetServiceId === highlightedServiceId)) ||
            (hasInfraHighlight && sourceInInfraScope && targetInInfraScope));
        const stroke = incidentMode
          ? "#ff3344"
          : sourceLane >= 0 && targetLane > sourceLane
            ? IMPACT_COLOR
            : DEPENDS_ON_COLOR;
        const sourceIsLeft = sourceLane <= targetLane;

        return {
          id: String(relation.relationId),
          source: String(relation.sourceServiceId),
          target: String(relation.targetServiceId),
          ...(showAllServices
            ? {
                sourceHandle: sourceIsLeft ? "right-source" : "left-source",
                targetHandle: sourceIsLeft ? "left-target" : "right-target",
              }
            : {}),
          type: "default",
          className: directlyConnected
            ? "chainview-flow-edge chainview-flow-edge-active"
            : hasHighlight
              ? showAllServices
                ? "chainview-flow-edge chainview-flow-edge-muted"
                : "chainview-flow-edge chainview-flow-edge-normal-dashed"
              : showAllServices
                ? "chainview-flow-edge chainview-flow-edge-default-dashed"
                : "chainview-flow-edge chainview-flow-edge-normal-dashed",
          style: {
            stroke,
            strokeWidth: incidentMode ? 2.8 : directlyConnected ? 2.8 : 1.75,
            opacity: incidentMode ? 0.95 : directlyConnected ? 0.98 : hasHighlight ? 0.12 : 0.42,
          },
        };
      });

    const topologyRelationEdges: Edge[] = [];
    const addedTopologyRelationEdges = new Set<string>();
    const visibleNodeIds = new Set(topologyNodes.map((node) => node.id));

    scopedInfraGraphRelations.forEach((relation) => {
      const sourceNodeId = `infra-${relation.sourceInfraNodeId}`;
      const targetNodeId = `infra-${relation.targetInfraNodeId}`;

      if (
        sourceNodeId === targetNodeId ||
        !visibleNodeIds.has(sourceNodeId) ||
        !visibleNodeIds.has(targetNodeId)
      ) {
        return;
      }

      const edgeId = `infra-relation-${relation.infraRelationId}`;
      if (addedTopologyRelationEdges.has(edgeId)) {
        return;
      }

      const sourcePosition = topologyNodePositionById.get(sourceNodeId);
      const targetPosition = topologyNodePositionById.get(targetNodeId);
      const sourceIsLeft =
        !sourcePosition ||
        !targetPosition ||
        sourcePosition.x <= targetPosition.x;

      const hasSelectedServiceInAllMode =
        graphViewMode === "all" && Boolean(selectedServiceNodeId);
      const hasSelectedInfraInAllMode =
        graphViewMode === "all" && Boolean(selectedInfraNodeId);
      const directlyConnectedToSelected =
        graphViewMode === "all"
          ? hasSelectedServiceInAllMode
            ? selectedServiceInfraNodeIds.has(relation.sourceInfraNodeId) &&
              selectedServiceInfraNodeIds.has(relation.targetInfraNodeId)
            : !hasSelectedInfraInAllMode ||
              relation.sourceInfraNodeId === selectedInfraNodeId ||
              relation.targetInfraNodeId === selectedInfraNodeId
          : selectedInfraNodeId === null ||
            relation.sourceInfraNodeId === selectedInfraNodeId ||
            relation.targetInfraNodeId === selectedInfraNodeId;

      addedTopologyRelationEdges.add(edgeId);
      topologyRelationEdges.push({
        id: edgeId,
        source: sourceNodeId,
        target: targetNodeId,
        sourceHandle: sourceIsLeft ? "right-source" : "left-source",
        targetHandle: sourceIsLeft ? "left-target" : "right-target",
        type: "default",
        animated: true,
        className:
          `chainview-flow-edge chainview-flow-edge-normal-dashed chainview-flow-edge-infra ${
            directlyConnectedToSelected
              ? "chainview-flow-edge-infra-active"
              : "chainview-flow-edge-infra-muted"
          }`,
        style: {
          stroke: "#2563eb",
          strokeWidth: directlyConnectedToSelected ? 2.7 : 1.8,
          opacity: directlyConnectedToSelected ? 0.88 : 0.16,
        },
      });
    });

    const serviceInfraEdges: Edge[] =
      graphViewMode === "all"
        ? filteredServices
            .filter((service) => visibleServiceIds.has(service.serviceId))
            .flatMap((service) => {
              const infraNodeId = serviceInfraTargetByServiceId.get(
                service.serviceId
              );
              if (!infraNodeId) {
                return [];
              }

              const sourceNodeId = String(service.serviceId);
              const targetNodeId = `infra-${infraNodeId}`;
              if (
                !visibleServiceIds.has(service.serviceId) ||
                !visibleNodeIds.has(targetNodeId)
              ) {
                return [];
              }
              const hasSelection =
                Boolean(selectedServiceNodeId) || Boolean(selectedInfraNodeId);
              const active =
                selectedServiceNodeId === service.serviceId ||
                selectedInfraNodeId === infraNodeId;

              return [
                {
                  id: `service-infra-${service.serviceId}-${infraNodeId}`,
                  source: sourceNodeId,
                  target: targetNodeId,
                  sourceHandle: "left-source",
                  targetHandle: "right-target",
                  type: "default",
                  animated: true,
                  className:
                    `chainview-flow-edge chainview-flow-edge-service-infra ${
                      active
                        ? "chainview-flow-edge-service-infra-active"
                        : hasSelection
                          ? "chainview-flow-edge-service-infra-muted"
                          : ""
                    }`,
                  style: {
                    stroke: SERVICE_INFRA_COLOR,
                    strokeWidth: active ? 2.8 : 2,
                    opacity: active ? 0.95 : hasSelection ? 0.14 : 0.72,
                  },
                },
              ];
            })
        : [];

    if (graphViewMode === "service") {
      return serviceRelationEdges;
    }

    if (graphViewMode === "infra") {
      return topologyRelationEdges;
    }

    return [...serviceRelationEdges, ...topologyRelationEdges, ...serviceInfraEdges];
  }, [
    activeRelations,
    filteredServices,
    graphViewMode,
    focusedServiceId,
    highlightServiceId,
    incidentMode,
    scopedInfraGraphRelations,
    laneByServiceId,
    serviceById,
    serverById,
    serviceInfraTargetByServiceId,
    selectedInfraNodeId,
    selectedInfraServiceIds,
    selectedServiceInfraNodeIds,
    selectedServiceNodeId,
    showAllServices,
    topologyNodes,
    topologyNodePositionById,
    visibleRelationIds,
    visibleServiceIds,
  ]);

  const nodes = useMemo<Node<GraphNodeData>[]>(
    () => {
      if (graphViewMode === "service") {
        return [...laneNodes, ...serviceNodes];
      }

      if (graphViewMode === "infra") {
        return topologyNodes;
      }

      return [...serviceNodes, ...topologyNodes];
    },
    [graphViewMode, laneNodes, serviceNodes, topologyNodes]
  );
  const nodeTypes = useMemo(
    () => ({ laneNode: LaneNode, serviceNode: ServiceNode, serverInfraNode: ServerInfraNode }),
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
  const detailRelationImpacts = detailService
    ? relationImpactByServiceId.get(detailService.serviceId) ?? []
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
    setRelationDepth(initialRelationDepth ?? 2);
    userMovedViewportRef.current = false;
  }, [incidentMode, initialFocusedServiceId, initialRelationDepth, initialServiceId]);

  useEffect(() => {
    if (!initialFitView || !flowInstance || initialFitViewDoneRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const fitZoom =
        initialFitZoom ?? (showAllServices ? 0.18 : 0.46);

      flowInstance.fitView({
        duration: 0,
        maxZoom: fitZoom,
        minZoom: fitZoom,
        padding: showAllServices ? 0.18 : 0.26,
      });
      initialFitViewDoneRef.current = true;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    edges.length,
    flowInstance,
    initialFitView,
    initialFitZoom,
    nodes.length,
    showAllServices,
  ]);

  useEffect(() => {
    if (!autoCenter) {
      return;
    }

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
  }, [autoCenter, flowInstance, focusedServiceId, relationDepth]);

  const shellClassName = embedded
    ? embeddedHeightClassName
      ? "h-full min-h-0"
      : "min-h-[680px]"
    : "mx-auto flex w-full max-w-[1600px] flex-col gap-5";
  const canvasClassName = embedded
    ? `relative ${embeddedHeightClassName ?? "h-[680px] min-h-[620px]"}`
    : "relative h-[calc(100vh-188px)] min-h-[620px]";
  const useDarkIncidentCanvas = incidentMode && incidentCanvasTone === "dark";
  const useLightIncidentCanvas = incidentMode && incidentCanvasTone === "light";

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
            ? `h-full overflow-hidden ${
                useDarkIncidentCanvas
                  ? "chainview-flow-dark bg-[#081b2d]"
                  : useLightIncidentCanvas
                    ? "chainview-flow-incident bg-[#f8fafc]"
                  : showAllServices
                    ? "chainview-flow-all bg-[#f8fafc]"
                    : "bg-white"
              }`
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
            onPaneClick={handlePaneClick}
            defaultViewport={initialViewport}
            minZoom={0.18}
            maxZoom={1.4}
            className="relative z-[1]"
          >
            <Background
              gap={24}
              size={1.1}
              color={useDarkIncidentCanvas ? "#1f3549" : "#dbe4f0"}
            />
            <Controls />
          </ReactFlow>
          {portalData.remoteApi.initialLoading ||
          (portalData.remoteApi.status.state === "loading" &&
            portalData.remoteApi.status.source === "snapshot") ||
          (infraGraphLoading && graphViewMode !== "service") ? (
            <div className="chainview-flow-loader" role="status" aria-live="polite">
              <span className="portal-initial-loader__ring" aria-hidden="true" />
              <strong>관계도를 불러오는 중입니다.</strong>
            </div>
          ) : null}
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

          {(graphViewMode === "service" || graphViewMode === "all") && !incidentMode && (
            <RelationEdgeLegend
              includeServiceInfra={graphViewMode === "all"}
              placement={legendPlacement}
            />
          )}

          {(graphViewMode === "infra" || graphViewMode === "all") &&
          selectedInfraNode &&
          !hideDetailPanel ? (
            <RelationInfraDetailPanel
              open={detailOpen}
              connectedCount={Math.max(
                selectedInfraConnectedNodeIds.size - 1,
                0
              )}
              incomingCount={selectedInfraIncomingCount}
              node={selectedInfraNode}
              outgoingCount={selectedInfraOutgoingCount}
              onPanelWideChange={setDetailPanelWide}
              onOpenChange={setDetailOpen}
            />
          ) : detailService && !hideDetailPanel ? (
            <RelationServiceDetailPanel
              open={detailOpen}
              incomingCount={directIncomingCount}
              incidentMode={detailInIncidentScope}
              incidentTitle={activeIncident?.title}
              impactCount={activeIncidentConnectedServiceIds.size}
              outgoingCount={directOutgoingCount}
              owners={detailOwners}
              relationImpacts={detailRelationImpacts}
              server={detailServer}
              service={detailService}
              techStacks={detailTechStacks}
              onPanelWideChange={setDetailPanelWide}
              onOpenChange={setDetailOpen}
            />
          ) : null}

          {!hideDepthToggle && (
              <RelationDepthToggle
                depth={relationDepth}
                onDepthChange={setRelationDepth}
              />
          )}

          {!incidentMode && (
            <GraphViewModeToggle
              placement={modeTogglePlacement}
              mode={graphViewMode}
              onModeChange={handleGraphViewModeChange}
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
          cursor: pointer;
          padding: 14px 16px;
          text-align: left;
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            opacity 0.18s ease,
            transform 0.18s ease;
        }

        .chainview-flow-node:hover {
          transform: translateY(-1px);
        }

        .chainview-flow-node-focused {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15),
            0 14px 30px rgba(37, 99, 235, 0.16);
        }

        .chainview-flow-node-connected {
          border-color: rgba(37, 99, 235, 0.45);
        }

        .chainview-flow-node-dimmed {
          opacity: 0.24;
        }

        .chainview-flow-node-detail-selected {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.2),
            0 14px 30px rgba(14, 165, 233, 0.18);
        }

        .chainview-flow-impact-note {
          border: 1px solid rgba(239, 68, 68, 0.22);
          border-radius: 8px;
          background: rgba(254, 242, 242, 0.96);
          color: #dc2626;
          padding: 8px 10px;
        }

        .chainview-infra-node {
          width: 198px;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.94);
          color: #0f172a;
          cursor: pointer;
          padding: 10px 12px;
          text-align: left;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease,
            opacity 160ms ease,
            transform 160ms ease;
        }

        .chainview-infra-node-server {
          border-color: rgba(37, 99, 235, 0.28);
        }

        .chainview-infra-node-infra {
          border-color: rgba(37, 99, 235, 0.32);
          background: rgba(248, 250, 252, 0.96);
        }

        .chainview-infra-node-connected {
          border-color: rgba(37, 99, 235, 0.5);
          box-shadow: 0 12px 26px rgba(37, 99, 235, 0.12);
        }

        .chainview-infra-node-focused {
          border-color: #2563eb;
          box-shadow:
            0 0 0 4px rgba(37, 99, 235, 0.15),
            0 14px 30px rgba(37, 99, 235, 0.18);
          transform: translateY(-1px);
        }

        .chainview-infra-node-dimmed {
          opacity: 0.24;
        }

        .chainview-flow-edge-infra path {
          stroke-linecap: round;
          stroke-dasharray: 14 12;
          animation: chainview-edge-flow 1.15s linear infinite;
        }

        .chainview-flow-edge-infra-muted path {
          animation: none;
        }

        .chainview-flow-node-compact {
          width: 168px;
          border-radius: 8px;
          padding: 8px 10px;
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
        }

        .chainview-flow-node-compact.chainview-flow-node-focused {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2),
            0 12px 26px rgba(37, 99, 235, 0.18);
        }

        .chainview-flow-node-compact.chainview-flow-node-connected {
          border-color: rgba(37, 99, 235, 0.55);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.12);
        }

        .chainview-lane-node {
          width: ${X_SPACING}px;
          height: ${LANE_HEIGHT}px;
          border-left: 1px solid rgba(148, 163, 184, 0.22);
          border-right: 1px solid rgba(148, 163, 184, 0.22);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 26px;
          pointer-events: none;
          background: transparent;
          color: #475569;
        }

        .chainview-lane-center {
          background: transparent;
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

        .chainview-flow-all .chainview-lane-label {
          display: none;
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

        .chainview-flow-edge-default-dashed path {
          stroke-dasharray: 5 8;
        }

        .chainview-flow-edge-normal-dashed path {
          stroke-dasharray: 12 10;
          animation: chainview-edge-flow 1.2s linear infinite;
        }

        .chainview-flow-edge-service-infra path {
          stroke-dasharray: 8 8;
          animation: chainview-edge-flow 1.25s linear infinite;
        }

        .chainview-flow-edge-service-infra-active path {
          stroke-dasharray: 10 8;
          animation: chainview-edge-flow 0.95s linear infinite;
        }

        .chainview-flow-edge-service-infra-muted path {
          animation: none;
        }

        .chainview-flow-dark .react-flow {
          background: #081b2d;
        }

        .chainview-flow-incident .react-flow {
          background: #f8fafc;
        }

        .chainview-flow-incident .chainview-flow-node-focused {
          border-color: #ff3344;
          box-shadow: 0 0 0 4px rgba(255, 51, 68, 0.14),
            0 14px 30px rgba(255, 51, 68, 0.12);
        }

        .chainview-flow-incident .chainview-flow-node-connected {
          border-color: rgba(255, 51, 68, 0.38);
        }

        .chainview-flow-all .react-flow {
          background: #f8fafc;
        }

        .chainview-flow-dark .chainview-flow-node {
          border-color: #35506b;
          background: #0b2135;
          color: #e2e8f0;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
        }

        .chainview-flow-dark .chainview-flow-node .text-slate-950,
        .chainview-flow-dark .chainview-flow-node .text-slate-900,
        .chainview-flow-dark .chainview-flow-node .text-slate-800 {
          color: #ffffff !important;
        }

        .chainview-flow-dark .chainview-flow-node .text-slate-700,
        .chainview-flow-dark .chainview-flow-node .text-slate-600,
        .chainview-flow-dark .chainview-flow-node .text-slate-500 {
          color: #cbd5e1 !important;
        }

        .chainview-flow-dark .chainview-flow-node .text-slate-400 {
          color: #94a3b8 !important;
        }

        .chainview-flow-dark .chainview-flow-node .bg-slate-50,
        .chainview-flow-dark .chainview-flow-node .bg-white {
          background: #112b43 !important;
        }

        .chainview-flow-dark .chainview-flow-node .border-slate-200,
        .chainview-flow-dark .chainview-flow-node .border-slate-300 {
          border-color: #35506b !important;
        }

        .chainview-flow-dark .chainview-flow-node-focused {
          border-color: #ff3344;
          box-shadow: 0 0 0 4px rgba(255, 51, 68, 0.18),
            0 14px 30px rgba(255, 51, 68, 0.18);
        }

        .chainview-flow-dark .chainview-flow-node-connected {
          border-color: rgba(245, 158, 11, 0.62);
        }

        .chainview-flow-dark .chainview-flow-impact-note {
          border-color: rgba(255, 51, 68, 0.38);
          background: rgba(2, 6, 23, 0.82);
          color: #ff4d5a;
          box-shadow: inset 0 0 0 1px rgba(255, 51, 68, 0.08);
        }

        .chainview-flow-dark .chainview-lane-node {
          border-left-color: rgba(100, 116, 139, 0.28);
          border-right-color: rgba(100, 116, 139, 0.28);
          background: transparent;
          color: #94a3b8;
        }

        .chainview-flow-dark .chainview-lane-center {
          background: transparent;
        }

        .chainview-flow-dark .chainview-lane-label {
          border-color: #35506b;
          background: rgba(11, 33, 53, 0.94);
          color: #e2e8f0;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }

        .chainview-flow-dark .react-flow__controls {
          background: #0b2135;
          border: 1px solid #35506b;
          box-shadow: none;
        }

        .chainview-flow-dark .react-flow__controls-button {
          background: #0b2135;
          border-bottom-color: #35506b;
          color: #e2e8f0;
        }

        .chainview-flow-dark .react-flow__controls-button:hover {
          background: #112b43;
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

function RelationEdgeLegend({
  includeServiceInfra = false,
  placement,
}: {
  includeServiceInfra?: boolean;
  placement: RelationLegendPlacement;
}) {
  const positionClass =
    placement === "top-left" ? "left-5 top-5" : "bottom-5 right-5";

  return (
    <div
      className={`pointer-events-none absolute ${positionClass} z-30 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-[11px] font-black text-slate-600 shadow-sm backdrop-blur`}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-0.5 w-6 rounded-full"
            style={{ backgroundColor: IMPACT_COLOR }}
          />
          송신/영향
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-0.5 w-6 rounded-full"
            style={{ backgroundColor: DEPENDS_ON_COLOR }}
          />
          수신/의존
        </span>
        {includeServiceInfra ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-0.5 w-6 rounded-full"
              style={{ backgroundColor: SERVICE_INFRA_COLOR }}
            />
            서비스-인프라
          </span>
        ) : null}
      </div>
    </div>
  );
}

function GraphViewModeToggle({
  mode,
  onModeChange,
  placement,
}: {
  mode: GraphViewMode;
  onModeChange: (mode: GraphViewMode) => void;
  placement: GraphModeTogglePlacement;
}) {
  const options: Array<{ mode: GraphViewMode; label: string }> = [
    { mode: "all", label: "전체" },
    { mode: "service", label: "서비스" },
    { mode: "infra", label: "인프라" },
  ];
  const activeIndex = options.findIndex((option) => option.mode === mode);
  const isBottom = placement === "bottom-center";

  return (
    <div
      className={`pointer-events-none absolute z-40 ${
        isBottom
          ? "bottom-5 left-1/2 -translate-x-1/2"
          : "right-5 top-5"
      }`}
    >
      <div
        className={`pointer-events-auto relative grid grid-cols-3 overflow-hidden rounded-full border border-slate-200 bg-white/95 p-1 font-black shadow-md backdrop-blur ${
          isBottom ? "h-12 text-base" : "h-10 text-sm"
        }`}
      >
        <span
          className="absolute bottom-1 top-1 w-[calc(33.333333%-4px)] rounded-full bg-[#2563eb] shadow-sm transition-transform duration-200"
          style={{
            left: "4px",
            borderRadius: "9999px",
            transform: `translate3d(${Math.max(activeIndex, 0) * 100}%, 0, 0)`,
            willChange: "transform",
          }}
        />
        {options.map((option) => {
          const active = option.mode === mode;
          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => onModeChange(option.mode)}
              className={`relative z-10 flex items-center justify-center rounded-full transition-colors duration-200 ${
                isBottom ? "h-10 min-w-[108px] px-6" : "h-8 min-w-[72px] px-4"
              } ${
                active
                  ? "text-white"
                  : "text-slate-700 hover:text-slate-950"
              }`}
              style={{ borderRadius: "9999px" }}
              title={
                option.mode === "all"
                  ? "서비스와 인프라 관계를 함께 표시합니다."
                  : option.mode === "service"
                    ? "서비스 간 호출 관계만 표시합니다."
                    : "서비스 관계를 기준으로 인프라 노드 간 연결만 표시합니다."
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RelationInfraDetailPanel({
  open,
  connectedCount,
  incomingCount,
  node,
  outgoingCount,
  onPanelWideChange,
  onOpenChange,
}: {
  open: boolean;
  connectedCount: number;
  incomingCount: number;
  node: InfraGraphNodeRecord;
  outgoingCount: number;
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
      className={`absolute right-4 top-4 z-30 flex origin-top-right transform-gpu flex-col overflow-hidden border border-blue-200 bg-white/96 text-slate-900 transition-[width,max-height,box-shadow,border-radius,transform] ease-out ${
        panelTall
          ? "rounded-2xl shadow-xl"
          : "rounded-[22px] shadow-sm hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
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
            <div className="text-xs font-bold text-blue-700">
              선택 인프라 상세
            </div>
            <h3 className="mt-1 break-words text-lg font-black leading-tight">
              {node.nodeName}
            </h3>
            <div className="mt-1 text-xs font-bold text-slate-500">
              {node.nodeCode}
            </div>
          </div>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpenChange(false);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
            title="상세 접기"
            type="button"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-blue-700">유형</div>
                <div className="mt-1 break-words text-sm font-black text-slate-900">
                  {node.nodeTypeName ?? node.nodeTypeCode}
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-blue-700 shadow-sm">
                {node.statusName ?? node.statusCode ?? "상태 미지정"}
              </span>
            </div>
          </div>

          <RelationDetailItem
            label="위치"
            value={node.locationLabel ?? "위치 미지정"}
          />
          <RelationDetailItem
            label="모델"
            value={node.vendorModel ?? "모델 미지정"}
          />
          <RelationDetailItem label="노드 코드" value={node.nodeCode} />

          <div className="grid grid-cols-3 gap-2">
            <ImpactBox label="직접 연결" value={connectedCount} />
            <ImpactBox label="수신" value={incomingCount} />
            <ImpactBox label="송신" value={outgoingCount} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs font-black text-slate-700">
              <Server size={14} />
              서버 매핑
            </div>
            <div className="mt-2 text-lg font-black text-slate-950">
              {node.serverCount ?? 0}
            </div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              해당 인프라 요소에 연결된 서버 수입니다.
            </p>
          </div>

          <RelationDetailItem
            label="최근 수정"
            value={node.updatedAt ? node.updatedAt.replace("T", " ").slice(0, 19) : "수정일 미지정"}
          />
        </div>
      </div>
    </aside>
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
  relationImpacts,
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
  relationImpacts: RelationImpactSummary[];
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
                등록 영향도
              </div>
              <div className="space-y-1.5 text-xs font-semibold leading-5 text-slate-600">
                {relationImpacts.length > 0 ? (
                  relationImpacts.slice(0, 4).map((impact) => (
                    <div key={`${impact.path}-${impact.text}`}>
                      <b className="text-slate-800">{impact.path}</b>
                      <p className="mt-0.5 break-words">{impact.text}</p>
                    </div>
                  ))
                ) : (
                  <>
                    <div>등록된 서비스 관계 영향도가 없습니다.</div>
                    <div>서비스 관계 등록/수정 화면의 설명에 영향도를 입력하면 표시됩니다.</div>
                  </>
                )}
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
  if (data.compact) {
    return (
      <button
        type="button"
        className={`chainview-flow-node chainview-flow-node-compact nodrag nopan text-left ${
          data.focused ? "chainview-flow-node-focused" : ""
        } ${data.connected ? "chainview-flow-node-connected" : ""} ${
          data.dimmed ? "chainview-flow-node-dimmed" : ""
        }`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          data.onSelectServiceNode(data.serviceId);
        }}
      >
        <Handle id="left-target" type="target" position={Position.Left} />
        <Handle id="left-source" type="source" position={Position.Left} />
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
            <Server size={14} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-black text-slate-900">
              {data.label}
            </div>
            <div className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
              {data.category.split(" / ").slice(0, 2).join(" / ")}
            </div>
          </div>
        </div>
        <Handle id="right-target" type="target" position={Position.Right} />
        <Handle id="right-source" type="source" position={Position.Right} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`chainview-flow-node ${
        data.focused ? "chainview-flow-node-focused" : ""
      } ${data.detailSelected ? "chainview-flow-node-detail-selected" : ""} ${
        data.connected ? "chainview-flow-node-connected" : ""
      } ${data.dimmed ? "chainview-flow-node-dimmed" : ""
      }`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        data.onSelectServiceNode(data.serviceId);
      }}
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
      {data.relationImpactText ? (
        <div className="chainview-flow-impact-note mt-3" title={`${data.relationImpactPath ?? "서비스 관계"} · ${data.relationImpactText}`}>
          <div className="flex items-center gap-1.5 text-[11px] font-black">
            <ShieldAlert size={12} />
            업무영향
          </div>
          <div className="mt-1 line-clamp-2 break-words text-xs font-black leading-5">
            {data.relationImpactText}
          </div>
        </div>
      ) : null}
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
    </button>
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

function ServerInfraNode({ data }: { data: ServerInfraNodeData }) {
  const isServer = data.kind === "server";

  return (
    <button
      type="button"
      className={`chainview-infra-node ${
        isServer ? "chainview-infra-node-server" : "chainview-infra-node-infra"
      } ${data.focused ? "chainview-infra-node-focused" : ""} ${
        data.connected ? "chainview-infra-node-connected" : ""
      } ${data.dimmed ? "chainview-infra-node-dimmed" : ""
      }`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        data.onSelect(data.infraNodeId);
      }}
    >
      <Handle id="left-target" type="target" position={Position.Left} />
      <Handle id="left-source" type="source" position={Position.Left} />
      <div className="flex min-w-0 items-start gap-2">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
            isServer
              ? "bg-blue-50 text-blue-600"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          <Server size={16} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-black text-slate-950">
            {data.label}
          </div>
          <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
            {data.code}
          </div>
          <div className="mt-1 truncate text-[10px] font-bold text-slate-400">
            {data.meta}
          </div>
        </div>
      </div>
      <Handle id="right-target" type="target" position={Position.Right} />
      <Handle id="right-source" type="source" position={Position.Right} />
    </button>
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

function getAllServicesLaneLabel(lane: number) {
  if (lane === 0) {
    return "공통 플랫폼";
  }
  if (lane === 1) {
    return "기간계/업무계";
  }
  if (lane === 2) {
    return "채널계";
  }
  if (lane === 3) {
    return "대외채널";
  }

  return "기타";
}
