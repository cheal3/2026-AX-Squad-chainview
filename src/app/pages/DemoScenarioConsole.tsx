import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  Database,
  FileCheck2,
  GitBranch,
  ListChecks,
  MonitorCheck,
  Radio,
  Server,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { usePortalData } from "../PortalDataStore";
import { PageHeader } from "../components/PageHeader";
import { TableActionButton } from "../components/TableActionButton";
import {
  codeLabels,
  incidentImpacts,
  type IncidentRecord,
  type ServiceOwnerRecord,
  type ServiceRecord,
} from "../mockData";
import { ServiceRelationFlow } from "./ServiceRelationFlow";

const responseTimeline = [
  {
    time: "14:12",
    title: "장애 감지",
    detail: "Payment-Service 예외율 급증, 결제 승인 실패 발생",
    status: "완료",
    tone: "red",
  },
  {
    time: "14:13",
    title: "인시던트 등록",
    detail: "중앙 장애 이슈 생성 및 CRITICAL 등급 지정",
    status: "완료",
    tone: "red",
  },
  {
    time: "14:14",
    title: "상황 전파",
    detail: "담당 조직과 영향 서비스 담당자에게 알림 발송",
    status: "완료",
    tone: "blue",
  },
  {
    time: "14:22",
    title: "원인 분석",
    detail: "payment-db-01 연결 풀 고갈 및 응답 지연 확인",
    status: "진행",
    tone: "amber",
  },
  {
    time: "14:37",
    title: "복구 조치",
    detail: "DB 세션 정리 및 Payment-Service 순차 재기동 예정",
    status: "대기",
    tone: "slate",
  },
];

const actionChecklist = [
  { label: "장애 이슈 등록", detail: "자동 감지 이벤트 기반 생성", done: true },
  { label: "영향 범위 확인", detail: "상위/하위 서비스 및 DB 연계 확인", done: true },
  { label: "담당자 전파", detail: "Slack, Email, SMS 발송 완료", done: true },
  { label: "복구 조치 실행", detail: "DB 세션 정리 및 서비스 재기동", done: false },
  { label: "완료 처리", detail: "정상화 확인 후 종료", done: false },
];

export function DemoScenarioConsole() {
  const { incidents, owners, relations, servers, services } = usePortalData();
  const activeIncidents = incidents.filter(
    (incident) => incident.incidentStatusCode !== "RESOLVED"
  );
  const [selectedIncidentId, setSelectedIncidentId] = useState(
    activeIncidents[0]?.incidentId ?? incidents[0]?.incidentId ?? 0
  );
  const activeIncident =
    incidents.find((incident) => incident.incidentId === selectedIncidentId) ??
    activeIncidents[0] ??
    incidents[0];
  const incidentService = getIncidentService(activeIncident, services) ?? services[0];
  const [selectedServiceId, setSelectedServiceId] = useState(
    incidentService?.serviceId ?? services[0]?.serviceId ?? 0
  );
  const targetService =
    services.find((service) => service.serviceId === selectedServiceId) ??
    incidentService;
  const targetServer = servers.find(
    (server) => server.serverId === targetService?.serverId
  );
  const ownerRows = useMemo(
    () =>
      targetService
        ? owners.filter((owner) => owner.serviceId === targetService.serviceId)
        : [],
    [owners, targetService]
  );
  const activeRelations = relations.filter(
    (relation) => relation.relationStatusCode === "ACTIVE"
  );
  const criticalServices = services.filter(
    (service) =>
      service.statusCode === "INCIDENT" || service.statusCode === "INACTIVE"
  );
  const warningServices = services.filter(
    (service) =>
      service.statusCode === "IMPACTED" || service.statusCode === "MAINTENANCE"
  );
  const normalServices = services.filter(
    (service) => service.statusCode === "NORMAL"
  );
  const affectedImpacts = incidentImpacts.filter(
    (impact) => impact.incidentId === activeIncident?.incidentId
  );
  const upstreamCount = activeRelations.filter(
    (relation) => relation.targetServiceId === targetService?.serviceId
  ).length;
  const downstreamCount = activeRelations.filter(
    (relation) => relation.sourceServiceId === targetService?.serviceId
  ).length;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader
        description="장애 발생 시 서비스 상태, 영향 관계, 전파 현황, 조치 진행을 한 화면에서 확인합니다."
        icon={<Siren size={22} />}
        title="장애 통합 상황판"
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700">
              <Radio size={16} className="text-blue-500" />
              감지 ON
            </span>
            <TableActionButton icon={<ShieldCheck size={15} />} label="PROD" />
          </div>
        }
      />

      <TopIncidentNotice
        affectedCount={warningServices.length + affectedImpacts.length}
        incident={activeIncident}
        incidents={activeIncidents.length > 0 ? activeIncidents : incidents}
        onIncidentSelect={(incidentId) => {
          setSelectedIncidentId(incidentId);
          const nextIncident = incidents.find(
            (incident) => incident.incidentId === incidentId
          );
          const nextService = getIncidentService(nextIncident, services);
          if (nextService) {
            setSelectedServiceId(nextService.serviceId);
          }
        }}
        selectedIncidentId={activeIncident?.incidentId}
        serviceName={targetService?.serviceName ?? "Payment-Service"}
      />

      <section className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCell icon={<ListChecks size={19} />} label="전체 서비스" value={services.length} detail="등록 서비스" />
        <SummaryCell icon={<MonitorCheck size={19} />} label="정상" value={normalServices.length} detail="정상 운영" tone="blue" />
        <SummaryCell icon={<Siren size={19} />} label="장애" value={criticalServices.length} detail="즉시 대응" tone="red" />
        <SummaryCell icon={<AlertTriangle size={19} />} label="영향" value={warningServices.length + affectedImpacts.length} detail="분석 대상" tone="red" />
        <SummaryCell icon={<Server size={19} />} label="서버" value={servers.length} detail="인벤토리" />
        <SummaryCell icon={<GitBranch size={19} />} label="활성 관계" value={activeRelations.length} detail="연계 정보" />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_520px]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-black text-slate-950">서비스 영향 관계도</h2>
              <p className="mt-1 text-xs font-bold text-slate-400">
                장애 서비스 기준으로 상위/하위 연계와 영향 범위를 확인합니다.
              </p>
            </div>
            <div className="flex gap-2">
              <TableActionButton icon={<GitBranch size={15} />} label="영향 경로" />
              <TableActionButton icon={<FileCheck2 size={15} />} label="분석 저장" />
            </div>
          </div>
          <div className="bg-slate-50 p-3">
            <ServiceRelationFlow
              defaultRelationDepth={2}
              embedded
              hideDepthToggle
              hideTopControl
              initialServiceId={incidentService?.serviceId}
              onServiceSelect={setSelectedServiceId}
            />
          </div>
        </div>

        <aside className="flex flex-col gap-5">
          <SituationPanel
            activeIncident={activeIncident}
            downstreamCount={downstreamCount}
            ownerRows={ownerRows}
            targetServerName={targetServer?.serverName ?? "서버 미지정"}
            targetService={targetService}
            upstreamCount={upstreamCount}
          />
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1fr_0.95fr]">
        <Panel
          icon={<ListChecks size={18} />}
          title="영향 대상 서비스"
          description="현재 장애와 연결된 서비스 현황입니다."
        >
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-black text-slate-400">
                <tr>
                  <th className="px-3 py-2">서비스</th>
                  <th className="px-3 py-2">담당</th>
                  <th className="px-3 py-2">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                {getPriorityServices(services, targetService).map((service) => (
                  <tr key={service.serviceId}>
                    <td className="px-3 py-3">
                      <div className="font-black text-slate-950">{service.serviceName}</div>
                      <div className="text-xs font-bold text-slate-400">{service.serviceCode}</div>
                    </td>
                    <td className="px-3 py-3">{getOwnerName(service, owners)}</td>
                    <td className="px-3 py-3">
                      <ServiceStatusBadge service={service} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          icon={<Clock3 size={18} />}
          title="실시간 대응 타임라인"
          description="감지, 등록, 전파, 분석, 복구 조치가 시간순으로 기록됩니다."
        >
          <div className="space-y-3">
            {responseTimeline.map((log) => (
              <TimelineRow key={log.time} {...log} />
            ))}
          </div>
        </Panel>

        <Panel
          icon={<CheckCircle2 size={18} />}
          title="조치 체크리스트"
          description="장애 종료 전 확인해야 하는 작업 상태입니다."
        >
          <div className="space-y-2">
            {actionChecklist.map((item) => (
              <ChecklistRow key={item.label} {...item} />
            ))}
          </div>
          <button className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 text-sm font-black text-white transition hover:bg-slate-800">
            <FileCheck2 size={16} />
            장애 완료 처리
          </button>
        </Panel>
      </section>

      <style>{`
        @keyframes incidentNoticeShake {
          0%, 100% { transform: translateX(0); }
          12% { transform: translateX(-2px); }
          24% { transform: translateX(2px); }
          36% { transform: translateX(-1px); }
          48% { transform: translateX(1px); }
          60% { transform: translateX(0); }
        }
        .incident-bell-shake {
          display: inline-flex;
          animation: incidentNoticeShake 1.4s ease-in-out infinite;
          transform-origin: 50% 0;
        }
      `}</style>
    </div>
  );
}

function TopIncidentNotice({
  affectedCount,
  incident,
  incidents,
  onIncidentSelect,
  selectedIncidentId,
  serviceName,
}: {
  affectedCount: number;
  incident?: IncidentRecord;
  incidents: IncidentRecord[];
  onIncidentSelect: (incidentId: number) => void;
  selectedIncidentId?: number;
  serviceName: string;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-red-100 bg-white px-4 py-2 shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
          <span className="incident-bell-shake">
            <BellRing size={17} />
          </span>
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-slate-900">
            {serviceName} 장애 감지
            <span className="ml-2 font-black text-red-500">CRITICAL</span>
          </div>
          <div className="mt-0.5 truncate text-xs font-bold text-slate-400">
            {incident?.startedAt ?? "2024-05-20 14:12"} 발생 · 영향 서비스 {affectedCount}개 · 담당자 알림 발송
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-1 lg:flex">
          {incidents.slice(0, 4).map((item) => (
            <button
              key={item.incidentId}
              type="button"
              onClick={() => onIncidentSelect(item.incidentId)}
              className={`h-8 rounded-lg border px-3 text-xs font-black transition ${
                selectedIncidentId === item.incidentId
                  ? "border-red-200 bg-red-50 text-red-500"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"
              }`}
            >
              INC-{String(item.incidentId).padStart(4, "0")}
            </button>
          ))}
        </div>
        <button className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700">
          자세히
        </button>
      </div>
    </div>
  );
}

function SummaryCell({
  detail,
  icon,
  label,
  tone = "slate",
  value,
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  tone?: "slate" | "blue" | "red";
  value: number;
}) {
  const valueClass =
    tone === "red" ? "text-red-500" : tone === "blue" ? "text-blue-500" : "text-slate-950";

  return (
    <div className="bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-400">{icon}</span>
        <span className="text-xs font-black text-slate-300">{detail}</span>
      </div>
      <div className="mt-4 text-sm font-black text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-black ${valueClass}`}>{value}</div>
    </div>
  );
}

function SituationPanel({
  activeIncident,
  downstreamCount,
  ownerRows,
  targetServerName,
  targetService,
  upstreamCount,
}: {
  activeIncident?: IncidentRecord;
  downstreamCount: number;
  ownerRows: ServiceOwnerRecord[];
  targetServerName: string;
  targetService?: ServiceRecord;
  upstreamCount: number;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
            <Server size={14} />
            선택 서비스 상세 보기
          </div>
          <h2 className="mt-3 text-xl font-black text-slate-950">
            {targetService?.serviceName ?? "Payment-Service"}
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            {targetService?.description ||
              activeIncident?.description ||
              "관계도에서 서비스를 클릭하면 이 영역의 상세 정보가 변경됩니다."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
        <InfoTile label="상태" value={activeIncident ? codeLabels.incidentStatus[activeIncident.incidentStatusCode] : "진행 중"} tone="red" />
        <InfoTile label="심각도" value={activeIncident ? codeLabels.severity[activeIncident.severityCode] : "CRITICAL"} tone="red" />
        <InfoTile label="서버" value={targetServerName} />
        <InfoTile label="담당" value={ownerRows[0]?.ownerName ?? "미지정"} />
        <InfoTile label="상위 영향" value={`${upstreamCount}개`} />
        <InfoTile label="하위 영향" value={`${downstreamCount}개`} />
        <InfoTile label="서비스 코드" value={targetService?.serviceCode ?? "-"} />
        <InfoTile label="인스턴스" value={`${targetService?.instanceCount ?? 0}개`} />
        <InfoTile label="서비스 유형" value={targetService ? codeLabels.serviceType[targetService.serviceTypeCode] : "-"} />
        <InfoTile label="중요도" value={targetService?.importanceCode ? codeLabels.importance[targetService.importanceCode] : "-"} />
        <InfoTile label="배포 상태" value={targetService?.deploymentStatusCode ? codeLabels.deploymentStatus[targetService.deploymentStatusCode] : "-"} />
        <InfoTile label="포트" value={targetService?.portInfo || "-"} />
        <InfoTile label="엔드포인트" value={targetService?.endpointUrl || "-"} />
        <InfoTile label="배포 경로" value={targetService?.deployPath || "-"} />
      </div>
    </section>
  );
}

function Panel({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-400">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function InfoTile({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "red";
  value: string;
}) {
  return (
    <div className="bg-white px-3 py-3">
      <div className="text-xs font-black text-slate-400">{label}</div>
      <div className={`mt-1 truncate text-sm font-black ${tone === "red" ? "text-red-500" : "text-slate-800"}`}>
        {value}
      </div>
    </div>
  );
}

function TimelineRow({
  detail,
  status,
  time,
  title,
  tone,
}: {
  detail: string;
  status: string;
  time: string;
  title: string;
  tone: string;
}) {
  const dotClass =
    tone === "red"
      ? "bg-red-500"
      : tone === "amber"
        ? "bg-amber-400"
        : tone === "blue"
          ? "bg-blue-500"
          : "bg-slate-300";

  return (
    <div className="grid grid-cols-[48px_12px_minmax(0,1fr)_52px] gap-3">
      <time className="pt-0.5 text-xs font-black text-slate-400">{time}</time>
      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${dotClass}`} />
      <div>
        <div className="text-sm font-black text-slate-950">{title}</div>
        <div className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">{detail}</div>
      </div>
      <span className="h-fit rounded-full bg-slate-100 px-2 py-1 text-center text-xs font-black text-slate-500">
        {status}
      </span>
    </div>
  );
}

function ChecklistRow({
  detail,
  done,
  label,
}: {
  detail: string;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white px-3 py-3">
      <CheckCircle2
        size={18}
        className={`mt-0.5 shrink-0 ${done ? "text-blue-500" : "text-slate-300"}`}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black text-slate-900">{label}</div>
        <div className="mt-0.5 text-xs font-semibold text-slate-500">{detail}</div>
      </div>
    </div>
  );
}

function ServiceStatusBadge({ service }: { service: ServiceRecord }) {
  const className =
    service.statusCode === "NORMAL"
      ? "bg-blue-50 text-blue-500"
      : service.statusCode === "INCIDENT" || service.statusCode === "INACTIVE"
        ? "bg-red-50 text-red-500"
        : "bg-amber-50 text-amber-600";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${className}`}>
      {codeLabels.serviceStatus[service.statusCode]}
    </span>
  );
}

function CauseCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "red" | "amber";
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className={`text-xs font-black ${tone === "red" ? "text-red-500" : "text-amber-500"}`}>원인 후보</div>
      <div className="mt-2 text-sm font-black text-slate-950">{label}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{value}</div>
    </div>
  );
}

function CloseStep({
  detail,
  done = false,
  label,
}: {
  detail: string;
  done?: boolean;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 size={18} className={done ? "text-blue-500" : "text-slate-300"} />
        <span className="text-sm font-black text-slate-950">{label}</span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function getIncidentService(
  incident: IncidentRecord | undefined,
  services: ServiceRecord[]
) {
  if (!incident?.serviceId) {
    return undefined;
  }
  return services.find((service) => service.serviceId === incident.serviceId);
}

function getPriorityServices(
  services: ServiceRecord[],
  targetService?: ServiceRecord
) {
  const targetId = targetService?.serviceId;
  return [...services]
    .sort((first, second) => {
      if (first.serviceId === targetId) {
        return -1;
      }
      if (second.serviceId === targetId) {
        return 1;
      }
      return getServicePriority(second) - getServicePriority(first);
    })
    .slice(0, 6);
}

function getServicePriority(service: ServiceRecord) {
  if (service.statusCode === "INCIDENT" || service.statusCode === "INACTIVE") {
    return 100;
  }
  if (service.statusCode === "IMPACTED" || service.statusCode === "MAINTENANCE") {
    return 50;
  }
  return 1;
}

function getOwnerName(
  service: ServiceRecord,
  owners: Array<{ serviceId: number; ownerName: string }>
) {
  return owners.find((owner) => owner.serviceId === service.serviceId)?.ownerName ?? "미지정";
}
