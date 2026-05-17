import { useMemo, useState } from "react";
import { Search, Edit2, Trash2, X, Server, Users, Wrench } from "lucide-react";
import {
  codeLabels,
  getOwnersByServiceId,
  getServerById,
  getTechStacksByServiceId,
  services,
  servers,
  type ServiceRecord,
  type ServiceStatusCode,
  type ServiceTypeCode,
} from "../mockData";

export function ServiceManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("전체");
  const [editingService, setEditingService] = useState<ServiceRecord | null>(
    null
  );

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const server = getServerById(service.serverId);
      const owners = getOwnersByServiceId(service.serviceId)
        .map((owner) => owner.ownerName)
        .join(" ");
      const haystack = [
        service.serviceCode,
        service.serviceName,
        service.categoryPath.join(" "),
        server?.serverName,
        owners,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesType =
        filterType === "전체" ||
        codeLabels.serviceType[service.serviceTypeCode] === filterType;
      return matchesSearch && matchesType;
    });
  }, [filterType, searchTerm]);

  const getStatusColor = (status: ServiceStatusCode) => {
    switch (status) {
      case "NORMAL":
        return "bg-green-100 text-green-800 border-green-200";
      case "INCIDENT":
        return "bg-red-100 text-red-800 border-red-200";
      case "IMPACTED":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "MAINTENANCE":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "INACTIVE":
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeColor = (type: ServiceTypeCode) => {
    switch (type) {
      case "WEB":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "API":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "BATCH":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "EXTERNAL":
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">서비스 관리</h3>
            <p className="text-sm text-gray-500 mt-1">
              서비스 기본 정보와 배포 서버, 담당, 기술 스택을 함께 확인합니다.
            </p>
          </div>
          <div className="text-sm text-gray-600">
            총 <span className="font-semibold">{filteredServices.length}</span>개
            서비스
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="서비스명, 서비스 코드, 분류, 서버, 담당으로 검색"
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
            <option>웹 서비스</option>
            <option>API 서비스</option>
            <option>배치</option>
            <option>외부 연계</option>
          </select>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">등록 목록</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
            {filteredServices.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  대분류
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  중분류
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  서비스 코드
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  서비스명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  배포 서버
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredServices.map((service) => {
                const server = getServerById(service.serverId);
                return (
                  <tr key={service.serviceId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {service.serviceId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {service.categoryPath[0]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {service.categoryPath[1]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {service.serviceCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {service.serviceName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {service.categoryPath.slice(2).join(" / ") || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${getTypeColor(
                          service.serviceTypeCode
                        )}`}
                      >
                        {codeLabels.serviceType[service.serviceTypeCode]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {server ? server.serverName : "미지정"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                          service.statusCode
                        )}`}
                      >
                        {codeLabels.serviceStatus[service.statusCode]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingService(service)}
                          className="px-3 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                        >
                          수정
                        </button>
                        <button className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          기술스택
                        </button>
                        <button className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          서비스 담당
                        </button>
                        <button className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          서비스 관계
                        </button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {editingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[92vh] overflow-auto">
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

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    분류 1단계 *
                  </label>
                  <select
                    defaultValue={editingService.categoryPath[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>채널계</option>
                    <option>기간계/업무계</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    분류 2단계
                  </label>
                  <select
                    defaultValue={editingService.categoryPath[1]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>대고객 채널</option>
                    <option>방카</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    분류 3단계
                  </label>
                  <select
                    defaultValue={editingService.categoryPath[2]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>홈페이지</option>
                    <option>대출</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    서비스 코드 *
                  </label>
                  <input
                    type="text"
                    defaultValue={editingService.serviceCode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    서비스명 *
                  </label>
                  <input
                    type="text"
                    defaultValue={editingService.serviceName}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    서비스 유형
                  </label>
                  <select
                    defaultValue={codeLabels.serviceType[editingService.serviceTypeCode]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>웹 서비스</option>
                    <option>API 서비스</option>
                    <option>배치</option>
                    <option>외부 연계</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    중요도
                  </label>
                  <select
                    defaultValue={
                      editingService.importanceCode
                        ? codeLabels.importance[editingService.importanceCode]
                        : "선택 안함"
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>선택 안함</option>
                    <option>매우 중요</option>
                    <option>중요</option>
                    <option>보통</option>
                    <option>낮음</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상태 *
                  </label>
                  <select
                    defaultValue={codeLabels.serviceStatus[editingService.statusCode]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>정상</option>
                    <option>장애</option>
                    <option>영향받음</option>
                    <option>점검중</option>
                    <option>비활성</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  엔드포인트 URL
                </label>
                <input
                  type="text"
                  defaultValue={editingService.endpointUrl}
                  placeholder="https://..."
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

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Server size={18} className="text-blue-600" />
                  <h4 className="font-semibold text-gray-900">배포 정보</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      배포 서버
                    </label>
                    <select
                      defaultValue={editingService.serverId}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {servers.map((server) => (
                        <option key={server.serverId} value={server.serverId}>
                          {server.serverName} ({server.hostName})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      배포 경로
                    </label>
                    <input
                      type="text"
                      defaultValue={editingService.deployPath}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      포트 정보
                    </label>
                    <input
                      type="text"
                      defaultValue={editingService.portInfo}
                      placeholder="예: 8080, 8443"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      인스턴스 수
                    </label>
                    <input
                      type="number"
                      defaultValue={editingService.instanceCount}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      배포 상태
                    </label>
                    <select
                      defaultValue={
                        editingService.deploymentStatusCode
                          ? codeLabels.deploymentStatus[
                              editingService.deploymentStatusCode
                            ]
                          : "선택 안함"
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>선택 안함</option>
                      <option>기동</option>
                      <option>중지</option>
                      <option>점검중</option>
                      <option>제거</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={17} className="text-emerald-600" />
                    <h4 className="font-semibold text-gray-900">서비스 담당</h4>
                  </div>
                  <div className="space-y-2">
                    {getOwnersByServiceId(editingService.serviceId).map((owner) => (
                      <div
                        key={owner.serviceOwnerId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-700">{owner.ownerName}</span>
                        <span className="text-gray-500">
                          {codeLabels.ownerType[owner.ownerTypeCode]} ·{" "}
                          {codeLabels.responsibilityType[owner.responsibilityCode]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench size={17} className="text-purple-600" />
                    <h4 className="font-semibold text-gray-900">기술 스택</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getTechStacksByServiceId(editingService.serviceId).map(
                      (techStack) => (
                        <span
                          key={techStack.techStackId}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {techStack.techName} {techStack.versionText}
                        </span>
                      )
                    )}
                  </div>
                </div>
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
