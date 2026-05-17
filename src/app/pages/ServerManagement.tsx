import { useMemo, useState } from "react";
import { Plus, Search, Edit2, Trash2, RefreshCw } from "lucide-react";
import {
  codeLabels,
  getServiceCountByServerId,
  servers,
  type ServerStatusCode,
} from "../mockData";

export function ServerManagement() {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEnv, setFilterEnv] = useState("전체");

  const filteredServers = useMemo(() => {
    return servers.filter((server) => {
      const matchesSearch = [server.serverName, server.hostName, server.ipAddress]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesEnv =
        filterEnv === "전체" || codeLabels.envType[server.envCode] === filterEnv;
      return matchesSearch && matchesEnv;
    });
  }, [filterEnv, searchTerm]);

  const getStatusColor = (status: ServerStatusCode) => {
    switch (status) {
      case "NORMAL":
        return "bg-green-100 text-green-800 border-green-200";
      case "INCIDENT":
        return "bg-red-100 text-red-800 border-red-200";
      case "MAINTENANCE":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "INACTIVE":
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getEnvColor = (envCode: keyof typeof codeLabels.envType) => {
    switch (envCode) {
      case "PROD":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "STAGE":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "DEV":
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">서버 관리</h3>
            <p className="text-sm text-gray-500 mt-1">
              서버 메타데이터를 조회하고 등록합니다. 삭제 시 연결 서비스가
              있으면 제한됩니다.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            신규 서버 등록
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
              placeholder="서버명, 호스트명, IP 주소로 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterEnv}
            onChange={(e) => setFilterEnv(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>전체</option>
            <option>운영</option>
            <option>스테이징</option>
            <option>개발</option>
          </select>
        </div>
      </section>

      {showForm && (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            신규 서버 등록
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                서버명 *
              </label>
              <input
                type="text"
                placeholder="예: prod-was-01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                호스트명 *
              </label>
              <input
                type="text"
                placeholder="예: prod-was-01.internal"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IP 주소 *
              </label>
              <input
                type="text"
                placeholder="예: 10.0.1.10"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                환경 *
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>운영</option>
                <option>스테이징</option>
                <option>개발</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OS 유형
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Linux</option>
                <option>Windows</option>
                <option>Unix</option>
                <option>기타</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OS 버전
              </label>
              <input
                type="text"
                placeholder="예: Ubuntu 22.04"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상태
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>기본: NORMAL</option>
                <option>장애</option>
                <option>점검중</option>
                <option>비활성</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                rows={3}
                placeholder="서버 설명"
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
            {filteredServers.length}
          </span>
          <button className="ml-auto flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <RefreshCw size={15} />
            목록 새로고침
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  서버명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  호스트명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  환경
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OS 유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  서비스 수
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredServers.map((server) => (
                <tr key={server.serverId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {server.serverId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {server.serverName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {server.hostName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {server.ipAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${getEnvColor(
                        server.envCode
                      )}`}
                    >
                      {codeLabels.envType[server.envCode]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {codeLabels.osType[server.osTypeCode]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                        server.statusCode
                      )}`}
                    >
                      {codeLabels.serverStatus[server.statusCode]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {getServiceCountByServerId(server.serverId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button className="px-3 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                        수정
                      </button>
                      <button className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        서비스 등록
                      </button>
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
      </section>
    </div>
  );
}
