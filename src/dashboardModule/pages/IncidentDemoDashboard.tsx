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
  Maximize2,
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
import { useNavigate } from "react-router-dom";

const categories = [
  { key: "all", label: "전체 서비스", value: 48, icon: <Server size={26} />, tone: "slate" },
  { key: "platform", label: "공통 플랫폼", value: 12, icon: <Network size={28} />, tone: "blue" },
  { key: "core", label: "기간계/업무계", value: 18, icon: <Building2 size={28} />, tone: "teal" },
  { key: "channel", label: "채널계", value: 10, icon: <Monitor size={27} />, tone: "green" },
  { key: "external", label: "대외채널", value: 8, icon: <Globe2 size={27} />, tone: "blue" },
];

const managementRows = [
  ["담당조직 미등록", "3건", "owner"],
  ["담당그룹 미등록", "2건", "group"],
  ["영향도 미연결", "5건", "relation"],
  ["서비스 설명 미등록", "4건", "document"],
  ["미완료 인시던트", "6건", "incident"],
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

function isCoreService(service: ServiceRecord) {
  const rootCategory = service.categoryPath[0] ?? "";
  return rootCategory.includes("기간계");
}

function matchesDashboardCategory(service: ServiceRecord, categoryKey: string) {
  const rootCategory = service.categoryPath[0] ?? "";
  const categoryLabel = service.categoryPath.join(" ");

  if (categoryKey === "all") {
    return true;
  }

  if (categoryKey === "platform") {
    return /공통|플랫폼|인프라/.test(categoryLabel);
  }

  if (categoryKey === "core") {
    return /기간계|업무계/.test(categoryLabel);
  }

  if (categoryKey === "channel") {
    return /채널/.test(categoryLabel);
  }

  if (categoryKey === "external") {
    return /대외|외부/.test(rootCategory) || /대외|외부/.test(categoryLabel);
  }

  return true;
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
  const stableDataRef = useRef(portalData);
  useEffect(() => {
    if (portalData.services.length > 0) {
      stableDataRef.current = portalData;
    }
  }, [portalData]);
  const dashboardData =
    stableDataRef.current.services.length > 0 ? stableDataRef.current : portalData;
  const activeIncident = activeIncidentId
    ? portalData.incidents.find(
        (incident) =>
          incident.incidentId === activeIncidentId &&
          incident.incidentStatusCode !== "RESOLVED"
      )
    : undefined;
  const { relations, services } = dashboardData;
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
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("core");
  const categoryServices = useMemo(() => {
    const matched = services.filter((service) =>
      matchesDashboardCategory(service, selectedCategoryKey)
    );
    return matched.length > 0 ? matched : services;
  }, [selectedCategoryKey, services]);
  const coreServices = useMemo(() => {
    const matched = categoryServices.filter(isCoreService);
    return selectedCategoryKey === "core" && matched.length > 0
      ? matched
      : categoryServices;
  }, [categoryServices, selectedCategoryKey]);
  const defaultSelectedServiceId = useMemo(
    () =>
      [...coreServices]
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
    [coreServices, relationCountByServiceId]
  );
  const [selectedServiceId, setSelectedServiceId] = useState<number | undefined>(
    defaultSelectedServiceId
  );

  useEffect(() => {
    setSelectedServiceId((current) => {
      if (current && coreServices.some((service) => service.serviceId === current)) {
        return current;
      }

      return defaultSelectedServiceId;
    });
  }, [coreServices, defaultSelectedServiceId]);

  const handleSelectService = (serviceId: number) => {
    setSelectedServiceId(serviceId);
  };
  const selectedService =
    services.find((service) => service.serviceId === selectedServiceId) ??
    coreServices.find((service) => service.serviceId === defaultSelectedServiceId) ??
    services[0];

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
    <section className="flex min-h-[calc(100vh-116px)] min-w-0 flex-1 flex-col">
      <MetricStrip
        selectedCategoryKey={selectedCategoryKey}
        onSelectCategory={setSelectedCategoryKey}
      />
      <div className="mt-3 grid min-h-[460px] min-w-0 flex-[1.55] grid-cols-[minmax(0,1fr)_minmax(300px,400px)] gap-3">
        <RelationMap
          coreServiceIds={coreServices.map((service) => service.serviceId)}
          selectedServiceId={selectedServiceId}
          onSelectService={handleSelectService}
        />
        <ServiceInfoPanel
          onCreateIncident={() => {
            if (!selectedService) {
              return;
            }

            const maxIncidentSeq = portalData.incidents.reduce((maxSeq, incident) => {
              const [, seqText] = incident.externalIncidentCode?.match(/^INC-\d{4}-(\d+)$/) ?? [];
              const seq = Number(seqText);
              return Number.isFinite(seq) ? Math.max(maxSeq, seq) : maxSeq;
            }, 142);

            portalData.createIncident({
              serviceId: selectedService.serviceId,
              severityCode: "CRITICAL",
              externalIncidentCode: `INC-2026-${String(maxIncidentSeq + 1).padStart(4, "0")}`,
              targetCode: selectedService.serviceCode,
              targetLabel: `SERVICE · ${selectedService.serviceCode}`,
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

function MetricStrip({
  onSelectCategory,
  selectedCategoryKey,
}: {
  onSelectCategory: (categoryKey: string) => void;
  selectedCategoryKey: string;
}) {
  return (
    <div className="mt-1 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
      {categories.map((item) => (
        <button
          key={item.label}
          className={`h-[74px] min-w-0 rounded-lg border bg-white px-5 py-3 text-left shadow-[0_1px_3px_rgba(15,23,42,0.08)] ${
            selectedCategoryKey === item.key
              ? "border-[#126cf0] ring-2 ring-[#126cf0]/15"
              : "border-slate-200"
          }`}
          type="button"
          onClick={() => onSelectCategory(item.key)}
        >
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
        </button>
      ))}
    </div>
  );
}

function RelationMap({
  coreServiceIds,
  onSelectService,
  selectedServiceId,
}: {
  coreServiceIds: number[];
  onSelectService: (serviceId: number) => void;
  selectedServiceId?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const coreServiceIdSet = useMemo(() => new Set(coreServiceIds), [coreServiceIds]);
  const serviceFilter = coreServiceIdSet.size
    ? (service: ServiceRecord) => coreServiceIdSet.has(service.serviceId)
    : undefined;

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
            initialRelationDepth={2}
            initialServiceId={selectedServiceId}
            onSelectService={onSelectService}
            serviceFilter={serviceFilter}
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
            hideTopControl
            highlightServiceId={selectedServiceId}
            initialFitView
            initialRelationDepth={2}
            initialServiceId={selectedServiceId}
            onSelectService={onSelectService}
            serviceFilter={serviceFilter}
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
      onMouseDown={onClose}
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
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
        <NormalInfo relationCount={relationCount} service={service} />
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
          service={service}
          onClose={() => setIsDetailOpen(false)}
        />
      ) : null}
    </>
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

function ServiceDetailModal({
  dark = false,
  onClose,
  relationCount,
  service,
}: {
  dark?: boolean;
  onClose: () => void;
  relationCount: number;
  service?: ServiceRecord;
}) {
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
        ["연관 서비스 수", `${relationCount}개`],
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
      onMouseDown={onClose}
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
  const [isMapExpanded, setIsMapExpanded] = useState(false);
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

      <div className="mt-3 grid min-h-[500px] min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(280px,320px)] gap-3">
        <section className="min-h-0 overflow-hidden rounded-lg border border-[#1f3549] bg-[#081b2d]">
          <div className="flex h-10 items-center justify-between border-b border-[#1f3549] px-4">
            <div className="text-base font-black text-white">서비스 영향도 맵</div>
            <div className="flex items-center gap-2">
              <div className="text-xs font-black text-slate-400">기준 노드 2뎁스 영향</div>
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
              initialRelationDepth={2}
              initialServiceId={rootService?.serviceId}
            />
          </div>
        </section>
        {isMapExpanded ? (
          <RelationFlowModal dark title="서비스 영향도 맵" onClose={() => setIsMapExpanded(false)}>
            <ServiceRelationFlow
            embedded
            embeddedHeightClassName="h-full"
            frameless
            hideDepthToggle
            hideTopControl
            incidentMode
            initialRelationDepth={2}
            initialServiceId={rootService?.serviceId}
            />
          </RelationFlowModal>
        ) : null}
        <IncidentSelectedPanel incident={incident} rootService={rootService} impactedCount={impactedCount} />
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
            <span>Connection Pool 고갈</span><b className="text-emerald-400">92%</b>
            <span>DB Timeout 증가</span><b className="text-emerald-400">85%</b>
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

function BottomPanels() {
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
      <Panel
        actionLabel="더보기 〉"
        onAction={() => navigate("/admin-deployments")}
        title="최근 배포"
      >
        {deployRows.map(([service, time, status]) => (
          <TinyRow key={service} icon={status === "up" ? "↑" : "●"} label={service} value={time} tone={status === "up" ? "success" : "muted"} />
        ))}
      </Panel>
      <Panel title="최근 서비스 변경">
        {changeRows.map(([service, change, time]) => (
          <div key={service} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,0.86fr)_minmax(44px,0.52fr)] items-center gap-2 py-1 text-[13px] leading-5 text-slate-900">
            <span className="min-w-0 break-words">{service}</span>
            <span className="min-w-0 break-words text-slate-700">{change}</span>
            <span className="min-w-0 break-words text-right text-slate-500">{time}</span>
          </div>
        ))}
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
        {incidentRows.map(([service, incident, status, impact, end, tone]) => (
          <div key={incident} className="grid min-w-0 grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(58px,0.72fr)_minmax(50px,0.7fr)_minmax(42px,0.55fr)] items-center gap-2 py-1 text-[13px] leading-5 text-slate-900">
            <span className="min-w-0 break-words">{service}</span>
            <span className="min-w-0 break-words text-slate-700">{incident}</span>
            <span className="min-w-0"><IncidentStatus tone={tone}>{status}</IncidentStatus></span>
            <span className="min-w-0 break-words text-slate-700">{impact}</span>
            <span className="min-w-0 break-words text-right text-slate-500">{end}</span>
          </div>
        ))}
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
        ? "bg-emerald-50 text-emerald-600"
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
