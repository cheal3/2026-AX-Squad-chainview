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
  Bell,
  Box,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  Filter,
  GitBranch,
  Globe2,
  HelpCircle,
  Layers,
  Monitor,
  Search,
  Server,
  ShieldAlert,
  Siren,
  UserRound,
  Users,
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

export function Dashboard() {
  const { services, relations, owners, incidents } = usePortalData();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<DashboardView>("cards");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    null
  );
  const [statusOverrides, setStatusOverrides] = useState<
    Record<number, ServiceStatusCode>
  >({});
  const incidentSectionRef = useRef<HTMLElement | null>(null);
  const warningSectionRef = useRef<HTMLElement | null>(null);
  const operationsSectionRef = useRef<HTMLElement | null>(null);

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
  const selectedService =
    services.find((service) => service.serviceId === selectedServiceId) ??
    warningServices[0] ??
    runningServices[0] ??
    services[0];
  const selectedStatus = selectedService
    ? getDashboardStatus(selectedService)
    : "NORMAL";
  const selectedIsWarning =
    selectedStatus === "IMPACTED" || selectedStatus === "MAINTENANCE";
  const selectedRelationCount = selectedService
    ? relationCountByServiceId.get(selectedService.serviceId) ?? {
        incoming: 0,
        outgoing: 0,
      }
    : { incoming: 0, outgoing: 0 };
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
  const businessTabs = ["전체", "공통 플랫폼", "기간계/업무계", "채널계", "대외채널"];

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f2f7ff] text-[#1f6feb]">
            <GitBranch size={19} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-950">
              전체 서비스 운영 현황
            </h1>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              정상/주의 상태와 관리 누락 항목을 함께 확인합니다.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700">
            운영환경 <span className="text-slate-950">PROD</span>
          </div>
          <label className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="서비스 검색"
              className="h-10 w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#86b7ff] focus:ring-4 focus:ring-[#edf5ff]"
            />
          </label>
          <Bell size={18} className="text-slate-500" />
          <HelpCircle size={18} className="text-slate-500" />
          <UserRound size={18} className="text-slate-500" />
        </div>
      </section>

      <section className="grid min-w-[1180px] gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="min-w-0 space-y-3">
          <div className="grid grid-cols-5 gap-3">
            <OverviewMetric icon={<Server size={22} />} label="전체 서비스" value={services.length} />
            <OverviewMetric icon={<Box size={22} />} label="공통 플랫폼" value={12} />
            <OverviewMetric icon={<Building2 size={22} />} label="기간계/업무계" value={18} />
            <OverviewMetric icon={<Monitor size={22} />} label="채널계" value={10} />
            <OverviewMetric icon={<Globe2 size={22} />} label="대외채널" value={8} />
          </div>

          {warningServices.length ? (
            <WarningAlert
              impactCount={Math.max(1, warningServices.length + 3)}
              service={warningServices[0]}
              detailHref={getIncidentDashboardHref(
                warningServices[0],
                incidents
              )}
            />
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-950">
                  서비스 관계도
                </h2>
                <div className="mt-2 flex flex-wrap gap-5">
                  {businessTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`h-7 text-xs font-black ${
                        tab === "전체"
                          ? "border-b-2 border-[#3182f6] text-[#1f6feb]"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-black text-slate-600">
                <button type="button" className="px-1">-</button>
                <span>100%</span>
                <button type="button" className="px-1">+</button>
              </div>
            </div>
            <BusinessRelationMap
              selectedServiceId={selectedService?.serviceId}
              services={filteredServices}
              warningServiceIds={new Set(warningServices.map((service) => service.serviceId))}
              onSelectService={setSelectedServiceId}
            />
          </section>
        </div>

        {selectedService ? (
          <SelectedOperationServicePanel
            isWarning={selectedIsWarning}
            owners={ownerByServiceId.get(selectedService.serviceId) ?? []}
            relationCount={selectedRelationCount}
            service={selectedService}
            status={selectedStatus}
            onPromote={() =>
              updateDashboardStatus(selectedService.serviceId, "INCIDENT")
            }
          />
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_0.95fr_1.1fr_1.1fr]">
        <ManagementNeededPanel
          items={[
            ["담당조직 미등록", ownerlessCount],
            ["담당그룹 미등록", Math.max(2, Math.floor(ownerlessCount / 2))],
            ["영향도 미연결", noRelationCount],
            ["서비스 설명 미등록", undocumentedCount],
            ["미완료 인시던트", criticalServices.length + warningServices.length],
          ]}
        />
        <RecentCurrentStatePanel services={services.slice(0, 5)} />
        <RecentServiceChangePanel services={services.slice(0, 5)} />
        <RecentIncidentPanel incidents={incidents} services={services} />
      </section>
    </div>
  );
}

function OverviewMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f2f7ff] text-[#3182f6]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function WarningAlert({
  detailHref,
  impactCount,
  service,
}: {
  detailHref: string;
  impactCount: number;
  service: ServiceRecord;
}) {
  return (
    <Link
      to={detailHref}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-[#ffd978] bg-[#fff8df] px-4 py-2.5 text-left shadow-sm transition hover:bg-[#fff3c4]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <AlertTriangle size={18} className="shrink-0 text-[#f08c00]" />
        <span className="text-sm font-black text-slate-900">
          영향 가능성 감지 서비스 1건
        </span>
        <span className="truncate text-xs font-bold text-slate-600">
          {service.serviceName} · 최근 15분 응답시간 증가 · 예상 영향 서비스 {impactCount}개
        </span>
      </div>
      <span className="shrink-0 text-xs font-black text-[#1f6feb]">
        상세 보기
      </span>
    </Link>
  );
}

function getIncidentDashboardHref(
  service: ServiceRecord,
  incidents: IncidentRecord[]
) {
  const incident = incidents.find(
    (item) =>
      item.serviceId === service.serviceId &&
      item.incidentStatusCode !== "RESOLVED"
  );

  return incident
    ? `/dashboard?incidentId=${incident.incidentId}`
    : `/dashboard?mode=incident&serviceId=${service.serviceId}`;
}

function BusinessRelationMap({
  onSelectService,
  selectedServiceId,
  services,
  warningServiceIds,
}: {
  onSelectService: (serviceId: number) => void;
  selectedServiceId?: number;
  services: ServiceRecord[];
  warningServiceIds: Set<number>;
}) {
  const columns = [
    { title: "공통 플랫폼", items: services.slice(0, 4) },
    { title: "기간계/업무계", items: services.slice(4, 9) },
    { title: "채널계", items: services.slice(9, 13) },
    { title: "대외채널", items: services.slice(13, 17) },
  ];

  return (
    <div className="grid min-h-[360px] grid-cols-4 gap-8 px-3 pb-4 pt-2">
      {columns.map((column, columnIndex) => (
        <div key={column.title} className="relative">
          <div className="mb-4 text-center text-xs font-black text-slate-700">
            {column.title}
          </div>
          <div className="space-y-3">
            {column.items.map((service, index) => {
              const warning = warningServiceIds.has(service.serviceId);
              const selected = selectedServiceId === service.serviceId;

              return (
                <button
                  key={service.serviceId}
                  type="button"
                  onClick={() => onSelectService(service.serviceId)}
                  className={`relative flex h-11 w-full items-center gap-2 rounded-lg border px-3 text-left text-xs font-black shadow-sm transition ${
                    warning
                      ? "border-[#f08c00] bg-[#fff8df] text-[#e67700]"
                      : selected
                        ? "border-[#3182f6] bg-[#f2f7ff] text-[#1f6feb]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {columnIndex < columns.length - 1 && index < 4 ? (
                    <span className="absolute -right-8 top-1/2 h-px w-8 bg-slate-200" />
                  ) : null}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-500">
                    {warning ? <AlertTriangle size={14} /> : <Layers size={14} />}
                  </span>
                  <span className="min-w-0 truncate">{service.serviceName}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SelectedOperationServicePanel({
  isWarning,
  onPromote,
  owners,
  relationCount,
  service,
  status,
}: {
  isWarning: boolean;
  onPromote: () => void;
  owners: string[];
  relationCount: { incoming: number; outgoing: number };
  service: ServiceRecord;
  status: ServiceStatusCode;
}) {
  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-950">선택 서비스 정보</h2>
        <StatusBadge status={status} />
      </div>
      <div className="mb-4 flex items-center gap-2">
        {isWarning ? (
          <AlertTriangle size={18} className="text-[#f08c00]" />
        ) : (
          <CheckCircle2 size={18} className="text-[#00a77d]" />
        )}
        <div className="min-w-0 flex-1 truncate text-base font-black text-slate-950">
          {service.serviceName}
        </div>
      </div>

      {isWarning ? (
        <div className="mb-4 rounded-lg border border-[#ffd978] bg-[#fff8df] p-3">
          <div className="text-xs font-black text-[#e67700]">
            위험 신호 최근 15분
          </div>
          <div className="mt-2 space-y-2 text-xs font-semibold text-slate-700">
            <div className="flex justify-between"><span>응답시간</span><b className="text-[#f08c00]">+45%</b></div>
            <div className="flex justify-between"><span>오류율</span><b className="text-[#f08c00]">+18%</b></div>
            <div className="flex justify-between"><span>실패 요청 수</span><b className="text-[#f08c00]">+32%</b></div>
          </div>
        </div>
      ) : null}

      <div className="space-y-3 border-t border-slate-100 pt-4 text-xs">
        <DetailLine label="서비스 분류" value={service.categoryPath.join(" > ")} />
        <DetailLine label="소유 조직" value={owners[0] ?? "미등록"} />
        <DetailLine label="상위 서비스" value={`${relationCount.incoming}개`} />
        <DetailLine label="하위 서비스" value={`${relationCount.outgoing}개`} />
        <DetailLine label="연관 서비스 수" value={`${relationCount.incoming + relationCount.outgoing}개`} />
        <DetailLine label="등록일" value={service.createdAt} />
        <DetailLine label="설명" value={service.description || "미등록"} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link
          to={`/services/${service.serviceId}`}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#3182f6] bg-white text-xs font-black text-[#1f6feb] transition hover:bg-[#f2f7ff]"
        >
          서비스 상세
        </Link>
        {isWarning ? (
          <button
            type="button"
            onClick={onPromote}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#f08c00] text-xs font-black text-white transition hover:bg-[#e67700]"
          >
            장애로 전환
          </button>
        ) : (
          <Link
            to="/incidents"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#3182f6] text-xs font-black text-white transition hover:bg-[#1b64da]"
          >
            인시던트 생성
          </Link>
        )}
      </div>
    </aside>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-3">
      <span className="font-black text-slate-400">{label}</span>
      <span className="truncate font-bold text-slate-700">{value}</span>
    </div>
  );
}

function ManagementNeededPanel({
  items,
}: {
  items: Array<[string, number]>;
}) {
  return (
    <DashboardInfoPanel title="관리 필요 서비스">
      <div className="space-y-2">
        {items.map(([label, count], index) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-bold text-slate-600">
              <span className={`h-2 w-2 rounded-full ${index === 4 ? "bg-[#ff4d5a]" : "bg-slate-400"}`} />
              {label}
            </span>
            <b className="text-slate-900">{count}건</b>
          </div>
        ))}
      </div>
    </DashboardInfoPanel>
  );
}

function RecentCurrentStatePanel({ services }: { services: ServiceRecord[] }) {
  return (
    <DashboardInfoPanel title="최근 서비스 현행화">
      <CompactServiceList services={services} meta="최근 점검" />
    </DashboardInfoPanel>
  );
}

function RecentServiceChangePanel({ services }: { services: ServiceRecord[] }) {
  return (
    <DashboardInfoPanel title="최근 서비스 변경">
      <CompactServiceList services={services} meta="담당/분류 변경" />
    </DashboardInfoPanel>
  );
}

function RecentIncidentPanel({
  incidents,
  services,
}: {
  incidents: IncidentRecord[];
  services: ServiceRecord[];
}) {
  const serviceById = new Map(services.map((service) => [service.serviceId, service]));
  const visibleIncidents = incidents.slice(0, 5);

  return (
    <DashboardInfoPanel title="최근 인시던트">
      <div className="space-y-2">
        {visibleIncidents.map((incident, index) => (
          <div key={incident.incidentId} className="grid grid-cols-[1fr_100px_72px] gap-2 text-xs">
            <span className="truncate font-black text-slate-700">
              {serviceById.get(incident.serviceId ?? 0)?.serviceName ?? "서비스"}
            </span>
            <span className="truncate font-semibold text-slate-500">
              INC-2026-{String(21 - index).padStart(4, "0")}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-center text-[11px] font-black ${
              incident.incidentStatusCode === "RESOLVED"
                ? "bg-[#ecfff8] text-[#00a77d]"
                : incident.incidentStatusCode === "MONITORING"
                  ? "bg-[#f2f7ff] text-[#1f6feb]"
                  : "bg-[#fff8df] text-[#e67700]"
            }`}>
              {incident.incidentStatusCode === "RESOLVED"
                ? "완료"
                : incident.incidentStatusCode === "MONITORING"
                  ? "회고 대기"
                  : "진행중"}
            </span>
          </div>
        ))}
      </div>
    </DashboardInfoPanel>
  );
}

function CompactServiceList({
  meta,
  services,
}: {
  meta: string;
  services: ServiceRecord[];
}) {
  return (
    <div className="space-y-2">
      {services.map((service, index) => (
        <div key={service.serviceId} className="grid grid-cols-[1fr_72px] gap-2 text-xs">
          <span className="truncate font-black text-slate-700">
            {service.serviceName}
          </span>
          <span className="text-right font-semibold text-slate-500">
            {index === 0 ? "5분 전" : `${index + 1}시간 전`}
          </span>
          <span className="col-span-2 truncate text-[11px] font-semibold text-slate-400">
            {meta}
          </span>
        </div>
      ))}
    </div>
  );
}

function DashboardInfoPanel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-950">{title}</h2>
        <span className="text-xs font-black text-[#1f6feb]">더보기</span>
      </div>
      {children}
    </section>
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
      icon: "bg-[#fff0b8] text-[#f08c00]",
      value: "text-[#f08c00]",
      line: "bg-[#ffd978]",
    },
    emerald: {
      border: "border-[#a7efd8]",
      icon: "bg-[#c9f7e6] text-[#20c997]",
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
      className={`min-h-[132px] rounded-xl border bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#d9e8ff] ${styles.border}`}
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
      <span className="h-3 w-3 shrink-0 rounded-full bg-[#20c997]" />
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
  ownerNames,
  relations,
  service,
  services,
}: {
  index: number;
  incident?: IncidentRecord;
  onDemote: () => void;
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
    <article className="flex h-full flex-col rounded-lg border border-[#ffd1d6] bg-white p-4 shadow-sm ring-1 ring-[#fff5f6]">
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
            className="inline-flex h-7 items-center rounded-md border border-[#ffd978] bg-[#fff8df] px-2.5 text-[11px] font-black text-[#e67700] transition hover:bg-[#fff0b8]"
          >
            주의로 하향
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
        <span className="text-[#1f6feb]">ID INC-2026-{String(312 + index).padStart(4, "0")}</span>
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

      <div className="mt-3 rounded-lg border border-dashed border-[#ffb8c0] bg-[#fff5f6] px-3 py-2 text-xs font-black text-[#f04452]">
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
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#ff4d5a] px-3 text-xs font-black text-white shadow-sm transition hover:bg-[#e43f4b]"
        >
          장애 상세보기
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
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
          ? "border-[#ff4d5a] bg-[#ff4d5a] text-white"
          : "border-[#ffd1d6] bg-[#fff5f6] text-[#f04452]"
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
        ? "bg-[#3182f6]"
      : color === "amber"
        ? "bg-[#f59f00]"
        : color === "emerald"
          ? "bg-[#00b386]"
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
          className="mt-2 inline-flex h-8 items-center rounded-md border border-[#ffd1d6] bg-white px-3 text-xs font-black text-[#f04452] transition hover:bg-[#fff5f6]"
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
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#1f6feb] shadow-sm">
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
      ? "border-[#a7efd8] bg-[#ecfff8] text-[#00a77d]"
      : status === "INCIDENT" || status === "INACTIVE"
        ? "border-[#ffd1d6] bg-[#fff5f6] text-[#f04452]"
        : "border-[#ffd978] bg-[#fff8df] text-[#e67700]";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${className}`}
    >
      {codeLabels.serviceStatus[status]}
    </span>
  );
}

function BellIcon() {
  return <ShieldAlert size={16} className="text-[#f08c00]" />;
}
