import { useState } from "react";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";

interface ServiceRelation {
  id: string;
  sourceService: string;
  targetService: string;
  relationType: string;
  isRequired: boolean;
  status: "정상" | "경고" | "장애";
  description: string;
}

export function ServiceRelations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("전체");
  const [showForm, setShowForm] = useState(false);

  const relations: ServiceRelation[] = [
    {
      id: "REL-001",
      sourceService: "주문 관리 서비스",
      targetService: "재고 관리 서비스",
      relationType: "동기 호출",
      isRequired: true,
      status: "정상",
      description: "주문 생성 시 재고 확인",
    },
    {
      id: "REL-002",
      sourceService: "주문 관리 서비스",
      targetService: "결제 처리 서비스",
      relationType: "비동기 메시지",
      isRequired: true,
      status: "정상",
      description: "주문 완료 후 결제 요청",
    },
    {
      id: "REL-003",
      sourceService: "결제 처리 서비스",
      targetService: "알림 발송 서비스",
      relationType: "이벤트",
      isRequired: false,
      status: "정상",
      description: "결제 완료 알림",
    },
    {
      id: "REL-004",
      sourceService: "회원 인증 서비스",
      targetService: "주문 관리 서비스",
      relationType: "동기 호출",
      isRequired: true,
      status: "정상",
      description: "사용자 권한 확인",
    },
    {
      id: "REL-005",
      sourceService: "결제 처리 서비스",
      targetService: "재고 관리 서비스",
      relationType: "동기 호출",
      isRequired: true,
      status: "경고",
      description: "결제 후 재고 차감",
    },
  ];

  const getStatusColor = (status: ServiceRelation["status"]) => {
    switch (status) {
      case "정상":
        return "bg-green-100 text-green-800 border-green-200";
      case "경고":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "장애":
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      "동기 호출": "bg-blue-100 text-blue-800 border-blue-200",
      "비동기 메시지": "bg-purple-100 text-purple-800 border-purple-200",
      이벤트: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return colors[type] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="space-y-6">
      {/* 헤더 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">서비스 연계</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            신규 연계 등록
          </button>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="서비스명으로 검색..."
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
            <option>동기 호출</option>
            <option>비동기 메시지</option>
            <option>이벤트</option>
          </select>

          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>모든 상태</option>
            <option>정상</option>
            <option>경고</option>
            <option>장애</option>
          </select>
        </div>
      </div>

      {/* 신규 연계 등록 폼 */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            신규 연계 등록
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                출발 서비스
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>선택하세요</option>
                <option>회원 인증 서비스</option>
                <option>결제 처리 서비스</option>
                <option>주문 관리 서비스</option>
                <option>재고 관리 서비스</option>
                <option>알림 발송 서비스</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                대상 서비스
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>선택하세요</option>
                <option>회원 인증 서비스</option>
                <option>결제 처리 서비스</option>
                <option>주문 관리 서비스</option>
                <option>재고 관리 서비스</option>
                <option>알림 발송 서비스</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                연계 유형
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>동기 호출</option>
                <option>비동기 메시지</option>
                <option>이벤트</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                필수 여부
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="true">필수</option>
                <option value="false">선택</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                rows={3}
                placeholder="연계에 대한 설명을 입력하세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              등록
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 연계 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  연계 ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  출발 서비스
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  대상 서비스
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  연계 유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  필수 여부
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  설명
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {relations.map((relation) => (
                <tr key={relation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {relation.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {relation.sourceService}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {relation.targetService}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${getTypeColor(
                        relation.relationType
                      )}`}
                    >
                      {relation.relationType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {relation.isRequired ? (
                      <span className="px-3 py-1 text-xs font-medium rounded-full border bg-red-100 text-red-800 border-red-200">
                        필수
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-medium rounded-full border bg-gray-100 text-gray-800 border-gray-200">
                        선택
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                        relation.status
                      )}`}
                    >
                      {relation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {relation.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
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

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">총 연계</div>
          <div className="text-2xl font-semibold text-gray-900">
            {relations.length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">필수 연계</div>
          <div className="text-2xl font-semibold text-red-600">
            {relations.filter((r) => r.isRequired).length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">정상 연계</div>
          <div className="text-2xl font-semibold text-green-600">
            {relations.filter((r) => r.status === "정상").length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">경고/장애</div>
          <div className="text-2xl font-semibold text-yellow-600">
            {
              relations.filter(
                (r) => r.status === "경고" || r.status === "장애"
              ).length
            }
          </div>
        </div>
      </div>
    </div>
  );
}
