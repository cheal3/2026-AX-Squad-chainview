import { useState } from "react";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";

interface Server {
  id: string;
  name: string;
  ip: string;
  environment: string;
  status: "정상" | "경고" | "장애";
  owner: string;
  lastUpdate: string;
}

export function ServerManagement() {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEnv, setFilterEnv] = useState("전체");

  const servers: Server[] = [
    {
      id: "SRV-001",
      name: "PRD-WEB-001",
      ip: "192.168.1.10",
      environment: "운영",
      status: "정상",
      owner: "김철수",
      lastUpdate: "2026-05-17 09:30",
    },
    {
      id: "SRV-002",
      name: "PRD-API-001",
      ip: "192.168.1.11",
      environment: "운영",
      status: "정상",
      owner: "박영희",
      lastUpdate: "2026-05-17 08:15",
    },
    {
      id: "SRV-003",
      name: "PRD-DB-MASTER",
      ip: "192.168.1.20",
      environment: "운영",
      status: "경고",
      owner: "이민수",
      lastUpdate: "2026-05-17 10:00",
    },
    {
      id: "SRV-004",
      name: "STG-WEB-001",
      ip: "192.168.2.10",
      environment: "스테이징",
      status: "정상",
      owner: "최지훈",
      lastUpdate: "2026-05-16 18:45",
    },
    {
      id: "SRV-005",
      name: "DEV-API-002",
      ip: "192.168.3.15",
      environment: "개발",
      status: "정상",
      owner: "정수아",
      lastUpdate: "2026-05-17 07:20",
    },
  ];

  const getStatusColor = (status: Server["status"]) => {
    switch (status) {
      case "정상":
        return "bg-green-100 text-green-800 border-green-200";
      case "경고":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "장애":
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  const getEnvColor = (env: string) => {
    switch (env) {
      case "운영":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "스테이징":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "개발":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">서버 목록</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            신규 서버 등록
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
              placeholder="서버명, IP 주소로 검색..."
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
      </div>

      {/* 신규 등록 폼 */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            신규 서버 등록
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                서버명
              </label>
              <input
                type="text"
                placeholder="PRD-WEB-001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IP 주소
              </label>
              <input
                type="text"
                placeholder="192.168.1.10"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                환경
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>운영</option>
                <option>스테이징</option>
                <option>개발</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                담당자
              </label>
              <input
                type="text"
                placeholder="담당자 이름"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                rows={3}
                placeholder="서버에 대한 설명을 입력하세요"
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

      {/* 서버 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  서버 ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  서버명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP 주소
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  환경
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  담당자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  최근 업데이트
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {servers.map((server) => (
                <tr key={server.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {server.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {server.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {server.ip}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${getEnvColor(
                        server.environment
                      )}`}
                    >
                      {server.environment}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                        server.status
                      )}`}
                    >
                      {server.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {server.owner}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {server.lastUpdate}
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
    </div>
  );
}
