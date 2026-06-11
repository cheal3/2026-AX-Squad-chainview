import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
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
import { ServiceRelationFlow } from "./ServiceRelationFlow";

type DashboardView = "cards" | "topology" | "relations";

const viewLabels: Record<DashboardView, string> = {
  cards: "카드",
  topology: "토폴로지",
  relations: "관계 그래프",
};

export function Dashboard() {
  const { services, relations, owners, incidents } = usePortalData();
  const [businessFilter, setBusinessFilter] = useState("전체 업무");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<DashboardView>("cards");
  const [statusOverrides, setStatusOverrides] = useState<
    Record<number, ServiceStatusCode>
  >({});

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

  const businessAreas = useMemo(() => {
    const areaSet = new Set(
      services.map((service) => service.categoryPath[0]).filter(Boolean)
    );
    return ["전체 업무", ...Array.from(areaSet).slice(0, 4)];
  }, [services]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const businessMatched =
        businessFilter === "전체 업무" ||
        service.categoryPath[0] === businessFilter;
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

      return businessMatched && queryMatched;
    });
  }, [businessFilter, normalizedQuery, services]);

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

        if (!service || getDashboardStatus(service) === "IMPACTED") {
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
    const promotedOrStatusCriticalCards = criticalServices
      .filter((service) => !activeServiceIds.has(service.serviceId))
      .map((service) => ({
        incident: undefined,
        service,
      }));
    const combinedCards = [
      ...activeIncidentCards,
      ...promotedOrStatusCriticalCards,
    ];

    return combinedCards.slice(0, 4).map(({ incident, service }) => ({
      incident: undefined,
      service,
      ...(incident ? { incident } : {}),
    }));
  }, [criticalServices, incidents, services, statusOverrides]);

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

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader
        description="서비스 상태, 장애 영향, 운영 현황을 한 번에 확인합니다."
        icon={<Monitor size={22} />}
        title="실시간 대시보드"
        actions={
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm">
            장애 {criticalServices.length} · 주의 {warningServices.length}
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricPanel
          accent="red"
          icon={<Siren size={24} />}
          label="장애"
          value={criticalServices.length}
          detail={`CRITICAL ${criticalServices.length}건`}
          subDetail="최근 15분 +1"
          strong
        />
        <MetricPanel
          accent="amber"
          icon={<AlertTriangle size={23} />}
          label="주의"
          value={warningServices.length}
          detail={`HIGH ${Math.ceil(warningServices.length / 2)} · MEDIUM ${Math.floor(
            warningServices.length / 2
          )}`}
          subDetail="임계 근접"
        />
        <CompactMetric
          dotClassName="bg-emerald-500"
          label="운영중 서비스"
          value={runningServices.length}
        />
        <CompactMetric
          dotClassName="bg-slate-400"
          label="중지/테스트"
          value={pausedServices.length}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-1">
            {businessAreas.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => setBusinessFilter(area)}
                className={`h-9 rounded-md px-4 text-sm font-black transition ${
                  businessFilter === area
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {area}
              </button>
            ))}
          </div>

          <label className="relative min-w-[260px] flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="서비스명, 코드, 담당자, 태그로 검색..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
            />
          </label>

          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            <Filter size={16} />
            고급 필터
          </button>

          <div className="ml-auto flex rounded-lg border border-slate-200 bg-white p-1">
            {(Object.keys(viewLabels) as DashboardView[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`h-9 rounded-md px-4 text-sm font-black transition ${
                  view === item
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {viewLabels[item]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {view === "cards" && (
        <>
          <section className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Siren size={17} className="shrink-0 text-red-500" />
                <h2 className="truncate text-base font-black text-slate-950">
                  진행 중 장애
                </h2>
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-black text-white">
                  {incidentCards.length}
                </span>
              </div>
              <div className="shrink-0 text-xs font-black text-slate-400">
                ACK {Math.max(1, incidentCards.length - 1)} · 미확인{" "}
                {incidentCards.length > 0 ? 1 : 0}
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

          <section className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
            <SectionTitle
              icon={<AlertTriangle size={17} className="text-amber-500" />}
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
            pausedServices={filteredPausedServices}
            relationCountByServiceId={relationCountByServiceId}
            runningServices={filteredRunningServices}
          />
        </>
      )}

      {view === "topology" && (
        <TopologyPanel
          services={filteredServices.slice(0, 9)}
          relations={activeRelations}
        />
      )}

      {view === "relations" && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div>
              <h2 className="text-base font-black text-slate-950">
                서비스 관계 그래프
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                현재 프로젝트의 React Flow 관계도를 이 화면 탭 안에 연결했습니다.
              </p>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
              React Flow
            </span>
          </div>
          <div className="p-4">
            <ServiceRelationFlow embedded />
          </div>
        </section>
      )}
    </div>
  );
}

function MetricPanel({
  accent,
  detail,
  icon,
  label,
  strong = false,
  subDetail,
  value,
}: {
  accent: "red" | "amber";
  detail: string;
  icon: ReactNode;
  label: string;
  strong?: boolean;
  subDetail: string;
  value: number;
}) {
  const color =
    accent === "red"
      ? "border-red-200 text-red-500"
      : "border-amber-200 text-amber-500";

  return (
    <div
      className={`rounded-xl border bg-white px-4 py-3 shadow-sm ${
        strong ? "ring-1 ring-red-100" : ""
      } ${color}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              accent === "red"
                ? "bg-red-100 text-red-500"
                : "bg-amber-100 text-amber-500"
            }`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-3xl font-black leading-none">{value}</div>
            <div className="mt-0.5 truncate text-sm font-black text-slate-800">
              {label}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={`text-xs font-black ${
              accent === "red" ? "text-red-500" : "text-slate-500"
            }`}
          >
            {detail}
          </div>
          <div
            className={`mt-0.5 text-xs font-bold ${
              accent === "red" ? "text-red-500" : "text-slate-500"
            }`}
          >
            {subDetail}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactMetric({
  dotClassName,
  label,
  value,
}: {
  dotClassName: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-center gap-3">
        <span className={`h-3 w-3 rounded-full ${dotClassName}`} />
        <div className="text-center">
          <div className="text-2xl font-black leading-none text-slate-700">{value}</div>
          <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function OperationalServiceBoard({
  pausedServices,
  relationCountByServiceId,
  runningServices,
}: {
  pausedServices: ServiceRecord[];
  relationCountByServiceId: Map<number, { incoming: number; outgoing: number }>;
  runningServices: ServiceRecord[];
}) {
  const visibleRunningServices = runningServices.slice(0, 15);
  const visiblePausedServices = pausedServices.slice(0, 4);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
}

function OperationalServiceItem({
  counts,
  service,
}: {
  counts: { incoming: number; outgoing: number };
  service: ServiceRecord;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-600" />
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
    <article className="rounded-lg border border-red-200 bg-white p-4 shadow-sm ring-1 ring-red-50">
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
          <span className="rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-black text-white">
            CRITICAL
          </span>
          <button
            type="button"
            onClick={onDemote}
            className="inline-flex h-7 items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-black text-amber-700 transition hover:bg-amber-100"
          >
            주의로 하향
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
        <span className="text-purple-600">ID INC-2026-{String(312 + index).padStart(4, "0")}</span>
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

      <div className="mt-3 rounded-lg border border-dashed border-red-300 bg-red-50 px-3 py-2 text-xs font-black text-red-700">
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

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Link
          to={`/services/${service.serviceId}`}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
        >
          서비스 상세보기
          <ArrowRight size={14} />
        </Link>
        <Link
          to={incident ? `/incidents/${incident.incidentId}` : "/incidents"}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-black text-white shadow-sm transition hover:bg-red-600"
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
          ? "border-red-500 bg-red-500 text-white"
          : "border-red-200 bg-red-50 text-red-600"
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
      ? "bg-red-500"
      : color === "blue"
        ? "bg-blue-500"
      : color === "amber"
        ? "bg-amber-500"
        : color === "emerald"
          ? "bg-emerald-500"
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
          className="mt-2 inline-flex h-8 items-center rounded-md border border-red-200 bg-white px-3 text-xs font-black text-red-600 transition hover:bg-red-50"
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
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
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
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "INCIDENT" || status === "INACTIVE"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${className}`}
    >
      {codeLabels.serviceStatus[status]}
    </span>
  );
}

function BellIcon() {
  return <ShieldAlert size={16} className="text-amber-500" />;
}
