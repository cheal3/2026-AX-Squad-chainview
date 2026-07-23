import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  ServiceRelationFlow,
  type InfraGraphNodeRecord,
} from "./ServiceRelationFlow";
import { usePortalData } from "../PortalDataStore";
import type { IncidentRecord, ServiceRecord, ServiceRelationRecord } from "../mockData";
import { chainViewApi, chainViewEmployeeNo } from "../chainViewApi";
import { useNavigate } from "react-router-dom";

const DASHBOARD_FILTER_STORAGE_KEY = "chainview.dashboard.service-filter.v1";
const DEFAULT_CATEGORY_L1 = "공통플랫폼";
const DEFAULT_CATEGORY_L2 = "SWA 플랫폼";

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
  categoryL1: DEFAULT_CATEGORY_L1,
  categoryL2: DEFAULT_CATEGORY_L2,
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
      scope: saved.scope,
      categoryL1: String(saved.categoryL1 ?? ""),
      categoryL2: String(saved.categoryL2 ?? ""),
      categoryL3: String(saved.categoryL3 ?? ""),
      serviceId: Number(saved.serviceId) || null,
    };
  } catch {
    return DEFAULT_DASHBOARD_FILTER;
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

type DashboardManagementRow = [string, string, string];
type DashboardChangeRow = {
  change: string;
  key: string;
  service: string;
  sortAt: string;
  time: string;
};
type DashboardDeployRow = [string, string, string];
type DashboardIncidentRow = [string, string, string, string, string, string];

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

function normalizeDashboardChangeRow(row: unknown, service: ServiceRecord): DashboardChangeRow | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const at =
    record.changedAt ||
    record.createdAt ||
    record.updatedAt ||
    record.occurredAt ||
    record.at ||
    "";
  const change =
    record.changeTypeName ||
    record.changeTypeCode ||
    record.actionType ||
    record.action ||
    record.type ||
    record.fieldName ||
    record.changedField ||
    "변경";
  return {
    change: String(change),
    key: String(record.changeHistoryId || record.historyId || record.id || `${service.serviceId}-${at}-${change}`),
    service: service.serviceName,
    sortAt: String(at),
    time: relativeDashboardTime(at),
  };
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
}): DashboardIncidentRow[] {
  return [...incidents]
    .sort((left, right) => String(right.startedAt || "").localeCompare(String(left.startedAt || "")))
    .slice(0, 5)
    .map((incident) => {
      const serviceName = serviceDisplayName(serviceById, serviceByCode, incident as unknown as Record<string, unknown>);
      const impactCount = incidentImpacts.filter((impact) => Number(impact.incidentId) === Number(incident.incidentId)).length;
      const resolved = incident.incidentStatusCode === "RESOLVED";
      const tone = resolved ? "green" : incident.incidentStatusCode === "IN_PROGRESS" ? "orange" : "sky";
      return [
        serviceName,
        incident.externalIncidentCode ?? `INC-${incident.incidentId}`,
        incident.incidentStatusCode,
        `${impactCount}개`,
        resolved ? relativeDashboardTime(incident.endedAt) : "미종료",
        tone,
      ];
    });
}

function buildRecentDeployRows({
  deployments,
  serviceByCode,
  serviceById,
  services,
}: {
  deployments: Record<string, unknown>[];
  serviceByCode: Map<string, ServiceRecord>;
  serviceById: Map<number, ServiceRecord>;
  services: ServiceRecord[];
}): DashboardDeployRow[] {
  const rows = deployments.length
    ? deployments
    : services.map((service) => ({
        deploymentStatusCode: service.deploymentStatusCode,
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        updatedAt: service.updatedAt,
      }));

  return [...rows]
    .sort((left, right) =>
      String((right as Record<string, unknown>).updatedAt || (right as Record<string, unknown>).createdAt || "")
        .localeCompare(String((left as Record<string, unknown>).updatedAt || (left as Record<string, unknown>).createdAt || ""))
    )
    .slice(0, 5)
    .map((row) => {
      const record = row as Record<string, unknown>;
      const status = String(record.deploymentStatusCode ?? record.statusCode ?? "");
      const at = record.updatedAt ?? record.createdAt;
      return [
        serviceDisplayName(serviceById, serviceByCode, record),
        relativeDashboardTime(at),
        status === "RUNNING" || status === "SUCCESS" ? "up" : "sync",
      ];
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
  const filterLookupRequestedRef = useRef(false);
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
    incidentImpacts,
    incidents,
    owners,
    relations,
    servers,
    services,
    users,
  } = dashboardData;
  const [recentChangeRows, setRecentChangeRows] = useState<DashboardChangeRow[]>([]);
  const [recentChangeLoading, setRecentChangeLoading] = useState(false);

  useEffect(() => {
    if (activeIncident || !portalData.remoteApi.enabled || filterLookupRequestedRef.current) return;
    filterLookupRequestedRef.current = true;
    if (portalData.categories.length === 0) {
      void portalData.remoteApi.testQuery("categories");
    }
    if (portalData.users.length === 0) {
      void portalData.remoteApi.testQuery("users");
    }
  }, [activeIncident, portalData]);

  useEffect(() => {
    if (!services.length) {
      setRecentChangeRows([]);
      return undefined;
    }

    let cancelled = false;
    setRecentChangeLoading(true);
    Promise.all(
      services.map((service) =>
        chainViewApi.services
          .changeHistory(Number(service.serviceId))
          .then((rows) =>
            Array.isArray(rows)
              ? rows.map((row) => normalizeDashboardChangeRow(row, service))
              : []
          )
          .catch(() => [])
      )
    )
      .then((rowsByService) => {
        if (cancelled) return;
        setRecentChangeRows(
          rowsByService
            .flat()
            .filter(Boolean)
            .sort((left, right) =>
              String(right.sortAt || "").localeCompare(String(left.sortAt || ""))
            )
            .slice(0, 5)
        );
      })
      .finally(() => {
        if (!cancelled) {
          setRecentChangeLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [services]);

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
  const recentDeployRows = useMemo(
    () => buildRecentDeployRows({ deployments, serviceByCode, serviceById, services }),
    [deployments, serviceByCode, serviceById, services]
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
  const currentUser = useMemo(
    () => users.find((user) => String(user.employeeNo ?? "") === chainViewEmployeeNo),
    [users]
  );
  const currentUserId = Number(currentUser?.userId) || 0;
  const myServiceIds = useMemo(() => {
    const userOwners = owners.filter((owner) => owner.ownerTypeCode === "USER");
    const matched = userOwners.filter((owner) =>
      currentUserId ? Number(owner.userId) === currentUserId : true
    );
    return new Set(matched.map((owner) => owner.serviceId));
  }, [currentUserId, owners]);
  const scopedServices = useMemo(
    () =>
      draftFilter.scope === "mine"
        ? services.filter((service) => myServiceIds.has(service.serviceId))
        : services,
    [draftFilter.scope, myServiceIds, services]
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
  const filteredServices = useMemo(() => {
    const candidates =
      appliedFilter.scope === "mine"
        ? services.filter((service) => myServiceIds.has(service.serviceId))
        : services;

    return candidates.filter((service) => {
      const path = categoryPathByServiceId.get(service.serviceId) ?? [];
      return (
        (!appliedFilter.serviceId || service.serviceId === appliedFilter.serviceId) &&
        (!appliedFilter.categoryL1 || path[0] === appliedFilter.categoryL1) &&
        (!appliedFilter.categoryL2 || path[1] === appliedFilter.categoryL2) &&
        (!appliedFilter.categoryL3 || path[2] === appliedFilter.categoryL3)
      );
    });
  }, [appliedFilter, categoryPathByServiceId, myServiceIds, services]);
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
        incident={activeIncident}
        onResolve={() => {
          if (!window.confirm(`${activeIncident.title} 인시던트를 종료 처리하시겠습니까?`)) {
            return;
          }
          portalData.updateIncidentStatus(
            activeIncident.incidentId,
            "RESOLVED",
            "운영자가 인시던트를 종료 처리했습니다."
          );
          navigate("/dashboard", { replace: true });
        }}
        relations={portalData.relations}
        services={portalData.services}
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
          infraNode={selectedInfraNode}
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

            const incident = portalData.createIncident({
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
            navigate(`/dashboard?incidentId=${incident.incidentId}`);
          }}
          onCreateIncident={() => {
            if (!selectedService) {
              return;
            }

            const incident = portalData.createIncident({
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
            navigate(`/dashboard?incidentId=${incident.incidentId}`);
          }}
          relationCount={
            selectedService
              ? relationCountByServiceId.get(selectedService.serviceId) ?? 0
              : 0
          }
          relationDirectionCounts={
            selectedService
              ? relationDirectionCountsByServiceId.get(selectedService.serviceId) ?? { incoming: 0, outgoing: 0 }
              : { incoming: 0, outgoing: 0 }
          }
          service={selectedService}
          onBeforeCreateInfraIncident={() =>
            window.confirm(`${selectedInfraNode?.nodeName ?? "선택 인프라"} 인시던트를 생성하시겠습니까?`)
          }
          onBeforeCreateIncident={() =>
            window.confirm(`${selectedService?.serviceName ?? "선택 서비스"} 인시던트를 생성하시겠습니까?`)
          }
        />
      </div>
      <BottomPanels
        changeRows={recentChangeRows}
        deployRows={recentDeployRows}
        incidentRows={recentIncidentRows}
        managementRows={managementRows}
        recentChangeLoading={recentChangeLoading}
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

  const updateScope = (scope: DashboardFilterScope) => {
    updateFilter({ scope, categoryL1: "", categoryL2: "", categoryL3: "", serviceId: null });
  };

  return (
    <section className="dashboard-service-filter mt-1 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <h2 className="mb-2.5 text-sm font-black text-slate-900">조회조건</h2>

      <div className="dashboard-service-filter__grid">
          <div
            className="relative grid h-10 min-w-0 grid-cols-2 overflow-hidden rounded-full border border-slate-200 bg-white p-1 shadow-md"
            style={{ borderRadius: 9999 }}
          >
            <span
              className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-[#1f2a44] shadow-sm transition-transform duration-200"
              style={{
                left: 4,
                borderRadius: 9999,
                transform: `translate3d(${filter.scope === "mine" ? 100 : 0}%, 0, 0)`,
              }}
            />
            {([
              ["all", "전체 서비스"],
              ["mine", "내 담당 서비스"],
            ] as const).map(([scope, label]) => (
              <button
                key={scope}
                className={`relative z-10 h-8 min-w-0 px-2 text-[11px] font-black transition-colors ${
                  filter.scope === scope
                    ? "text-white"
                    : "text-slate-600 hover:text-slate-950"
                }`}
                style={{ borderRadius: 9999 }}
                type="button"
                onClick={() => updateScope(scope)}
              >
                {label}
              </button>
            ))}
          </div>

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
          <div className="flex min-w-0 items-center gap-8">
            <span className="shrink-0 text-sm font-black">서비스 관계도</span>
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
            initialServiceId={selectedServiceId}
            onSelectInfraNode={onSelectInfraNode}
            onSelectService={onSelectService}
            serviceFilter={serviceFilter}
            showAllServices
          />
        </div>
      </section>

      {isExpanded ? (
        <RelationFlowModal title="서비스 관계도" onClose={() => setIsExpanded(false)}>
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
            initialServiceId={selectedServiceId}
            legendPlacement="top-left"
            modeTogglePlacement="bottom-center"
            onSelectInfraNode={onSelectInfraNode}
            onSelectService={onSelectService}
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
}: {
  children: ReactNode;
  dark?: boolean;
  onClose: () => void;
  title: string;
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
          <div className="min-w-0 truncate text-base font-black">{title}</div>
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
  infraNode,
  onBeforeCreateInfraIncident,
  onBeforeCreateIncident,
  onCreateInfraIncident,
  onCreateIncident,
  relationCount,
  relationDirectionCounts,
  service,
}: {
  infraNode?: InfraGraphNodeRecord;
  onBeforeCreateInfraIncident: () => boolean;
  onBeforeCreateIncident: () => boolean;
  onCreateInfraIncident: () => void;
  onCreateIncident: () => void;
  relationCount: number;
  relationDirectionCounts: { incoming: number; outgoing: number };
  service?: ServiceRecord;
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
        <NormalInfo relationDirectionCounts={relationDirectionCounts} service={service} />
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
          relationCount={relationCount}
          relationDirectionCounts={relationDirectionCounts}
          service={service}
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
  relationDirectionCounts,
  service,
}: {
  relationDirectionCounts: { incoming: number; outgoing: number };
  service?: ServiceRecord;
}) {
  const category = service?.categoryPath.join(" > ") ?? "-";
  const serviceCode = service?.serviceCode ?? "-";
  const incomingCount = relationDirectionCounts.incoming;
  const outgoingCount = relationDirectionCounts.outgoing;
  const relationCount = incomingCount + outgoingCount;
  const createdAt = service?.createdAt ?? "-";
  const description = service?.description || "-";

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
      <dt className="font-bold text-slate-700">연관 서비스 수</dt>
      <dd className="truncate">{relationCount}개</dd>
      <dt className="font-bold text-slate-700">인시던트 이력</dt>
      <dd className="truncate">0건 (최근 30일)</dd>
      <dt className="font-bold text-slate-700">등록일</dt>
      <dd className="truncate">{createdAt}</dd>
      <dt className="font-bold text-slate-700">설명</dt>
      <dd className="truncate">{description}</dd>
    </dl>
  );
}

function ServiceDetailModal({
  dark = false,
  onClose,
  relationCount,
  relationDirectionCounts,
  service,
}: {
  dark?: boolean;
  onClose: () => void;
  relationCount: number;
  relationDirectionCounts: { incoming: number; outgoing: number };
  service?: ServiceRecord;
}) {
  const backdropHandlers = useSafeBackdropClose(onClose);
  const incomingCount = relationDirectionCounts.incoming;
  const outgoingCount = relationDirectionCounts.outgoing;
  const totalRelationCount = incomingCount + outgoingCount;
  const sections = [
    {
      title: "서비스 정보",
      rows: [
        ["서비스 코드", service?.serviceCode ?? "-"],
        ["서비스명", service?.serviceName ?? "-"],
        ["서비스 분류", service?.categoryPath.join(" > ") ?? "-"],
        ["서비스 유형", service?.serviceTypeCode ?? "-"],
        ["중요도", service?.importanceCode ?? "-"],
        ["상태", service?.statusCode ?? "-"],
      ],
    },
    {
      title: "배포 정보",
      rows: [
        ["배포 상태", service?.deploymentStatusCode ?? "-"],
        ["엔드포인트 URL", service?.endpointUrl ?? "-"],
        ["배포 경로", service?.deployPath ?? "-"],
        ["포트", service?.portInfo ?? "-"],
        ["인스턴스 수", service?.instanceCount ? `${service.instanceCount}개` : "-"],
      ],
    },
    {
      title: "영향도 정보",
      rows: [
        ["상위 서비스", `${incomingCount}개`],
        ["하위 서비스", `${outgoingCount}개`],
        ["연관 서비스 수", `${totalRelationCount || relationCount}개`],
        ["직접 영향", "EAM 통합 인증, SSO 통합 인증"],
        ["간접 영향", "결제/주문/알림 연계 서비스"],
      ],
    },
    {
      title: "담당자 정보",
      rows: [
        ["등록자", service?.createdBy ?? "-"],
        ["수정자", service?.updatedBy ?? "-"],
        ["등록일", service?.createdAt ?? "-"],
        ["수정일", service?.updatedAt ?? "-"],
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
              {service?.statusCode ?? "UNKNOWN"}
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
  incident,
  onResolve,
  relations,
  services,
}: {
  incident: IncidentRecord;
  onResolve: () => void;
  relations: ServiceRelationRecord[];
  services: ServiceRecord[];
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
  const impact = buildIncidentImpactColumns(incidentServices, services, relations);
  const impactedCount =
    incident.incidentTypeCode === "SERVER"
      ? impact.affectedServices.length
      : impact.level1.length;
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
  const timelineEvents = [
    [formatTimelineClock(startedAtDate), `${incidentTargetName} 오류 증가 감지`],
    [formatTimelineClock(clampTimelineTime(addSeconds(startedAtDate, 14), now)), `${impact.level1[0]?.serviceName ?? "Order-Service"} 영향 감지`],
    [formatTimelineClock(clampTimelineTime(addSeconds(startedAtDate, 24), now)), `${impact.level1[1]?.serviceName ?? impact.level1[0]?.serviceName ?? "Contract-Service"} 영향 감지`],
    [formatTimelineClock(now), "현재 모니터링 중"],
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="flex min-h-full min-w-0 flex-1 flex-col overflow-hidden text-slate-100">
      <header className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(360px,420px)] gap-3">
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
        <div className="grid grid-cols-3 gap-3 rounded-lg border border-[#1f3549] bg-[#081b2d] px-5 py-4">
          <DarkHeaderStat label="발생 시간" value={formatDateTime(startedAtDate)} />
          <DarkHeaderStat label="경과 시간" value={formatElapsedTime(startedAtDate, now)} />
          <DarkHeaderStat icon={<RefreshCw size={14} />} label="실시간 업데이트" value={formatClock(now)} />
        </div>
      </header>

      <div className="mt-3 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
        <DarkMetric icon={<AlertTriangle size={23} />} label={`장애 ${incidentTargetTypeLabel}`} value="1" delta="1" tone="red" />
        <DarkMetric icon={<Users size={23} />} label="영향 서비스" value={String(Math.max(impactedCount, 1))} delta="3" tone="amber" />
        <DarkMetric icon={<BriefcaseBusiness size={23} />} label="영향 업무" value={String(impact.businessImpactCount)} delta={String(impact.businessImpactCount)} tone="amber" />
        <DarkMetric icon={<Globe2 size={23} />} label="영향 채널" value="3" delta="1" tone="purple" />
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
          onResolve={onResolve}
        />
      </div>

      <div className="mt-3 grid min-h-[240px] min-w-0 grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
        <DarkPanel title="장애 타임라인">
          {timelineEvents.map(([time, text], index) => (
            <div key={`${time}-${text}`} className="flex gap-3 py-2 text-sm leading-5">
              <span className={`mt-1 h-4 w-4 shrink-0 rounded-full ${index === 0 ? "bg-[#ff3344]" : "bg-[#f59e0b]"}`} />
              <span className="w-14 shrink-0 text-slate-300">{time}</span>
              <span className="min-w-0 break-words text-slate-300">{text}</span>
            </div>
          ))}
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
          {["김민수 (결제운영팀)", "이정훈 (결제시스템팀)", "결제운영팀 6명", "모바일서비스팀 5명"].map((item) => (
            <div key={item} className="flex items-center justify-between gap-3 border-b border-[#1f3549] py-2 text-sm leading-5 text-slate-300">
              <span className="min-w-0 break-words">{item}</span>
              <span className="flex gap-2 text-[#58a6ff]"><Phone size={13} /><Mail size={13} /></span>
            </div>
          ))}
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
          <div className="mt-5 flex flex-wrap gap-2">
            {["결제", "기간계", "CRITICAL", "PROD"].map((tag) => (
              <span key={tag} className="rounded bg-[#112b43] px-3 py-1 text-xs font-black text-slate-200">{tag}</span>
            ))}
          </div>
        </DarkPanel>
      </div>
    </section>
  );
}

function buildIncidentImpactColumns(
  incidentServices: ServiceRecord[],
  services: ServiceRecord[],
  relations: ServiceRelationRecord[]
) {
  const serviceById = new Map(services.map((service) => [service.serviceId, service]));
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
  const affectedServices = [...incidentServices, ...level1].filter(
    (service, index, list) =>
      list.findIndex((item) => item.serviceId === service.serviceId) === index
  );
  const businessImpactCount = new Set(
    affectedServices
      .map(
        (service) =>
          service.categoryPath[service.categoryPath.length - 1] ??
          service.categoryPath[0]
      )
      .filter(Boolean)
  ).size;

  return { affectedServices, businessImpactCount, level1 };
}

function IncidentSelectedPanel({
  impactedCount,
  incident,
  onResolve,
  rootService,
}: {
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

  return (
      <aside className="overflow-hidden rounded-lg border border-[#1f3549] bg-[#081b2d] p-3">
        <div className="flex items-center justify-between border-b border-[#1f3549] pb-2">
          <h2 className="text-sm font-black text-white">선택된 인시던트</h2>
          <X size={18} className="text-slate-400" />
        </div>
        <div className="mt-3 flex min-w-0 items-center gap-2">
          <AlertTriangle size={19} className="text-[#ff4d5a]" />
          <span className="truncate text-base font-black text-white">{incident.title}</span>
          <span className="rounded bg-[#7f1d2d] px-2 py-1 text-[11px] font-black text-white">{incident.severityCode}</span>
        </div>
        <dl className="mt-3 grid grid-cols-[82px_minmax(0,1fr)] gap-y-2 text-xs">
          <dt className="text-slate-400">상태</dt><dd className="font-black text-[#ff4d5a]">장애</dd>
          <dt className="text-slate-400">심각도</dt><dd className="font-black text-[#ff4d5a]">치명({incident.severityCode})</dd>
          <dt className="text-slate-400">인시던트</dt><dd className="truncate text-slate-200">{incident.externalIncidentCode ?? `#${incident.incidentId}`}</dd>
          <dt className="text-slate-400">대상</dt><dd className="truncate text-slate-200">{targetLabel}</dd>
          <dt className="text-slate-400">발생 시간</dt><dd className="truncate text-slate-200">{incident.startedAt}</dd>
          <dt className="text-slate-400">서비스 분류</dt><dd className="truncate text-slate-200">{categoryLabel}</dd>
          <dt className="text-slate-400">영향받은 서비스</dt><dd className="font-black text-slate-100">{impactedCount}개</dd>
        </dl>
        <div className="mt-3 rounded border border-[#1f3549] bg-[#0b2135] p-2 text-xs text-slate-300">
          <div className="mb-2 font-black text-white">관련 서버 (2)</div>
          <div className="flex justify-between py-1"><span>payment-db-01</span><span>10.10.10.41</span></div>
          <div className="flex justify-between py-1"><span>payment-app-01</span><span>10.10.10.42</span></div>
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
            onClick={() => navigate(`/dashboard-proto-detail?incidentId=${incident.incidentId}`)}
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
    <div>
      <div className="flex items-center gap-1 text-xs font-bold text-slate-400">{icon}{label}</div>
      <div className="mt-2 text-base font-black text-white">{value}</div>
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
  changeRows,
  deployRows,
  incidentRows,
  managementRows,
  recentChangeLoading,
}: {
  changeRows: DashboardChangeRow[];
  deployRows: DashboardDeployRow[];
  incidentRows: DashboardIncidentRow[];
  managementRows: DashboardManagementRow[];
  recentChangeLoading: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="mt-3 grid min-h-[220px] min-w-0 flex-[0.7] grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1.25fr)_minmax(0,2.15fr)] items-stretch gap-2">
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
      <Panel title="최근 서비스 변경">
        {recentChangeLoading && !changeRows.length ? (
          <TinyEmpty>변경 이력을 불러오는 중입니다.</TinyEmpty>
        ) : changeRows.length ? (
          changeRows.map((row) => (
            <div key={row.key} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,0.86fr)_minmax(44px,0.52fr)] items-center gap-2 py-1 text-[13px] leading-5 text-slate-900">
              <span className="min-w-0 break-words">{row.service}</span>
              <span className="min-w-0 break-words text-slate-700">{row.change}</span>
              <span className="min-w-0 break-words text-right text-slate-500">{row.time}</span>
            </div>
          ))
        ) : (
          <TinyEmpty>변경 이력이 없습니다.</TinyEmpty>
        )}
      </Panel>
      <Panel
        actionLabel="더보기 〉"
        onAction={() => navigate("/admin-incidents")}
        title="최근 인시던트"
      >
        <div className="grid min-w-0 grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(58px,0.72fr)_minmax(50px,0.7fr)_minmax(42px,0.55fr)] gap-2 pb-1 text-[12px] font-black leading-5 text-slate-500">
          <span className="break-words">서비스</span>
          <span className="break-words">인시던트</span>
          <span className="break-words">상태</span>
          <span className="break-words">영향 서비스</span>
          <span className="text-right">종료</span>
        </div>
        {incidentRows.length ? incidentRows.map(([service, incident, status, impact, end, tone]) => (
          <div key={incident} className="grid min-w-0 grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(58px,0.72fr)_minmax(50px,0.7fr)_minmax(42px,0.55fr)] items-center gap-2 py-1 text-[13px] leading-5 text-slate-900">
            <span className="min-w-0 break-words">{service}</span>
            <span className="min-w-0 break-words text-slate-700">{incident}</span>
            <span className="min-w-0"><IncidentStatus tone={tone}>{status}</IncidentStatus></span>
            <span className="min-w-0 break-words text-slate-700">{impact}</span>
            <span className="min-w-0 break-words text-right text-slate-500">{end}</span>
          </div>
        )) : <TinyEmpty>등록된 인시던트가 없습니다.</TinyEmpty>}
      </Panel>
      <Panel
        actionLabel="더보기 〉"
        onAction={() => navigate("/admin-deployments")}
        title="최근 배포"
      >
        {deployRows.length ? deployRows.map(([service, time, status]) => (
          <TinyRow key={`${service}-${time}`} icon={status === "up" ? "↑" : "●"} label={service} value={time} tone={status === "up" ? "success" : "muted"} />
        )) : <TinyEmpty>최근 배포가 없습니다.</TinyEmpty>}
      </Panel>
    </div>
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
    <section className="h-full min-h-[220px] min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
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
      <div className="min-w-0 overflow-hidden">{children}</div>
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
  icon,
  label,
  tone = "muted",
  value,
}: {
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
    <div className="flex min-w-0 items-center justify-between gap-3 py-1 text-[13px] leading-5 text-slate-900">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full ${toneClass}`}>{icon}</span>
        <span className="truncate font-normal">{label}</span>
      </div>
      <span className="shrink-0 font-normal text-slate-950">{value}</span>
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
      ? "bg-[#edd8ff] text-[#8b3fd1]"
      : tone === "green"
        ? "bg-[#d9f8e8] text-[#008f72]"
        : tone === "sky"
          ? "bg-[#dbf1ff] text-[#008ec9]"
          : "bg-[#ffe8d6] text-[#ff6b00]";
  return <span className={`inline-flex min-w-[48px] justify-center rounded-full px-1.5 py-0.5 text-[11px] font-black leading-4 ${className}`}>{children}</span>;
}
