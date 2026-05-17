import { AlertCircle, Clock, Users, TrendingUp } from "lucide-react";

interface Incident {
  id: string;
  service: string;
  title: string;
  severity: "긴급" | "높음" | "보통";
  status: "진행중" | "해결중" | "완료";
  startTime: string;
  duration: string;
  assignee: string;
}

interface ImpactedService {
  name: string;
  impactType: "직접" | "간접";
  impactLevel: "높음" | "중간" | "낮음";
  affectedUsers: number;
}

export function IncidentImpact() {
  const incidents: Incident[] = [
    {
      id: "INC-001",
      service: "결제 처리 서비스",
      title: "응답 지연 발생",
      severity: "긴급",
      status: "진행중",
      startTime: "2026-05-17 09:15",
      duration: "45분",
      assignee: "박영희",
    },
    {
      id: "INC-002",
      service: "재고 관리 서비스",
      title: "DB 연결 오류",
      severity: "높음",
      status: "해결중",
      startTime: "2026-05-17 08:30",
      duration: "1시간 30분",
      assignee: "최지훈",
    },
    {
      id: "INC-003",
      service: "알림 발송 서비스",
      title: "푸시 발송 실패",
      severity: "보통",
      status: "진행중",
      startTime: "2026-05-17 10:00",
      duration: "15분",
      assignee: "정수아",
    },
  ];

  const impactedServices: ImpactedService[] = [
    {
      name: "결제 처리 서비스",
      impactType: "직접",
      impactLevel: "높음",
      affectedUsers: 2340,
    },
    {
      name: "주문 관리 서비스",
      impactType: "간접",
      impactLevel: "높음",
      affectedUsers: 1850,
    },
    {
      name: "재고 관리 서비스",
      impactType: "직접",
      impactLevel: "중간",
      affectedUsers: 420,
    },
    {
      name: "알림 발송 서비스",
      impactType: "직접",
      impactLevel: "낮음",
      affectedUsers: 150,
    },
    {
      name: "회원 인증 서비스",
      impactType: "간접",
      impactLevel: "낮음",
      affectedUsers: 85,
    },
  ];

  const getSeverityColor = (severity: Incident["severity"]) => {
    switch (severity) {
      case "긴급":
        return "bg-red-100 text-red-800 border-red-200";
      case "높음":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "보통":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getStatusColor = (status: Incident["status"]) => {
    switch (status) {
      case "진행중":
        return "bg-red-100 text-red-800 border-red-200";
      case "해결중":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "완료":
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getImpactTypeColor = (type: ImpactedService["impactType"]) => {
    return type === "직접"
      ? "bg-red-100 text-red-800 border-red-200"
      : "bg-blue-100 text-blue-800 border-blue-200";
  };

  const getImpactLevelColor = (level: ImpactedService["impactLevel"]) => {
    switch (level) {
      case "높음":
        return "bg-red-100 text-red-800 border-red-200";
      case "중간":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "낮음":
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-red-500 p-3 rounded-lg">
              <AlertCircle size={24} className="text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600">진행 중 장애</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">
            {incidents.filter((i) => i.status === "진행중").length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-500 p-3 rounded-lg">
              <Clock size={24} className="text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600">해결 중</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">
            {incidents.filter((i) => i.status === "해결중").length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-orange-500 p-3 rounded-lg">
              <TrendingUp size={24} className="text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600">영향 받는 서비스</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">
            {impactedServices.length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-purple-500 p-3 rounded-lg">
              <Users size={24} className="text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600">영향 받는 사용자</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">
            {impactedServices
              .reduce((sum, s) => sum + s.affectedUsers, 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* 진행 중인 장애 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          진행 중인 장애
        </h3>
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {incident.id}
                    </span>
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${getSeverityColor(
                        incident.severity
                      )}`}
                    >
                      {incident.severity}
                    </span>
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                        incident.status
                      )}`}
                    >
                      {incident.status}
                    </span>
                  </div>
                  <h4 className="text-base font-semibold text-gray-900">
                    {incident.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    대상: {incident.service}
                  </p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <div>발생: {incident.startTime}</div>
                  <div className="font-semibold text-red-600 mt-1">
                    경과: {incident.duration}
                  </div>
                  <div className="mt-1">담당: {incident.assignee}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 영향 받는 서비스 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          영향 받는 서비스
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  서비스명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  영향 유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  영향 수준
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  영향 사용자
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {impactedServices.map((service, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {service.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${getImpactTypeColor(
                        service.impactType
                      )}`}
                    >
                      {service.impactType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${getImpactLevelColor(
                        service.impactLevel
                      )}`}
                    >
                      {service.impactLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {service.affectedUsers.toLocaleString()}명
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 서비스 연계 그래프 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          장애 영향 관계도
        </h3>
        <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
          <div className="flex flex-col items-center gap-6">
            {/* 장애 발생 서비스 */}
            <div className="flex items-center gap-4">
              <div className="px-6 py-4 bg-red-100 border-2 border-red-500 rounded-lg text-center">
                <div className="text-sm font-semibold text-red-900">
                  장애 발생
                </div>
                <div className="text-base font-bold text-red-900 mt-1">
                  결제 처리 서비스
                </div>
              </div>
            </div>

            {/* 화살표 */}
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-8 bg-gray-400"></div>
              <div className="w-3 h-3 bg-gray-400 rotate-45 transform translate-y-[-6px]"></div>
            </div>

            {/* 직접 영향 서비스 */}
            <div className="flex items-center gap-6">
              <div className="px-4 py-3 bg-orange-50 border border-orange-300 rounded-lg text-center">
                <div className="text-xs text-orange-700">직접 영향</div>
                <div className="text-sm font-semibold text-orange-900 mt-1">
                  주문 관리
                </div>
              </div>
              <div className="px-4 py-3 bg-orange-50 border border-orange-300 rounded-lg text-center">
                <div className="text-xs text-orange-700">직접 영향</div>
                <div className="text-sm font-semibold text-orange-900 mt-1">
                  재고 관리
                </div>
              </div>
            </div>

            {/* 화살표 */}
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-8 bg-gray-300"></div>
              <div className="w-3 h-3 bg-gray-300 rotate-45 transform translate-y-[-6px]"></div>
            </div>

            {/* 간접 영향 서비스 */}
            <div className="flex items-center gap-6">
              <div className="px-4 py-3 bg-blue-50 border border-blue-300 rounded-lg text-center">
                <div className="text-xs text-blue-700">간접 영향</div>
                <div className="text-sm font-semibold text-blue-900 mt-1">
                  회원 인증
                </div>
              </div>
              <div className="px-4 py-3 bg-blue-50 border border-blue-300 rounded-lg text-center">
                <div className="text-xs text-blue-700">간접 영향</div>
                <div className="text-sm font-semibold text-blue-900 mt-1">
                  알림 발송
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
