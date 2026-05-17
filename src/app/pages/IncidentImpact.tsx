import { AlertCircle, Clock, Route, TrendingUp } from "lucide-react";
import {
  codeLabels,
  getServiceById,
  incidentImpacts,
  incidents,
  serviceRelations,
  type IncidentStatusCode,
  type SeverityCode,
} from "../mockData";

export function IncidentImpact() {
  const getSeverityColor = (severity: SeverityCode) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200";
      case "MAJOR":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "MINOR":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "NOTICE":
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getStatusColor = (status: IncidentStatusCode) => {
    switch (status) {
      case "OPEN":
        return "bg-red-100 text-red-800 border-red-200";
      case "MONITORING":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "RESOLVED":
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const openIncidents = incidents.filter(
    (incident) => incident.incidentStatusCode === "OPEN"
  );
  const mandatoryRelations = serviceRelations.filter(
    (relation) => relation.mandatoryYn === "Y"
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-red-500 p-3 rounded-lg">
              <AlertCircle size={24} className="text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600">진행 중 장애</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">
            {openIncidents.length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-500 p-3 rounded-lg">
              <Clock size={24} className="text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600">모니터링</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">
            {
              incidents.filter(
                (incident) => incident.incidentStatusCode === "MONITORING"
              ).length
            }
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-orange-500 p-3 rounded-lg">
              <TrendingUp size={24} className="text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600">영향 서비스</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">
            {incidentImpacts.length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-sky-500 p-3 rounded-lg">
              <Route size={24} className="text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600">필수 관계</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">
            {mandatoryRelations.length}
          </p>
        </div>
      </div>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          장애 목록
        </h3>
        <div className="space-y-3">
          {incidents.map((incident) => {
            const targetService = incident.serviceId
              ? getServiceById(incident.serviceId)
              : undefined;
            return (
              <div
                key={incident.incidentId}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        #{incident.incidentId}
                      </span>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${getSeverityColor(
                          incident.severityCode
                        )}`}
                      >
                        {codeLabels.severity[incident.severityCode]}
                      </span>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                          incident.incidentStatusCode
                        )}`}
                      >
                        {codeLabels.incidentStatus[incident.incidentStatusCode]}
                      </span>
                    </div>
                    <h4 className="text-base font-semibold text-gray-900">
                      {incident.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      대상: {targetService?.serviceName || "-"} ·{" "}
                      {codeLabels.incidentType[incident.incidentTypeCode]}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      {incident.description}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600 lg:text-right">
                    <div>발생: {incident.startedAt}</div>
                    <div className="font-semibold text-red-600 mt-1">
                      수동 등록: {incident.manualRegisteredYn}
                    </div>
                    <div className="mt-1">등록자: {incident.registeredBy}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          장애 영향 범위
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  영향 ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  영향 서비스
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  영향 단계
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  직접 영향
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  영향 경로
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {incidentImpacts.map((impact) => {
                const impactedService = getServiceById(impact.impactedServiceId);
                return (
                  <tr key={impact.impactId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {impact.impactId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {impactedService?.serviceName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {impact.impactLevel}차
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${
                          impact.directYn === "Y"
                            ? "bg-red-100 text-red-800 border-red-200"
                            : "bg-blue-100 text-blue-800 border-blue-200"
                        }`}
                      >
                        {impact.directYn === "Y" ? "직접" : "간접"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {impact.impactPathText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          장애 영향 관계도
        </h3>
        <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
          <div className="flex flex-col items-center gap-6">
            <div className="px-6 py-4 bg-red-100 border-2 border-red-500 rounded-lg text-center">
              <div className="text-sm font-semibold text-red-900">
                장애 발생
              </div>
              <div className="text-base font-bold text-red-900 mt-1">
                테스트서비스
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-0.5 h-8 bg-gray-400" />
              <div className="w-3 h-3 bg-gray-400 rotate-45 transform translate-y-[-6px]" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6">
              <div className="px-4 py-3 bg-orange-50 border border-orange-300 rounded-lg text-center">
                <div className="text-xs text-orange-700">직접 영향</div>
                <div className="text-sm font-semibold text-orange-900 mt-1">
                  111
                </div>
              </div>
              <div className="px-4 py-3 bg-orange-50 border border-orange-300 rounded-lg text-center">
                <div className="text-xs text-orange-700">자기 참조</div>
                <div className="text-sm font-semibold text-orange-900 mt-1">
                  테스트서비스
                </div>
              </div>
            </div>

            <p className="max-w-2xl text-center text-sm text-gray-500">
              SERVICE 장애 등록 시 명세서 기준으로 대상 서비스가 종점인
              관계를 역방향 탐색하여 영향 서비스를 계산합니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
