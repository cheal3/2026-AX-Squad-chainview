import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  CircleHelp,
  Clock3,
  ExternalLink,
  GitBranch,
  Globe2,
  Mail,
  Maximize2,
  Phone,
  RefreshCw,
  Search,
  Server,
  UserRound,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import {
  FlowAnimationToggleButton,
  ServiceRelationFlow,
  type InfraGraphNodeRecord,
} from "./ServiceRelationFlow";
import { usePortalData } from "../PortalDataStore";
import { codeLabels, type IncidentImpactRecord, type IncidentRecord, type ServiceOwnerRecord, type ServiceRecord, type ServiceRelationRecord } from "../mockData";
import { useNavigate } from "react-router-dom";

const DASHBOARD_FILTER_STORAGE_KEY = "chainview.dashboard.service-filter.v1";
const DASHBOARD_BOTTOM_PANEL_WIDTHS_KEY = "chainview.dashboard.bottom-panel-widths.v1";
const DEFAULT_BOTTOM_PANEL_WIDTHS = [24, 29, 47] as const;
const MIN_BOTTOM_PANEL_WIDTH = 16;

type DashboardFilterScope = "all" | "mine";

type DashboardFilterState = {
  scope: DashboardFilterScope;
  categoryL1: string;
  categoryL2: string;
  categoryL3: string;
  serviceId: number | null;
};

const DEFAULT_DASHBOARD_FILTER: DashboardFilterState = {
  scope: "all",
  categoryL1: "",
  categoryL2: "",
  categoryL3: "",
  serviceId: null,
};

function readDashboardFilter(): DashboardFilterState {
  if (typeof window === "undefined") return DEFAULT_DASHBOARD_FILTER;

  try {
    const saved = JSON.parse(window.localStorage.getItem(DASHBOARD_FILTER_STORAGE_KEY) ?? "null");
    if (!saved || (saved.scope !== "all" && saved.scope !== "mine")) {
      return DEFAULT_DASHBOARD_FILTER;
    }
    return {
      scope: "all",
      categoryL1: String(saved.categoryL1 ?? ""),
      categoryL2: String(saved.categoryL2 ?? ""),
      categoryL3: String(saved.categoryL3 ?? ""),
      serviceId: Number(saved.serviceId) || null,
    };
  } catch {
    return DEFAULT_DASHBOARD_FILTER;
  }
}

function readBottomPanelWidths() {
  if (typeof window === "undefined") return [...DEFAULT_BOTTOM_PANEL_WIDTHS];

  try {
    const saved = JSON.parse(window.localStorage.getItem(DASHBOARD_BOTTOM_PANEL_WIDTHS_KEY) ?? "null");
    if (!Array.isArray(saved) || saved.length !== 3) {
      return [...DEFAULT_BOTTOM_PANEL_WIDTHS];
    }
    const values = saved.map((value) => Number(value));
    const total = values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
    if (total <= 0 || values.some((value) => !Number.isFinite(value) || value < MIN_BOTTOM_PANEL_WIDTH)) {
      return [...DEFAULT_BOTTOM_PANEL_WIDTHS];
    }
    return values.map((value) => (value / total) * 100);
  } catch {
    return [...DEFAULT_BOTTOM_PANEL_WIDTHS];
  }
}

function categoryName(record: Record<string, unknown>) {
  return String(record.categoryName ?? record.name ?? record.label ?? "").trim();
}

function categoryId(record: Record<string, unknown>) {
  return Number(record.categoryId ?? record.id) || 0;
}

function serviceCategoryPath(
  service: ServiceRecord,
  categoryRecords: Array<Record<string, unknown>>
) {
  if (service.categoryPath.length > 1 || !service.categoryId) {
    return service.categoryPath.filter(Boolean);
  }

  const byId = new Map(categoryRecords.map((record) => [categoryId(record), record]));
  const path: string[] = [];
  let current = byId.get(service.categoryId);
  const visited = new Set<number>();

  while (current) {
    const currentId = categoryId(current);
    if (!currentId || visited.has(currentId)) break;
    visited.add(currentId);
    const name = categoryName(current);
    if (name) path.unshift(name);
    const parentId = Number(current.parentCategoryId ?? current.parentId) || 0;
    current = parentId ? byId.get(parentId) : undefined;
  }

  return path.length ? path : service.categoryPath.filter(Boolean);
}

function uniqueLabels(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
}

function sameDashboardFilter(first: DashboardFilterState, second: DashboardFilterState) {
  return (
    first.scope === second.scope &&
    first.categoryL1 === second.categoryL1 &&
    first.categoryL2 === second.categoryL2 &&
    first.categoryL3 === second.categoryL3 &&
    first.serviceId === second.serviceId
  );
}

function normalizeDashboardFilter(
  filter: DashboardFilterState,
  services: ServiceRecord[],
  categoryPathByServiceId: Map<number, string[]>
): DashboardFilterState {
  if (!services.length) return filter;

  const next = { ...filter };
  const hasCategoryValue = (level: number, value: string) =>
    !value ||
    services.some((service) => {
      const path = categoryPathByServiceId.get(service.serviceId) ?? [];
      return path[level] === value;
    });

  if (!hasCategoryValue(0, next.categoryL1)) {
    next.categoryL1 = "";
    next.categoryL2 = "";
    next.categoryL3 = "";
  }

  if (
    next.categoryL1 &&
    next.categoryL2 &&
    !services.some((service) => {
      const path = categoryPathByServiceId.get(service.serviceId) ?? [];
      return path[0] === next.categoryL1 && path[1] === next.categoryL2;
    })
  ) {
    next.categoryL2 = "";
    next.categoryL3 = "";
  }

  if (
    next.categoryL1 &&
    next.categoryL2 &&
    next.categoryL3 &&
    !services.some((service) => {
      const path = categoryPathByServiceId.get(service.serviceId) ?? [];
      return (
        path[0] === next.categoryL1 &&
        path[1] === next.categoryL2 &&
        path[2] === next.categoryL3
      );
    })
  ) {
    next.categoryL3 = "";
  }

  if (
    next.serviceId &&
    !services.some((service) => {
      const path = categoryPathByServiceId.get(service.serviceId) ?? [];
      return (
        service.serviceId === next.serviceId &&
        (!next.categoryL1 || path[0] === next.categoryL1) &&
        (!next.categoryL2 || path[1] === next.categoryL2) &&
        (!next.categoryL3 || path[2] === next.categoryL3)
      );
    })
  ) {
    next.serviceId = null;
  }

  return next;
}

type DashboardManagementRow = [string, string, string];
type DashboardRecentIncidentRow = {
  code: string;
  endState: string;
  impact: string;
  key: string;
  occurredAt: string;
  serviceId?: number;
  serviceName: string;
  status: string;
  title: string;
  tone: string;
};

function parseDashboardCardDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function relativeDashboardTime(value: unknown) {
  const date = parseDashboardCardDate(value);
  if (!date) return "-";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "방금 전";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function serviceDisplayName(
  serviceById: Map<number, ServiceRecord>,
  serviceByCode: Map<string, ServiceRecord>,
  row: Record<string, unknown>
) {
  const service =
    serviceById.get(Number(row.serviceId)) ||
    serviceById.get(Number(row.impactedServiceId)) ||
    serviceByCode.get(String(row.serviceCode ?? row.targetCode ?? ""));
  return String(row.serviceName ?? row.targetServiceName ?? service?.serviceName ?? row.targetLabel ?? row.serviceCode ?? row.targetCode ?? "-");
}

function buildManagementRows({
  incidents,
  owners,
  relations,
  services,
}: {
  incidents: IncidentRecord[];
  owners: { serviceId: number }[];
  relations: ServiceRelationRecord[];
  services: ServiceRecord[];
}): DashboardManagementRow[] {
  const ownerServiceIds = new Set(owners.map((owner) => Number(owner.serviceId)));
  const relationServiceIds = new Set<number>();
  relations.forEach((relation) => {
    relationServiceIds.add(Number(relation.sourceServiceId));
    relationServiceIds.add(Number(relation.targetServiceId));
  });

  return [
    [
      "담당자/담당그룹 미등록",
      `${services.filter((service) => !ownerServiceIds.has(Number(service.serviceId))).length}건`,
      "group",
    ],
    [
      "영향도 미연결",
      `${services.filter((service) => !relationServiceIds.has(Number(service.serviceId))).length}건`,
      "relation",
    ],
    [
      "서비스 설명 미등록",
      `${relations.filter((relation) => !String(relation.description ?? "").trim()).length}건`,
      "document",
    ],
    [
      "미완료 인시던트",
      `${incidents.filter((incident) => incident.incidentStatusCode !== "RESOLVED").length}건`,
      "incident",
    ],
  ];
}

function buildRecentIncidentRows({
  incidentImpacts,
  incidents,
  serviceByCode,
  serviceById,
}: {
  incidentImpacts: { incidentId: number }[];
  incidents: IncidentRecord[];
  serviceByCode: Map<string, ServiceRecord>;
  serviceById: Map<number, ServiceRecord>;
}): DashboardRecentIncidentRow[] {
  return [...incidents]
    .sort((left, right) => String(right.startedAt || "").localeCompare(String(left.startedAt || "")))
    .map((incident) => {
      const incidentRow = incident as unknown as Record<string, unknown>;
      const service =
        serviceById.get(Number(incidentRow.serviceId)) ||
        serviceById.get(Number(incidentRow.impactedServiceId)) ||
        serviceByCode.get(String(incidentRow.serviceCode ?? incidentRow.targetCode ?? ""));
      const impactCount = incidentImpacts.filter((impact) => Number(impact.incidentId) === Number(incident.incidentId)).length;
      const resolved = incident.incidentStatusCode === "RESOLVED" || incident.incidentStatusCode === "CLOSED";
      const tone = resolved
        ? "green"
        : incident.incidentStatusCode === "IN_PROGRESS"
          ? "sky"
          : incident.incidentStatusCode === "MONITORING"
            ? "orange"
            : "purple";
      return {
        code: incident.externalIncidentCode ?? `INC-${incident.incidentId}`,
        endState: resolved ? "종료" : "미종료",
        impact: `${impactCount}개`,
        key: String(incident.incidentId),
        occurredAt: relativeDashboardTime(incident.startedAt),
        serviceId: service?.serviceId ?? (Number(incident.serviceId) || undefined),
        serviceName:
          service?.serviceName ??
          serviceDisplayName(serviceById, serviceByCode, incidentRow),
        status: formatDashboardIncidentStatus(incident.incidentStatusCode),
        title: incident.title || "제목 없는 인시던트",
        tone,
      };
    });
}

function formatDashboardIncidentStatus(statusCode: string) {
  return (
    {
      OPEN: "접수",
      IN_PROGRESS: "조치중",
      MONITORING: "모니터링",
      RESOLVED: "종료",
      CLOSED: "종료",
    }[statusCode] ?? statusCode
  );
}

function buildServiceRecentIncidentRows(
  rows: DashboardRecentIncidentRow[],
  selectedService?: ServiceRecord
) {
  if (!selectedService) return [];

  return rows.filter((row) => {
    return (
      Number(row.serviceId) === Number(selectedService.serviceId) ||
      row.serviceName === selectedService.serviceName ||
      row.code === selectedService.serviceCode
    );
  });
}

export function IncidentDemoDashboard({
  activeIncidentId,
}: {
  activeIncidentId?: number;
} = {}) {
  return (
    <div className="min-w-0 overflow-x-hidden text-slate-950">
      <div className="flex min-h-[820px] w-full">
        <DashboardCase activeIncidentId={activeIncidentId} />
      </div>
    </div>
  );
}

function DashboardCase({
  activeIncidentId,
}: {
  activeIncidentId?: number;
}) {
  const portalData = usePortalData();
  const navigate = useNavigate();
  const stableDataRef = useRef(portalData);
  useEffect(() => {
    if (portalData.services.length > 0) {
      stableDataRef.current = portalData;
    }
  }, [portalData]);
  const dashboardData =
    portalData.services.length > 0 ? portalData : stableDataRef.current;
  const activeIncident = activeIncidentId
    ? portalData.incidents.find(
        (incident) => incident.incidentId === activeIncidentId
      )
    : undefined;
  const {
    categories: categoryRecords,
    deployments,
    groups,
    incidentEvents,
    incidentImpacts,
    incidents,
    owners,
    relations,
    servers,
    services,
    users,
  } = dashboardData;

  const relationCountByServiceId = useMemo(() => {
    const counts = new Map<number, number>();

    relations.forEach((relation) => {
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
  }, [relations]);
  const relationDirectionCountsByServiceId = useMemo(() => {
    const counts = new Map<number, { incoming: number; outgoing: number }>();
    const ensure = (serviceId: number) => {
      const current = counts.get(serviceId) ?? { incoming: 0, outgoing: 0 };
      counts.set(serviceId, current);
      return current;
    };

    relations.forEach((relation) => {
      ensure(relation.sourceServiceId).outgoing += 1;
      ensure(relation.targetServiceId).incoming += 1;
    });

    return counts;
  }, [relations]);
  const serviceById = useMemo(
    () => new Map(services.map((service) => [Number(service.serviceId), service])),
    [services]
  );
  const serviceByCode = useMemo(
    () => new Map(services.map((service) => [service.serviceCode, service])),
    [services]
  );
  const managementRows = useMemo(
    () => buildManagementRows({ incidents, owners, relations, services }),
    [incidents, owners, relations, services]
  );
  const recentIncidentRows = useMemo(
    () => buildRecentIncidentRows({ incidentImpacts, incidents, serviceByCode, serviceById }),
    [incidentImpacts, incidents, serviceByCode, serviceById]
  );
  const [draftFilter, setDraftFilter] = useState<DashboardFilterState>(readDashboardFilter);
  const [appliedFilter, setAppliedFilter] = useState<DashboardFilterState>(readDashboardFilter);
  const categoryPathByServiceId = useMemo(
    () =>
      new Map(
        services.map((service) => [
          service.serviceId,
          serviceCategoryPath(service, categoryRecords),
        ])
      ),
    [categoryRecords, services]
  );
  const scopedServices = useMemo(
    () =>
      services,
    [services]
  );
  const categoryL1Options = useMemo(
    () =>
      uniqueLabels(
        scopedServices.map((service) => categoryPathByServiceId.get(service.serviceId)?.[0] ?? "")
      ),
    [categoryPathByServiceId, scopedServices]
  );
  const categoryL2Options = useMemo(
    () =>
      uniqueLabels(
        scopedServices
          .filter(
            (service) =>
              !draftFilter.categoryL1 ||
              categoryPathByServiceId.get(service.serviceId)?.[0] === draftFilter.categoryL1
          )
          .map((service) => categoryPathByServiceId.get(service.serviceId)?.[1] ?? "")
      ),
    [categoryPathByServiceId, draftFilter.categoryL1, scopedServices]
  );
  const categoryL3Options = useMemo(
    () =>
      uniqueLabels(
        scopedServices
          .filter((service) => {
            const path = categoryPathByServiceId.get(service.serviceId) ?? [];
            return (
              (!draftFilter.categoryL1 || path[0] === draftFilter.categoryL1) &&
              (!draftFilter.categoryL2 || path[1] === draftFilter.categoryL2)
            );
          })
          .map((service) => categoryPathByServiceId.get(service.serviceId)?.[2] ?? "")
      ),
    [categoryPathByServiceId, draftFilter.categoryL1, draftFilter.categoryL2, scopedServices]
  );

  useEffect(() => {
    const normalizedApplied = normalizeDashboardFilter(
      appliedFilter,
      services,
      categoryPathByServiceId
    );
    const normalizedDraft = normalizeDashboardFilter(
      draftFilter,
      services,
      categoryPathByServiceId
    );

    if (!sameDashboardFilter(appliedFilter, normalizedApplied)) {
      setAppliedFilter(normalizedApplied);
      window.localStorage.setItem(
        DASHBOARD_FILTER_STORAGE_KEY,
        JSON.stringify(normalizedApplied)
      );
    }

    if (!sameDashboardFilter(draftFilter, normalizedDraft)) {
      setDraftFilter(normalizedDraft);
    }
  }, [appliedFilter, categoryPathByServiceId, draftFilter, services]);

  const filteredServices = useMemo(() => {
    const candidates =
      services;

    return candidates.filter((service) => {
      const path = categoryPathByServiceId.get(service.serviceId) ?? [];
      return (
        (!appliedFilter.serviceId || service.serviceId === appliedFilter.serviceId) &&
        (!appliedFilter.categoryL1 || path[0] === appliedFilter.categoryL1) &&
        (!appliedFilter.categoryL2 || path[1] === appliedFilter.categoryL2) &&
        (!appliedFilter.categoryL3 || path[2] === appliedFilter.categoryL3)
      );
    });
  }, [appliedFilter, categoryPathByServiceId, services]);
  const filteredServiceIds = useMemo(
    () => {
      const seedIds = new Set(filteredServices.map((service) => service.serviceId));
      const expandedIds = new Set(seedIds);
      relations.forEach((relation) => {
        if (relation.relationStatusCode !== "ACTIVE") return;
        if (seedIds.has(relation.sourceServiceId)) {
          expandedIds.add(relation.targetServiceId);
        }
        if (seedIds.has(relation.targetServiceId)) {
          expandedIds.add(relation.sourceServiceId);
        }
      });
      return [...expandedIds];
    },
    [filteredServices, relations]
  );
  const defaultSelectedServiceId = useMemo(
    () =>
      [...filteredServices]
        .sort((first, second) => {
          const relationCountDiff =
            (relationCountByServiceId.get(second.serviceId) ?? 0) -
            (relationCountByServiceId.get(first.serviceId) ?? 0);

          return (
            relationCountDiff ||
            first.serviceName.localeCompare(second.serviceName, "ko") ||
            first.serviceId - second.serviceId
          );
        })[0]?.serviceId,
    [filteredServices, relationCountByServiceId]
  );
  const [selectedServiceId, setSelectedServiceId] = useState<number | undefined>(
    defaultSelectedServiceId
  );
  const [selectedInfraNode, setSelectedInfraNode] =
    useState<InfraGraphNodeRecord | undefined>();

  useEffect(() => {
    setSelectedServiceId((current) => {
      if (current && filteredServices.some((service) => service.serviceId === current)) {
        return current;
      }

      return defaultSelectedServiceId;
    });
  }, [filteredServices, defaultSelectedServiceId]);

  const applyFilter = (nextFilter = draftFilter) => {
    setAppliedFilter(nextFilter);
    window.localStorage.setItem(DASHBOARD_FILTER_STORAGE_KEY, JSON.stringify(nextFilter));
    setSelectedInfraNode(undefined);
  };

  const resetFilter = (applyImmediately = false) => {
    const reset = { ...draftFilter, categoryL1: "", categoryL2: "", categoryL3: "", serviceId: null };
    setDraftFilter(reset);
    if (applyImmediately) {
      applyFilter(reset);
    }
  };

  const handleSelectService = (serviceId: number) => {
    setSelectedInfraNode(undefined);
    setSelectedServiceId(serviceId);
  };
  const nextIncidentCode = () => {
    const maxIncidentSeq = portalData.incidents.reduce((maxSeq, incident) => {
      const [, seqText] =
        incident.externalIncidentCode?.match(/^INC-\d{4}-(\d+)$/) ?? [];
      const seq = Number(seqText);
      return Number.isFinite(seq) ? Math.max(maxSeq, seq) : maxSeq;
    }, 142);

    return `INC-2026-${String(maxIncidentSeq + 1).padStart(4, "0")}`;
  };
  const selectedService =
    services.find((service) => service.serviceId === selectedServiceId) ??
    filteredServices.find((service) => service.serviceId === defaultSelectedServiceId) ??
    filteredServices[0];

  if (activeIncident) {
    return (
      <IncidentCommandDashboard
        deployments={deployments}
        groups={groups}
        incident={activeIncident}
        incidentEvents={incidentEvents}
        incidentImpacts={incidentImpacts}
        owners={owners}
        onResolve={async () => {
          if (!window.confirm(`${activeIncident.title} 인시던트를 종료 처리하시겠습니까?`)) {
            return;
          }
          const result = await portalData.updateIncidentStatus(
            activeIncident.incidentId,
            "RESOLVED",
            "운영자가 인시던트를 종료 처리했습니다."
          );
          window.alert(result.message);
          if (result.ok) {
            navigate("/dashboard", { replace: true });
          }
        }}
        relations={portalData.relations}
        servers={servers}
        services={portalData.services}
        users={users}
      />
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-116px)] min-w-0 flex-1 flex-col">
      <DashboardServiceFilter
        categoryL1Options={categoryL1Options}
        categoryL2Options={categoryL2Options}
        categoryL3Options={categoryL3Options}
        categoryPathByServiceId={categoryPathByServiceId}
        filter={draftFilter}
        services={scopedServices}
        onApply={applyFilter}
        onChange={setDraftFilter}
        onReset={resetFilter}
      />
      <div className="mt-3 grid min-h-[460px] min-w-0 flex-[1.55] grid-cols-[minmax(0,1fr)_minmax(300px,400px)] gap-3">
        <RelationMap
          key={JSON.stringify(appliedFilter)}
          coreServiceIds={filteredServiceIds}
          selectedServiceId={selectedServiceId}
          onSelectInfraNode={setSelectedInfraNode}
          onSelectService={handleSelectService}
        />
        <ServiceInfoPanel
          deployments={deployments}
          infraNode={selectedInfraNode}
          groups={groups}
          incidents={incidents}
          onCreateInfraIncident={() => {
            if (!selectedInfraNode) {
              return;
            }

            const normalizeLookup = (value?: string) =>
              String(value ?? "").trim().toUpperCase();
            const infraCode = normalizeLookup(selectedInfraNode.nodeCode);
            const infraName = normalizeLookup(selectedInfraNode.nodeName);
            const incidentServer = servers.find(
              (server) =>
                server.infraNodeId === selectedInfraNode.infraNodeId ||
                (Boolean(infraCode) &&
                  normalizeLookup(server.infraNodeCode) === infraCode) ||
                (Boolean(infraName) &&
                  normalizeLookup(server.infraNodeName) === infraName)
            );

            if (!incidentServer) {
              window.alert(
                "선택한 인프라 요소에 매핑된 서버가 없어 서버 인시던트를 생성할 수 없습니다."
              );
              return;
            }

            const createdIncident = portalData.createIncident({
              incidentTypeCode: "SERVER",
              serverId: incidentServer.serverId,
              severityCode: "CRITICAL",
              externalIncidentCode: nextIncidentCode(),
              targetCode: selectedInfraNode.nodeCode,
              targetLabel: `INFRA · ${selectedInfraNode.nodeCode}`,
              title: `${selectedInfraNode.nodeName} 장애 발생`,
              description: "대시보드에서 등록한 인프라 장애입니다.",
              manualRegisteredYn: "Y",
              registeredBy: "admin",
            });
            navigate(`/?incidentId=${createdIncident.incidentId}`);
          }}
          onCreateIncident={() => {
            if (!selectedService) {
              return;
            }

            const createdIncident = portalData.createIncident({
              serviceId: selectedService.serviceId,
              severityCode: "CRITICAL",
              externalIncidentCode: nextIncidentCode(),
              targetCode: selectedService.serviceCode,
              targetLabel: `SERVICE · ${selectedService.serviceCode}`,
              title: `${selectedService.serviceName} 장애 발생`,
              description: "대시보드에서 등록한 서비스 장애입니다.",
              manualRegisteredYn: "Y",
              registeredBy: "admin",
            });
            navigate(`/?incidentId=${createdIncident.incidentId}`);
          }}
          relationDirectionCounts={
            selectedService
              ? relationDirectionCountsByServiceId.get(selectedService.serviceId) ?? { incoming: 0, outgoing: 0 }
              : { incoming: 0, outgoing: 0 }
          }
          owners={owners}
          service={selectedService}
          users={users}
          onBeforeCreateInfraIncident={() =>
            window.confirm(`${selectedInfraNode?.nodeName ?? "선택 인프라"} 인시던트를 생성하시겠습니까?`)
          }
          onBeforeCreateIncident={() =>
            window.confirm(`${selectedService?.serviceName ?? "선택 서비스"} 인시던트를 생성하시겠습니까?`)
          }
        />
      </div>
      <BottomPanels
        incidentRows={recentIncidentRows}
        managementRows={managementRows}
        selectedService={selectedService}
      />
    </section>
  );
}

function DashboardHeader() {
  return (
    <header className="flex h-10 min-w-0 items-center justify-between gap-4 px-1">
      <div className="flex min-w-0 items-center gap-5">
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eaf3ff] text-[#0868e8]">
            <GitBranch size={17} />
          </div>
          <span className="text-base font-black">ChainView</span>
        </div>
        <h1 className="truncate text-base font-black">전체 서비스 운영 현황</h1>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="whitespace-nowrap text-xs font-black text-slate-600">운영환경</span>
        <button className="inline-flex h-[32px] items-center gap-8 rounded border border-slate-200 bg-white px-4 text-sm font-black leading-none text-slate-800">
          PROD
          <span className="text-slate-400">⌄</span>
        </button>
        <label className="relative shrink-0">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="h-[32px] w-[180px] rounded border border-slate-200 bg-white pl-10 pr-3 text-xs font-semibold outline-none"
            placeholder="서비스 검색"
          />
        </label>
        <Bell size={18} className="text-slate-600" />
        <CircleHelp size={18} className="text-slate-600" />
        <UserRound size={18} className="text-slate-600" />
      </div>
    </header>
  );
}

function DashboardServiceFilter({
  categoryL1Options,
  categoryL2Options,
  categoryL3Options,
  categoryPathByServiceId,
  filter,
  onApply,
  onChange,
  onReset,
  services,
}: {
  categoryL1Options: string[];
  categoryL2Options: string[];
  categoryL3Options: string[];
  categoryPathByServiceId: Map<number, string[]>;
  filter: DashboardFilterState;
  onApply: (filter?: DashboardFilterState) => void;
  onChange: (filter: DashboardFilterState) => void;
  onReset: (applyImmediately?: boolean) => void;
  services: ServiceRecord[];
}) {
  const [compact, setCompact] = useState(() =>
    window.matchMedia("(max-width: 1279px)").matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1279px)");
    const updateCompact = () => setCompact(mediaQuery.matches);
    updateCompact();
    mediaQuery.addEventListener("change", updateCompact);
    return () => mediaQuery.removeEventListener("change", updateCompact);
  }, []);

  const updateFilter = (nextFilter: DashboardFilterState) => {
    onChange(nextFilter);
    if (compact) {
      onApply(nextFilter);
    }
  };

  return (
    <section className="dashboard-service-filter mt-1 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <h2 className="mb-2.5 text-sm font-black text-slate-900">조회조건</h2>

      <div className="dashboard-service-filter__grid">
        <FilterSelect
          label="대분류"
          options={categoryL1Options}
          value={filter.categoryL1}
          onChange={(categoryL1) =>
            updateFilter({ ...filter, categoryL1, categoryL2: "", categoryL3: "", serviceId: null })
          }
        />
        <FilterSelect
          disabled={!filter.categoryL1}
          label="중분류"
          options={categoryL2Options}
          value={filter.categoryL2}
          onChange={(categoryL2) =>
            updateFilter({ ...filter, categoryL2, categoryL3: "", serviceId: null })
          }
        />
        <FilterSelect
          disabled={!filter.categoryL2}
          label="소분류"
          options={categoryL3Options}
          value={filter.categoryL3}
          onChange={(categoryL3) => updateFilter({ ...filter, categoryL3, serviceId: null })}
        />

        <ServiceSearchSelect
          services={services}
          value={filter.serviceId}
          onChange={(service) => {
            const path = service
              ? categoryPathByServiceId.get(service.serviceId) ?? service.categoryPath
              : [];
            updateFilter({
              ...filter,
              serviceId: service?.serviceId ?? null,
              categoryL1: path[0] ?? "",
              categoryL2: path[1] ?? "",
              categoryL3: path[2] ?? "",
            });
          }}
        />

        <div className="dashboard-service-filter__actions flex shrink-0 items-end gap-2">
          <button
            className="hidden h-9 shrink-0 border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-700 hover:bg-slate-50 xl:block"
            type="button"
            onClick={() => onReset()}
          >
            초기화
          </button>
          <button
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 xl:hidden"
            type="button"
            title="필터 초기화"
            aria-label="필터 초기화"
            onClick={() => onReset(true)}
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="hidden h-9 shrink-0 bg-[#1f2a44] px-4 text-[11px] font-black text-white shadow-sm hover:bg-[#263552] xl:block"
            type="button"
            onClick={() => onApply()}
          >
            조회
          </button>
        </div>
      </div>

    </section>
  );
}

function FilterSelect({
  disabled = false,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  const normalizedOptions = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[11px] font-black text-slate-600">{label}</span>
      <select
        className="h-9 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">전체</option>
        {normalizedOptions.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ServiceSearchSelect({
  onChange,
  services,
  value,
}: {
  onChange: (service?: ServiceRecord) => void;
  services: ServiceRecord[];
  value: number | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = services.find((service) => service.serviceId === value);
  const [query, setQuery] = useState(selected ? `${selected.serviceName} · ${selected.serviceCode}` : "");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return services
      .filter((service) =>
        !keyword || `${service.serviceName} ${service.serviceCode}`.toLowerCase().includes(keyword)
      )
      .slice(0, 20);
  }, [query, services]);

  useEffect(() => {
    setQuery(selected ? `${selected.serviceName} · ${selected.serviceCode}` : "");
  }, [selected?.serviceId]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <label className="block">
        <span className="mb-1 block text-[11px] font-black text-slate-600">서비스 검색</span>
        <span className="relative block">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="h-9 w-full min-w-0 rounded-md border border-slate-200 bg-white pl-8 pr-7 text-[11px] font-bold text-slate-800 outline-none focus:border-blue-500"
            placeholder="서비스명 또는 코드 검색"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              if (value) onChange(undefined);
            }}
          />
          {query ? (
            <button
              aria-label="서비스 검색 초기화"
              className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center text-slate-400 hover:text-slate-700"
              type="button"
              onClick={() => {
                setQuery("");
                setOpen(true);
                onChange(undefined);
              }}
            >
              <X size={14} />
            </button>
          ) : null}
        </span>
      </label>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-xl">
          {results.length ? results.map((service) => (
            <button
              key={service.serviceId}
              className="flex w-full min-w-0 flex-col px-3 py-2 text-left hover:bg-slate-50"
              type="button"
              onClick={() => {
                setQuery(`${service.serviceName} · ${service.serviceCode}`);
                setOpen(false);
                onChange(service);
              }}
            >
              <span className="truncate text-xs font-black text-slate-900">{service.serviceName}</span>
              <span className="truncate text-[11px] font-bold text-slate-500">{service.serviceCode}</span>
            </button>
          )) : (
            <div className="px-3 py-4 text-center text-xs font-bold text-slate-500">검색 결과가 없습니다.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function RelationMap({
  coreServiceIds,
  onSelectInfraNode,
  onSelectService,
  selectedServiceId,
}: {
  coreServiceIds: number[];
  onSelectInfraNode: (node?: InfraGraphNodeRecord) => void;
  onSelectService: (serviceId: number) => void;
  selectedServiceId?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const coreServiceIdSet = useMemo(() => new Set(coreServiceIds), [coreServiceIds]);
  const serviceFilter = (service: ServiceRecord) =>
    coreServiceIdSet.has(service.serviceId);

  return (
    <>
      <section className="relative h-full min-h-[300px] min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex h-[44px] min-w-0 items-center justify-between gap-3 border-b border-slate-100 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-sm font-black">서비스 관계도</span>
            <FlowAnimationToggleButton />
          </div>
          <button
            aria-label="서비스 관계도 전체 화면 보기"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            title="전체 화면 보기"
            type="button"
            onClick={() => setIsExpanded(true)}
          >
            <Maximize2 size={15} />
          </button>
        </div>
        <div className="h-[calc(100%-44px)] min-h-[386px] min-w-0 overflow-hidden">
          <ServiceRelationFlow
            autoCenter
            embedded
            embeddedHeightClassName="h-full"
            frameless
            hideDepthToggle
            hideDetailPanel
            hideTopControl
            highlightServiceId={selectedServiceId}
            initialFitView
            initialFitZoom={0.28}
            initialRelationDepth={2}
            onSelectInfraNode={onSelectInfraNode}
            onSelectService={onSelectService}
            serviceFilter={serviceFilter}
            showAllServices
          />
        </div>
      </section>

      {isExpanded ? (
        <RelationFlowModal
          title="서비스 관계도"
          titleAction={<FlowAnimationToggleButton />}
          onClose={() => setIsExpanded(false)}
        >
          <ServiceRelationFlow
            autoCenter
            embedded
            embeddedHeightClassName="h-full"
            frameless
            hideDepthToggle
            hideTopControl
            highlightServiceId={selectedServiceId}
            initialFitView
            initialRelationDepth={2}
            legendPlacement="top-left"
            modeTogglePlacement="bottom-center"
            onSelectInfraNode={onSelectInfraNode}
            onSelectService={onSelectService}
            preserveDetailPanelStateOnSelect
            serviceFilter={serviceFilter}
            showAllServices
          />
        </RelationFlowModal>
      ) : null}
    </>
  );
}

function RelationFlowModal({
  children,
  dark = false,
  onClose,
  title,
  titleAction,
}: {
  children: ReactNode;
  dark?: boolean;
  onClose: () => void;
  title: string;
  titleAction?: ReactNode;
}) {
  const backdropHandlers = useSafeBackdropClose(onClose);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1000] bg-slate-950/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      {...backdropHandlers}
    >
      <section
        className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border shadow-2xl ${
          dark
            ? "border-[#1f3549] bg-[#061625] text-slate-100"
            : "border-slate-200 bg-white text-slate-950"
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header
          className={`flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4 ${
            dark ? "border-[#1f3549]" : "border-slate-200"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 truncate text-base font-black">{title}</div>
            {titleAction}
          </div>
          <button
            aria-label="전체 화면 닫기"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border ${
              dark
                ? "border-[#35506b] bg-[#0b2135] text-slate-100 hover:bg-[#102a43]"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
            title="닫기"
            type="button"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </section>
    </div>
  );
}

function ServiceInfoPanel({
  deployments,
  groups,
  infraNode,
  incidents,
  onBeforeCreateInfraIncident,
  onBeforeCreateIncident,
  onCreateInfraIncident,
  onCreateIncident,
  owners,
  relationDirectionCounts,
  service,
  users,
}: {
  deployments: Record<string, unknown>[];
  groups: Record<string, unknown>[];
  infraNode?: InfraGraphNodeRecord;
  incidents: IncidentRecord[];
  onBeforeCreateInfraIncident: () => boolean;
  onBeforeCreateIncident: () => boolean;
  onCreateInfraIncident: () => void;
  onCreateIncident: () => void;
  owners: ServiceOwnerRecord[];
  relationDirectionCounts: { incoming: number; outgoing: number };
  service?: ServiceRecord;
  users: Record<string, unknown>[];
}) {
  const serviceName = service?.serviceName ?? "-";
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  if (infraNode) {
    return (
      <InfraInfoPanel
        node={infraNode}
        onBeforeCreateIncident={onBeforeCreateInfraIncident}
        onCreateIncident={onCreateInfraIncident}
      />
    );
  }

  return (
    <>
      <aside className="h-full min-h-[430px] min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
          <h2 className="truncate text-sm font-black">선택 서비스 정보</h2>
          <StatusBadge />
        </div>
        <div className="flex min-w-0 items-center gap-2 text-base font-black">
          <CheckCircle2 size={17} className="text-[#008f72]" />
          <span className="truncate">{serviceName}</span>
        </div>
        <NormalInfo
          groups={groups}
          incidents={incidents}
          owners={owners}
          relationDirectionCounts={relationDirectionCounts}
          service={service}
          users={users}
        />
        <div className="mt-4 grid min-w-0 grid-cols-2 gap-3">
          <button
            className="h-[28px] min-w-0 rounded border border-[#126cf0] px-2 text-sm font-black text-[#126cf0]"
            type="button"
            onClick={() => setIsDetailOpen(true)}
          >
            서비스 상세
          </button>
          <button
            className="h-[28px] min-w-0 rounded bg-[#126cf0] px-2 text-sm font-black text-white"
            onClick={() => {
              if (onBeforeCreateIncident()) {
                onCreateIncident();
              }
            }}
            type="button"
          >
            인시던트 생성
          </button>
        </div>
      </aside>

      {isDetailOpen ? (
        <ServiceDetailModal
          deployments={deployments}
          relationDirectionCounts={relationDirectionCounts}
          groups={groups}
          incidents={incidents}
          owners={owners}
          service={service}
          users={users}
          onClose={() => setIsDetailOpen(false)}
        />
      ) : null}
    </>
  );
}

function InfraInfoPanel({
  node,
  onBeforeCreateIncident,
  onCreateIncident,
}: {
  node: InfraGraphNodeRecord;
  onBeforeCreateIncident: () => boolean;
  onCreateIncident: () => void;
}) {
  const statusLabel = node.statusName ?? node.statusCode ?? "상태 미지정";
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <>
      <aside className="h-full min-h-[430px] min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
          <h2 className="truncate text-sm font-black">선택 인프라 정보</h2>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-[#e8fbf4] px-3 py-1 text-xs font-black text-[#008f72]">
            ● {statusLabel}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2 text-base font-black">
          <Server size={18} className="shrink-0 text-[#008f72]" />
          <span className="truncate">{node.nodeName}</span>
        </div>
        <InfraInfoRows node={node} />
        <div className="mt-4 grid min-w-0 grid-cols-2 gap-3">
          <button
            className="h-[28px] min-w-0 rounded border border-[#126cf0] px-2 text-sm font-black text-[#126cf0]"
            type="button"
            onClick={() => setIsDetailOpen(true)}
          >
            인프라 상세
          </button>
          <button
            className="h-[28px] min-w-0 rounded bg-[#126cf0] px-2 text-sm font-black text-white"
            onClick={() => {
              if (onBeforeCreateIncident()) {
                onCreateIncident();
              }
            }}
            type="button"
          >
            인시던트 생성
          </button>
        </div>
      </aside>

      {isDetailOpen ? (
        <InfraDetailModal node={node} onClose={() => setIsDetailOpen(false)} />
      ) : null}
    </>
  );
}

function InfraInfoRows({ node }: { node: InfraGraphNodeRecord }) {
  const statusLabel = node.statusName ?? node.statusCode ?? "상태 미지정";

  return (
    <dl className="mt-4 grid min-w-0 grid-cols-[110px_minmax(0,1fr)] gap-y-2 text-sm leading-5">
      <dt className="font-bold text-slate-700">노드 코드</dt>
      <dd className="truncate">{node.nodeCode}</dd>
      <dt className="font-bold text-slate-700">인프라 유형</dt>
      <dd className="truncate">{node.nodeTypeName ?? node.nodeTypeCode}</dd>
      <dt className="font-bold text-slate-700">상태</dt>
      <dd className="truncate">{statusLabel}</dd>
      <dt className="font-bold text-slate-700">위치</dt>
      <dd className="truncate">{node.locationLabel ?? "-"}</dd>
      <dt className="font-bold text-slate-700">모델</dt>
      <dd className="truncate">{node.vendorModel ?? "-"}</dd>
      <dt className="font-bold text-slate-700">서버 매핑</dt>
      <dd className="truncate">{node.serverCount ?? 0}개</dd>
      <dt className="font-bold text-slate-700">최근 수정</dt>
      <dd className="truncate">
        {node.updatedAt ? node.updatedAt.replace("T", " ").slice(0, 19) : "-"}
      </dd>
    </dl>
  );
}

function InfraDetailModal({
  node,
  onClose,
}: {
  node: InfraGraphNodeRecord;
  onClose: () => void;
}) {
  const backdropHandlers = useSafeBackdropClose(onClose);
  const rows = [
    ["노드 ID", String(node.infraNodeId)],
    ["노드 코드", node.nodeCode],
    ["노드명", node.nodeName],
    ["인프라 유형", node.nodeTypeName ?? node.nodeTypeCode],
    ["상태", node.statusName ?? node.statusCode ?? "상태 미지정"],
    ["위치", node.locationLabel ?? "-"],
    ["모델", node.vendorModel ?? "-"],
    ["서버 매핑", `${node.serverCount ?? 0}개`],
    ["최근 수정", node.updatedAt ? node.updatedAt.replace("T", " ").slice(0, 19) : "-"],
  ];

  return (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center bg-slate-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="인프라 상세"
      {...backdropHandlers}
    >
      <div
        className="flex max-h-[86vh] w-full max-w-[820px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-5">
          <h2 className="text-base font-black">인프라 상세</h2>
          <button
            aria-label="인프라 상세 닫기"
            className="grid h-8 w-8 place-items-center rounded border border-slate-200 bg-white text-slate-600"
            type="button"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-500">INFRA</div>
              <h3 className="mt-1 break-words text-xl font-black">
                {node.nodeName}
              </h3>
              <p className="mt-2 break-words text-sm text-slate-600">
                {node.nodeCode}
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              {node.statusName ?? node.statusCode ?? "UNKNOWN"}
            </span>
          </div>
          <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 className="mb-3 text-sm font-black">기본 정보</h4>
            <div className="grid gap-3">
              {rows.map(([label, value]) => (
                <div
                  className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 text-sm"
                  key={label}
                >
                  <div className="font-black text-slate-500">{label}</div>
                  <div className="min-w-0 break-words">{value}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusBadge() {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-full bg-[#e8fbf4] px-3 py-1 text-xs font-black text-[#008f72]">● 정상</span>
  );
}

function NormalInfo({
  groups,
  incidents,
  owners,
  relationDirectionCounts,
  service,
  users,
}: {
  groups: Record<string, unknown>[];
  incidents: IncidentRecord[];
  owners: ServiceOwnerRecord[];
  relationDirectionCounts: { incoming: number; outgoing: number };
  service?: ServiceRecord;
  users: Record<string, unknown>[];
}) {
  const category = service?.categoryPath.join(" > ") ?? "-";
  const serviceCode = service?.serviceCode ?? "-";
  const incomingCount = relationDirectionCounts.incoming;
  const outgoingCount = relationDirectionCounts.outgoing;
  const recentIncidentCount = serviceIncidents(incidents, service, 30).length;
  const description = service?.description || "-";
  const ownerRows = resolveOwnerRows({ groups, owners, service, users });
  const departments = [...new Set(ownerRows.map((owner) => owner.groupName).filter(Boolean))].join(", ") || "-";
  const ownerNames = ownerRows.map((owner) => owner.name).filter(Boolean).join(", ") || "-";

  return (
    <dl className="mt-4 grid min-w-0 grid-cols-[110px_minmax(0,1fr)] gap-y-2 text-sm leading-5">
      <dt className="font-bold text-slate-700">서비스 분류</dt>
      <dd className="truncate">{category}</dd>
      <dt className="font-bold text-slate-700">서비스 코드</dt>
      <dd className="truncate">{serviceCode}</dd>
      <dt className="font-bold text-slate-700">상위 서비스</dt>
      <dd className="truncate">{incomingCount}개</dd>
      <dt className="font-bold text-slate-700">하위 서비스</dt>
      <dd className="truncate">{outgoingCount}개</dd>
      <dt className="font-bold text-slate-700">인시던트 이력</dt>
      <dd className="truncate">{recentIncidentCount}건 (최근 30일)</dd>
      <dt className="font-bold text-slate-700">담당부서</dt>
      <dd className="truncate" title={departments}>{departments}</dd>
      <dt className="font-bold text-slate-700">담당자</dt>
      <dd className="truncate" title={ownerNames}>{ownerNames}</dd>
      <dt className="font-bold text-slate-700">설명</dt>
      <dd className="truncate">{description}</dd>
    </dl>
  );
}

function ServiceDetailModal({
  dark = false,
  deployments,
  groups,
  incidents,
  onClose,
  owners,
  relationDirectionCounts,
  service,
  users,
}: {
  dark?: boolean;
  deployments: Record<string, unknown>[];
  groups: Record<string, unknown>[];
  incidents: IncidentRecord[];
  onClose: () => void;
  owners: ServiceOwnerRecord[];
  relationDirectionCounts: { incoming: number; outgoing: number };
  service?: ServiceRecord;
  users: Record<string, unknown>[];
}) {
  const backdropHandlers = useSafeBackdropClose(onClose);
  const incomingCount = relationDirectionCounts.incoming;
  const outgoingCount = relationDirectionCounts.outgoing;
  const ownerRows = resolveOwnerRows({ groups, owners, service, users });
  const ownerNames = ownerRows.map((owner) => `${owner.name} (${owner.responsibility})`).join(", ");
  const ownerGroups = [...new Set(ownerRows.map((owner) => owner.groupName).filter(Boolean))].join(", ");
  const recentIncidentCount = serviceIncidents(incidents, service, 30).length;
  const serviceDeployments = deployments.filter((deployment) =>
    service
      ? Number(deployment.serviceId) === Number(service.serviceId) ||
        String(deployment.serviceCode ?? "") === service.serviceCode
      : false
  );
  const primaryDeployment = serviceDeployments[0];
  const serviceStatusLabel = labeledCode(codeLabels.serviceStatus, service?.statusCode);
  const importanceLabel = labeledCode(codeLabels.importance, service?.importanceCode);
  const deploymentStatusCode = String(primaryDeployment?.deploymentStatusCode ?? service?.deploymentStatusCode ?? "") || undefined;
  const deploymentStatusLabel = String(primaryDeployment?.deploymentStatusName ?? "") || labeledCode(codeLabels.deploymentStatus, deploymentStatusCode);
  const endpointUrl = String(primaryDeployment?.endpointUrl ?? service?.endpointUrl ?? "-");
  const deploymentPath = String(primaryDeployment?.deployPath ?? service?.deployPath ?? "-");
  const portInfo = String(primaryDeployment?.portInfo ?? primaryDeployment?.port ?? service?.portInfo ?? "-");
  const instanceCount =
    serviceDeployments.reduce((sum, deployment) => sum + (Number(deployment.instanceCount) || 0), 0) ||
    service?.instanceCount ||
    serviceDeployments.length ||
    0;
  const sections = [
    {
      title: "서비스 정보",
      rows: [
        ["서비스 코드", service?.serviceCode ?? "-"],
        ["서비스명", service?.serviceName ?? "-"],
        ["서비스 분류", service?.categoryPath.join(" > ") ?? "-"],
        ["서비스 유형", labeledCode(codeLabels.serviceType, service?.serviceTypeCode)],
        ["중요도", importanceLabel],
        ["상태", serviceStatusLabel],
      ],
    },
    {
      title: "배포 정보",
      rows: [
        ["배포 상태", deploymentStatusLabel],
        ["엔드포인트 URL", endpointUrl],
        ["배포 경로", deploymentPath],
        ["포트", portInfo],
        ["인스턴스 수", instanceCount ? `${instanceCount}개` : "-"],
      ],
    },
    {
      title: "영향도 정보",
      rows: [
        ["상위 서비스", `${incomingCount}개`],
        ["하위 서비스", `${outgoingCount}개`],
        ["인시던트 이력", `${recentIncidentCount}건 (최근 30일)`],
      ],
    },
    {
      title: "담당자 정보",
      rows: [
        ["담당부서", ownerGroups || "-"],
        ["담당자", ownerNames || "-"],
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center bg-slate-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="서비스 상세"
      {...backdropHandlers}
    >
      <div
        className={`flex max-h-[86vh] w-full max-w-[1040px] flex-col overflow-hidden rounded-lg border shadow-2xl ${
          dark ? "border-[#1f3549] bg-[#081b2d] text-slate-100" : "border-slate-200 bg-white text-slate-950"
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={`flex h-12 shrink-0 items-center justify-between border-b px-5 ${dark ? "border-[#1f3549]" : "border-slate-200"}`}>
          <h2 className="text-base font-black">서비스 상세</h2>
          <button
            aria-label="서비스 상세 닫기"
            className={`grid h-8 w-8 place-items-center rounded border ${
              dark ? "border-[#35506b] bg-[#0b2135] text-slate-100" : "border-slate-200 bg-white text-slate-600"
            }`}
            type="button"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className={`text-xs font-black ${dark ? "text-slate-400" : "text-slate-500"}`}>SERVICE</div>
              <h3 className="mt-1 break-words text-xl font-black">{service?.serviceName ?? "선택 서비스"}</h3>
              <p className={`mt-2 break-words text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>{service?.description || "서비스 설명이 등록되지 않았습니다."}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${dark ? "bg-[#0b2135] text-[#4db2ff]" : "bg-blue-50 text-blue-700"}`}>
              {serviceStatusLabel}
            </span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {sections.map((section) => (
              <section className={`rounded-lg border p-4 ${dark ? "border-[#1f3549] bg-[#0b2135]" : "border-slate-200 bg-slate-50"}`} key={section.title}>
                <h4 className="mb-3 text-sm font-black">{section.title}</h4>
                <div className="grid gap-3">
                  {section.rows.map(([label, value]) => (
                    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 text-sm" key={label}>
                      <div className={`font-black ${dark ? "text-slate-400" : "text-slate-500"}`}>{label}</div>
                      <div className="min-w-0 break-words">{value}</div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function useSafeBackdropClose(onClose: () => void) {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  return {
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) {
        return;
      }
      const start = pointerStartRef.current;
      pointerStartRef.current = null;
      if (!start) {
        return;
      }
      const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (moved <= 6) {
        onClose();
      }
    },
    onMouseDown: (event: React.MouseEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) {
        pointerStartRef.current = null;
        return;
      }
      pointerStartRef.current = { x: event.clientX, y: event.clientY };
    },
  };
}

function parseDashboardDate(value: string) {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatClock(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatElapsedTime(startedAt: Date, now: Date) {
  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
  const days = Math.floor(elapsedSeconds / 86400);
  const hours = Math.floor((elapsedSeconds % 86400) / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  if (days > 0) {
    return `${days}일 ${hours}시간 ${minutes}분`;
  }

  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${seconds}초`;
  }

  if (minutes > 0) {
    return `${minutes}분 ${seconds}초`;
  }

  return `${seconds}초`;
}

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

function clampTimelineTime(date: Date, now: Date) {
  return date.getTime() > now.getTime() ? now : date;
}

function formatTimelineClock(date: Date) {
  return formatClock(date).slice(0, 5);
}

function IncidentCommandDashboard({
  deployments,
  groups,
  incident,
  incidentEvents,
  incidentImpacts,
  owners,
  onResolve,
  relations,
  servers,
  services,
  users,
}: {
  deployments: Record<string, unknown>[];
  groups: Record<string, unknown>[];
  incident: IncidentRecord;
  incidentEvents: Record<string, unknown>[];
  incidentImpacts: IncidentImpactRecord[];
  owners: Record<string, unknown>[];
  onResolve: () => void;
  relations: ServiceRelationRecord[];
  servers: ServerRecord[];
  services: ServiceRecord[];
  users: Record<string, unknown>[];
}) {
  const rootService =
    services.find((service) => service.serviceId === incident.serviceId) ??
    (incident.incidentTypeCode === "SERVICE"
      ? services.find(
          (service) =>
            service.serviceCode === incident.targetCode ||
            service.serviceName === incident.targetLabel
        )
      : undefined);
  const incidentServices = rootService
    ? [rootService]
    : incident.incidentTypeCode === "SERVER" && incident.serverId
      ? services.filter((service) => service.serverId === incident.serverId)
      : [];
  const impact = buildIncidentImpactColumns(
    incident,
    incidentServices,
    services,
    relations,
    incidentImpacts
  );
  const impactedCount =
    impact.apiImpactsUsed
      ? impact.level1.length
      : incident.incidentTypeCode === "SERVER"
        ? impact.affectedServices.length
        : impact.level1.length;
  const impactedInfraCount = countImpactedInfraNodes(
    impact.affectedServices,
    deployments,
    servers
  );
  const incidentTitle = incident.title || `${rootService?.serviceName ?? "서비스"} 장애 발생`;
  const incidentTargetTypeLabel =
    incident.incidentTypeCode === "SERVER" ? "인프라" : "서비스";
  const incidentTargetName =
    incident.targetLabel || rootService?.serviceName || incident.targetCode || "대상 미지정";
  const startedAt = useMemo(
    () => incident.startedAt || formatDateTime(new Date()),
    [incident.startedAt]
  );
  const [now, setNow] = useState(() => new Date());
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const startedAtDate = useMemo(() => parseDashboardDate(startedAt), [startedAt]);
  const timelineEvents = useMemo(
    () =>
      buildDashboardIncidentTimeline({
        affectedServiceCount: impactedCount,
        incident,
        incidentEvents,
      }),
    [impactedCount, incident, incidentEvents]
  );
  const ownerRows = useMemo(
    () => resolveOwnerRows({ groups, owners: owners as ServiceOwnerRecord[], service: rootService, users }),
    [groups, owners, rootService, users]
  );
  const serviceDeployments = useMemo(
    () =>
      deployments.filter((deployment) =>
        rootService
          ? Number(deployment.serviceId) === Number(rootService.serviceId) ||
            String(deployment.serviceCode ?? "") === rootService.serviceCode
          : false
      ),
    [deployments, rootService]
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="flex min-h-full min-w-0 flex-1 flex-col overflow-hidden text-slate-100">
      <header className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(680px,720px)] gap-3">
        <div className="rounded-lg border border-[#1f3549] bg-[#081b2d] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ff3344]/50 bg-[#ff3344]/10 text-[#ff4d5a]">
              <AlertTriangle size={25} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-[#ff4d5a]">{incidentTargetTypeLabel} 장애 발생</div>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <h1 className="truncate text-xl font-black text-white">
                  {incidentTitle}
                </h1>
                <span className="rounded bg-[#7f1d2d] px-3 py-1 text-xs font-black text-white">
                  {incident.severityCode}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-[1.1fr_1fr_1fr] gap-3 rounded-lg border border-[#1f3549] bg-[#081b2d] px-5 py-4">
          <DarkHeaderStat label="발생 시간" value={formatDateTime(startedAtDate)} />
          <DarkHeaderStat label="경과 시간" value={formatElapsedTime(startedAtDate, now)} />
          <DarkHeaderStat icon={<RefreshCw size={14} />} label="실시간 업데이트" value={formatClock(now)} />
        </div>
      </header>

      <div className="mt-3 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
        <DarkMetric icon={<AlertTriangle size={23} />} label="장애 노드" value="1" delta="1" tone="red" />
        <DarkMetric icon={<Users size={23} />} label="영향받은 서비스" value={String(impactedCount)} delta={String(impactedCount)} tone="amber" />
        <DarkMetric icon={<Server size={23} />} label="영향받은 인프라" value={String(impactedInfraCount)} delta={String(impactedInfraCount)} tone="purple" />
      </div>

      <div className="mt-3 grid min-h-[500px] min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(280px,320px)] gap-3">
        <section className="min-h-0 overflow-hidden rounded-lg border border-[#1f3549] bg-[#081b2d]">
          <div className="flex h-10 items-center justify-between border-b border-[#1f3549] px-4">
            <div className="text-base font-black text-white">{incidentTargetTypeLabel} 영향도 맵</div>
            <div className="flex items-center gap-2">
              <div className="text-xs font-black text-slate-400">직접 연결 영향</div>
              <button
                aria-label="서비스 영향도 맵 전체 화면 보기"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[#35506b] bg-[#0b2135] text-slate-200 hover:border-[#4b6682] hover:bg-[#102a43]"
                title="전체 화면 보기"
                type="button"
                onClick={() => setIsMapExpanded(true)}
              >
                <Maximize2 size={15} />
              </button>
            </div>
          </div>
          <div className="h-[calc(100%-40px)] min-h-[420px] overflow-hidden">
            <ServiceRelationFlow
              embedded
              embeddedHeightClassName="h-full"
              frameless
              hideDepthToggle
              hideDetailPanel
              hideTopControl
              incidentMode
              incident={incident}
              initialRelationDepth={1}
              initialServiceId={rootService?.serviceId ?? incidentServices[0]?.serviceId}
            />
          </div>
        </section>
        {isMapExpanded ? (
          <RelationFlowModal dark title={`${incidentTargetTypeLabel} 영향도 맵`} onClose={() => setIsMapExpanded(false)}>
            <ServiceRelationFlow
            embedded
            embeddedHeightClassName="h-full"
            frameless
            hideDepthToggle
            hideTopControl
            incidentMode
            incident={incident}
            initialRelationDepth={1}
            initialServiceId={rootService?.serviceId ?? incidentServices[0]?.serviceId}
            />
          </RelationFlowModal>
        ) : null}
        <IncidentSelectedPanel
          incident={incident}
          rootService={rootService}
          impactedCount={impactedCount}
          deployments={serviceDeployments}
          onResolve={onResolve}
        />
      </div>

      <div className="mt-3 grid min-h-[240px] min-w-0 grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
        <DarkPanel title="장애 타임라인">
          <div className="incident-dark-scroll max-h-[184px] overflow-y-auto pr-1">
            {timelineEvents.map(([time, text, actor], index) => (
              <div key={`${time}-${text}`} className="flex gap-3 py-2 text-sm leading-5">
                <span className={`mt-1 h-4 w-4 shrink-0 rounded-full ${index === 0 ? "bg-[#ff3344]" : "bg-[#f59e0b]"}`} />
                <span className="w-14 shrink-0 text-slate-300">{time}</span>
                <span className="min-w-0 flex-1 break-words text-slate-300">{text}</span>
                <span className="shrink-0 text-xs font-bold text-slate-500">{actor}</span>
              </div>
            ))}
          </div>
        </DarkPanel>
        <DarkPanel title="유사 장애 이력 & 권장 조치">
          <div className="grid grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)_48px] gap-2 text-sm leading-5 text-slate-300">
            <span>Connection Pool 고갈</span><b className="text-blue-300">92%</b>
            <span>DB Timeout 증가</span><b className="text-blue-300">85%</b>
          </div>
          <div className="mt-4 space-y-2 text-sm leading-5 text-slate-300">
            {["Payment Failover 상태 확인", "DB Connection Pool 상태 확인", "Order-Service 지연 확인"].map((item, index) => (
              <div key={item} className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#1f3549] text-white">{index + 1}</span>
                <span className="min-w-0 break-words">{item}</span>
              </div>
            ))}
          </div>
        </DarkPanel>
        <DarkPanel title="담당자 영향도">
          {ownerRows.length ? ownerRows.map((owner) => (
            <div key={`${owner.name}-${owner.responsibility}`} className="flex items-center justify-between gap-3 border-b border-[#1f3549] py-2 text-sm leading-5 text-slate-300">
              <span className="min-w-0 break-words">{owner.name} ({owner.groupName}) · {owner.responsibility}</span>
              <span className="flex gap-2 text-[#58a6ff]"><Phone size={13} /><Mail size={13} /></span>
            </div>
          )) : <div className="text-sm text-slate-400">등록된 담당자 정보가 없습니다.</div>}
        </DarkPanel>
        <DarkPanel title="기타 정보">
          <div className="space-y-3 text-sm leading-5 text-slate-300">
            {["운영 가이드", "장애 대응 절차"].map((item) => (
              <div key={item} className="flex items-center justify-between rounded border border-[#1f3549] bg-[#0b2135] px-3 py-2">
                <span className="min-w-0 break-words">{item}</span>
                <ExternalLink size={13} />
              </div>
            ))}
          </div>
        </DarkPanel>
      </div>
    </section>
  );
}

function buildIncidentImpactColumns(
  incident: IncidentRecord,
  incidentServices: ServiceRecord[],
  services: ServiceRecord[],
  relations: ServiceRelationRecord[],
  incidentImpacts: IncidentImpactRecord[]
) {
  const serviceById = new Map(services.map((service) => [service.serviceId, service]));
  const apiImpactedServices = incidentImpacts
    .filter((impact) => Number(impact.incidentId) === Number(incident.incidentId))
    .map((impact) => serviceById.get(Number(impact.impactedServiceId)))
    .filter((service): service is ServiceRecord => Boolean(service))
    .filter(
      (service, index, list) =>
        list.findIndex((item) => item.serviceId === service.serviceId) === index
    );
  const apiImpactsUsed = apiImpactedServices.length > 0;
  const incidentServiceIds = new Set(
    incidentServices.map((service) => service.serviceId)
  );
  const activeRelations = relations.filter(
    (relation) => relation.relationStatusCode === "ACTIVE"
  );
  const level1 = activeRelations
    .flatMap((relation) => {
      if (incidentServiceIds.has(relation.sourceServiceId)) {
        return [serviceById.get(relation.targetServiceId)];
      }
      if (incidentServiceIds.has(relation.targetServiceId)) {
        return [serviceById.get(relation.sourceServiceId)];
      }
      return [];
    })
    .filter((service): service is ServiceRecord => Boolean(service))
    .filter(
      (service, index, list) =>
        !incidentServiceIds.has(service.serviceId) &&
        list.findIndex((item) => item.serviceId === service.serviceId) === index
    );
  const level1Services = apiImpactsUsed ? apiImpactedServices : level1;
  const affectedServices = [...incidentServices, ...level1Services].filter(
    (service, index, list) =>
      list.findIndex((item) => item.serviceId === service.serviceId) === index
  );
  const businessImpactCount = new Set(
    level1Services
      .map(
        (service) =>
          service.categoryPath[service.categoryPath.length - 1] ??
          service.categoryPath[0]
      )
      .filter(Boolean)
  ).size;

  return {
    affectedServices,
    apiImpactsUsed,
    businessImpactCount,
    impactedServices: level1Services,
    level1: level1Services,
  };
}

function countImpactedInfraNodes(
  impactedServices: ServiceRecord[],
  deployments: Record<string, unknown>[],
  servers: ServerRecord[]
) {
  const impactedServiceIds = new Set(
    impactedServices.map((service) => Number(service.serviceId)).filter(Boolean)
  );
  const impactedServiceCodes = new Set(
    impactedServices.map((service) => service.serviceCode).filter(Boolean)
  );
  const infraKeys = new Set<string>();
  const serviceIdsWithDeployments = new Set<number>();
  const serviceIdByCode = new Map(
    impactedServices.map((service) => [service.serviceCode, service.serviceId])
  );
  const serverById = new Map(servers.map((server) => [server.serverId, server]));
  const normalize = (value: unknown) => String(value ?? "").trim().toUpperCase();
  const infraKeyForServer = (server?: ServerRecord, fallback?: unknown) => {
    if (!server) {
      const fallbackText = normalize(fallback);
      return fallbackText ? `SERVER:${fallbackText}` : "";
    }
    return String(
      server.infraNodeId ||
        server.infraNodeCode ||
        server.infraNodeName ||
        server.hostName ||
        server.serverName ||
        server.serverId
    ).toUpperCase();
  };

  deployments.forEach((deployment) => {
    const serviceId = Number(deployment.serviceId);
    if (!serviceId || !impactedServiceIds.has(serviceId)) {
      return;
    }

    serviceIdsWithDeployments.add(serviceId);

    const deploymentServerId = Number(
      deployment.serverId ?? deployment.deploymentServerId ?? deployment.infraServerId
    );
    const keyParts = deploymentServerId
      ? [infraKeyForServer(serverById.get(deploymentServerId), deploymentServerId)]
      : [
          deployment.infraNodeId,
          deployment.infraNodeCode,
          deployment.infraNodeName,
          deployment.nodeCode,
          deployment.nodeName,
          deployment.serverName,
          deployment.hostName,
          deployment.hostname,
          deployment.ipAddress,
          deployment.ip,
          deployment.deploymentKey,
        ]
          .map(normalize)
          .filter(Boolean);

    if (keyParts.length) {
      infraKeys.add(keyParts[0]);
    }
  });

  servers.forEach((server) => {
    const serverServiceIds = [
      ...(server.serviceIds ?? []),
      ...(server.serviceCodes ?? [])
        .map((serviceCode) => serviceIdByCode.get(serviceCode))
        .filter((serviceId): serviceId is number => Boolean(serviceId)),
    ];

    if (!serverServiceIds.some((serviceId) => impactedServiceIds.has(serviceId))) {
      return;
    }

    infraKeys.add(infraKeyForServer(server));
  });

  impactedServices.forEach((service) => {
    if (service.serverId && !serviceIdsWithDeployments.has(service.serviceId)) {
      infraKeys.add(infraKeyForServer(serverById.get(service.serverId), service.serverId));
    }
  });

  return infraKeys.size;
}

function buildDashboardIncidentTimeline({
  affectedServiceCount,
  incident,
  incidentEvents,
}: {
  affectedServiceCount: number;
  incident: IncidentRecord;
  incidentEvents: Record<string, unknown>[];
}) {
  const rows = incidentEvents
    .filter((event) => Number(event.incidentId) === Number(incident.incidentId))
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
    .map((event) => [
      formatDashboardEventTime(String(event.createdAt || incident.startedAt || incident.createdAt || "")),
      normalizeDashboardEventMessage(String(event.message || "인시던트 이벤트가 기록되었습니다."), affectedServiceCount),
      String(event.actor || "SYSTEM"),
    ]);

  return rows.length
    ? rows
    : [[
        formatDashboardEventTime(String(incident.startedAt || incident.createdAt || "")),
        "등록된 장애 진행 이벤트가 없습니다.",
        "SYSTEM",
      ]];
}

function formatDashboardEventTime(value: string) {
  const date = parseDashboardDate(value || formatDateTime(new Date()));
  return formatTimelineClock(date);
}

function normalizeDashboardEventMessage(message: string, affectedServiceCount: number) {
  const text = String(message || "").trim();
  if (text.includes("예상 영향") && text.includes("0건")) {
    return affectedServiceCount > 0
      ? `서비스 관계 기준 예상 영향 ${affectedServiceCount}건을 조회했습니다.`
      : "서비스 관계 기준 추가 영향 서비스는 확인되지 않았습니다.";
  }
  return text;
}

function IncidentSelectedPanel({
  deployments,
  impactedCount,
  incident,
  onResolve,
  rootService,
}: {
  deployments: Record<string, unknown>[];
  impactedCount: number;
  incident: IncidentRecord;
  onResolve: () => void;
  rootService?: ServiceRecord;
}) {
  const targetLabel = incident.targetLabel || rootService?.serviceName || incident.targetCode || "-";
  const categoryLabel =
    rootService?.categoryPath.join(" > ") ||
    (incident.targetCode ? `관리 화면 대상 · ${incident.targetCode}` : "-");
  const navigate = useNavigate();
  const serviceDetailPath = rootService?.serviceCode
    ? `/admin-services/${rootService.serviceCode}?tab=overview`
    : "/admin-services";
  const severityLabel = labeledCode(codeLabels.severity, incident.severityCode);
  const statusLabel = labeledCode(codeLabels.incidentStatus, incident.incidentStatusCode);
  const visibleDeployments = deployments.slice(0, 2);

  return (
      <aside className="overflow-hidden rounded-lg border border-[#1f3549] bg-[#081b2d] p-3">
        <div className="flex items-center justify-between border-b border-[#1f3549] pb-2">
          <h2 className="text-sm font-black text-white">선택된 인시던트</h2>
          <X size={18} className="text-slate-400" />
        </div>
        <div className="mt-3 flex min-w-0 items-center gap-2">
          <AlertTriangle size={19} className="text-[#ff4d5a]" />
          <span className="truncate text-base font-black text-white">{incident.title}</span>
          <span className="rounded bg-[#7f1d2d] px-2 py-1 text-[11px] font-black text-white">{severityLabel}</span>
        </div>
        <dl className="mt-3 grid grid-cols-[82px_minmax(0,1fr)] gap-y-2 text-xs">
          <dt className="text-slate-400">상태</dt><dd className="font-black text-[#ff4d5a]">{statusLabel}</dd>
          <dt className="text-slate-400">심각도</dt><dd className="font-black text-[#ff4d5a]">{severityLabel} ({incident.severityCode})</dd>
          <dt className="text-slate-400">인시던트</dt><dd className="truncate text-slate-200">{incident.externalIncidentCode ?? `#${incident.incidentId}`}</dd>
          <dt className="text-slate-400">대상</dt><dd className="truncate text-slate-200">{targetLabel}</dd>
          <dt className="text-slate-400">발생 시간</dt><dd className="truncate text-slate-200">{formatDashboardDate(incident.startedAt)}</dd>
          <dt className="text-slate-400">서비스 분류</dt><dd className="truncate text-slate-200">{categoryLabel}</dd>
          <dt className="text-slate-400">영향받은 서비스</dt><dd className="font-black text-slate-100">{impactedCount}개</dd>
        </dl>
        <div className="mt-3 rounded border border-[#1f3549] bg-[#0b2135] p-2 text-xs text-slate-300">
          <div className="mb-2 font-black text-white">배포 정보 ({deployments.length})</div>
          {visibleDeployments.length ? visibleDeployments.map((deployment, index) => (
            <div className="flex justify-between gap-2 py-1" key={`${deployment.deploymentKey ?? index}`}>
              <span className="min-w-0 truncate">{String(deployment.serverName ?? deployment.hostName ?? deployment.serverId ?? "-")}</span>
              <span className="shrink-0 text-slate-400">{String(deployment.deploymentStatusName ?? deployment.deploymentStatusCode ?? "-")}</span>
            </div>
          )) : (
            <div className="py-1 text-slate-400">등록된 배포 정보가 없습니다.</div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            className="h-8 rounded bg-[#126cf0] text-xs font-black text-white"
            type="button"
            onClick={() => navigate(serviceDetailPath)}
          >
            서비스 상세 <ExternalLink className="inline" size={12} />
          </button>
          <button
            className="h-8 rounded border border-[#35506b] bg-[#0b2135] text-xs font-black text-slate-200"
            type="button"
            onClick={() => navigate(`/?detail=1&incidentId=${incident.incidentId}`)}
          >
            인시던트 상세 <ExternalLink className="inline" size={12} />
          </button>
          <button
            className="col-span-2 h-8 rounded bg-[#b42335] text-xs font-black text-white hover:bg-[#cf2d42]"
            type="button"
            onClick={onResolve}
          >
            인시던트 종료 처리
          </button>
        </div>
      </aside>
  );
}

function DarkHeaderStat({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 whitespace-nowrap text-xs font-bold text-slate-400">{icon}{label}</div>
      <div className="mt-2 whitespace-nowrap text-sm font-black text-white">{value}</div>
    </div>
  );
}

function DarkMetric({
  delta,
  icon,
  label,
  tone,
  value,
}: {
  delta: string;
  icon: ReactNode;
  label: string;
  tone: "red" | "amber" | "purple";
  value: string;
}) {
  const color = tone === "red" ? "text-[#ff4d5a] bg-[#ff3344]/10" : tone === "purple" ? "text-[#c084fc] bg-[#a855f7]/10" : "text-[#fbbf24] bg-[#f59e0b]/10";

  return (
    <div className="flex items-center gap-4 rounded-lg border border-[#1f3549] bg-[#081b2d] px-4 py-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${color}`}>{icon}</div>
      <div>
        <div className="text-xs font-bold text-slate-300">{label}</div>
        <div className="mt-1 flex items-end gap-4">
          <span className="text-2xl font-black text-white">{value}</span>
          <span className="pb-1 text-xs font-black text-[#ff4d5a]">▲ {delta}</span>
        </div>
      </div>
    </div>
  );
}

function DarkPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="min-h-[240px] overflow-hidden rounded-lg border border-[#1f3549] bg-[#081b2d] p-4">
      <h3 className="mb-3 text-base font-black text-white">{title}</h3>
      {children}
    </section>
  );
}

function BottomPanels({
  incidentRows,
  managementRows,
  selectedService,
}: {
  incidentRows: DashboardRecentIncidentRow[];
  managementRows: DashboardManagementRow[];
  selectedService?: ServiceRecord;
}) {
  const navigate = useNavigate();
  const panelShellRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    handleIndex: 0 | 1;
    startX: number;
    startWidths: number[];
  } | null>(null);
  const [panelWidths, setPanelWidths] = useState(readBottomPanelWidths);
  const visibleAllIncidentRows = incidentRows.slice(0, 5);
  const selectedIncidentRows = buildServiceRecentIncidentRows(incidentRows, selectedService).slice(0, 5);
  const selectedIncidentTitle = `${selectedService?.serviceName ?? "선택 서비스"} 최근 인시던트`;
  const panelGridTemplate = `minmax(220px, ${panelWidths[0]}fr) 10px minmax(320px, ${panelWidths[1]}fr) 10px minmax(420px, ${panelWidths[2]}fr)`;
  const beginResize = (handleIndex: 0 | 1, event: PointerEvent<HTMLButtonElement>) => {
    dragStateRef.current = {
      handleIndex,
      startX: event.clientX,
      startWidths: panelWidths,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const resizePanels = (event: PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    const shellWidth = panelShellRef.current?.getBoundingClientRect().width ?? 0;
    if (!dragState || shellWidth <= 0) return;

    const totalWidth = dragState.startWidths.reduce((sum, width) => sum + width, 0);
    const deltaWidth = ((event.clientX - dragState.startX) / shellWidth) * totalWidth;
    const nextWidths = [...dragState.startWidths];
    const leftIndex = dragState.handleIndex;
    const rightIndex = dragState.handleIndex + 1;
    const pairTotal = nextWidths[leftIndex] + nextWidths[rightIndex];
    const nextLeft = Math.min(
      pairTotal - MIN_BOTTOM_PANEL_WIDTH,
      Math.max(MIN_BOTTOM_PANEL_WIDTH, nextWidths[leftIndex] + deltaWidth)
    );
    nextWidths[leftIndex] = nextLeft;
    nextWidths[rightIndex] = pairTotal - nextLeft;
    setPanelWidths(nextWidths);
  };
  const endResize = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
    window.localStorage.setItem(DASHBOARD_BOTTOM_PANEL_WIDTHS_KEY, JSON.stringify(panelWidths));
  };

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_BOTTOM_PANEL_WIDTHS_KEY, JSON.stringify(panelWidths));
  }, [panelWidths]);

  return (
    <div
      ref={panelShellRef}
      className="mt-3 grid h-[236px] min-w-0 flex-none items-stretch overflow-hidden"
      style={{ gridTemplateColumns: panelGridTemplate }}
    >
      <Panel title="관리 필요 서비스">
        {managementRows.map(([label, value, type]) => (
          <TinyRow
            key={label}
            icon={managementIcon(type)}
            label={label}
            value={value}
            tone={type === "incident" ? "danger" : type === "relation" ? "success" : "muted"}
          />
        ))}
      </Panel>
      <BottomPanelResizeHandle
        onPointerDown={(event) => beginResize(0, event)}
        onPointerMove={resizePanels}
        onPointerUp={endResize}
        onPointerCancel={endResize}
      />
      <ReferencePanel
        actionLabel="더보기 〉"
        onAction={() => navigate("/admin-incidents")}
        title="전체 최근 인시던트"
      >
        <RecentIncidentList rows={visibleAllIncidentRows} emptyText="최근 인시던트가 없습니다." />
      </ReferencePanel>
      <BottomPanelResizeHandle
        onPointerDown={(event) => beginResize(1, event)}
        onPointerMove={resizePanels}
        onPointerUp={endResize}
        onPointerCancel={endResize}
      />
      <ReferencePanel
        actionLabel="더보기 〉"
        onAction={() => navigate("/admin-incidents")}
        title={selectedIncidentTitle}
      >
        <RecentIncidentList rows={selectedIncidentRows} emptyText="최근 인시던트가 없습니다." />
      </ReferencePanel>
    </div>
  );
}

function BottomPanelResizeHandle({
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      aria-label="패널 너비 조절"
      className="group relative h-full cursor-col-resize touch-none rounded-md bg-transparent outline-none"
      type="button"
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <span className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rounded-full bg-slate-200 transition group-hover:bg-slate-400 group-focus-visible:bg-slate-500" />
    </button>
  );
}

function RecentIncidentList({
  emptyText,
  rows,
}: {
  emptyText: string;
  rows: DashboardRecentIncidentRow[];
}) {
  if (!rows.length) {
    return <TinyEmpty>{emptyText}</TinyEmpty>;
  }

  return (
    <div className="min-w-0">
      <div className="grid min-w-0 grid-cols-[minmax(104px,1fr)_62px_76px_64px] items-center gap-2 px-0.5 pb-2 text-[11px] font-black leading-4 text-slate-500">
        <span>서비스</span>
        <span className="text-center">상태</span>
        <span className="text-center">영향 서비스</span>
        <span className="text-right">종료여부</span>
      </div>
      <div className="space-y-[2px]">
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid min-w-0 grid-cols-[minmax(104px,1fr)_62px_76px_64px] items-center gap-2 px-0.5 py-[4px] text-[12px] font-medium leading-5 text-slate-600"
          >
            <span className="min-w-0 truncate font-semibold text-slate-800" title={`${row.serviceName} · ${row.title || row.code}`}>{row.serviceName}</span>
            <span className="flex justify-center"><IncidentStatus tone={row.tone}>{row.status}</IncidentStatus></span>
            <span className="whitespace-nowrap text-center text-slate-500">{row.impact}</span>
            <span className="truncate text-right font-medium text-slate-400" title={row.endState}>{row.endState}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDashboardDate(value?: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function labeledCode(
  labels: Record<string, string>,
  value?: string
) {
  return value ? labels[value] ?? value : "-";
}

function serviceIncidents(
  incidents: IncidentRecord[],
  service?: ServiceRecord,
  days?: number
) {
  if (!service) return [];
  const sinceTime = days
    ? Date.now() - days * 24 * 60 * 60 * 1000
    : Number.NEGATIVE_INFINITY;

  return incidents.filter((incident) => {
    const matchesService =
      incident.serviceId === service.serviceId ||
      incident.targetCode === service.serviceCode ||
      incident.targetLabel === service.serviceName;
    if (!matchesService) return false;

    const date = parseDashboardCardDate(incident.startedAt);
    return !days || !date || date.getTime() >= sinceTime;
  });
}

function resolveOwnerRows({
  groups,
  owners,
  service,
  users,
}: {
  groups: Record<string, unknown>[];
  owners: ServiceOwnerRecord[];
  service?: ServiceRecord;
  users: Record<string, unknown>[];
}) {
  if (!service) return [];

  return owners
    .filter((owner) => Number(owner.serviceId) === Number(service.serviceId))
    .map((owner) => {
      const user = users.find((row) => Number(row.userId ?? row.id) === Number(owner.userId));
      const group = groups.find((row) => Number(row.groupId ?? row.id) === Number(owner.groupId));
      const ownerName =
        owner.ownerName ||
        String(user?.userName ?? user?.name ?? group?.groupName ?? group?.name ?? "담당자 미등록");
      const groupName = String(
        group?.groupName ??
          group?.name ??
          user?.groupName ??
          user?.departmentName ??
          ownerName
      );

      return {
        groupName,
        name: ownerName,
        responsibility:
          codeLabels.responsibilityType[owner.responsibilityCode] ??
          owner.responsibilityCode ??
          "-",
      };
    });
}

function ReferencePanel({
  actionLabel,
  children,
  onAction,
  title,
}: {
  actionLabel?: string;
  children: ReactNode;
  onAction?: () => void;
  title: string;
}) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <div className="mb-2.5 flex min-w-0 shrink-0 items-center justify-between gap-3">
        <h3 className="truncate text-sm font-black leading-5 text-slate-950">{title}</h3>
        {actionLabel && onAction ? (
          <button
            className="shrink-0 whitespace-nowrap text-[11px] font-bold leading-5 text-slate-500 hover:text-slate-800"
            onClick={onAction}
            type="button"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}

function Panel({
  actionLabel,
  children,
  onAction,
  title,
}: {
  actionLabel?: string;
  children: ReactNode;
  onAction?: () => void;
  title: string;
}) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-2 flex min-w-0 shrink-0 items-center justify-between gap-3">
        <h3 className="truncate text-sm font-black leading-5 text-slate-950">{title}</h3>
        {actionLabel && onAction ? (
          <button
            className="shrink-0 whitespace-nowrap text-[11px] font-bold text-slate-500"
            onClick={onAction}
            type="button"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}

function managementIcon(type: string) {
  if (type === "incident") {
    return <AlertTriangle size={12} />;
  }

  if (type === "relation") {
    return <GitBranch size={12} />;
  }

  if (type === "document") {
    return <CircleHelp size={12} />;
  }

  return <UsersRound size={12} />;
}

function TinyRow({
  compact = false,
  icon,
  label,
  tone = "muted",
  value,
}: {
  compact?: boolean;
  icon: ReactNode;
  label: string;
  tone?: "danger" | "muted" | "success";
  value: string;
}) {
  const toneClass =
    tone === "danger"
      ? "bg-red-50 text-red-600"
      : tone === "success"
        ? "bg-blue-50 text-blue-600"
        : "bg-slate-100 text-slate-500";

  return (
    <div className={`flex min-w-0 items-center justify-between gap-3 ${compact ? "py-0.5 text-xs" : "py-1.5 text-[13px]"} leading-5 text-slate-900`}>
      <div className="flex min-w-0 items-center gap-2">
        <span className={`grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full ${toneClass}`}>{icon}</span>
        <span className="min-w-0 truncate whitespace-nowrap font-normal leading-5" title={label}>{label}</span>
      </div>
      <span className="shrink-0 whitespace-nowrap font-normal text-slate-950">{value}</span>
    </div>
  );
}

function TinyEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="py-6 text-center text-[13px] font-semibold text-slate-400">
      {children}
    </div>
  );
}

function IncidentStatus({ children, tone }: { children: ReactNode; tone: string }) {
  const className =
    tone === "purple"
      ? "bg-slate-100 text-slate-700 ring-slate-200"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
        : tone === "sky"
          ? "bg-sky-50 text-sky-700 ring-sky-100"
          : "bg-amber-50 text-amber-700 ring-amber-100";
  return <span className={`inline-flex h-[22px] w-[54px] items-center justify-center rounded-full px-2 text-[11px] font-black leading-none ring-1 ${className}`}>{children}</span>;
}
