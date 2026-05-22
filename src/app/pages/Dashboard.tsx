import { Link } from "react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Network,
  Server,
  Settings,
  UserCheck,
} from "lucide-react";
import { usePortalData } from "../PortalDataStore";
import { codeLabels } from "../mockData";

export function Dashboard() {
  const { servers, services, relations, owners, incidents, techStacks } =
    usePortalData();
  const activeRelations = relations.filter(
    (relation) => relation.relationStatusCode === "ACTIVE"
  );
  const openIncidents = incidents.filter(
    (incident) => incident.incidentStatusCode !== "RESOLVED"
  );
  const ownerAssignedServiceIds = new Set(
    owners.map((owner) => owner.serviceId)
  );
  const myServices = services
    .filter((service) => ownerAssignedServiceIds.has(service.serviceId))
    .slice(0, 5);
  const attentionServices = services
    .filter(
      (service) =>
        service.statusCode !== "NORMAL" ||
        !service.endpointUrl ||
        !ownerAssignedServiceIds.has(service.serviceId)
    )
    .slice(0, 5);
  const normalServerCount = servers.filter(
    (server) => server.statusCode === "NORMAL"
  ).length;
  const normalServiceCount = services.filter(
    (service) => service.statusCode === "NORMAL"
  ).length;
  const degradedServiceCount = services.filter(
    (service) =>
      service.statusCode === "IMPACTED" || service.statusCode === "MAINTENANCE"
  ).length;
  const downServiceCount = services.filter(
    (service) =>
      service.statusCode === "INCIDENT" || service.statusCode === "INACTIVE"
  ).length;
  const unassignedServices = services.filter(
    (service) => !ownerAssignedServiceIds.has(service.serviceId)
  );
  const relationMissingServices = services.filter(
    (service) =>
      !relations.some(
        (relation) =>
          relation.sourceServiceId === service.serviceId ||
          relation.targetServiceId === service.serviceId
      )
  );
  const recentServices = [...services]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  const incidentServices = services
    .filter((service) => service.statusCode !== "NORMAL")
    .sort(
      (a, b) =>
        importanceRank(b.importanceCode ?? "NORMAL") -
        importanceRank(a.importanceCode ?? "NORMAL")
    )
    .slice(0, 6);

  const kpiCards = [
    {
      title: "전체 서비스",
      value: services.length.toString(),
      icon: Settings,
      detail: "서비스 기준 모니터링",
    },
    {
      title: "운영 중",
      value: normalServiceCount.toString(),
      icon: CheckCircle2,
      detail: "정상 응답 서비스",
    },
    {
      title: "성능저하",
      value: degradedServiceCount.toString(),
      icon: AlertTriangle,
      detail: "영향/점검 상태",
    },
    {
      title: "중단",
      value: downServiceCount.toString(),
      icon: AlertTriangle,
      detail: "장애/비활성 상태",
    },
    {
      title: "등록 서버",
      value: servers.length.toString(),
      icon: Server,
      detail: `정상 ${normalServerCount}대`,
    },
    {
      title: "담당자 미지정",
      value: unassignedServices.length.toString(),
      icon: UserCheck,
      detail: "조치 필요 서비스",
    },
  ];

  const quickLinks = [
    {
      label: "서비스 등록",
      description: "새 서비스와 배포 정보를 등록합니다.",
      to: "/services",
      icon: Settings,
    },
    {
      label: "서버 조회",
      description: "배포 대상 서버 상태를 확인합니다.",
      to: "/servers",
      icon: Server,
    },
    {
      label: "영향 경로 확인",
      description: "종속 서비스 전파 경로를 점검합니다.",
      to: "/relations",
      icon: Network,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">
            서비스 포털
          </h1>
          <p className="mt-3 text-base text-slate-500">
            담당 서비스의 배포 상태, 관계, 점검 필요 항목을 한 번에 확인합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
          <CheckCircle2 size={18} />
          담당 서비스 {myServices.length}개 표시 중
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {card.title}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">{card.detail}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="font-semibold text-slate-950">
              현재 장애/성능저하 서비스
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              중요도가 높은 서비스가 우선 표시됩니다.
            </p>
          </div>
          <div className="divide-y divide-slate-200">
            {incidentServices.length > 0 ? (
              incidentServices.map((service) => {
                const impactedCount = relations.filter(
                  (relation) => relation.targetServiceId === service.serviceId
                ).length;

                return (
                  <Link
                    key={service.serviceId}
                    to="/relations"
                    className="block px-6 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">
                            {service.serviceName}
                          </span>
                          <StatusBadge
                            status={codeLabels.serviceStatus[service.statusCode]}
                            tone={
                              service.statusCode === "INCIDENT" ||
                              service.statusCode === "INACTIVE"
                                ? "danger"
                                : "warning"
                            }
                          />
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {service.categoryPath.join(" / ")}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-semibold text-slate-950">
                          영향 {impactedCount}개
                        </div>
                        <div className="mt-1 text-slate-500">
                          {codeLabels.importance[service.importanceCode ?? "NORMAL"]}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <EmptyState message="현재 장애/성능저하 서비스가 없습니다." />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h3 className="font-semibold text-slate-950">내 담당 서비스</h3>
              <p className="mt-1 text-sm text-slate-500">
                담당 그룹이 지정된 서비스의 운영 상태입니다.
              </p>
            </div>
            <Link
              to="/services"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              서비스 보기
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">서비스</th>
                  <th className="px-6 py-3">분류</th>
                  <th className="px-6 py-3">상태</th>
                  <th className="px-6 py-3">관계</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {myServices.map((service) => (
                  <tr key={service.serviceId} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="font-semibold text-slate-950">
                        {service.serviceName}
                      </div>
                      <div className="text-sm text-slate-500">
                        {service.serviceCode}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {service.categoryPath.join(" / ")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge
                        status={codeLabels.serviceStatus[service.statusCode]}
                        tone={service.statusCode === "NORMAL" ? "success" : "warning"}
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-700">
                      {
                        relations.filter(
                          (relation) =>
                            relation.sourceServiceId === service.serviceId ||
                            relation.targetServiceId === service.serviceId
                        ).length
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-semibold text-slate-950">운영 상태</h3>
              <Clock size={18} className="text-slate-400" />
            </div>
            <StatusBar
              label="서버 정상"
              value={normalServerCount}
              total={servers.length}
            />
            <StatusBar
              label="서비스 정상"
              value={normalServiceCount}
              total={services.length}
            />
            <StatusBar
              label="관계 활성"
              value={activeRelations.length}
              total={relations.length}
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <h3 className="font-semibold text-slate-950">주의 필요</h3>
            </div>
            <div className="space-y-3">
              {openIncidents[0] && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm font-semibold text-red-900">
                    {openIncidents[0].title}
                  </p>
                  <p className="mt-1 text-xs text-red-700">
                    {codeLabels.severity[openIncidents[0].severityCode]} ·{" "}
                    {openIncidents[0].startedAt}
                  </p>
                </div>
              )}
              {attentionServices.map((service) => (
                <div
                  key={service.serviceId}
                  className="rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {service.serviceName}
                    </span>
                    <StatusBadge
                      status={codeLabels.serviceStatus[service.statusCode]}
                      tone={service.statusCode === "NORMAL" ? "success" : "warning"}
                    />
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {!service.endpointUrl
                      ? "엔드포인트 미입력"
                      : ownerAssignedServiceIds.has(service.serviceId)
                        ? service.serviceCode
                        : "담당 그룹 미지정"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="font-semibold text-slate-950">최근 등록/수정 서비스</h3>
            <p className="mt-1 text-sm text-slate-500">
              최근 변경된 서비스 기준으로 확인합니다.
            </p>
          </div>
          <div className="divide-y divide-slate-200">
            {recentServices.map((service) => (
              <div key={service.serviceId} className="px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-950">
                      {service.serviceName}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {service.serviceCode}
                    </div>
                  </div>
                  <div className="whitespace-nowrap text-sm text-slate-500">
                    {service.updatedAt}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-950">조치 필요 항목</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionItem label="담당자 미지정" value={unassignedServices.length} />
          <ActionItem label="관계 미등록" value={relationMissingServices.length} />
          <ActionItem
            label="기술 스택 미등록"
            value={
              services.filter(
                (service) =>
                  !techStacks.some((tech) => tech.serviceId === service.serviceId)
              ).length
            }
          />
          <ActionItem
            label="연결 서버 없음"
            value={services.filter((service) => !service.serverId).length}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon size={20} />
              </div>
              <h3 className="font-semibold text-slate-950">{item.label}</h3>
              <p className="mt-2 text-sm text-slate-500">{item.description}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

function StatusBadge({
  status,
  tone = "success",
}: {
  status: string;
  tone?: "success" | "warning" | "danger";
}) {
  return (
    <span
      className={`inline-flex rounded-md border px-3 py-1 text-xs font-semibold ${
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : tone === "danger"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      {status}
    </span>
  );
}

function ActionItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="px-6 py-10 text-center text-sm text-slate-500">{message}</div>;
}

function importanceRank(importance: string) {
  const ranks: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    NORMAL: 2,
    LOW: 1,
  };
  return ranks[importance] ?? 0;
}

function StatusBar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-950">
          {value}/{total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
