import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Clock,
  Eye,
  FileText,
  Route,
  ShieldAlert,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { usePortalData } from "../PortalDataStore";
import { PageHeader } from "../components/PageHeader";
import {
  codeLabels,
  type IncidentImpactRecord,
  type IncidentRecord,
  type IncidentStatusCode,
  type ServiceOwnerRecord,
  type ServiceRecord,
  type SeverityCode,
} from "../mockData";

type IncidentDetailTab = "overview" | "impact" | "owners" | "history";

const incidentTabLabels: Record<IncidentDetailTab, string> = {
  overview: "개요",
  impact: "영향범위",
  owners: "담당자정보",
  history: "인시던트이력",
};

export function IncidentListPage() {
  const { createIncident, incidentImpacts, incidents, relations, services } =
    usePortalData();
  const [manualServiceId, setManualServiceId] = useState(
    services[0]?.serviceId ?? 0
  );
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const openIncidents = incidents.filter(
    (incident) => incident.incidentStatusCode === "OPEN"
  );
  const monitoringIncidents = incidents.filter(
    (incident) => incident.incidentStatusCode === "MONITORING"
  );
  const impactedServiceIds = new Set(
    incidentImpacts.map((impact) => impact.impactedServiceId)
  );
  const mandatoryRelations = relations.filter(
    (relation) => relation.mandatoryYn === "Y"
  );

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader
        description="등록된 인시던트를 목록에서 확인하고 상세 영향 분석으로 이동합니다."
        icon={<AlertCircle size={22} />}
        title="인시던트 관리"
      />

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <IncidentMetric
          icon={<AlertCircle size={21} />}
          label="진행 중"
          tone="red"
          value={openIncidents.length}
        />
        <IncidentMetric
          icon={<Clock size={21} />}
          label="모니터링"
          tone="blue"
          value={monitoringIncidents.length}
        />
        <IncidentMetric
          icon={<TrendingUp size={21} />}
          label="영향 서비스"
          tone="amber"
          value={impactedServiceIds.size}
        />
        <IncidentMetric
          icon={<Route size={21} />}
          label="필수 관계"
          tone="slate"
          value={mandatoryRelations.length}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-950">
              수동 인시던트 등록
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-400">
              등록 즉시 인시던트 기록, 영향도, 알림 전파 이력이 생성됩니다.
            </p>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1.4fr)_120px]">
          <select
            value={manualServiceId}
            onChange={(event) => setManualServiceId(Number(event.target.value))}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
          >
            {services.slice(0, 24).map((service) => (
              <option key={service.serviceId} value={service.serviceId}>
                {service.serviceName}
              </option>
            ))}
          </select>
          <input
            value={manualTitle}
            onChange={(event) => setManualTitle(event.target.value)}
            placeholder="인시던트 제목"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
          />
          <input
            value={manualDescription}
            onChange={(event) => setManualDescription(event.target.value)}
            placeholder="감지 내용 또는 현상"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
          />
          <button
            type="button"
            onClick={() => {
              const service = services.find(
                (item) => item.serviceId === manualServiceId
              );
              createIncident({
                serviceId: manualServiceId,
                severityCode: "MAJOR",
                title:
                  manualTitle.trim() ||
                  `${service?.serviceName ?? "서비스"} 수동 인시던트`,
                description:
                  manualDescription.trim() ||
                  "운영자가 수동으로 등록한 인시던트입니다.",
                manualRegisteredYn: "Y",
                registeredBy: "admin",
              });
              setManualTitle("");
              setManualDescription("");
            }}
            className="h-10 rounded-lg bg-[#3182f6] px-4 text-sm font-black text-white transition hover:bg-[#1b64da]"
          >
            등록
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-black text-slate-950">
              인시던트 목록
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-400">
              장애 상세를 누르면 진행 정보, 영향 범위, 담당자, 이력을 확인합니다.
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
            총 {incidents.length}건
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed">
            <colgroup>
              <col className="w-[92px]" />
              <col />
              <col className="w-[220px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[160px]" />
              <col className="w-[150px]" />
            </colgroup>
            <thead className="bg-slate-50 text-left text-xs font-black text-slate-400">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">인시던트</th>
                <th className="px-5 py-3">대상</th>
                <th className="px-5 py-3 text-center">심각도</th>
                <th className="px-5 py-3 text-center">상태</th>
                <th className="px-5 py-3">발생 시각</th>
                <th className="px-5 py-3 text-center">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incidents.map((incident) => {
                const targetService = getIncidentService(incident, services);

                return (
                  <tr key={incident.incidentId} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-black text-slate-900">
                      #{incident.incidentId}
                    </td>
                    <td className="px-5 py-4">
                      <div className="truncate text-sm font-black text-slate-900">
                        {incident.title}
                      </div>
                      <div className="mt-1 truncate text-xs font-bold text-slate-400">
                        {incident.description}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700">
                      <div className="truncate">{targetService?.serviceName ?? "-"}</div>
                      <div className="mt-1 truncate text-xs font-black text-slate-400">
                        {targetService?.serviceCode ??
                          codeLabels.incidentType[incident.incidentTypeCode]}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <SeverityBadge severity={incident.severityCode} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <IncidentStatusBadge status={incident.incidentStatusCode} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-500">
                      {incident.startedAt}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Link
                        to={`/dashboard?incidentId=${incident.incidentId}`}
                        className="inline-flex h-8 min-w-[72px] shrink-0 items-center justify-center gap-1 whitespace-nowrap break-keep rounded-md border border-slate-200 bg-slate-100 px-3 text-xs font-black leading-none text-slate-700 transition hover:bg-slate-200"
                      >
                        <Eye size={14} />
                        상세
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function IncidentImpact() {
  const { incidentId } = useParams();
  const {
    addIncidentEvent,
    incidentEvents,
    incidentImpacts,
    incidents,
    owners,
    relations,
    services,
    updateIncidentStatus,
  } = usePortalData();
  const [activeTab, setActiveTab] = useState<IncidentDetailTab>("overview");
  const [actionNote, setActionNote] = useState("");
  const incident =
    incidents.find((item) => item.incidentId === Number(incidentId)) ??
    incidents[0];
  const targetService = getIncidentService(incident, services);
  const impacts = incidentImpacts.filter(
    (impact) => impact.incidentId === incident?.incidentId
  );
  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.serviceId, service])),
    [services]
  );
  const ownerByServiceId = useMemo(() => {
    const next = new Map<number, ServiceOwnerRecord[]>();
    owners.forEach((owner) => {
      const items = next.get(owner.serviceId) ?? [];
      items.push(owner);
      next.set(owner.serviceId, items);
    });
    return next;
  }, [owners]);
  const mandatoryRelations = relations.filter(
    (relation) => relation.mandatoryYn === "Y"
  );
  const impactServices = impacts
    .map((impact) => ({
      impact,
      service: serviceById.get(impact.impactedServiceId),
    }))
    .filter(
      (item): item is { impact: IncidentImpactRecord; service: ServiceRecord } =>
        Boolean(item.service)
    );

  if (!incident) {
    return (
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
        <PageHeader
          description="요청한 인시던트를 찾을 수 없습니다."
          icon={<AlertCircle size={22} />}
          title="인시던트 상세"
          actions={<BackToIncidentList />}
        />
      </div>
    );
  }

  const elapsed = getIncidentElapsedLabel(incident);
  const historyRows = getIncidentHistoryRows({
    events: incidentEvents.filter((event) => event.incidentId === incident.incidentId),
    incident,
    ownerNames:
      targetService && ownerByServiceId.get(targetService.serviceId)
        ? ownerByServiceId
            .get(targetService.serviceId)!
            .map((owner) => owner.ownerName)
        : [],
    service: targetService,
  });

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader
        description="진행 중 장애의 경과, 영향 범위, 담당자, 처리 이력을 확인합니다."
        icon={<AlertCircle size={22} />}
        title="인시던트 상세"
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#ffe5e8] bg-[#fff5f6] px-4 text-sm font-black text-[#f04452] shadow-sm">
              <Clock size={16} />
              경과 {elapsed}
            </div>
            {incident.incidentStatusCode !== "RESOLVED" ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    updateIncidentStatus(
                      incident.incidentId,
                      "MONITORING",
                      "장애 조치 후 모니터링 상태로 전환했습니다."
                    )
                  }
                  className="inline-flex h-10 items-center rounded-lg border border-[#d9e8ff] bg-[#f2f7ff] px-4 text-sm font-black text-[#1f6feb]"
                >
                  모니터링 전환
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateIncidentStatus(
                      incident.incidentId,
                      "RESOLVED",
                      "복구 확인 후 인시던트를 완료 처리했습니다."
                    )
                  }
                  className="inline-flex h-10 items-center rounded-lg bg-[#20c997] px-4 text-sm font-black text-white"
                >
                  완료 처리
                </button>
              </>
            ) : null}
            <BackToIncidentList />
          </div>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-4 gap-1">
          {(Object.keys(incidentTabLabels) as IncidentDetailTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`h-11 rounded-lg text-sm font-black transition ${
                activeTab === tab
                  ? "bg-[#fff5f6] text-[#f04452] shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {incidentTabLabels[tab]}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <ProgressIncidentCard
            elapsed={elapsed}
            incident={incident}
            targetService={targetService}
          />
          <section className="grid grid-cols-2 gap-3">
            <IncidentMetric
              icon={<AlertCircle size={21} />}
              label="상태"
              tone="red"
              value={codeLabels.incidentStatus[incident.incidentStatusCode]}
            />
            <IncidentMetric
              icon={<TrendingUp size={21} />}
              label="영향 서비스"
              tone="amber"
              value={impactServices.length}
            />
            <IncidentMetric
              icon={<Route size={21} />}
              label="필수 관계"
              tone="slate"
              value={mandatoryRelations.length}
            />
            <IncidentMetric
              icon={<Clock size={21} />}
              label="발생 시각"
              tone="blue"
              value={incident.startedAt}
              compact
            />
          </section>
        </div>
      )}

      {activeTab === "impact" && (
        <ImpactScopeSection
          impactServices={impactServices}
          targetService={targetService}
        />
      )}

      {activeTab === "owners" && (
        <OwnerInfoSection
          impactServices={impactServices}
          ownerByServiceId={ownerByServiceId}
          targetService={targetService}
        />
      )}

      {activeTab === "history" && (
        <IncidentHistorySection
          actionNote={actionNote}
          onActionNoteChange={setActionNote}
          onAddAction={() => {
            addIncidentEvent(incident.incidentId, actionNote);
            setActionNote("");
          }}
          rows={historyRows}
        />
      )}
    </div>
  );
}

function ProgressIncidentCard({
  elapsed,
  incident,
  targetService,
}: {
  elapsed: string;
  incident: IncidentRecord;
  targetService?: ServiceRecord;
}) {
  return (
    <section className="rounded-xl border border-[#ffd1d6] bg-white p-5 shadow-sm ring-1 ring-[#fff5f6]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black text-slate-400">
              #{incident.incidentId}
            </span>
            <SeverityBadge severity={incident.severityCode} />
            <IncidentStatusBadge status={incident.incidentStatusCode} />
          </div>
          <h2 className="mt-3 text-2xl font-black text-slate-950">
            {incident.title}
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {incident.description}
          </p>
        </div>
        <div className="rounded-xl border border-[#ffe5e8] bg-[#fff5f6] px-4 py-3 text-sm font-bold text-[#f04452] lg:min-w-[260px]">
          <div className="flex items-center gap-2 text-base font-black">
            <Clock size={18} />
            경과 {elapsed}
          </div>
          <div className="mt-2 text-[#f04452]">
            대상: {targetService?.serviceName ?? "-"}
          </div>
          <div className="mt-1 text-[#f04452]">
            유형: {codeLabels.incidentType[incident.incidentTypeCode]}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoTile label="대상 서비스" value={targetService?.serviceName ?? "-"} />
        <InfoTile label="서비스 코드" value={targetService?.serviceCode ?? "-"} />
        <InfoTile label="등록자" value={incident.registeredBy} />
        <InfoTile label="수동 등록" value={incident.manualRegisteredYn} />
      </div>
    </section>
  );
}

function ImpactScopeSection({
  impactServices,
  targetService,
}: {
  impactServices: Array<{
    impact: IncidentImpactRecord;
    service: ServiceRecord;
  }>;
  targetService?: ServiceRecord;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-950">영향범위</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            장애 중심 서비스와 영향을 받는 서비스의 업무 설명을 함께 확인합니다.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
          영향 {impactServices.length}개
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
        <div className="rounded-xl border border-[#ffd1d6] bg-[#fff5f6] p-4">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff4d5a] text-white">
            <ShieldAlert size={21} />
          </div>
          <div className="text-xs font-black text-[#ff4d5a]">장애 중심</div>
          <div className="mt-1 text-lg font-black text-slate-950">
            {targetService?.serviceName ?? "-"}
          </div>
          <p className="mt-2 text-sm font-semibold text-[#f04452]">
            {targetService?.description || "등록된 서비스 설명이 없습니다."}
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {impactServices.length ? (
            impactServices.map(({ impact, service }) => (
              <ImpactServiceCard
                key={impact.impactId}
                impact={impact}
                service={service}
                targetService={targetService}
              />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-400 lg:col-span-2">
              계산된 영향 서비스가 없습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ImpactServiceCard({
  impact,
  service,
  targetService,
}: {
  impact: IncidentImpactRecord;
  service: ServiceRecord;
  targetService?: ServiceRecord;
}) {
  const descriptions = buildImpactDescriptions(service, impact, targetService);

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-black text-slate-950">
            {service.serviceName}
          </div>
          <div className="mt-1 truncate text-xs font-black text-slate-400">
            {service.serviceCode} · {impact.impactLevel}차 영향
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black ${
            impact.directYn === "Y"
              ? "border-[#ffd1d6] bg-[#fff5f6] text-[#f04452]"
              : "border-[#c7dbff] bg-[#f2f7ff] text-[#1f6feb]"
          }`}
        >
          {impact.directYn === "Y" ? "직접 영향" : "간접 영향"}
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-white bg-white p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-black text-slate-500">
          <FileText size={14} />
          등록 설명 기반 업무 영향
        </div>
        <div className="space-y-1.5">
          {descriptions.map((item) => (
            <div
              key={item}
              className="flex items-start gap-2 text-sm font-bold text-slate-700"
            >
              <ArrowRight size={14} className="mt-0.5 shrink-0 text-[#d46b73]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">
        경로: {impact.impactPathText}
      </div>
    </article>
  );
}

function OwnerInfoSection({
  impactServices,
  ownerByServiceId,
  targetService,
}: {
  impactServices: Array<{
    impact: IncidentImpactRecord;
    service: ServiceRecord;
  }>;
  ownerByServiceId: Map<number, ServiceOwnerRecord[]>;
  targetService?: ServiceRecord;
}) {
  const services = [
    ...(targetService ? [{ service: targetService, role: "장애 중심" }] : []),
    ...impactServices.map(({ service }) => ({ service, role: "영향 서비스" })),
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <UserRound size={19} className="text-slate-500" />
        <h3 className="text-lg font-black text-slate-950">담당자정보</h3>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {services.map(({ role, service }) => {
          const serviceOwners = ownerByServiceId.get(service.serviceId) ?? [];
          return (
            <article
              key={`${role}-${service.serviceId}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="text-xs font-black text-slate-400">{role}</div>
              <div className="mt-1 text-base font-black text-slate-950">
                {service.serviceName}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {serviceOwners.length ? (
                  serviceOwners.map((owner) => (
                    <span
                      key={owner.serviceOwnerId}
                      className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600"
                    >
                      {owner.ownerName} ·{" "}
                      {codeLabels.responsibilityType[owner.responsibilityCode]}
                    </span>
                  ))
                ) : (
                  <span className="text-sm font-bold text-slate-400">
                    등록된 담당자 정보가 없습니다.
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function IncidentHistorySection({
  actionNote,
  onActionNoteChange,
  onAddAction,
  rows,
}: {
  actionNote: string;
  onActionNoteChange: (value: string) => void;
  onAddAction: () => void;
  rows: IncidentHistoryRow[];
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Bell size={18} className="text-[#f08c00]" />
        <h3 className="text-lg font-black text-slate-950">인시던트이력</h3>
      </div>
      <div className="mb-4 grid gap-2 lg:grid-cols-[minmax(0,1fr)_120px]">
        <input
          value={actionNote}
          onChange={(event) => onActionNoteChange(event.target.value)}
          placeholder="타임라인에 남길 진행 내역 또는 조치 내용을 입력"
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[#86b7ff] focus:ring-4 focus:ring-[#edf5ff]"
        />
        <button
          type="button"
          onClick={onAddAction}
          className="h-10 rounded-lg bg-[#3182f6] px-4 text-sm font-black text-white transition hover:bg-[#1b64da]"
        >
          기록 추가
        </button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        {rows.map((row, index) => (
          <TimelineRow
            key={`${row.time}-${index}`}
            color={row.color}
            time={row.time}
          >
            {row.label}
          </TimelineRow>
        ))}
      </div>
    </section>
  );
}

function IncidentMetric({
  compact = false,
  icon,
  label,
  tone,
  value,
}: {
  compact?: boolean;
  icon: ReactNode;
  label: string;
  tone: "red" | "blue" | "amber" | "slate";
  value: number | string;
}) {
  const toneClassName =
    tone === "red"
      ? "bg-[#fff5f6] text-[#f04452] border-[#ffe5e8]"
      : tone === "blue"
        ? "bg-[#f2f7ff] text-[#1f6feb] border-[#d9e8ff]"
        : tone === "amber"
          ? "bg-[#fff8df] text-[#f08c00] border-[#ffe6a3]"
          : "bg-slate-50 text-slate-600 border-slate-100";

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneClassName}`}>
      <div className="flex items-center gap-2 text-sm font-black opacity-80">
        {icon}
        {label}
      </div>
      <div
        className={`mt-2 font-black leading-tight ${
          compact ? "text-lg" : "text-3xl"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function BackToIncidentList() {
  return (
    <Link
      to="/incidents"
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50"
    >
      <ArrowLeft size={16} />
      목록
    </Link>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-black text-slate-400">{label}</div>
      <div className="mt-1 truncate text-sm font-black text-slate-900">
        {value}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: SeverityCode }) {
  const className =
    severity === "CRITICAL"
      ? "border-[#ffd1d6] bg-[#fff5f6] text-[#f04452]"
      : severity === "MAJOR"
        ? "border-[#ffd7a3] bg-[#fff3e0] text-[#ff8a00]"
      : severity === "MINOR"
        ? "border-[#ffd978] bg-[#fff8df] text-[#e67700]"
        : "border-[#f7c8d6] bg-[#fff0f5] text-[#e84870]";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-black ${className}`}
    >
      {codeLabels.severity[severity]}
    </span>
  );
}

function IncidentStatusBadge({ status }: { status: IncidentStatusCode }) {
  const className =
    status === "OPEN"
      ? "border-[#ffd1d6] bg-[#fff5f6] text-[#f04452]"
      : status === "MONITORING"
        ? "border-[#c7dbff] bg-[#f2f7ff] text-[#1f6feb]"
        : "border-[#a7efd8] bg-[#ecfff8] text-[#00a77d]";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-black ${className}`}
    >
      {codeLabels.incidentStatus[status]}
    </span>
  );
}

type IncidentHistoryRow = {
  color: "red" | "slate" | "amber" | "emerald" | "blue";
  label: ReactNode;
  time: string;
};

function TimelineRow({
  children,
  color,
  time,
}: {
  children: ReactNode;
  color: IncidentHistoryRow["color"];
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
    <div className="flex items-start gap-3 py-1 text-sm font-semibold text-slate-600">
      <span className="w-12 shrink-0 text-slate-500">{time}</span>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClassName}`} />
      <span className="min-w-0 flex-1">{children}</span>
      <span className="text-xs text-slate-400">System</span>
    </div>
  );
}

function getIncidentHistoryRows({
  events,
  incident,
  ownerNames,
  service,
}: {
  events: Array<{
    actor: string;
    createdAt: string;
    eventType: string;
    message: string;
  }>;
  incident: IncidentRecord;
  ownerNames: string[];
  service?: ServiceRecord;
}): IncidentHistoryRow[] {
  if (events.length) {
    return [...events]
      .sort((first, second) => first.createdAt.localeCompare(second.createdAt))
      .map((event) => ({
        color:
          event.eventType === "DETECTED"
            ? "red"
            : event.eventType === "NOTIFICATION_SENT"
              ? "amber"
              : event.eventType === "RESOLVED"
                ? "emerald"
                : event.eventType === "STATUS_CHANGED"
                  ? "blue"
                  : "slate",
        time: event.createdAt.slice(11, 16),
        label: (
          <>
            {event.message} · {event.actor}
          </>
        ),
      }));
  }

  const serviceName = service?.serviceName ?? incident.title;
  const ownerName = ownerNames[0] ?? "담당 그룹";

  return [
    {
      color: "red",
      time: "14:08",
      label: <>자동 감지 · 헬스체크 fail · {serviceName}</>,
    },
    {
      color: "slate",
      time: "14:08",
      label: <>담당 그룹 매핑 · {ownerName} 알림 대상자 조회</>,
    },
    {
      color: "blue",
      time: "14:08",
      label: <>영향 범위 계산 · 수신/송신 관계 기반 영향 서비스 산출</>,
    },
    {
      color: "amber",
      time: "14:09",
      label: <>알림 발송 준비 · Slack · SMS · Email 채널 큐 적재</>,
    },
    {
      color: "emerald",
      time: "14:09",
      label: <>알림 발송 완료 → 담당자 ACK 대기</>,
    },
    {
      color: "slate",
      time: "14:10",
      label: <>운영자 확인 · 장애 상세 조회 및 영향 서비스 확인</>,
    },
    {
      color: "amber",
      time: "14:12",
      label: <>조치 배정 · 영향 서비스 담당자에게 후속 조치 요청</>,
    },
    {
      color: "blue",
      time: "14:14",
      label: <>모니터링 전환 대기 · 응답 회복 여부 재점검</>,
    },
  ];
}

function buildImpactDescriptions(
  service: ServiceRecord,
  impact: IncidentImpactRecord,
  targetService?: ServiceRecord
) {
  const registeredDescription =
    service.description && service.description !== "-"
      ? service.description
      : `${service.serviceName} 업무 처리 경로`;
  const lastCategory =
    service.categoryPath[service.categoryPath.length - 1] ?? service.serviceName;
  const cause =
    impact.directYn === "Y"
      ? `${service.serviceName} 호출 또는 응답이 직접 실패할 수 있습니다.`
      : `${targetService?.serviceName ?? "장애 중심 서비스"} 영향으로 ${service.serviceName} 처리가 지연될 수 있습니다.`;

  return [
    registeredDescription,
    cause,
    `${lastCategory} 처리 결과와 이력 확인이 제한될 수 있습니다.`,
  ];
}

function getIncidentElapsedLabel(incident: IncidentRecord) {
  return incident.incidentId % 2 === 0 ? "00:11:08" : "00:14:32";
}

function getIncidentService(
  incident: IncidentRecord,
  services: ServiceRecord[]
) {
  return incident.serviceId
    ? services.find((service) => service.serviceId === incident.serviceId)
    : undefined;
}
