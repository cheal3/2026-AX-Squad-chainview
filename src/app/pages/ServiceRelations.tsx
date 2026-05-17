import { useMemo, useState } from "react";
import { Search, Plus, Trash2, Edit2 } from "lucide-react";
import {
  codeLabels,
  getServiceById,
  serviceRelations,
  services,
  type RelationStatusCode,
  type RelationTypeCode,
} from "../mockData";

export function ServiceRelations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("전체");
  const [showForm, setShowForm] = useState(false);

  const filteredRelations = useMemo(() => {
    return serviceRelations.filter((relation) => {
      const source = getServiceById(relation.sourceServiceId);
      const target = getServiceById(relation.targetServiceId);
      const haystack = [
        source?.serviceId,
        source?.serviceName,
        target?.serviceId,
        target?.serviceName,
        codeLabels.relationType[relation.relationTypeCode],
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesType =
        filterType === "전체" ||
        codeLabels.relationType[relation.relationTypeCode] === filterType;
      return matchesSearch && matchesType;
    });
  }, [filterType, searchTerm]);

  const getStatusColor = (status: RelationStatusCode) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 border-green-200";
      case "INACTIVE":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "DEPRECATED":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getTypeColor = (type: RelationTypeCode) => {
    switch (type) {
      case "REST":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "SOAP":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "MQ":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "FILE":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "ETC":
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              서비스 관계 관리
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              출발 서비스와 대상 서비스 사이의 방향성 있는 의존 관계를
              관리합니다.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            신규 관계 등록
          </button>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="서비스명, 서비스 ID, 관계 유형으로 검색"
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
            <option>REST API</option>
            <option>SOAP</option>
            <option>Message Queue</option>
            <option>File Transfer</option>
            <option>기타</option>
          </select>
        </div>
      </section>

      {showForm && (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            신규 관계 등록
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                출발 서비스 *
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>선택하세요</option>
                {services.map((service) => (
                  <option key={service.serviceId}>
                    #{service.serviceId} {service.serviceName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                대상 서비스 *
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>선택하세요</option>
                {services.map((service) => (
                  <option key={service.serviceId}>
                    #{service.serviceId} {service.serviceName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                관계 유형 *
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>REST API</option>
                <option>SOAP</option>
                <option>Message Queue</option>
                <option>File Transfer</option>
                <option>기타</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                필수 여부 *
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>필수</option>
                <option>선택</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상태 *
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>활성</option>
                <option>비활성</option>
                <option>폐기 예정</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                rows={3}
                placeholder="연계 설명"
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
        </section>
      )}

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">등록 목록</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
            {filteredRelations.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  출발 서비스
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  대상 서비스
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  관계 유형
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
              {filteredRelations.map((relation) => {
                const source = getServiceById(relation.sourceServiceId);
                const target = getServiceById(relation.targetServiceId);
                return (
                  <tr key={relation.relationId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {relation.relationId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="text-xs text-gray-500">
                        #{source?.serviceId}
                      </div>
                      {source?.serviceName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="text-xs text-gray-500">
                        #{target?.serviceId}
                      </div>
                      {target?.serviceName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${getTypeColor(
                          relation.relationTypeCode
                        )}`}
                      >
                        {codeLabels.relationType[relation.relationTypeCode]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 text-xs font-medium rounded-full border bg-green-100 text-green-800 border-green-200">
                        {relation.mandatoryYn === "Y" ? "필수" : "선택"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                          relation.relationStatusCode
                        )}`}
                      >
                        {codeLabels.relationStatus[relation.relationStatusCode]}
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
                        <button className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                          삭제
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">총 관계</div>
          <div className="text-2xl font-semibold text-gray-900">
            {serviceRelations.length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">필수 관계</div>
          <div className="text-2xl font-semibold text-green-600">
            {serviceRelations.filter((relation) => relation.mandatoryYn === "Y").length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">활성 관계</div>
          <div className="text-2xl font-semibold text-blue-600">
            {
              serviceRelations.filter(
                (relation) => relation.relationStatusCode === "ACTIVE"
              ).length
            }
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">REST API</div>
          <div className="text-2xl font-semibold text-gray-900">
            {
              serviceRelations.filter(
                (relation) => relation.relationTypeCode === "REST"
              ).length
            }
          </div>
        </div>
      </div>
    </div>
  );
}
