import {
  forwardRef,
  lazy,
  useMemo,
  useRef,
  useState,
  Suspense,
  type ReactNode,
  type RefObject,
} from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  FileText,
  Filter,
  GitBranch,
  Monitor,
  Search,
  ShieldAlert,
  Siren,
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
  const { services, relations, owners, incidents } = usePortalData();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<DashboardView>("cards");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [incidentDemoOpen, setIncidentDemoOpen] = useState(true);
  const [analysisReportOpen, setAnalysisReportOpen] = useState(false);
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
    statusOverrides[service.serviceId] ?? service.statusCode;
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
      service.deploymentStatusCode === "STOPPED" ||
        status === "MAINTENANCE" ||
        status === "INACTIVE"
      );
    }
  );
  const activeRelations = relations.filter(
    (relation) => relation.relationStatusCode === "ACTIVE"
  );

  const incidentCards = useMemo(() => {
    const serviceById = new Map(services.map((service) => [service.serviceId, service]));
    const activeIncidentCards = incidents
      .filter((incident) => incident.incidentStatusCode !== "RESOLVED")
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
      );
    const activeServiceIds = new Set(
      activeIncidentCards.map(({ service }) => service.serviceId)
    );
    const statusIncidentCards = criticalServices
      .filter((service) => !activeServiceIds.has(service.serviceId))
      .map((service) => {
        return { incident: undefined, service };
      });

    return [...activeIncidentCards, ...statusIncidentCards].slice(
      0,
      criticalServices.length
    );
  }, [criticalServices, incidents, services, statusOverrides]);

  const primaryIncidentCard = incidentCards[0];
  const displayedIncidentCount = criticalServices.length;

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
    setView("relations");
    window.setTimeout(() => scrollToSection(relationSectionRef), 0);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader
        description="장애 발생부터 영향도 확인, 분석 보고, 알림 전파까지 시연합니다."
        icon={<Monitor size={22} />}
        title="장애 시연 대시보드"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIncidentDemoOpen((current) => !current)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#3182f6] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#1b64da]"
            >
              <Siren size={16} />
              장애 시연 보기
            </button>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm">
              장애 {criticalServices.length} · 주의 {warningServices.length}
            </div>
          </div>
        }
      />

      {incidentDemoOpen && primaryIncidentCard ? (
        <IncidentDemoPanel
          incident={primaryIncidentCard.incident}
          relationCountByServiceId={relationCountByServiceId}
          service={primaryIncidentCard.service}
          onOpenImpact={showIncidentRelations}
          onOpenReport={() => setAnalysisReportOpen(true)}
        />
      ) : null}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricPanel
          accent="red"
          icon={<Siren size={24} />}
          label="장애"
          onClick={() => showCardsAndScrollTo(incidentSectionRef)}
          value={criticalServices.length}
        />
        <MetricPanel
          accent="amber"
          icon={<AlertTriangle size={23} />}
          label="주의"
          onClick={() => showCardsAndScrollTo(warningSectionRef)}
          value={warningServices.length}
        />
        <MetricPanel
          accent="emerald"
          icon={<Monitor size={23} />}
          label="운영중 서비스"
          onClick={() => showCardsAndScrollTo(operationsSectionRef)}
          value={runningServices.length}
        />
        <MetricPanel
          accent="slate"
          icon={<Clock3 size={23} />}
          label="중지/테스트"
          onClick={() => showCardsAndScrollTo(operationsSectionRef)}
          value={pausedServices.length}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[260px] flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="서비스명, 코드, 담당자, 태그 검색"
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />
          </label>

          <button
            type="button"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((current) => !current)}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Filter size={16} />
            상세 설정
          </button>

          {advancedOpen ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-800">
                  대시보드 표시 방식
                </div>
                <div className="mt-0.5 text-xs font-semibold text-slate-500">
                  카드 현황, 토폴로지, 관계 그래프를 같은 조건으로 전환합니다.
                </div>
              </div>
              <div className="flex rounded-lg border border-slate-200 bg-white p-1">
                {(Object.keys(viewLabels) as DashboardView[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setView(item)}
                    className={`h-9 rounded-md px-4 text-sm font-black transition ${
                      view === item
                        ? "bg-[#f2f7ff] text-[#1f6feb]"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {viewLabels[item]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {view === "cards" ? (
        <>
          <section
            ref={incidentSectionRef}
            className="scroll-mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Siren size={17} className="shrink-0 text-[#f04452]" />
                <h2 className="truncate text-base font-black text-slate-950">
                  진행 중 장애
                </h2>
                <span className="rounded-full bg-[#ff4d5a] px-2 py-0.5 text-xs font-black text-white">
                  {displayedIncidentCount}
                </span>
              </div>
              <div className="shrink-0 text-xs font-black text-slate-400">
                ACK {Math.max(1, displayedIncidentCount - 3)} · 미확인{" "}
                {displayedIncidentCount > 0 ? 1 : 0}
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              {incidentCards.length ? (
                incidentCards.map(({ incident, service }, index) => (
                  <IncidentCard
                    key={service.serviceId}
                    index={index}
                    incident={incident}
                    relations={activeRelations}
                    service={service}
                    services={services}
                    ownerNames={ownerByServiceId.get(service.serviceId) ?? []}
                    onOpenImpact={showIncidentRelations}
                    onOpenReport={() => setAnalysisReportOpen(true)}
                    onDemote={() =>
                      updateDashboardStatus(service.serviceId, "IMPACTED")
                    }
                  />
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-400 xl:col-span-2">
                  진행 중 장애가 없습니다.
                </div>
              )}
            </div>
          </section>

          <section
            ref={warningSectionRef}
            className="scroll-mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <SectionTitle
              icon={<AlertTriangle size={17} className="text-slate-500" />}
              title="주의 서비스"
              count={warningServices.length}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {warningServices.length ? (
                warningServices.slice(0, 6).map((service) => (
                  <ServiceMiniCard
                    key={service.serviceId}
                    service={service}
                    status={getDashboardStatus(service)}
                    onPromote={() =>
                      updateDashboardStatus(service.serviceId, "INCIDENT")
                    }
                  />
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-400 sm:col-span-2 xl:col-span-3">
                  주의 상태 서비스가 없습니다.
                </div>
              )}
            </div>
          </section>

          <OperationalServiceBoard
            ref={operationsSectionRef}
            pausedServices={filteredPausedServices}
            relationCountByServiceId={relationCountByServiceId}
            runningServices={filteredRunningServices}
          />
        </>
      ) : null}

      {view === "topology" ? (
        <TopologyPanel
          services={filteredServices.slice(0, 9)}
          relations={activeRelations}
        />
      ) : null}

      {view === "relations" ? (
        <section
          ref={relationSectionRef}
          className="scroll-mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div>
              <h2 className="text-base font-black text-slate-950">
                서비스 관계 그래프
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                현재 필터 기준의 서비스 관계도를 확인합니다.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              React Flow
            </span>
          </div>
          <div className="p-4">
            <Suspense
              fallback={
                <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-black text-slate-400">
                  관계 그래프를 불러오는 중입니다.
                </div>
              }
            >
              <LazyServiceRelationFlow
                embedded
                incidentMode
                initialServiceId={primaryIncidentCard?.service.serviceId}
              />
            </Suspense>
          </div>
        </section>
      ) : null}

      {analysisReportOpen && primaryIncidentCard ? (
        <IncidentAnalysisReport
          incident={primaryIncidentCard.incident}
          relationCountByServiceId={relationCountByServiceId}
          service={primaryIncidentCard.service}
          onClose={() => setAnalysisReportOpen(false)}
        />
      ) : null}
    </div>
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
          to={incident ? `/incidents/${incident.incidentId}` : "/incidents"}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <section className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
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
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50"
          >
            닫기
          </button>
        </div>

        <div className="space-y-4 p-5">
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
