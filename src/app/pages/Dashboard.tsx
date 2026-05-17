import { Server, Settings, Network, AlertTriangle, UserCheck } from "lucide-react";
import {
  codeLabels,
  incidentImpacts,
  incidents,
  serviceOwners,
  serviceRelations,
  services,
  servers,
} from "../mockData";

export function Dashboard() {
  const activeRelations = serviceRelations.filter(
    (relation) => relation.relationStatusCode === "ACTIVE"
  );
  const openIncidents = incidents.filter(
    (incident) => incident.incidentStatusCode !== "RESOLVED"
  );
  const ownerAssignedCount = new Set(
    serviceOwners.map((owner) => owner.serviceId)
  ).size;

  const kpiCards = [
    {
      title: "서버 수",
      value: servers.length.toString(),
      icon: Server,
      color: "bg-blue-500",
      detail: "운영 1 · 스테이징 1",
    },
    {
      title: "서비스 수",
      value: services.length.toString(),
      icon: Settings,
      color: "bg-green-500",
      detail: "정상 2",
    },
    {
      title: "활성 연계",
      value: activeRelations.length.toString(),
      icon: Network,
      color: "bg-sky-500",
      detail: "REST API 2",
    },
    {
      title: "진행 장애",
      value: openIncidents.length.toString(),
      icon: AlertTriangle,
      color: "bg-red-500",
      detail: "영향 서비스 2",
    },
    {
      title: "담당 지정",
      value: `${ownerAssignedCount}/${services.length}`,
      icon: UserCheck,
      color: "bg-emerald-500",
      detail: "정 담당 기준",
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: "서버 등록",
      description: "server-test-name111 서버가 스테이징 환경에 등록되었습니다.",
      time: "2026-05-17 10:10",
      user: "8913812",
    },
    {
      id: 2,
      type: "서비스 수정",
      description: "111 서비스의 배포 서버가 server-test-name111로 지정되었습니다.",
      time: "2026-05-17 10:15",
      user: "8913812",
    },
    {
      id: 3,
      type: "관계 등록",
      description: "111 -> 테스트서비스 REST API 필수 관계가 활성화되었습니다.",
      time: "2026-05-17 10:20",
      user: "8913812",
    },
    {
      id: 4,
      type: "장애 등록",
      description: "테스트서비스 장애 기준 영향 서비스가 2건 계산되었습니다.",
      time: "2026-05-17 10:30",
      user: "8913812",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className="text-3xl font-semibold text-gray-900">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500">{card.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            최근 등록/수정 이력
          </h3>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {activity.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {activity.time}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    X-User-Id: {activity.user}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            데이터 상태 요약
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">서버 정상</span>
                <span className="text-sm font-semibold text-gray-900">
                  {servers.filter((server) => server.statusCode === "NORMAL").length}/
                  {servers.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">서비스 정상</span>
                <span className="text-sm font-semibold text-gray-900">
                  {services.filter((service) => service.statusCode === "NORMAL").length}/
                  {services.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">관계 활성</span>
                <span className="text-sm font-semibold text-gray-900">
                  {activeRelations.length}/{serviceRelations.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-sky-500 h-2 rounded-full w-full" />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                진행 중 장애
              </h4>
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-medium text-red-900">
                  {incidents[0].title}
                </p>
                <p className="text-xs text-red-700 mt-1">
                  {codeLabels.severity[incidents[0].severityCode]} · 영향{" "}
                  {incidentImpacts.length}건
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
