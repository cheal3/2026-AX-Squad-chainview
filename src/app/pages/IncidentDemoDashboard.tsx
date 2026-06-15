import {
  forwardRef,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type ReactNode,
  type RefObject,
} from "react";
import { Link, useSearchParams } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeInfo,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Filter,
  GitBranch,
  Globe2,
  Headphones,
  Mail,
  Monitor,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  ShieldAlert,
  Siren,
  Smartphone,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { usePortalData } from "../PortalDataStore";
import { PageHeader } from "../components/PageHeader";
import {
  codeLabels,
  type IncidentRecord,
  type ServiceRecord,
  type ServiceStatusCode,
} from "../mockData";

type DashboardView = "cards" | "topology" | "relations";
type ImpactDetailTab = "service" | "impact" | "owners" | "history";

const viewLabels: Record<DashboardView, string> = {
  cards: "카드",
  topology: "토폴로지",
  relations: "관계 그래프",
};

const LazyServiceRelationFlow = lazy(() =>
  import("./ServiceRelationFlow").then((module) => ({
    default: module.ServiceRelationFlow,
  }))
);

export function IncidentDemoDashboard() {
  const [searchParams] = useSearchParams();
  const {
    addIncidentEvent,
    createIncident,
    incidentEvents,
    services,
    relations,
    owners,
    incidents,
    updateIncidentStatus,
    updateService,
  } = usePortalData();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<DashboardView>("cards");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [incidentDemoOpen, setIncidentDemoOpen] = useState(true);
  const [analysisReportOpen, setAnalysisReportOpen] = useState(false);
  const [impactDetailTab, setImpactDetailTab] =
    useState<ImpactDetailTab>("service");
  const [normalCategoryTab, setNormalCategoryTab] = useState("전체");
  const [normalListPage, setNormalListPage] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    null
  );
  const [serviceDetailPanelOpen, setServiceDetailPanelOpen] = useState(true);
  const [normalPopupServiceId, setNormalPopupServiceId] = useState<
    number | null
  >(null);
  const [incidentRegisterService, setIncidentRegisterService] =
    useState<ServiceRecord | null>(null);
  const [incidentSymptom, setIncidentSymptom] = useState("");
  const [demoIncidentIds, setDemoIncidentIds] = useState<Set<number>>(
    () => new Set()
  );
  const [timelinePopupOpen, setTimelinePopupOpen] = useState(false);
  const [actionNote, setActionNote] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [statusOverrides, setStatusOverrides] = useState<
    Record<number, ServiceStatusCode>
  >({});
  const incidentSectionRef = useRef<HTMLElement | null>(null);
  const warningSectionRef = useRef<HTMLElement | null>(null);
  const operationsSectionRef = useRef<HTMLElement | null>(null);
  const relationSectionRef = useRef<HTMLElement | null>(null);

  const scrollToSection = (sectionRef: RefObject<HTMLElement | null>) => {
    sectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  const showCardsAndScrollTo = (sectionRef: RefObject<HTMLElement | null>) => {
    setView("cards");
    window.setTimeout(() => scrollToSection(sectionRef), 0);
  };

  const getDashboardStatus = (service: ServiceRecord) =>
    statusOverrides[service.serviceId] ?? "NORMAL";
  const updateDashboardStatus = (
    serviceId: number,
    statusCode: ServiceStatusCode
  ) => {
    setStatusOverrides((current) => ({
      ...current,
      [serviceId]: statusCode,
    }));
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const queryMatched =
        !normalizedQuery ||
        [
          service.serviceName,
          service.serviceCode,
          service.categoryPath.join(" "),
          service.createdBy,
          service.updatedBy,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return queryMatched;
    });
  }, [normalizedQuery, services]);

  const criticalServices = services.filter((service) => {
    const status = getDashboardStatus(service);
    return status === "INCIDENT" || status === "INACTIVE";
  });
  const warningServices = services.filter((service) => {
    const status = getDashboardStatus(service);
    return status === "IMPACTED" || status === "MAINTENANCE";
  });
  const runningServices = services.filter(
    (service) => getDashboardStatus(service) === "NORMAL"
  );
  const pausedServices = services.filter(
    (service) => {
      const status = getDashboardStatus(service);
      return (
        status === "MAINTENANCE" ||
        status === "INACTIVE"
      );
    }
  );
  const activeRelations = relations.filter(
    (relation) => relation.relationStatusCode === "ACTIVE"
  );

  const openIncidentCards = useMemo(() => {
    const serviceById = new Map(services.map((service) => [service.serviceId, service]));
    const activeIncidentCards = incidents
      .filter(
        (incident) =>
          (demoIncidentIds.has(incident.incidentId) ||
            incident.manualRegisteredYn === "Y" ||
            incident.registeredBy === "admin") &&
          incident.incidentStatusCode !== "RESOLVED"
      )
      .map((incident) => {
        const service = incident.serviceId
          ? serviceById.get(incident.serviceId)
          : undefined;

        if (!service) {
          return null;
        }

        return { incident, service };
      })
      .filter(
        (item): item is { incident: IncidentRecord; service: ServiceRecord } =>
          Boolean(item)
      )
      .sort((first, second) =>
        second.incident.startedAt.localeCompare(first.incident.startedAt)
      );

    return activeIncidentCards;
  }, [demoIncidentIds, incidents, services]);
  const displayedIncidentCount = criticalServices.length;
  const requestedIncidentId = Number(searchParams.get("incidentId"));
  const requestedServiceId = Number(searchParams.get("serviceId"));
  const incidentDashboardRequested =
    searchParams.get("mode") === "incident" ||
    Boolean(searchParams.get("incidentId"));
  const requestedIncident =
    (Number.isFinite(requestedIncidentId) && requestedIncidentId > 0
      ? incidents.find(
          (incident) =>
            (demoIncidentIds.has(incident.incidentId) ||
              incident.manualRegisteredYn === "Y" ||
              incident.registeredBy === "admin") &&
            incident.incidentId === requestedIncidentId &&
            incident.incidentStatusCode !== "RESOLVED"
        )
      : undefined) ??
    (incidentDashboardRequested ? openIncidentCards[0]?.incident : undefined);
  const requestedIncidentService = requestedIncident?.serviceId
    ? services.find((service) => service.serviceId === requestedIncident.serviceId)
    : undefined;
  const requestedService =
    Number.isFinite(requestedServiceId) && requestedServiceId > 0
      ? services.find((service) => service.serviceId === requestedServiceId)
      : undefined;
  const activeIncident = incidentDashboardRequested
    ? requestedIncident
    : undefined;
  const incidentRootService = activeIncident?.serviceId
    ? services.find((service) => service.serviceId === activeIncident.serviceId)
    : undefined;
  const relationRootService =
    incidentRootService ?? requestedIncidentService ?? requestedService ?? services[0] ?? null;
  const selectedService =
    services.find((service) => service.serviceId === selectedServiceId) ??
    requestedIncidentService ??
    requestedService ??
    services[0];
  const activeServiceIncident =
    incidentDashboardRequested &&
    selectedService &&
    activeIncident?.serviceId === selectedService.serviceId
      ? activeIncident
      : undefined;
  const primaryIncidentService = relationRootService ?? selectedService;
  const selectedStatus = selectedService
    ? getDashboardStatus(selectedService)
    : "NORMAL";
  const hasActiveIncident =
    incidentDashboardRequested && Boolean(selectedService) && Boolean(activeIncident);
  const activeIncidentStartedAt = activeIncident
    ? parseDateTime(activeIncident.startedAt)
    : null;
  const incidentStartedTime = activeIncidentStartedAt
    ? formatClockTime(activeIncidentStartedAt)
    : "-";
  const incidentElapsedTime = activeIncidentStartedAt
    ? formatElapsedTime(activeIncidentStartedAt, currentTime)
    : "-";

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const impactSnapshot = useMemo(() => {
    if (!primaryIncidentService) {
      return {
        directServices: [] as ServiceRecord[],
        indirectServices: [] as ServiceRecord[],
        impactedServices: [] as ServiceRecord[],
      };
    }

    const serviceById = new Map(
      services.map((service) => [service.serviceId, service])
    );
    const directIds = new Set<number>();
    activeRelations.forEach((relation) => {
      if (relation.sourceServiceId === primaryIncidentService.serviceId) {
        directIds.add(relation.targetServiceId);
      }
      if (relation.targetServiceId === primaryIncidentService.serviceId) {
        directIds.add(relation.sourceServiceId);
      }
    });

    const indirectIds = new Set<number>();
    directIds.forEach((directId) => {
      activeRelations.forEach((relation) => {
        const nextId =
          relation.sourceServiceId === directId
            ? relation.targetServiceId
            : relation.targetServiceId === directId
              ? relation.sourceServiceId
              : undefined;

        if (
          nextId &&
          nextId !== primaryIncidentService.serviceId &&
          !directIds.has(nextId)
        ) {
          indirectIds.add(nextId);
        }
      });
    });

    const directServices = Array.from(directIds)
      .map((serviceId) => serviceById.get(serviceId))
      .filter(Boolean)
      .slice(0, 4) as ServiceRecord[];
    const indirectServices = Array.from(indirectIds)
      .map((serviceId) => serviceById.get(serviceId))
      .filter(Boolean)
      .slice(0, 5) as ServiceRecord[];

    return {
      directServices,
      indirectServices,
      impactedServices: [...directServices, ...indirectServices],
    };
  }, [activeRelations, primaryIncidentService, services]);

  const ownerByServiceId = useMemo(() => {
    const next = new Map<number, string[]>();
    owners.forEach((owner) => {
      const item = next.get(owner.serviceId) ?? [];
      item.push(owner.ownerName);
      next.set(owner.serviceId, item);
    });
    return next;
  }, [owners]);
  const relationCountByServiceId = useMemo(() => {
    const next = new Map<number, { incoming: number; outgoing: number }>();
    relations.forEach((relation) => {
      const source = next.get(relation.sourceServiceId) ?? {
        incoming: 0,
        outgoing: 0,
      };
      source.outgoing += 1;
      next.set(relation.sourceServiceId, source);

      const target = next.get(relation.targetServiceId) ?? {
        incoming: 0,
        outgoing: 0,
      };
      target.incoming += 1;
      next.set(relation.targetServiceId, target);
    });
    return next;
  }, [relations]);
  const filteredRunningServices = filteredServices.filter(
    (service) => getDashboardStatus(service) === "NORMAL"
  );
  const filteredPausedServices = filteredServices.filter((service) => {
    const status = getDashboardStatus(service);
    return (
      status === "INACTIVE" ||
      status === "MAINTENANCE" ||
      service.deploymentStatusCode === "STOPPED"
    );
  });
  const showIncidentRelations = () => {
    window.setTimeout(() => scrollToSection(relationSectionRef), 0);
  };

  const ownerlessCount = services.filter(
    (service) => !(ownerByServiceId.get(service.serviceId)?.length)
  ).length;
  const noRelationCount = services.filter((service) => {
    const count = relationCountByServiceId.get(service.serviceId);
    return !count || count.incoming + count.outgoing === 0;
  }).length;
  const undocumentedCount = services.filter(
    (service) => !service.description.trim()
  ).length;
  const createSelectedIncident = () => {
    if (!selectedService) {
      return;
    }

    return createNormalIncident(selectedService);
  };
  const createNormalIncident = (service: ServiceRecord, symptom?: string) => {
    const description =
      symptom?.trim() || "대시보드에서 운영자가 등록한 인시던트입니다.";
    const incident = createIncident({
      serviceId: service.serviceId,
      severityCode: "MAJOR",
      title: `${service.serviceName} 응답 지연 감지`,
      description,
      manualRegisteredYn: "Y",
      registeredBy: "admin",
    });
    setDemoIncidentIds((current) => {
      const next = new Set(current);
      next.add(incident.incidentId);
      return next;
    });
    setSelectedServiceId(service.serviceId);
    updateDashboardStatus(service.serviceId, "INCIDENT");
    setImpactDetailTab("history");
    return incident;
  };
  const normalPopupService =
    normalPopupServiceId !== null
      ? services.find((service) => service.serviceId === normalPopupServiceId)
      : undefined;
  const normalCategoryTabs = [
    "전체",
    "공통 플랫폼",
    "기간계/업무계",
    "채널계",
    "대외채널",
  ];
  const normalListServices = filteredServices
    .filter((service) =>
      normalCategoryTab === "전체"
        ? true
        : getNormalServiceCategory(service) === normalCategoryTab
    )
    .sort(
      (first, second) =>
        (relationCountByServiceId.get(second.serviceId)?.incoming ?? 0) +
          (relationCountByServiceId.get(second.serviceId)?.outgoing ?? 0) -
          ((relationCountByServiceId.get(first.serviceId)?.incoming ?? 0) +
            (relationCountByServiceId.get(first.serviceId)?.outgoing ?? 0)) ||
        second.instanceCount - first.instanceCount ||
        first.serviceName.localeCompare(second.serviceName, "ko")
    );
  const normalListPageSize = 10;
  const normalListTotalPages = Math.max(
    1,
    Math.ceil(normalListServices.length / normalListPageSize)
  );
  const safeNormalListPage = Math.min(normalListPage, normalListTotalPages);
  const pagedNormalListServices = normalListServices.slice(
    (safeNormalListPage - 1) * normalListPageSize,
    safeNormalListPage * normalListPageSize
  );

  useEffect(() => {
    setNormalListPage(1);
  }, [normalCategoryTab, normalizedQuery]);

  if (!hasActiveIncident && selectedService) {
    return (
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-3">
        <section className="flex h-10 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f2f7ff] text-[#1f6feb]">
              <GitBranch size={18} />
            </div>
            <div className="text-lg font-black text-slate-950">ChainView</div>
            <div className="ml-4 text-base font-black text-slate-900">
              전체 서비스 운영 현황
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-slate-500">운영환경</span>
            <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-black text-slate-900">
              PROD
            </div>
            <ShieldAlert size={18} className="text-slate-500" />
            <UserRound size={18} className="text-slate-500" />
          </div>
        </section>

        <section className="grid min-w-0 gap-3">
          <div className="min-w-0 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <NormalMetricCard icon={<Server size={22} />} label="전체 서비스" value={services.length} />
              <NormalMetricCard icon={<BriefcaseBusiness size={22} />} label="공통 플랫폼" value={12} />
              <NormalMetricCard icon={<Monitor size={22} />} label="기간계/업무계" value={18} emphasis />
              <NormalMetricCard icon={<Smartphone size={22} />} label="채널계" value={10} />
              <NormalMetricCard icon={<Globe2 size={22} />} label="대외채널" value={8} />
            </div>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">
                      서비스 운영 리스트
                    </h2>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      분류별 정상 운영 서비스를 목록으로 확인합니다.
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">
                      기준 {new Date().toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <label className="relative min-w-[220px] max-w-full flex-1 sm:flex-none">
                      <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="서비스 검색"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#86b7ff] focus:bg-white focus:ring-4 focus:ring-[#edf5ff] sm:w-64"
                      />
                    </label>
                  </div>
                </div>
                <div className="mt-5 overflow-x-auto border-b border-slate-200 bg-white">
                  <div className="grid min-w-[980px] grid-cols-5 gap-0">
                    {normalCategoryTabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setNormalCategoryTab(tab)}
                        className={`flex h-11 items-center justify-center border-b-2 px-3 text-center text-sm font-black transition ${
                          normalCategoryTab === tab
                            ? "border-slate-950 text-slate-950"
                            : "border-transparent text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <NormalServiceRankList
                getServiceStatus={getDashboardStatus}
                relationCountByServiceId={relationCountByServiceId}
                selectedServiceId={selectedService.serviceId}
                rankOffset={(safeNormalListPage - 1) * normalListPageSize}
                services={pagedNormalListServices}
                onCreateIncident={(service) => {
                  setIncidentRegisterService(service);
                  setIncidentSymptom("");
                }}
                onOpenDetail={(service) => setNormalPopupServiceId(service.serviceId)}
                onSelectService={(serviceId) => {
                  setSelectedServiceId(serviceId);
                }}
              />
              <NormalServicePagination
                currentPage={safeNormalListPage}
                pageSize={normalListPageSize}
                totalItems={normalListServices.length}
                totalPages={normalListTotalPages}
                onPageChange={setNormalListPage}
              />
            </section>
          </div>
        </section>

        <section className="grid gap-3 xl:grid-cols-[0.9fr_0.95fr_1.1fr_1.1fr]">
          <NormalInfoPanel title="관리 필요 서비스" to="/services">
            <StatusCountRow label="담당조직 미등록" value={ownerlessCount} />
            <StatusCountRow label="담당그룹 미등록" value={Math.max(2, Math.floor(ownerlessCount / 2))} />
            <StatusCountRow label="영향도 미연결" value={noRelationCount} />
            <StatusCountRow label="서비스 설명 미등록" value={undocumentedCount} />
            <StatusCountRow label="미완료 인시던트" value={openIncidentCards.length} danger />
          </NormalInfoPanel>
          <NormalInfoPanel title="최근 서비스 현행화" to="/services">
            <NormalServiceList services={services.slice(0, 5)} />
          </NormalInfoPanel>
          <NormalInfoPanel title="최근 서비스 변경" to="/services">
            <NormalChangeList services={services.slice(0, 5)} />
          </NormalInfoPanel>
          <NormalInfoPanel title="최근 인시던트" to="/incidents">
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center text-xs font-bold text-slate-400">
              진행 중인 인시던트가 없습니다.
            </div>
          </NormalInfoPanel>
        </section>
        {normalPopupService ? (
          <NormalServiceDetailModal
            ownerNames={ownerByServiceId.get(normalPopupService.serviceId) ?? []}
            relationCount={
              relationCountByServiceId.get(normalPopupService.serviceId) ?? {
                incoming: 0,
                outgoing: 0,
              }
            }
            service={normalPopupService}
            status={getDashboardStatus(normalPopupService)}
            onClose={() => setNormalPopupServiceId(null)}
            onCreateIncident={() => {
              setIncidentRegisterService(normalPopupService);
              setIncidentSymptom("");
            }}
          />
        ) : null}
        {incidentRegisterService ? (
          <IncidentRegistrationModal
            service={incidentRegisterService}
            symptom={incidentSymptom}
            onChangeSymptom={setIncidentSymptom}
            onClose={() => {
              setIncidentRegisterService(null);
              setIncidentSymptom("");
            }}
            onConfirm={() => {
              createNormalIncident(incidentRegisterService, incidentSymptom);
              setIncidentRegisterService(null);
              setIncidentSymptom("");
              setNormalPopupServiceId(null);
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              aria-label="전체 상황판"
              title="전체 상황판"
            >
              <ArrowLeft size={18} />
            </Link>
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                hasActiveIncident
                  ? "bg-[#fff5f6] text-[#f04452]"
                  : "bg-[#ecfff8] text-[#00a77d]"
              }`}
            >
              {hasActiveIncident ? <Siren size={27} /> : <CheckCircle2 size={27} />}
            </div>
            <div className="min-w-0">
              <div
                className={`flex flex-wrap items-center gap-2 text-sm font-black ${
                  hasActiveIncident ? "text-[#f04452]" : "text-[#00a77d]"
                }`}
              >
                <span>{hasActiveIncident ? "서비스 인시던트 발생" : "전체 정상 상태"}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                    hasActiveIncident
                      ? "bg-[#ff4d5a] text-white"
                      : "bg-[#ecfff8] text-[#00a77d]"
                  }`}
                >
                  {hasActiveIncident ? activeIncident?.severityCode ?? "MAJOR" : "NORMAL"}
                </span>
              </div>
              <h1 className="mt-1 truncate text-xl font-black text-slate-950">
                {activeIncident?.title ??
                  `${selectedService?.serviceName ?? "선택 서비스"} 정상 운영 중`}
              </h1>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-3 md:w-auto">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <HeaderStat label="발생 시간" value={incidentStartedTime} />
              <HeaderStat label="경과 시간" value={incidentElapsedTime} />
            </div>
            {activeIncident &&
            activeIncident.incidentStatusCode !== "RESOLVED" ? (
              <button
                type="button"
                onClick={() => {
                  if (!activeIncident) {
                    return;
                  }
                  updateIncidentStatus(
                    activeIncident.incidentId,
                    "RESOLVED",
                    "복구 확인 후 장애를 완료 처리했습니다."
                  );
                  if (activeIncident.serviceId) {
                    updateDashboardStatus(activeIncident.serviceId, "NORMAL");
                  }
                  setImpactDetailTab("history");
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#20c997] px-4 text-sm font-black text-white transition hover:bg-[#12b886]"
              >
                완료 처리
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section
        className={`grid min-w-0 gap-4 ${
          serviceDetailPanelOpen
            ? "xl:grid-cols-[minmax(0,1fr)_360px]"
            : "xl:grid-cols-1"
        }`}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <section className="grid grid-cols-4 gap-3">
            <CommandMetric
              delta={displayedIncidentCount > 0 ? 1 : 0}
              icon={<AlertTriangle size={23} />}
              label={hasActiveIncident ? "장애 서비스" : "장애 서비스"}
              value={criticalServices.length}
            />
            <CommandMetric
              delta={hasActiveIncident ? Math.min(3, warningServices.length) : 0}
              icon={<Users size={23} />}
              label="영향 서비스"
              value={
                hasActiveIncident
                  ? impactSnapshot.impactedServices.length || warningServices.length
                  : 0
              }
            />
            <CommandMetric
              delta={hasActiveIncident ? 5 : 0}
              icon={<BriefcaseBusiness size={23} />}
              label="영향 업무"
              value={
                hasActiveIncident
                  ? Math.max(4, impactSnapshot.impactedServices.length + 3)
                  : 0
              }
            />
            <CommandMetric
              delta={hasActiveIncident ? 1 : 0}
              icon={<Globe2 size={23} />}
              label="영향 채널"
              value={hasActiveIncident ? 3 : 0}
            />
          </section>

          <section
            ref={relationSectionRef}
            className="scroll-mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <GitBranch size={17} className="text-slate-600" />
                  <h2 className="text-base font-black text-slate-950">
                    서비스 영향도 맵
                  </h2>
                  <BadgeInfo size={15} className="text-slate-400" />
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  선택 서비스를 기준으로 이전/이후 관계를 2-depth까지 표시합니다.
                </p>
              </div>
            </div>
            <Suspense
              fallback={
                <div className="flex min-h-[680px] items-center justify-center bg-slate-50 text-sm font-black text-slate-400">
                  관계도를 불러오는 중입니다.
                </div>
              }
            >
              <LazyServiceRelationFlow
                embedded
                frameless
                hideDepthToggle
                hideDetailPanel
                hideTopControl
                incidentMode
                initialServiceId={relationRootService?.serviceId}
                onSelectService={(serviceId) => {
                  setSelectedServiceId(serviceId);
                  setImpactDetailTab("service");
                  setServiceDetailPanelOpen(true);
                }}
              />
            </Suspense>
          </section>
        </div>

        {selectedService && serviceDetailPanelOpen ? (
          <ImpactDetailTabs
            activeTab={impactDetailTab}
            actionNote={actionNote}
            directServices={impactSnapshot.directServices}
            incident={activeIncident}
            incidentEvents={
              activeIncident
                ? incidentEvents.filter(
                    (event) => event.incidentId === activeIncident.incidentId
                  )
                : []
            }
            indirectServices={impactSnapshot.indirectServices}
            onActionNoteChange={setActionNote}
            onAddAction={() => {
              if (!activeIncident) {
                return;
              }
              addIncidentEvent(activeIncident.incidentId, actionNote);
              setActionNote("");
            }}
            onCreateIncident={() => {
              setIncidentRegisterService(selectedService);
              setIncidentSymptom("");
            }}
            onClose={() => setServiceDetailPanelOpen(false)}
            onOpenServiceDetail={() => setNormalPopupServiceId(selectedService.serviceId)}
            onPromote={() => {
              updateService(selectedService.serviceId, {
                statusCode: "INCIDENT",
              });
              if (activeIncident) {
                addIncidentEvent(
                  activeIncident.incidentId,
                  "주의 상태를 장애 상태로 전환했습니다."
                );
              } else {
                const incident = createIncident({
                  serviceId: selectedService.serviceId,
                  severityCode: "CRITICAL",
                  title: `${selectedService.serviceName} 장애 발생`,
                  description:
                    "주의 상태에서 장애 상태로 전환되어 인시던트가 생성되었습니다.",
                  manualRegisteredYn: "Y",
                  registeredBy: "admin",
                });
                setDemoIncidentIds((current) => {
                  const next = new Set(current);
                  next.add(incident.incidentId);
                  return next;
                });
              }
              updateDashboardStatus(selectedService.serviceId, "INCIDENT");
              setImpactDetailTab("history");
            }}
            onResolve={() => {
              if (!activeIncident) {
                return;
              }
              updateIncidentStatus(
                activeIncident.incidentId,
                "RESOLVED",
                "복구 확인 후 장애를 완료 처리했습니다."
              );
              if (activeIncident.serviceId) {
                updateDashboardStatus(activeIncident.serviceId, "NORMAL");
              }
              setImpactDetailTab("history");
            }}
            onTabChange={setImpactDetailTab}
            ownerNames={
              ownerByServiceId.get(
                incidentRootService?.serviceId ?? selectedService.serviceId
              ) ?? []
            }
            relationCount={
              relationCountByServiceId.get(selectedService.serviceId) ?? {
                incoming: 0,
                outgoing: 0,
              }
            }
            service={selectedService}
            status={selectedStatus}
          />
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.1fr_1.05fr_0.85fr]">
        <TimelinePanel
          serviceName={primaryIncidentService?.serviceName}
          onOpenTimeline={() => setTimelinePopupOpen(true)}
        />
        <SimilarIncidentPanel onOpenReport={() => setAnalysisReportOpen(true)} />
        <ImpactMatrixPanel />
        <SupportInfoPanel />
      </section>

      {analysisReportOpen && selectedService ? (
        <IncidentAnalysisReport
          incident={activeIncident}
          relationCountByServiceId={relationCountByServiceId}
          service={selectedService}
          onClose={() => setAnalysisReportOpen(false)}
        />
      ) : null}
      {timelinePopupOpen ? (
        <TimelineDetailModal
          incident={activeIncident}
          incidentEvents={
            activeIncident
              ? incidentEvents.filter(
                  (event) => event.incidentId === activeIncident.incidentId
                )
              : []
          }
          serviceName={primaryIncidentService?.serviceName}
          onClose={() => setTimelinePopupOpen(false)}
        />
      ) : null}
      {normalPopupService ? (
        <NormalServiceDetailModal
          ownerNames={ownerByServiceId.get(normalPopupService.serviceId) ?? []}
          relationCount={
            relationCountByServiceId.get(normalPopupService.serviceId) ?? {
              incoming: 0,
              outgoing: 0,
            }
          }
          service={normalPopupService}
          status={getDashboardStatus(normalPopupService)}
          showActions={false}
          onClose={() => setNormalPopupServiceId(null)}
          onCreateIncident={() => {
            setIncidentRegisterService(normalPopupService);
            setIncidentSymptom("");
          }}
        />
      ) : null}
      {incidentRegisterService ? (
        <IncidentRegistrationModal
          service={incidentRegisterService}
          symptom={incidentSymptom}
          onChangeSymptom={setIncidentSymptom}
          onClose={() => {
            setIncidentRegisterService(null);
            setIncidentSymptom("");
          }}
          onConfirm={() => {
            createNormalIncident(incidentRegisterService, incidentSymptom);
            setIncidentRegisterService(null);
            setIncidentSymptom("");
            setNormalPopupServiceId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function NormalMetricCard({
  emphasis = false,
  icon,
  label,
  value,
}: {
  emphasis?: boolean;
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black text-slate-500">{label}</div>
          <div
            className={`mt-2 text-2xl font-black ${
              emphasis ? "text-[#008f72]" : "text-slate-950"
            }`}
          >
            {value}
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f2f7ff] text-[#3182f6]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function NormalServiceRankList({
  getServiceStatus,
  onCreateIncident,
  onOpenDetail,
  onSelectService,
  rankOffset,
  relationCountByServiceId,
  selectedServiceId,
  services,
}: {
  getServiceStatus: (service: ServiceRecord) => ServiceStatusCode;
  onCreateIncident: (service: ServiceRecord) => void;
  onOpenDetail: (service: ServiceRecord) => void;
  onSelectService: (serviceId: number) => void;
  rankOffset: number;
  relationCountByServiceId: Map<number, { incoming: number; outgoing: number }>;
  selectedServiceId: number;
  services: ServiceRecord[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] table-fixed">
        <colgroup>
          <col className="w-[150px]" />
          <col />
          <col className="w-[130px]" />
          <col className="w-[120px]" />
          <col className="w-[150px]" />
          <col className="w-[220px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-200 border-t border-t-slate-100 bg-slate-50 text-left text-xs font-black text-slate-400">
            <th className="px-5 py-4 text-center">순위</th>
            <th className="px-5 py-4 text-center">서비스</th>
            <th className="px-5 py-4 text-center">상태</th>
            <th className="px-5 py-4 text-center">인스턴스</th>
            <th className="px-5 py-4 text-center">연관 서비스</th>
            <th className="px-5 py-4 text-center">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {services.map((service, index) => {
            const relationCount = relationCountByServiceId.get(
              service.serviceId
            ) ?? { incoming: 0, outgoing: 0 };
            const totalRelations = relationCount.incoming + relationCount.outgoing;
            const selected = selectedServiceId === service.serviceId;
            const displayStatus = getServiceStatus(service);

            return (
              <tr
                key={service.serviceId}
                onClick={() => onSelectService(service.serviceId)}
                className={`cursor-pointer transition ${
                  selected ? "bg-[#f2f7ff]" : "hover:bg-slate-50"
                }`}
              >
                <td className="whitespace-nowrap px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-slate-300">♥</span>
                    <span className="text-base font-black text-slate-700">
                      {rankOffset + index + 1}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        selected
                          ? "bg-[#3182f6] text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {service.serviceName.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-black text-slate-900">
                        {service.serviceName}
                      </div>
                      <div className="mt-1 truncate text-xs font-bold text-slate-400">
                        {service.serviceCode} · {getNormalServiceCategory(service)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-center">
                  <span
                    className={`text-sm font-black ${
                      displayStatus === "NORMAL"
                        ? "text-[#00a77d]"
                        : displayStatus === "IMPACTED"
                          ? "text-[#ff8a00]"
                          : "text-[#f04452]"
                    }`}
                  >
                    {codeLabels.serviceStatus[displayStatus]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-center text-sm font-black text-slate-700">
                  {service.instanceCount}개
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-center text-sm font-black text-slate-700">
                  {totalRelations}개
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenDetail(service);
                      }}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-[#3182f6] hover:bg-[#f2f7ff] hover:text-[#1f6feb]"
                    >
                      상세보기
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCreateIncident(service);
                      }}
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-[#3182f6] px-3 text-xs font-black text-white transition hover:bg-[#1b64da]"
                    >
                      인시던트 등록
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {services.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-5 py-14 text-center text-sm font-bold text-slate-400"
              >
                조건에 맞는 서비스가 없습니다.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function NormalServicePagination({
  currentPage,
  onPageChange,
  pageSize,
  totalItems,
  totalPages,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(
      (page) =>
        page === 1 ||
        page === totalPages ||
        Math.abs(page - currentPage) <= 1
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4">
      <div className="text-xs font-bold text-slate-400">
        {start}-{end} / 총 {totalItems}개
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          이전
        </button>
        {visiblePages.map((page, index) => {
          const previousPage = visiblePages[index - 1];
          const showGap = previousPage && page - previousPage > 1;

          return (
            <span key={page} className="inline-flex items-center gap-1">
              {showGap ? (
                <span className="px-1 text-xs font-black text-slate-300">...</span>
              ) : null}
              <button
                type="button"
                onClick={() => onPageChange(page)}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-black transition ${
                  currentPage === page
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            </span>
          );
        })}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  );
}

function NormalServiceDetailModal({
  onClose,
  onCreateIncident,
  ownerNames,
  relationCount,
  service,
  showActions = true,
  status,
}: {
  onClose: () => void;
  onCreateIncident: () => void;
  ownerNames: string[];
  relationCount: { incoming: number; outgoing: number };
  service: ServiceRecord;
  showActions?: boolean;
  status: ServiceStatusCode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-5 py-8"
      onClick={onClose}
    >
      <section
        className="flex max-h-[min(720px,calc(100vh-64px))] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <div className="text-xs font-black text-[#1f6feb]">서비스 상세</div>
            <h2 className="mt-1 truncate text-xl font-black text-slate-950">
              {service.serviceName}
            </h2>
            <p className="mt-1 truncate text-sm font-bold text-slate-500">
              {service.serviceCode} · {getNormalServiceCategory(service)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            title="팝업 닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#ecfff8] px-4 py-3">
              <div className="text-xs font-black text-slate-400">상태</div>
              <div className="mt-1 text-sm font-black text-[#00a77d]">
                {codeLabels.serviceStatus[status]}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-xs font-black text-slate-400">인스턴스</div>
              <div className="mt-1 text-sm font-black text-slate-900">
                {service.instanceCount}개
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-xs font-black text-slate-400">연관 서비스</div>
              <div className="mt-1 text-sm font-black text-slate-900">
                {relationCount.incoming + relationCount.outgoing}개
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <NormalDetailLine label="서비스 분류" value={service.categoryPath.join(" > ")} />
            <NormalDetailLine label="서비스 코드" value={service.serviceCode} />
            <NormalDetailLine label="소유 조직" value={ownerNames[0] ?? "미등록"} />
            <NormalDetailLine label="담당 그룹" value={ownerNames[1] ?? ownerNames[0] ?? "미등록"} />
            <NormalDetailLine label="상위 서비스" value={relationCount.incoming ? `${relationCount.incoming}개` : "-"} />
            <NormalDetailLine label="하위 서비스" value={relationCount.outgoing ? `${relationCount.outgoing}개` : "-"} />
            <NormalDetailLine label="엔드포인트" value={service.endpointUrl || "미등록"} />
            <NormalDetailLine label="배포 경로" value={service.deployPath || "미등록"} />
            <NormalDetailLine label="포트" value={service.portInfo || "미등록"} />
            <NormalDetailLine label="등록일" value={service.createdAt.slice(0, 10)} />
            <NormalDetailLine label="설명" value={service.description || "미등록"} />
          </div>
        </div>

        {showActions ? (
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 px-6 py-4">
            <Link
              to={`/services/${service.serviceId}`}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#3182f6] bg-white text-sm font-black text-[#1f6feb] transition hover:bg-[#f2f7ff]"
            >
              서비스 관리로 이동
            </Link>
            <button
              type="button"
              onClick={onCreateIncident}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#3182f6] text-sm font-black text-white transition hover:bg-[#1b64da]"
            >
              인시던트 등록
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function IncidentRegistrationModal({
  onChangeSymptom,
  onClose,
  onConfirm,
  service,
  symptom,
}: {
  onChangeSymptom: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  service: ServiceRecord;
  symptom: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-5 py-8"
      onClick={onClose}
    >
      <section
        className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <div className="text-xs font-black text-[#f04452]">인시던트 등록 확인</div>
            <h2 className="mt-1 truncate text-xl font-black text-slate-950">
              {service.serviceName}
            </h2>
            <p className="mt-1 truncate text-sm font-bold text-slate-500">
              {service.serviceCode} · {getNormalServiceCategory(service)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            title="팝업 닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <label className="block">
            <span className="text-sm font-black text-slate-700">증상 입력</span>
            <textarea
              value={symptom}
              onChange={(event) => onChangeSymptom(event.target.value)}
              placeholder="예: 응답 시간이 증가하고 일부 요청에서 타임아웃이 발생합니다."
              className="mt-2 min-h-[120px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-700 outline-none transition focus:border-[#86b7ff] focus:bg-white focus:ring-4 focus:ring-[#edf5ff]"
            />
          </label>
          <div className="mt-3 rounded-xl border border-[#ffe5e8] bg-[#fff5f6] px-4 py-3 text-xs font-bold leading-5 text-[#b4232f]">
            등록하면 대시보드 상단에 인시던트 알림이 표시되고, 영향도와 타임라인 기록이 생성됩니다.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#3182f6] text-sm font-black text-white transition hover:bg-[#1b64da]"
          >
            등록
          </button>
        </div>
      </section>
    </div>
  );
}

function getNormalServiceCategory(service: ServiceRecord) {
  const categoryText = service.categoryPath.join(" ");
  if (/공통|인증|API Gateway|SSO|OAuth|알림|모니터링|DevOps|WEB\/WAS/.test(categoryText)) {
    return "공통 플랫폼";
  }
  if (/채널|모바일|홈페이지|다이렉트|고객센터|영업지원|챗봇/.test(categoryText)) {
    return "채널계";
  }
  if (/대외|마이데이터|공공|제휴|MCI|Megaware|카드|금융결제/.test(categoryText)) {
    return "대외채널";
  }
  return "기간계/업무계";
}

function getNormalServiceSummary({
  ownerCount,
  relationCount,
  service,
}: {
  ownerCount: number;
  relationCount: number;
  service: ServiceRecord;
}) {
  if (service.statusCode !== "NORMAL") {
    return "주의 상태 확인 필요";
  }
  if (ownerCount === 0) {
    return "담당자 등록 필요";
  }
  if (relationCount === 0) {
    return "영향도 연결 정보 보강 필요";
  }
  if (service.importanceCode === "CRITICAL") {
    return "핵심 서비스 정상 운영 중";
  }
  return "정상 운영 및 관리 정보 최신";
}

function NormalServiceMap({
  onSelectService,
  selectedServiceId,
  services,
}: {
  onSelectService: (serviceId: number) => void;
  selectedServiceId: number;
  services: ServiceRecord[];
}) {
  const columns = [
    { title: "공통 플랫폼", labels: ["인증", "공통API", "메시징", "모니터링"] },
    { title: "기간계/업무계", labels: ["고객", "계약", "대출", "결제", "정산"] },
    { title: "채널계", labels: ["모바일", "인터넷뱅킹", "고객센터", "영업지원"] },
    { title: "대외채널", labels: ["금융결제원", "카드사", "제휴기관", "타행"] },
  ];

  return (
    <div className="grid min-h-[340px] grid-cols-4 gap-9 px-4 pb-4 pt-2">
      {columns.map((column, columnIndex) => (
        <div key={column.title} className="relative">
          <div className="mb-4 text-center text-xs font-black text-slate-700">
            {column.title}
          </div>
          <div className="space-y-3">
            {column.labels.map((label, index) => {
              const service = services[(columnIndex * 5 + index) % services.length];
              const selected = selectedServiceId === service?.serviceId;

              return (
                <button
                  key={`${column.title}-${label}`}
                  type="button"
                  onClick={() => service && onSelectService(service.serviceId)}
                  className={`relative flex h-11 w-full items-center gap-3 rounded-lg border px-3 text-left text-xs font-black shadow-sm transition ${
                    selected
                      ? "border-[#3182f6] bg-[#f2f7ff] text-[#1f6feb]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {columnIndex < columns.length - 1 ? (
                    <span className="absolute -right-9 top-1/2 h-px w-9 bg-slate-200" />
                  ) : null}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-500">
                    <GitBranch size={14} />
                  </span>
                  <span className="min-w-0 truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function NormalSelectedServicePanel({
  onClose,
  onCreateIncident,
  onOpenDetail,
  ownerNames,
  relationCount,
  service,
}: {
  onClose: () => void;
  onCreateIncident: () => void;
  onOpenDetail: () => void;
  ownerNames: string[];
  relationCount: { incoming: number; outgoing: number };
  service: ServiceRecord;
}) {
  return (
    <aside className="flex max-h-[calc(100vh-112px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-black text-slate-950">선택 서비스 정보</h2>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ecfff8] px-2.5 py-1 text-xs font-black text-[#00a77d]">
            <CheckCircle2 size={13} />
            정상
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-[#00a77d]" />
          <div className="min-w-0 flex-1 truncate text-base font-black text-slate-950">
            {service.serviceName}
          </div>
        </div>
        <div className="space-y-3 border-t border-slate-100 pt-4 text-xs">
          <NormalDetailLine label="서비스 분류" value={service.categoryPath.join(" > ")} />
          <NormalDetailLine label="소유 조직" value={ownerNames[0] ?? "미등록"} />
          <NormalDetailLine label="담당 그룹" value={ownerNames[1] ?? ownerNames[0] ?? "미등록"} />
          <NormalDetailLine label="상위 서비스" value={relationCount.incoming ? `${relationCount.incoming}개` : "-"} />
          <NormalDetailLine label="하위 서비스" value={relationCount.outgoing ? `${relationCount.outgoing}개` : "-"} />
          <NormalDetailLine label="연관 서비스 수" value={`${relationCount.incoming + relationCount.outgoing}개`} />
          <NormalDetailLine label="인시던트 이력" value="0건 (최근 30일)" />
          <NormalDetailLine label="등록일" value={service.createdAt.slice(0, 10)} />
          <NormalDetailLine label="설명" value={service.description || "미등록"} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenDetail}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[#3182f6] bg-white text-xs font-black text-[#1f6feb] transition hover:bg-[#f2f7ff]"
          >
            서비스 상세
          </button>
          <button
            type="button"
            onClick={onCreateIncident}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#3182f6] text-xs font-black text-white transition hover:bg-[#1b64da]"
          >
            인시던트 생성
          </button>
        </div>
      </div>
    </aside>
  );
}

function NormalDetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
      <span className="font-black text-slate-400">{label}</span>
      <span className="truncate font-bold text-slate-700">{value}</span>
    </div>
  );
}

function NormalInfoPanel({
  children,
  title,
  to,
}: {
  children: ReactNode;
  title: string;
  to: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-950">{title}</h2>
        <Link
          to={to}
          className="text-xs font-black text-slate-500 transition hover:text-[#1f6feb]"
        >
          더보기 &gt;
        </Link>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function StatusCountRow({
  danger = false,
  label,
  value,
}: {
  danger?: boolean;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-2 font-bold text-slate-600">
        <span className={`h-2 w-2 rounded-full ${danger ? "bg-[#ff4d5a]" : "bg-slate-400"}`} />
        {label}
      </span>
      <b className="text-slate-900">{value}건</b>
    </div>
  );
}

function NormalServiceList({ services }: { services: ServiceRecord[] }) {
  return (
    <>
      {services.map((service, index) => (
        <div key={service.serviceId} className="grid grid-cols-[1fr_60px] gap-2 text-xs">
          <span className="truncate font-black text-slate-700">{service.serviceName}</span>
          <span className="text-right font-semibold text-slate-500">
            {index === 0 ? "5분 전" : `${index + 1}시간 전`}
          </span>
        </div>
      ))}
    </>
  );
}

function NormalChangeList({ services }: { services: ServiceRecord[] }) {
  const changes = ["담당조직 변경", "서비스 설명 수정", "영향관계 수정", "담당그룹 변경", "서비스 분류 변경"];
  return (
    <>
      {services.map((service, index) => (
        <div key={service.serviceId} className="grid grid-cols-[1fr_92px_60px] gap-2 text-xs">
          <span className="truncate font-black text-slate-700">{service.serviceName}</span>
          <span className="truncate font-semibold text-slate-500">{changes[index % changes.length]}</span>
          <span className="text-right font-semibold text-slate-500">{index + 1}시간 전</span>
        </div>
      ))}
    </>
  );
}

function ImpactDetailTabs({
  activeTab,
  actionNote,
  directServices,
  incident,
  incidentEvents,
  indirectServices,
  onActionNoteChange,
  onAddAction,
  onCreateIncident,
  onClose,
  onOpenServiceDetail,
  onPromote,
  onResolve,
  onTabChange,
  ownerNames,
  relationCount,
  service,
  status,
}: {
  activeTab: ImpactDetailTab;
  actionNote: string;
  directServices: ServiceRecord[];
  incident?: IncidentRecord;
  incidentEvents: Array<{
    actor: string;
    createdAt: string;
    eventId: number;
    eventType: string;
    message: string;
  }>;
  indirectServices: ServiceRecord[];
  onActionNoteChange: (value: string) => void;
  onAddAction: () => void;
  onCreateIncident: () => void;
  onClose: () => void;
  onOpenServiceDetail: () => void;
  onPromote: () => void;
  onResolve: () => void;
  onTabChange: (tab: ImpactDetailTab) => void;
  ownerNames: string[];
  relationCount: { incoming: number; outgoing: number };
  service: ServiceRecord;
  status: ServiceStatusCode;
}) {
  const tabs: Array<{ label: string; value: ImpactDetailTab }> = [
    { label: "서비스 상세", value: "service" },
    { label: "영향 서비스", value: "impact" },
    { label: "담당자", value: "owners" },
    { label: "진행 기록", value: "history" },
  ];
  const serviceIncident =
    incident?.serviceId === service.serviceId ? incident : undefined;

  return (
    <aside className="flex max-h-[calc(100vh-112px)] min-h-[560px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="shrink-0 border-b border-slate-100 p-3">
        <div className="flex items-center gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-4 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange(tab.value)}
                className={`flex h-10 min-w-0 items-center justify-center rounded-md px-2 text-center text-xs font-black transition ${
                  activeTab === tab.value
                    ? "bg-white text-[#1f6feb] shadow-sm"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
                }`}
              >
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {activeTab === "service" ? (
          <div className="flex min-h-[500px] flex-col">
            <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  serviceIncident
                    ? "bg-[#fff5f6] text-[#f04452]"
                    : "bg-[#ecfff8] text-[#00a77d]"
                }`}
              >
                {serviceIncident ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-black text-slate-950">
                  {service.serviceName}
                </div>
                <div className="mt-1 truncate text-xs font-semibold text-slate-500">
                  {service.serviceCode} · {service.categoryPath.join(" > ")}
                </div>
              </div>
            </div>

            <div className="space-y-3 py-4">
              <DetailRow
                label="상태"
                value={codeLabels.serviceStatus[status]}
                tone={serviceIncident ? "red" : "default"}
              />
              {serviceIncident ? (
                <DetailRow
                  label="심각도"
                  value={serviceIncident.severityCode}
                  tone="red"
                />
              ) : null}
              <DetailRow
                label={serviceIncident ? "발생 시간" : "점검 상태"}
                value={serviceIncident?.startedAt ?? "정상 운영 중"}
              />
              <DetailRow
                label="서비스 분류"
                value={service.categoryPath.join(" > ")}
              />
              <DetailRow
                label="상위 서비스"
                value={relationCount.incoming ? `${relationCount.incoming}개` : "-"}
              />
              <DetailRow
                label="하위 서비스"
                value={relationCount.outgoing ? `${relationCount.outgoing}개` : "-"}
              />
              <DetailRow
                label="인스턴스"
                value={`${service.instanceCount}개`}
              />
            </div>

            <div className="mt-auto grid gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onOpenServiceDetail}
                className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[#3182f6] bg-white px-3 text-xs font-black text-[#1f6feb] transition hover:bg-[#f2f7ff]"
              >
                서비스 상세
                <ExternalLink size={14} />
              </button>
              {!incident ? (
                <button
                  type="button"
                  onClick={onCreateIncident}
                  className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#3182f6] px-3 text-xs font-black text-white transition hover:bg-[#1b64da]"
                >
                  인시던트 생성
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === "impact" ? (
          <div className="space-y-4">
            <ImpactServiceGroup
              services={directServices}
              title="직접 영향"
              emptyText="직접 영향 서비스가 없습니다."
            />
            <ImpactServiceGroup
              services={indirectServices}
              title="간접 영향"
              emptyText="간접 영향 서비스가 없습니다."
            />
          </div>
        ) : null}

        {activeTab === "owners" ? (
          <div className="space-y-3">
            {(ownerNames.length ? ownerNames : ["결제 운영팀", "결제시스템팀"]).map(
              (ownerName, index) => (
                <div
                  key={`${ownerName}-${index}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-600">
                    {index === 0 ? <UserRound size={16} /> : <Users size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-black text-slate-800">
                      {ownerName}
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                      {index === 0 ? "정 담당" : "알림 대상"}
                    </div>
                  </div>
                  <Phone size={14} className="text-slate-400" />
                  <Mail size={14} className="text-[#3182f6]" />
                </div>
              )
            )}
          </div>
        ) : null}

        {activeTab === "history" ? (
          <div>
            {incident ? (
              <>
                <div className="mb-3 grid gap-2">
                  <input
                    value={actionNote}
                    onChange={(event) => onActionNoteChange(event.target.value)}
                    placeholder="진행 내역 또는 조치 방법 입력"
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-[#86b7ff] focus:ring-4 focus:ring-[#edf5ff]"
                  />
                  <button
                    type="button"
                    onClick={onAddAction}
                    className="h-9 rounded-lg bg-[#3182f6] text-xs font-black text-white transition hover:bg-[#1b64da]"
                  >
                    진행 기록 추가
                  </button>
                </div>
                <div className="space-y-2">
                  {incidentEvents.length ? (
                    incidentEvents
                      .slice()
                      .sort((first, second) =>
                        second.createdAt.localeCompare(first.createdAt)
                      )
                      .map((event) => (
                        <div
                          key={event.eventId}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div className="flex justify-between gap-2 text-[11px] font-black text-slate-400">
                            <span>{event.createdAt}</span>
                            <span>{event.actor}</span>
                          </div>
                          <div className="mt-1 text-xs font-bold leading-5 text-slate-700">
                            {event.message}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs font-bold text-slate-400">
                      아직 진행 기록이 없습니다.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-xs font-bold text-slate-400">
                인시던트 생성 후 알림 전파와 조치 기록이 여기에 남습니다.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function ImpactServiceGroup({
  emptyText,
  services,
  title,
}: {
  emptyText: string;
  services: ServiceRecord[];
  title: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-600">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500">
          {services.length}
        </span>
      </div>
      <div className="space-y-2">
        {services.length ? (
          services.slice(0, 6).map((service) => (
            <div
              key={service.serviceId}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="truncate text-xs font-black text-slate-800">
                {service.serviceName}
              </div>
              <div className="mt-1 truncate text-[11px] font-semibold text-slate-500">
                {service.serviceCode} · {codeLabels.serviceStatus[service.statusCode]}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs font-bold text-slate-400">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

function parseDateTime(value: string) {
  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T");
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatClockTime(value: Date) {
  return [value.getHours(), value.getMinutes(), value.getSeconds()]
    .map((item) => String(item).padStart(2, "0"))
    .join(":");
}

function formatElapsedTime(startedAt: Date, currentTime: Date) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((currentTime.getTime() - startedAt.getTime()) / 1000)
  );
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function HeaderStat({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "green";
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[11px] font-black text-slate-400">{label}</div>
      <div
        className={`mt-1 whitespace-nowrap text-sm font-black ${
          tone === "green" ? "text-emerald-600" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function CommandMetric({
  delta,
  icon,
  label,
  value,
}: {
  delta: number;
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-slate-600">
            {label}
          </div>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-3xl font-black leading-none text-slate-950">
              {value}
            </span>
            <span className="pb-0.5 text-xs font-black text-[#f04452]">
              ▲ {delta}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImpactMapPanel({
  directServices,
  incidentService,
  indirectServices,
  normalServices,
  onOpenGraph,
}: {
  directServices: ServiceRecord[];
  incidentService?: ServiceRecord;
  indirectServices: ServiceRecord[];
  normalServices: ServiceRecord[];
  onOpenGraph: () => void;
}) {
  const direct = directServices.length
    ? directServices
    : incidentService
      ? [incidentService]
      : [];
  const indirect = indirectServices.length ? indirectServices : normalServices;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch size={17} className="text-slate-600" />
            <h2 className="text-base font-black text-slate-950">
              서비스 영향도 맵
            </h2>
            <BadgeInfo size={15} className="text-slate-400" />
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            장애 원인에서 직접 영향, 간접 영향, 최종 채널 순으로 읽습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenGraph}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw size={14} />
            전체화면
          </button>
          <button
            type="button"
            onClick={onOpenGraph}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            <GitBranch size={14} />
            경로 보기
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            <RotateCcw size={14} />
            초기화
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
        <MapStage title="Level 0 (장애 원인)">
          {incidentService ? (
            <ImpactNode
              icon={<AlertTriangle size={20} />}
              label={incidentService.serviceName}
              status="장애"
              tone="critical"
            />
          ) : null}
        </MapStage>
        <MapStage title="Level 1 (직접 영향)">
          {direct.slice(0, 3).map((service, index) => (
            <ImpactNode
              key={service.serviceId}
              icon={index === 0 ? <Server size={18} /> : <BellIcon />}
              label={service.serviceName}
              status={index === 0 ? "영향 높음" : "영향 보통"}
              tone={index === 0 ? "high" : "medium"}
            />
          ))}
        </MapStage>
        <MapStage title="Level 2 (간접 영향)">
          {indirect.slice(0, 3).map((service, index) => (
            <ImpactNode
              key={service.serviceId}
              icon={<AlertTriangle size={18} />}
              label={service.serviceName}
              status={index === 0 ? "영향 높음" : "영향 보통"}
              tone={index === 0 ? "high" : "medium"}
            />
          ))}
        </MapStage>
        <MapStage title="Level 3 (최종 영향)">
          <ImpactNode
            icon={<Smartphone size={18} />}
            label="모바일 앱"
            status="영향 높음"
            tone="channel"
          />
          <ImpactNode
            icon={<Globe2 size={18} />}
            label="홈페이지"
            status="영향 보통"
            tone="channel"
          />
          <ImpactNode
            icon={<Headphones size={18} />}
            label="고객센터"
            status="영향 낮음"
            tone="neutral"
          />
        </MapStage>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <LegendItem className="bg-[#ff4d5a]" label="장애" />
        <LegendItem className="bg-slate-900" label="영향 높음" />
        <LegendItem className="bg-slate-500" label="영향 보통" />
        <LegendItem className="bg-slate-300" label="영향 낮음" />
        <LegendItem className="bg-emerald-500" label="정상" />
      </div>
    </section>
  );
}

function MapStage({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="relative flex min-h-[120px] flex-col justify-center gap-3 xl:min-h-[300px]">
      <div className="absolute left-0 top-0 text-xs font-black text-slate-500">
        {title}
      </div>
      <div className="mt-7 flex flex-col gap-3">{children}</div>
    </div>
  );
}

function ImpactNode({
  icon,
  label,
  status,
  tone,
}: {
  icon: ReactNode;
  label: string;
  status: string;
  tone: "critical" | "high" | "medium" | "channel" | "neutral";
}) {
  const className =
    tone === "critical"
      ? "border-[#ff4d5a] bg-[#fff5f6] text-[#f04452]"
      : tone === "high"
        ? "border-slate-400 bg-slate-50 text-slate-900"
        : tone === "medium"
          ? "border-slate-300 bg-white text-slate-700"
          : tone === "channel"
            ? "border-slate-300 bg-slate-50 text-slate-800"
            : "border-slate-200 bg-white text-slate-600";

  return (
    <div
      className={`relative flex min-h-[60px] items-center gap-3 rounded-lg border px-3 py-2 shadow-sm ${className}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-black">{label}</div>
        <div className="mt-0.5 text-xs font-bold text-slate-500">{status}</div>
      </div>
      <ArrowRight className="absolute -right-5 top-1/2 hidden -translate-y-1/2 text-slate-300 xl:block" size={18} />
    </div>
  );
}

function LegendItem({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-black text-slate-500">
      <span className={`h-2 w-5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function SelectedServicePanel({
  incident,
  onOpenReport,
  ownerNames,
  relationCount,
  service,
  services,
}: {
  incident?: IncidentRecord;
  onOpenReport: () => void;
  ownerNames: string[];
  relationCount: { incoming: number; outgoing: number };
  service: ServiceRecord;
  services: ServiceRecord[];
}) {
  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-700">선택된 서비스</div>
          <div className="mt-2 flex items-center gap-2">
            <AlertTriangle size={18} className="text-[#f04452]" />
            <h2 className="truncate text-base font-black text-slate-950">
              {service.serviceName}
            </h2>
            <span className="rounded-full bg-[#ff4d5a] px-2 py-0.5 text-[10px] font-black text-white">
              CRITICAL
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 py-4 text-sm">
        <DetailRow label="상태" value={codeLabels.serviceStatus[service.statusCode]} tone="red" />
        <DetailRow label="심각도" value={incident?.severityCode ?? "CRITICAL"} tone="red" />
        <DetailRow label="발생 시간" value={incident?.startedAt ?? "2026-06-15 14:12"} />
        <DetailRow label="서비스 분류" value={service.categoryPath.join(" > ")} />
        <DetailRow label="상위 서비스" value={relationCount.incoming ? `${relationCount.incoming}개` : "-"} />
        <DetailRow label="하위 서비스" value={relationCount.outgoing ? `${relationCount.outgoing}개` : "-"} />
        <DetailRow label="영향받은 연관 서비스" value={`${Math.max(services.length, relationCount.incoming + relationCount.outgoing)}개`} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 text-xs font-black text-slate-600">관련 서버</div>
        <div className="space-y-2 text-xs font-semibold text-slate-600">
          <div className="flex justify-between gap-2">
            <span>payment-db-01</span>
            <span>10.10.10.41</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>payment-app-01</span>
            <span>10.10.10.42</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
        <span className="rounded-full bg-slate-100 px-2.5 py-1">
          {ownerNames[0] ?? "결제 운영팀"}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1">기간계</span>
        <span className="rounded-full bg-[#fff5f6] px-2.5 py-1 text-[#f04452]">
          CRITICAL
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1">PROD</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          to={`/services/${service.serviceId}`}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#3182f6] px-3 text-xs font-black text-white transition hover:bg-[#1b64da]"
        >
          서비스 상세
          <ExternalLink size={14} />
        </Link>
        <button
          type="button"
          onClick={onOpenReport}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
        >
          인시던트 상세
          <ExternalLink size={14} />
        </button>
      </div>
    </aside>
  );
}

function DetailRow({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "red";
  value: string;
}) {
  return (
    <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3">
      <span className="text-xs font-black text-slate-400">{label}</span>
      <span
        className={`min-w-0 truncate text-xs font-black ${
          tone === "red" ? "text-[#f04452]" : "text-slate-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function TimelinePanel({
  onOpenTimeline,
  serviceName,
}: {
  onOpenTimeline: () => void;
  serviceName?: string;
}) {
  const rows = [
    ["14:12:21", `${serviceName ?? "서비스"} 오류 증가 감지`, "red"],
    ["14:12:35", "직접 영향 서비스 탐지", "amber"],
    ["14:12:45", "간접 영향 서비스 탐지", "amber"],
    ["14:13:02", "영향 채널 모바일 앱", "blue"],
    ["14:15:18", "정상 서비스 헬스체크 확인", "emerald"],
    ["14:35:21", "현재 모니터링 중", "slate"],
  ] as const;

  return (
    <InfoPanel title="장애 타임라인" action="실시간">
      <div className="rounded-lg bg-slate-50 px-3 py-3">
        {rows.map(([time, label, color]) => (
          <DashboardTimelineRow
            key={`${time}-${label}`}
            color={color}
            label={label}
            time={time}
          />
        ))}
      </div>
      <PanelButton label="전체 타임라인 보기" onClick={onOpenTimeline} />
    </InfoPanel>
  );
}

function TimelineDetailModal({
  incident,
  incidentEvents,
  onClose,
  serviceName,
}: {
  incident?: IncidentRecord;
  incidentEvents: Array<{
    actor: string;
    createdAt: string;
    eventId: number;
    eventType: string;
    message: string;
  }>;
  onClose: () => void;
  serviceName?: string;
}) {
  const defaultRows = [
    {
      actor: "System",
      createdAt: "14:12:21",
      eventId: -1,
      eventType: "DETECTED",
      message: `${serviceName ?? "서비스"} 오류 증가 감지`,
    },
    {
      actor: "System",
      createdAt: "14:12:35",
      eventId: -2,
      eventType: "IMPACT",
      message: "직접 영향 서비스 탐지",
    },
    {
      actor: "System",
      createdAt: "14:12:45",
      eventId: -3,
      eventType: "IMPACT",
      message: "간접 영향 서비스 탐지",
    },
    {
      actor: "System",
      createdAt: "14:35:21",
      eventId: -4,
      eventType: "MONITORING",
      message: "현재 모니터링 중",
    },
  ];
  const rows = incidentEvents.length
    ? incidentEvents.slice().sort((first, second) =>
        second.createdAt.localeCompare(first.createdAt)
      )
    : defaultRows;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-5 py-8"
      onClick={onClose}
    >
      <section
        className="flex max-h-[min(720px,calc(100vh-64px))] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <div className="text-xs font-black text-[#1f6feb]">장애 타임라인</div>
            <h2 className="mt-1 truncate text-xl font-black text-slate-950">
              {incident?.title ?? `${serviceName ?? "서비스"} 진행 기록`}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              탐지부터 조치까지 시간순으로 추적합니다.
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-3">
            {rows.map((event) => (
              <div
                key={event.eventId}
                className="grid grid-cols-[92px_minmax(0,1fr)_86px] gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              >
                <span className="font-black text-slate-500">
                  {event.createdAt}
                </span>
                <span className="min-w-0 font-bold leading-6 text-slate-800">
                  {event.message}
                </span>
                <span className="text-right text-xs font-black text-slate-400">
                  {event.actor}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            닫기
          </button>
        </div>
      </section>
    </div>
  );
}

function DashboardTimelineRow({
  color,
  label,
  time,
}: {
  color: "red" | "slate" | "amber" | "emerald" | "blue";
  label: string;
  time: string;
}) {
  const dotClassName =
    color === "red"
      ? "bg-[#ff4d5a] ring-[#ffd1d6]"
      : color === "blue"
        ? "bg-[#3182f6] ring-[#d8e8ff]"
        : color === "amber"
          ? "bg-[#f08c00] ring-[#fff0bf]"
          : color === "emerald"
            ? "bg-emerald-500 ring-emerald-100"
            : "bg-slate-300 ring-slate-100";

  return (
    <div className="group relative grid grid-cols-[76px_18px_minmax(0,1fr)] gap-3 pb-4 last:pb-0">
      <div className="pt-0.5 text-xs font-black tabular-nums text-slate-500">
        {time}
      </div>
      <div className="relative flex justify-center">
        <span className="absolute bottom-[-16px] top-5 w-px bg-slate-200 group-last:hidden" />
        <span
          className={`relative z-[1] mt-1 h-2.5 w-2.5 rounded-full ring-4 ${dotClassName}`}
        />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-black leading-5 text-slate-700">
          {label}
        </div>
        <div className="mt-1 text-[11px] font-semibold text-slate-400">
          자동 감지
        </div>
      </div>
    </div>
  );
}

function SimilarIncidentPanel({ onOpenReport }: { onOpenReport: () => void }) {
  return (
    <InfoPanel title="유사 장애 이력 & 권장 조치" action="전체 보기">
      <div className="grid grid-cols-[1fr_70px_1fr_58px] gap-2 text-xs font-black text-slate-400">
        <span>발생 일시</span>
        <span>유사도</span>
        <span>원인</span>
        <span>해결</span>
      </div>
      {[
        ["2024-03-18 10:21", "92%", "Connection Pool 고갈", "17분"],
        ["2024-02-07 09:15", "85%", "DB Timeout 증가", "23분"],
        ["2023-12-26 14:44", "78%", "API Rate Limit 초과", "31분"],
      ].map(([date, match, cause, resolved]) => (
        <div
          key={date}
          className="grid grid-cols-[1fr_70px_1fr_58px] gap-2 py-1.5 text-xs font-semibold text-slate-600"
        >
          <span>{date}</span>
          <span className="font-black text-emerald-600">{match}</span>
          <span className="truncate">{cause}</span>
          <span>{resolved}</span>
        </div>
      ))}
      <div className="mt-3 space-y-1.5">
        {[
          "Payment Failover 상태 확인",
          "DB Connection Pool 상태 확인",
          "연계 서비스 상태 및 지연 확인",
          "최근 유사 장애 이력 확인",
        ].map((item, index) => (
          <div
            key={item}
            className="flex items-center gap-2 text-xs font-semibold text-slate-700"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-[11px] font-black text-slate-500">
              {index + 1}
            </span>
            {item}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpenReport}
        className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-black text-slate-700 transition hover:bg-slate-100"
      >
        추가 권장 조치 보기
        <ExternalLink size={13} />
      </button>
    </InfoPanel>
  );
}

function ImpactMatrixPanel() {
  const groups = [
    ["김민수", "결제운영팀", "직접 담당자"],
    ["이정훈", "결제시스템팀", "직접 담당자"],
    ["결제운영팀", "6명", "그룹 담당자"],
    ["모바일서비스팀", "5명", "그룹 담당자"],
    ["고객채널팀", "4명", "대기 그룹"],
  ];

  return (
    <InfoPanel title="담당자 영향도">
      <div className="space-y-2">
        {groups.map(([name, group, tag]) => (
          <div
            key={`${name}-${group}`}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-600">
              {tag.includes("담당자") ? <UserRound size={16} /> : <Users size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-black text-slate-800">
                {name}
              </div>
              <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                {group}
              </div>
            </div>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-500">
              {tag}
            </span>
            <Phone size={14} className="text-slate-400" />
            <Mail size={14} className="text-[#3182f6]" />
          </div>
        ))}
      </div>
    </InfoPanel>
  );
}

function SupportInfoPanel() {
  const [openDocument, setOpenDocument] = useState<string | null>(null);
  const documents: Record<string, string[]> = {
    "운영 가이드": [
      "장애 감지 후 영향도 맵에서 직접/간접 영향 서비스를 확인합니다.",
      "담당자 탭에서 온콜 그룹과 서비스 담당자를 확인하고 전파 상태를 기록합니다.",
      "진행 기록에는 확인한 증상, 조치, 복구 판단 근거를 시간순으로 남깁니다.",
    ],
    "장애 대응 절차": [
      "1차: 장애 중심 서비스 헬스체크와 최근 변경 사항을 확인합니다.",
      "2차: 직접 영향 서비스 담당자에게 처리 지연 가능성을 알립니다.",
      "복구 후 완료 처리하고 타임라인을 장애 지침서로 재사용합니다.",
    ],
  };

  return (
    <InfoPanel title="기타 정보">
      <div className="space-y-2">
        {Object.keys(documents).map((label) => (
          <SupportLink
            key={label}
            active={openDocument === label}
            label={label}
            onClick={() =>
              setOpenDocument((current) => (current === label ? null : label))
            }
          />
        ))}
      </div>
      {openDocument ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-black text-slate-700">{openDocument}</div>
          <div className="mt-2 space-y-1.5">
            {documents[openDocument].map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 text-xs font-bold leading-5 text-slate-600"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3182f6]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-5 text-xs font-black text-slate-500">태그</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {["결제", "기간계", "CRITICAL", "PROD"].map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600"
          >
            {tag}
          </span>
        ))}
      </div>
    </InfoPanel>
  );
}

function InfoPanel({
  action,
  children,
  title,
}: {
  action?: string;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-slate-950">{title}</h2>
        {action ? (
          <span className="text-xs font-black text-[#3182f6]">{action}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function PanelButton({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      {label}
      <ExternalLink size={13} />
    </button>
  );
}

function SupportLink({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 w-full items-center justify-between rounded-lg border px-3 text-xs font-black transition ${
        active
          ? "border-[#c7dbff] bg-[#f2f7ff] text-[#1f6feb]"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
      <ExternalLink size={13} className={active ? "text-[#1f6feb]" : "text-slate-400"} />
    </button>
  );
}

function IncidentDemoPanel({
  incident,
  onOpenImpact,
  onOpenReport,
  relationCountByServiceId,
  service,
}: {
  incident?: IncidentRecord;
  onOpenImpact: () => void;
  onOpenReport: () => void;
  relationCountByServiceId: Map<number, { incoming: number; outgoing: number }>;
  service: ServiceRecord;
}) {
  const relationCount = relationCountByServiceId.get(service.serviceId) ?? {
    incoming: 0,
    outgoing: 0,
  };

  return (
    <section className="rounded-xl border border-[#d9e8ff] bg-[#f6fafc] p-4 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[1fr_1.05fr_0.85fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-black text-[#f04452]">
            <Siren size={17} />
            메인 장애 발생
          </div>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            {incident?.title ?? `${service.serviceName} 장애 감지`}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {incident?.description ??
              "서비스 헬스체크 실패와 외부 연계 응답 지연이 감지되었습니다."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#ff4d5a] px-3 py-1 text-xs font-black text-white">
              CRITICAL
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
              경과 00:14:32
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-black text-[#1f6feb]">
            <GitBranch size={17} />
            영향도 자동 계산
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ImpactMiniMetric label="수신" value={relationCount.incoming} />
            <ImpactMiniMetric label="송신" value={relationCount.outgoing} />
            <ImpactMiniMetric
              label="우선 조치"
              value={Math.max(1, relationCount.incoming + relationCount.outgoing)}
            />
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            장애 서비스 기준으로 직접/간접 연계 서비스를 자동 검색하고,
            관련 서비스 클릭 시 서비스 정보와 영향도를 함께 확인합니다.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-black text-slate-700">
            <BellIcon />
            전파/기록 상태
          </div>
          <div className="mt-3 space-y-2 text-xs font-bold text-slate-600">
            <div>14:08 영향 범위 계산 완료</div>
            <div>14:09 Slack · SMS · Email 발송 완료</div>
            <div>14:10 운영자 확인 이력 기록</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenImpact}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#3182f6] px-3 text-xs font-black text-white transition hover:bg-[#1b64da]"
            >
              영향도 보기
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={onOpenReport}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
            >
              <FileText size={14} />
              분석 보고서
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ImpactMiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs font-black text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function MetricPanel({
  accent,
  icon,
  label,
  onClick,
  value,
}: {
  accent: "red" | "amber" | "emerald" | "slate";
  icon: ReactNode;
  label: string;
  onClick: () => void;
  value: number;
}) {
  const styles = {
    red: {
      border: "border-[#ffd1d6]",
      icon: "bg-[#ffe5e8] text-[#ff4d5a]",
      value: "text-[#ff4d5a]",
      line: "bg-[#ffd1d6]",
    },
    amber: {
      border: "border-[#ffd978]",
      icon: "bg-[#fff8df] text-[#f08c00]",
      value: "text-[#f08c00]",
      line: "bg-[#ffd978]",
    },
    emerald: {
      border: "border-[#a7efd8]",
      icon: "bg-[#ecfff8] text-[#20c997]",
      value: "text-[#20c997]",
      line: "bg-[#a7efd8]",
    },
    slate: {
      border: "border-slate-200",
      icon: "bg-slate-100 text-slate-500",
      value: "text-slate-700",
      line: "bg-slate-200",
    },
  }[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[132px] rounded-xl border bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-slate-100 ${styles.border}`}
    >
      <div className="flex h-full flex-col justify-between gap-5">
        <div className="flex items-center justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${styles.icon}`}>
            {icon}
          </div>
          <span className={`h-px w-8 ${styles.line}`} />
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="text-sm font-black text-slate-700">{label}</div>
          <div className={`text-3xl font-black leading-none ${styles.value}`}>
            {value}
          </div>
        </div>
      </div>
    </button>
  );
}

const OperationalServiceBoard = forwardRef<HTMLElement, {
  pausedServices: ServiceRecord[];
  relationCountByServiceId: Map<number, { incoming: number; outgoing: number }>;
  runningServices: ServiceRecord[];
}>(function OperationalServiceBoard({
  pausedServices,
  relationCountByServiceId,
  runningServices,
}, ref) {
  const visibleRunningServices = runningServices.slice(0, 15);
  const visiblePausedServices = pausedServices.slice(0, 4);

  return (
    <section ref={ref} className="scroll-mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-600 shadow-[0_0_0_2px_rgba(34,197,94,0.16)]" />
          <h2 className="text-base font-black text-slate-700">운영중</h2>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-black text-slate-500 shadow-sm">
            {runningServices.length}
          </span>
        </div>
        <div className="h-px min-w-10 flex-1 bg-slate-200" />
        <div className="text-xs font-black text-slate-400">
          상태 점 · 서비스명 · serviceCode · 연계 수(↘수신 / ↗발신)
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {visibleRunningServices.map((service) => (
          <OperationalServiceItem
            key={service.serviceId}
            counts={
              relationCountByServiceId.get(service.serviceId) ?? {
                incoming: 0,
                outgoing: 0,
              }
            }
            service={service}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-b from-white to-slate-300 shadow-[0_0_0_1px_rgba(148,163,184,0.36)]" />
          <h2 className="text-base font-black text-slate-600">중지/테스트</h2>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-black text-slate-500 shadow-sm">
            {pausedServices.length}
          </span>
        </div>
        <div className="h-px min-w-10 flex-1 bg-slate-200" />
        <div className="text-xs font-black text-slate-400">
          STATUS ≠ 운영중 (논리삭제 대상 후보 포함)
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {visiblePausedServices.map((service) => (
          <span
            key={service.serviceId}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-500"
          >
            <span className="text-slate-400">⊘</span>
            <span className="truncate">
              {service.serviceName} ({service.serviceCode}) ·{" "}
              {codeLabels.serviceStatus[service.statusCode]}
            </span>
          </span>
        ))}
        {visiblePausedServices.length === 0 ? (
          <span className="text-xs font-bold text-slate-400">
            중지/테스트 상태 서비스가 없습니다.
          </span>
        ) : null}
      </div>
    </section>
  );
});

function OperationalServiceItem({
  counts,
  service,
}: {
  counts: { incoming: number; outgoing: number };
  service: ServiceRecord;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <span className="h-3 w-3 shrink-0 rounded-full bg-slate-500" />
      <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">
        {service.serviceName}
      </span>
      <span className="shrink-0 text-xs font-black text-slate-400">
        {service.serviceCode}
      </span>
      <span className="shrink-0 whitespace-nowrap text-xs font-black text-slate-500">
        ↘{counts.incoming} ↗{counts.outgoing}
      </span>
    </div>
  );
}

function IncidentCard({
  index,
  incident,
  onDemote,
  onOpenImpact,
  onOpenReport,
  ownerNames,
  relations,
  service,
  services,
}: {
  index: number;
  incident?: IncidentRecord;
  onDemote: () => void;
  onOpenImpact: () => void;
  onOpenReport: () => void;
  ownerNames: string[];
  relations: {
    sourceServiceId: number;
    targetServiceId: number;
  }[];
  service: ServiceRecord;
  services: ServiceRecord[];
}) {
  const serviceById = new Map(services.map((item) => [item.serviceId, item]));
  const outgoing = relations.filter(
    (relation) => relation.sourceServiceId === service.serviceId
  );
  const incoming = relations.filter(
    (relation) => relation.targetServiceId === service.serviceId
  );
  const connected = [...outgoing, ...incoming]
    .map((relation) =>
      relation.sourceServiceId === service.serviceId
        ? serviceById.get(relation.targetServiceId)
        : serviceById.get(relation.sourceServiceId)
    )
    .filter(Boolean)
    .slice(0, 4) as ServiceRecord[];
  const elapsed = index === 0 ? "00:14:32" : "00:11:08";
  const historyRows: Array<{
    color: "red" | "slate" | "amber" | "emerald" | "blue";
    label: ReactNode;
    time: string;
  }> = [
    {
      color: "red",
      time: index === 0 ? "14:08" : "14:11",
      label: <>자동 감지 · 헬스체크 fail · {service.serviceName}</>,
    },
    {
      color: "slate",
      time: index === 0 ? "14:08" : "14:11",
      label: (
        <>
          담당 그룹 매핑 · {(ownerNames[0] ?? "담당 그룹")} 알림 대상자 조회
        </>
      ),
    },
    {
      color: "blue",
      time: index === 0 ? "14:08" : "14:11",
      label: <>영향 범위 계산 · 직접/간접 연계 서비스 산출</>,
    },
    {
      color: "amber",
      time: index === 0 ? "14:09" : "14:12",
      label: <>알림 발송 준비 · Slack · SMS · Email 채널 큐 적재</>,
    },
    {
      color: "emerald",
      time: index === 0 ? "14:09" : "14:12",
      label: <>알림 발송 완료 → 담당자 ACK 대기</>,
    },
    {
      color: "slate",
      time: index === 0 ? "14:10" : "14:13",
      label: <>운영자 확인 · 장애 상세 페이지 조회 이력 기록</>,
    },
    {
      color: "amber",
      time: index === 0 ? "14:12" : "14:14",
      label: <>재시도 정책 확인 · 후속 조치 담당자 배정 대기</>,
    },
  ];

  return (
    <article className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-black text-slate-900">
              {service.serviceName}
            </h3>
            <span className="text-xs font-black text-slate-500">
              · {codeLabels.serviceType[service.serviceTypeCode]}
            </span>
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {service.serviceCode} · {service.categoryPath.join(" > ")} · 중요도{" "}
            {codeLabels.importance[service.importanceCode ?? "NORMAL"]}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full bg-[#ff4d5a] px-2.5 py-1 text-[11px] font-black text-white">
            CRITICAL
          </span>
          <button
            type="button"
            onClick={onDemote}
            className="inline-flex h-7 items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-black text-slate-600 transition hover:bg-slate-100"
          >
            주의로 하향
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
        <span className="text-slate-500">ID INC-2026-{String(312 + index).padStart(4, "0")}</span>
        <span>
          <Clock3 size={13} className="mr-1 inline" />
          경과 <b className="text-slate-950">{elapsed}</b>
        </span>
        <span>
          <Monitor size={13} className="mr-1 inline" />
          인스턴스 <b className="text-slate-950">{service.instanceCount}</b> /{" "}
          {Math.max(service.instanceCount, service.instanceCount + 1)} down
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
        현상{" "}
        {incident?.description ||
          (incoming.length
            ? "상위 서비스 장애로 인한 연쇄 영향이 감지되었습니다."
            : "외부 연계 응답 지연 및 헬스체크 실패가 감지되었습니다.")}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <RelationChip active>{service.serviceName}</RelationChip>
        {connected.map((item) => (
          <span key={item.serviceId} className="inline-flex items-center gap-2">
            <ArrowRight size={13} className="text-slate-300" />
            <RelationChip>{item.serviceName}</RelationChip>
          </span>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-black text-slate-700">
          <BellIcon />
          전체 처리 이력
        </div>
        {historyRows.map((row, rowIndex) => (
          <TimelineRow
            key={`${row.time}-${rowIndex}`}
            color={row.color}
            time={row.time}
          >
            {row.label}
          </TimelineRow>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap justify-end gap-2 pt-3">
        <button
          type="button"
          onClick={onOpenImpact}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100"
        >
          영향도 보기
          <ArrowRight size={14} />
        </button>
        <button
          type="button"
          onClick={onOpenReport}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
        >
          <FileText size={14} />
          분석 보고서
        </button>
        <Link
          to={`/services/${service.serviceId}`}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
        >
          서비스 상세보기
          <ArrowRight size={14} />
        </Link>
        <Link
          to={
            incident
              ? `/dashboard?incidentId=${incident.incidentId}`
              : `/dashboard?mode=incident&serviceId=${service.serviceId}`
          }
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#3182f6] px-3 text-xs font-black text-white shadow-sm transition hover:bg-[#1b64da]"
        >
          장애 상세보기
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}

function IncidentAnalysisReport({
  incident,
  onClose,
  relationCountByServiceId,
  service,
}: {
  incident?: IncidentRecord;
  onClose: () => void;
  relationCountByServiceId: Map<number, { incoming: number; outgoing: number }>;
  service: ServiceRecord;
}) {
  const relationCount = relationCountByServiceId.get(service.serviceId) ?? {
    incoming: 0,
    outgoing: 0,
  };
  const impactTotal = Math.max(1, relationCount.incoming + relationCount.outgoing);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      onClick={onClose}
    >
      <section
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-slate-700">
              <FileText size={17} />
              영향도 분석 결과
            </div>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {incident?.title ?? `${service.serviceName} 장애 분석 보고`}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              장애 영향도 확인과 전파 이력을 시연하기 위한 보고서 묵업입니다.
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <ReportMetric label="장애 서비스" value={service.serviceName} />
            <ReportMetric label="영향 서비스" value={`${impactTotal}개`} />
            <ReportMetric label="전파 상태" value="발송 완료" />
          </div>

          <ReportBlock
            title="분석 요약"
            items={[
              `${service.serviceName} 응답 지연으로 직접 연계 서비스의 처리 지연 가능성이 높습니다.`,
              "필수 관계와 담당 그룹을 기준으로 우선 전파 대상이 자동 산출되었습니다.",
              "현재 조치 이력은 운영 히스토리에 누적되어 이후 장애 지침서로 재사용됩니다.",
            ]}
          />
          <ReportBlock
            title="우선 조치"
            items={[
              "장애 중심 서비스의 헬스체크, 최근 배포, 외부 연계 응답 시간을 우선 확인합니다.",
              "직접 영향 서비스 담당자에게 처리 지연 가능성을 먼저 전파합니다.",
              "복구 후 모니터링 상태로 전환하고 타임라인에 조치 결과를 기록합니다.",
            ]}
          />
          <ReportBlock
            title="전파 결과"
            items={[
              "Slack 운영 채널 알림 발송 완료",
              "SMS 긴급 담당자 알림 발송 완료",
              "Email 상세 분석 보고 발송 완료",
            ]}
          />
        </div>
        <div className="shrink-0 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            닫기
          </button>
        </div>
      </section>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-black text-slate-400">{label}</div>
      <div className="mt-1 truncate text-sm font-black text-slate-900">
        {value}
      </div>
    </div>
  );
}

function ReportBlock({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-start gap-2 text-sm font-semibold leading-6 text-slate-600"
          >
            <ArrowRight size={14} className="mt-1 shrink-0 text-slate-400" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RelationChip({
  active = false,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex max-w-[150px] items-center rounded-full border px-2.5 py-1 text-xs font-black ${
        active
          ? "border-[#3182f6] bg-[#3182f6] text-white"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

function TimelineRow({
  children,
  color,
  time,
}: {
  children: ReactNode;
  color: "red" | "slate" | "amber" | "emerald" | "blue";
  time: string;
}) {
  const dotClassName =
    color === "red"
      ? "bg-[#ff4d5a]"
      : color === "blue"
        ? "bg-slate-500"
      : color === "amber"
        ? "bg-slate-400"
        : color === "emerald"
          ? "bg-slate-600"
          : "bg-slate-300";

  return (
    <div className="flex items-start gap-3 py-0.5 text-xs font-semibold text-slate-600">
      <span className="w-9 shrink-0 text-slate-500">{time}</span>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClassName}`} />
      <span className="min-w-0 flex-1">{children}</span>
      <span className="text-[11px] text-slate-400">System</span>
    </div>
  );
}

function SectionTitle({
  count,
  icon,
  title,
}: {
  count: number;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <h2 className="text-base font-black text-slate-800">{title}</h2>
      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-black text-slate-500">
        {count}
      </span>
    </div>
  );
}

function ServiceMiniCard({
  onPromote,
  service,
  status = service.statusCode,
}: {
  onPromote?: () => void;
  service: ServiceRecord;
  status?: ServiceStatusCode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-slate-900">
            {service.serviceName}
          </div>
          <div className="mt-1 truncate text-xs font-bold text-slate-500">
            {service.serviceCode} · {codeLabels.serviceStatus[status]}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      {onPromote ? (
        <button
          type="button"
          onClick={onPromote}
          className="mt-2 inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
        >
          장애로 상향
        </button>
      ) : null}
    </div>
  );
}

function TopologyPanel({
  relations,
  services,
}: {
  relations: { sourceServiceId: number; targetServiceId: number }[];
  services: ServiceRecord[];
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-slate-950">서비스 토폴로지</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            필터링된 서비스의 간략 연결 상태입니다. 상세 분석은 관계 그래프 탭에서 확인합니다.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
          관계 {relations.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {services.map((service, index) => (
          <div
            key={service.serviceId}
            className="relative rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            {index < services.length - 1 ? (
              <div className="absolute -right-4 top-1/2 hidden h-px w-4 bg-slate-300 md:block" />
            ) : null}
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
              <GitBranch size={17} />
            </div>
            <div className="truncate text-sm font-black text-slate-900">
              {service.serviceName}
            </div>
            <div className="mt-1 text-xs font-bold text-slate-500">
              {service.categoryPath.slice(0, 3).join(" / ")}
            </div>
            <div className="mt-3">
              <StatusBadge status={service.statusCode} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: ServiceStatusCode }) {
  const className =
    status === "NORMAL"
      ? "border-slate-200 bg-slate-50 text-slate-700"
      : status === "INCIDENT" || status === "INACTIVE"
        ? "border-[#ffd1d6] bg-[#fff5f6] text-[#f04452]"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${className}`}
    >
      {codeLabels.serviceStatus[status]}
    </span>
  );
}

function BellIcon() {
  return <ShieldAlert size={16} className="text-slate-500" />;
}
