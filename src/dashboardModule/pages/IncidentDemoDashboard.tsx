import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleHelp,
  Clock3,
  ExternalLink,
  GitBranch,
  Globe2,
  Mail,
  Monitor,
  Network,
  Phone,
  RefreshCw,
  Search,
  Server,
  UserRound,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { ServiceRelationFlow } from "./ServiceRelationFlow";
import { usePortalData } from "../PortalDataStore";
import type { IncidentRecord, ServiceRecord, ServiceRelationRecord } from "../mockData";

const categories = [
  { label: "전체 서비스", value: 48, icon: <Server size={26} />, tone: "slate" },
  { label: "공통 플랫폼", value: 12, icon: <Network size={28} />, tone: "blue" },
  { label: "기간계/업무계", value: 18, icon: <Building2 size={28} />, tone: "teal" },
  { label: "채널계", value: 10, icon: <Monitor size={27} />, tone: "green" },
  { label: "대외채널", value: 8, icon: <Globe2 size={27} />, tone: "blue" },
];

const managementRows = [
  ["담당조직 미등록", "3건"],
  ["담당그룹 미등록", "2건"],
  ["영향도 미연결", "5건"],
  ["서비스 설명 미등록", "4건"],
  ["미완료 인시던트", "6건"],
];

const deployRows = [
  ["Payment-Service", "5분 전", "up"],
  ["Order-Service", "12분 전", "up"],
  ["Customer-Service", "35분 전", "up"],
  ["Loan-Service", "1시간 전", "sync"],
  ["Auth-Service", "2시간 전", "sync"],
];

const changeRows = [
  ["Payment-Service", "담당조직 변경", "20분 전"],
  ["Order-Service", "서비스 설명 수정", "1시간 전"],
  ["Customer-Service", "영향관계 수정", "2시간 전"],
  ["Loan-Service", "담당그룹 변경", "3시간 전"],
  ["Auth-Service", "서비스 분류 변경", "4시간 전"],
];

const incidentRows = [
  ["Payment-Service", "INC-2026-0021", "회고 대기", "7개", "2시간 전", "purple"],
  ["Order-Service", "INC-2026-0020", "완료", "3개", "어제", "green"],
  ["Customer-Service", "INC-2026-0019", "분석 중", "6개", "어제", "sky"],
  ["Loan-Service", "INC-2026-0018", "조치 중", "5개", "3일 전", "orange"],
  ["Auth-Service", "INC-2026-0017", "완료", "2개", "5일 전", "green"],
];

export function IncidentDemoDashboard() {
  return (
    <div className="min-w-0 overflow-x-auto text-slate-950">
      <div className="flex min-h-[720px] w-full">
        <DashboardCase />
      </div>
    </div>
  );
}

function DashboardCase() {
  const portalData = usePortalData();
  const stableDataRef = useRef(portalData);
  const activeIncident = portalData.incidents.find(
    (incident) => incident.incidentStatusCode !== "RESOLVED"
  );
  const { relations, services } = stableDataRef.current;
  const [selectedServiceId, setSelectedServiceId] = useState(
    services[0]?.serviceId ?? 0
  );
  const selectedService =
    services.find((service) => service.serviceId === selectedServiceId) ??
    services[0];
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

  if (activeIncident) {
    return (
      <IncidentCommandDashboard
        incident={activeIncident}
        relations={portalData.relations}
        services={portalData.services}
      />
    );
  }

  return (
    <section className="flex min-h-full min-w-0 flex-1 flex-col">
      <MetricStrip />
      <div className="mt-3 grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(300px,400px)] gap-3">
        <RelationMap onSelectService={setSelectedServiceId} />
        <ServiceInfoPanel
          onCreateIncident={() => {
            if (!selectedService) {
              return;
            }

            portalData.createIncident({
              serviceId: selectedService.serviceId,
              severityCode: "CRITICAL",
              title: `${selectedService.serviceName} 장애 발생`,
              description: "대시보드에서 등록한 서비스 장애입니다.",
              manualRegisteredYn: "Y",
              registeredBy: "admin",
            });
          }}
          relationCount={
            selectedService
              ? relationCountByServiceId.get(selectedService.serviceId) ?? 0
              : 0
          }
          service={selectedService}
          onBeforeCreateIncident={() =>
            window.confirm(`${selectedService?.serviceName ?? "선택 서비스"} 인시던트를 생성하시겠습니까?`)
          }
        />
      </div>
      <BottomPanels />
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

function MetricStrip() {
  return (
    <div className="mt-1 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
      {categories.map((item) => (
        <div key={item.label} className="h-[74px] min-w-0 rounded-lg border border-slate-200 bg-white px-5 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-xs font-black text-slate-500">{item.label}</div>
              <div className={`mt-2 text-3xl font-black ${item.tone === "teal" ? "text-[#00796c]" : "text-slate-950"}`}>
                {item.value}
              </div>
            </div>
            <div className={`shrink-0 ${item.tone === "slate" ? "text-slate-500" : item.tone === "teal" ? "text-[#009fbd]" : item.tone === "green" ? "text-[#10b981]" : "text-[#1473ff]"}`}>
              {item.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RelationMap({
  onSelectService,
}: {
  onSelectService: (serviceId: number) => void;
}) {
  return (
    <section className="relative h-full min-h-[300px] min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex h-[44px] min-w-0 items-center justify-between gap-3 border-b border-slate-100 px-4">
        <div className="flex min-w-0 items-center gap-8">
          <span className="shrink-0 text-sm font-black">서비스 관계도</span>
        </div>
      </div>
      <div className="h-[calc(100%-44px)] min-h-[256px] min-w-0 overflow-hidden">
        <ServiceRelationFlow
          autoCenter={false}
          embedded
          embeddedHeightClassName="h-full"
          frameless
          hideDepthToggle
          hideDetailPanel
          hideTopControl
          initialFitView
          onSelectService={onSelectService}
          showAllServices
        />
      </div>
    </section>
  );
}

function ServiceInfoPanel({
  onBeforeCreateIncident,
  onCreateIncident,
  relationCount,
  service,
}: {
  onBeforeCreateIncident: () => boolean;
  onCreateIncident: () => void;
  relationCount: number;
  service?: ServiceRecord;
}) {
  const serviceName = service?.serviceName ?? "-";

  return (
    <aside className="h-full min-h-[300px] min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <h2 className="truncate text-sm font-black">선택 서비스 정보</h2>
        <StatusBadge />
      </div>
      <div className="flex min-w-0 items-center gap-2 text-base font-black">
        <CheckCircle2 size={17} className="text-[#008f72]" />
        <span className="truncate">{serviceName}</span>
      </div>
      <NormalInfo relationCount={relationCount} service={service} />
      <div className="mt-4 grid min-w-0 grid-cols-2 gap-3">
        <button className="h-[28px] min-w-0 rounded border border-[#126cf0] px-2 text-sm font-black text-[#126cf0]">서비스 상세</button>
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
  );
}

function StatusBadge() {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-full bg-[#e8fbf4] px-3 py-1 text-xs font-black text-[#008f72]">● 정상</span>
  );
}

function NormalInfo({
  relationCount,
  service,
}: {
  relationCount: number;
  service?: ServiceRecord;
}) {
  const category = service?.categoryPath.join(" > ") ?? "-";
  const ownerGroup = service?.createdBy ?? "-";
  const serviceCode = service?.serviceCode ?? "-";
  const serviceType = service?.serviceTypeCode ?? "-";
  const createdAt = service?.createdAt ?? "-";
  const description = service?.description || "-";

  return (
    <dl className="mt-4 grid min-w-0 grid-cols-[110px_minmax(0,1fr)] gap-y-2 text-sm leading-5">
      <dt className="font-bold text-slate-700">서비스 분류</dt>
      <dd className="truncate">{category}</dd>
      <dt className="font-bold text-slate-700">소유 조직</dt>
      <dd className="truncate">{ownerGroup}</dd>
      <dt className="font-bold text-slate-700">담당 그룹</dt>
      <dd className="truncate">{serviceCode}</dd>
      <dt className="font-bold text-slate-700">상위 서비스</dt>
      <dd className="truncate">{serviceType}</dd>
      <dt className="font-bold text-slate-700">하위 서비스</dt>
      <dd className="truncate">-</dd>
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
  relations,
  services,
}: {
  incident: IncidentRecord;
  relations: ServiceRelationRecord[];
  services: ServiceRecord[];
}) {
  const rootService =
    services.find((service) => service.serviceId === incident.serviceId) ??
    services[0];
  const impact = buildIncidentImpactColumns(rootService, services, relations);
  const impactedCount = impact.level1.length + impact.level2.length;
  const incidentTitle = incident.title || `${rootService?.serviceName ?? "서비스"} 장애 발생`;
  const incidentTargetName =
    incident.targetLabel || rootService?.serviceName || incident.targetCode || "대상 미지정";
  const startedAt = useMemo(
    () => incident.startedAt || formatDateTime(new Date()),
    [incident.startedAt]
  );
  const [now, setNow] = useState(() => new Date());
  const startedAtDate = useMemo(() => parseDashboardDate(startedAt), [startedAt]);
  const timelineEvents = [
    [formatTimelineClock(startedAtDate), `${incidentTargetName} 오류 증가 감지`],
    [formatTimelineClock(clampTimelineTime(addSeconds(startedAtDate, 14), now)), `${impact.level1[0]?.serviceName ?? "Order-Service"} 영향 감지`],
    [formatTimelineClock(clampTimelineTime(addSeconds(startedAtDate, 24), now)), `${impact.level2[0]?.serviceName ?? "Contract-Service"} 영향 감지`],
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
              <div className="text-xs font-black text-[#ff4d5a]">서비스 장애 발생</div>
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
        <DarkMetric icon={<AlertTriangle size={23} />} label="장애 서비스" value="1" delta="1" tone="red" />
        <DarkMetric icon={<Users size={23} />} label="영향 서비스" value={String(Math.max(impactedCount, 1))} delta="3" tone="amber" />
        <DarkMetric icon={<BriefcaseBusiness size={23} />} label="영향 업무" value="14" delta="5" tone="amber" />
        <DarkMetric icon={<Globe2 size={23} />} label="영향 채널" value="3" delta="1" tone="purple" />
      </div>

      <div className="mt-3 grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(280px,320px)] gap-3">
        <section className="min-h-0 overflow-hidden rounded-lg border border-[#1f3549] bg-[#081b2d]">
          <div className="flex h-10 items-center justify-between border-b border-[#1f3549] px-4">
            <div className="text-base font-black text-white">서비스 영향도 맵</div>
            <div className="text-xs font-black text-slate-400">기준 노드 2뎁스 영향</div>
          </div>
          <div className="h-[calc(100%-40px)] min-h-[250px] overflow-hidden">
            <ServiceRelationFlow
              embedded
              embeddedHeightClassName="h-full"
              frameless
              hideDepthToggle
              hideDetailPanel
              hideTopControl
              incidentMode
              initialRelationDepth={2}
              initialServiceId={rootService?.serviceId}
            />
          </div>
        </section>
        <IncidentSelectedPanel incident={incident} rootService={rootService} impactedCount={impactedCount} />
      </div>

      <div className="mt-3 grid h-[145px] min-w-0 grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <DarkPanel title="장애 타임라인">
          {timelineEvents.map(([time, text], index) => (
            <div key={`${time}-${text}`} className="flex gap-3 py-1.5 text-xs">
              <span className={`mt-0.5 h-4 w-4 rounded-full ${index === 0 ? "bg-[#ff3344]" : "bg-[#f59e0b]"}`} />
              <span className="w-14 shrink-0 text-slate-300">{time}</span>
              <span className="min-w-0 truncate text-slate-300">{text}</span>
            </div>
          ))}
        </DarkPanel>
        <DarkPanel title="유사 장애 이력 & 권장 조치">
          <div className="grid grid-cols-[1fr_52px_1fr_52px] gap-2 text-xs text-slate-300">
            <span>Connection Pool 고갈</span><b className="text-emerald-400">92%</b>
            <span>DB Timeout 증가</span><b className="text-emerald-400">85%</b>
          </div>
          <div className="mt-4 space-y-2 text-xs text-slate-300">
            {["Payment Failover 상태 확인", "DB Connection Pool 상태 확인", "Order-Service 지연 확인"].map((item, index) => (
              <div key={item} className="flex gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[#1f3549] text-white">{index + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </DarkPanel>
        <DarkPanel title="담당자 영향도">
          {["김민수 (결제운영팀)", "이정훈 (결제시스템팀)", "결제운영팀 6명", "모바일서비스팀 5명"].map((item) => (
            <div key={item} className="flex items-center justify-between border-b border-[#1f3549] py-2 text-xs text-slate-300">
              <span>{item}</span>
              <span className="flex gap-2 text-[#58a6ff]"><Phone size={13} /><Mail size={13} /></span>
            </div>
          ))}
        </DarkPanel>
        <DarkPanel title="기타 정보">
          <div className="space-y-2 text-xs text-slate-300">
            {["운영 가이드", "장애 대응 절차"].map((item) => (
              <div key={item} className="flex items-center justify-between rounded border border-[#1f3549] bg-[#0b2135] px-3 py-2">
                <span>{item}</span>
                <ExternalLink size={13} />
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
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
  rootService: ServiceRecord | undefined,
  services: ServiceRecord[],
  relations: ServiceRelationRecord[]
) {
  const serviceById = new Map(services.map((service) => [service.serviceId, service]));
  const activeRelations = relations.filter(
    (relation) => relation.relationStatusCode === "ACTIVE"
  );
  const level1 = rootService
    ? activeRelations
        .filter((relation) => relation.sourceServiceId === rootService.serviceId)
        .map((relation) => serviceById.get(relation.targetServiceId))
        .filter((service): service is ServiceRecord => Boolean(service))
        .slice(0, 3)
    : [];
  const level1Ids = new Set(level1.map((service) => service.serviceId));
  const level2 = activeRelations
    .filter((relation) => level1Ids.has(relation.sourceServiceId))
    .map((relation) => serviceById.get(relation.targetServiceId))
    .filter((service): service is ServiceRecord => Boolean(service))
    .filter((service, index, list) => list.findIndex((item) => item.serviceId === service.serviceId) === index)
    .slice(0, 3);

  return { level1, level2 };
}

function IncidentSelectedPanel({
  impactedCount,
  incident,
  rootService,
}: {
  impactedCount: number;
  incident: IncidentRecord;
  rootService?: ServiceRecord;
}) {
  const targetLabel = incident.targetLabel || rootService?.serviceName || incident.targetCode || "-";
  const categoryLabel =
    rootService?.categoryPath.join(" > ") ||
    (incident.targetCode ? `관리 화면 대상 · ${incident.targetCode}` : "-");

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
        <button className="h-8 rounded bg-[#126cf0] text-xs font-black text-white" type="button">서비스 상세 <ExternalLink className="inline" size={12} /></button>
        <button className="h-8 rounded border border-[#35506b] bg-[#0b2135] text-xs font-black text-slate-200" type="button">인시던트 상세 <ExternalLink className="inline" size={12} /></button>
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
    <section className="overflow-hidden rounded-lg border border-[#1f3549] bg-[#081b2d] p-3">
      <h3 className="mb-2 text-sm font-black text-white">{title}</h3>
      {children}
    </section>
  );
}

function BottomPanels() {
  return (
    <div className="mt-2 grid min-w-0 grid-cols-[0.9fr_1fr_1.15fr_1.65fr] gap-2">
      <Panel title="관리 필요 서비스">
        {managementRows.map(([label, value], index) => (
          <TinyRow key={label} icon={index === 4 ? <AlertTriangle size={14} /> : <UsersRound size={14} />} label={label} value={value} danger={index === 4} />
        ))}
      </Panel>
      <Panel title="최근 배포">
        {deployRows.map(([service, time, status]) => (
          <TinyRow key={service} icon={status === "up" ? "↑" : "●"} label={service} value={time} accent={status === "up"} />
        ))}
      </Panel>
      <Panel title="최근 서비스 변경">
        {changeRows.map(([service, change, time]) => (
          <div key={service} className="grid min-w-0 grid-cols-[minmax(0,1fr)_110px_68px] gap-2 py-1 text-sm">
            <span className="truncate font-black">{service}</span>
            <span className="truncate">{change}</span>
            <span className="truncate text-right text-slate-700">{time}</span>
          </div>
        ))}
      </Panel>
      <Panel title="최근 인시던트">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_116px_82px_76px_60px] gap-2 pb-1 text-xs font-black text-slate-500">
          <span className="truncate">서비스</span>
          <span className="truncate">인시던트</span>
          <span className="truncate">상태</span>
          <span className="truncate">영향 서비스</span>
          <span className="text-right">종료</span>
        </div>
        {incidentRows.map(([service, incident, status, impact, end, tone]) => (
          <div key={incident} className="grid min-w-0 grid-cols-[minmax(0,1fr)_116px_82px_76px_60px] items-center gap-2 py-1 text-sm">
            <span className="truncate font-black">{service}</span>
            <span className="truncate">{incident}</span>
            <span className="truncate"><IncidentStatus tone={tone}>{status}</IncidentStatus></span>
            <span className="truncate">{impact}</span>
            <span className="truncate text-right">{end}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function Panel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="h-[126px] min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
        <h3 className="truncate text-sm font-black">{title}</h3>
        <button className="shrink-0 whitespace-nowrap text-xs font-bold text-slate-600">더보기 〉</button>
      </div>
      <div className="min-w-0 overflow-hidden">{children}</div>
    </section>
  );
}

function TinyRow({
  accent,
  danger,
  icon,
  label,
  value,
}: {
  accent?: boolean;
  danger?: boolean;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 py-0.5 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`shrink-0 ${danger ? "text-red-500" : accent ? "text-emerald-600" : "text-slate-500"}`}>{icon}</span>
        <span className="truncate font-bold">{label}</span>
      </div>
      <span className="shrink-0 font-black">{value}</span>
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
  return <span className={`rounded-full px-2 py-0.5 text-xs font-black ${className}`}>{children}</span>;
}
