import { useState } from "react";
import { Search, Edit2, Trash2, X } from "lucide-react";

interface Service {
  id: string;
  name: string;
  type: string;
  status: "정상" | "점검" | "장애";
  owner: string;
  techStack: string[];
  description: string;
}

export function ServiceManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("전체");
  const [editingService, setEditingService] = useState<Service | null>(null);

  const services: Service[] = [
    {
      id: "SVC-001",
      name: "회원 인증 서비스",
      type: "인증/인가",
      status: "정상",
      owner: "김철수",
      techStack: ["Spring Boot", "Redis", "PostgreSQL"],
      description: "사용자 로그인 및 권한 관리",
    },
    {
      id: "SVC-002",
      name: "결제 처리 서비스",
      type: "결제",
      status: "장애",
      owner: "박영희",
      techStack: ["Node.js", "MongoDB", "RabbitMQ"],
      description: "결제 요청 처리 및 PG 연동",
    },
    {
      id: "SVC-003",
      name: "주문 관리 서비스",
      type: "주문",
      status: "정상",
      owner: "이민수",
      techStack: ["Spring Boot", "MySQL", "Kafka"],
      description: "주문 생성 및 상태 관리",
    },
    {
      id: "SVC-004",
      name: "재고 관리 서비스",
      type: "재고",
      status: "정상",
      owner: "최지훈",
      techStack: ["Python", "PostgreSQL", "Redis"],
      description: "재고 수량 관리 및 예약",
    },
    {
      id: "SVC-005",
      name: "알림 발송 서비스",
      type: "알림",
      status: "점검",
      owner: "정수아",
      techStack: ["Node.js", "Redis", "Firebase"],
      description: "푸시, 이메일, SMS 알림 발송",
    },
  ];

  const getStatusColor = (status: Service["status"]) => {
    switch (status) {
      case "정상":
        return "bg-green-100 text-green-800 border-green-200";
      case "점검":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "장애":
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      "인증/인가": "bg-purple-100 text-purple-800 border-purple-200",
      결제: "bg-blue-100 text-blue-800 border-blue-200",
      주문: "bg-green-100 text-green-800 border-green-200",
      재고: "bg-orange-100 text-orange-800 border-orange-200",
      알림: "bg-pink-100 text-pink-800 border-pink-200",
    };
    return colors[type] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="space-y-6">
      {/* 헤더 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">서비스 목록</h3>
          <div className="text-sm text-gray-600">
            총 <span className="font-semibold">{services.length}</span>개 서비스
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="서비스명, 담당자로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>전체</option>
            <option>인증/인가</option>
            <option>결제</option>
            <option>주문</option>
            <option>재고</option>
            <option>알림</option>
          </select>
        </div>
      </div>

      {/* 서비스 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  서비스 ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  서비스명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  담당자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  기술스택
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {service.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {service.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {service.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${getTypeColor(
                        service.type
                      )}`}
                    >
                      {service.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                        service.status
                      )}`}
                    >
                      {service.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {service.owner}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {service.techStack.map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingService(service)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 수정 모달 */}
      {editingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                서비스 수정
              </h3>
              <button
                onClick={() => setEditingService(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  서비스 ID
                </label>
                <input
                  type="text"
                  value={editingService.id}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  서비스명
                </label>
                <input
                  type="text"
                  defaultValue={editingService.name}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    유형
                  </label>
                  <select
                    defaultValue={editingService.type}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>인증/인가</option>
                    <option>결제</option>
                    <option>주문</option>
                    <option>재고</option>
                    <option>알림</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상태
                  </label>
                  <select
                    defaultValue={editingService.status}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>정상</option>
                    <option>점검</option>
                    <option>장애</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  담당자
                </label>
                <input
                  type="text"
                  defaultValue={editingService.owner}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기술스택 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  defaultValue={editingService.techStack.join(", ")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명
                </label>
                <textarea
                  rows={3}
                  defaultValue={editingService.description}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setEditingService(null)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
