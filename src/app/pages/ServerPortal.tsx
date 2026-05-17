import { useMemo, useState } from "react";
import { Edit2, Plus, Search, Server, Trash2 } from "lucide-react";
import { usePortalData } from "../PortalDataStore";
import {
  codeLabels,
  type EnvCode,
  type OsTypeCode,
  type ServerRecord,
  type ServerStatusCode,
} from "../mockData";
import { Info, Input, Modal, Select, Summary } from "../components/PortalUi";

export function ServerPortal() {
  const { servers, services, addServer, updateServer, deleteServer } =
    usePortalData();
  const [selectedServerId, setSelectedServerId] = useState(
    servers[0]?.serverId ?? 0
  );
  const [query, setQuery] = useState("");
  const [envFilter, setEnvFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showServerForm, setShowServerForm] = useState(false);
  const [message, setMessage] = useState("");

  const filteredServers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return servers.filter((server) => {
      const matchesQuery =
        !normalized ||
        [
          server.serverName,
          server.hostName,
          server.ipAddress,
          server.osVersion,
          server.description,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      const matchesEnv = envFilter === "ALL" || server.envCode === envFilter;
      const matchesStatus =
        statusFilter === "ALL" || server.statusCode === statusFilter;
      return matchesQuery && matchesEnv && matchesStatus;
    });
  }, [envFilter, query, servers, statusFilter]);

  const selectedServer =
    servers.find((server) => server.serverId === selectedServerId) ??
    filteredServers[0] ??
    servers[0];

  const selectedServices = selectedServer
    ? services.filter((service) => service.serverId === selectedServer.serverId)
    : [];
  const normalServerCount = servers.filter(
    (server) => server.statusCode === "NORMAL"
  ).length;

  const handleDeleteServer = (server: ServerRecord) => {
    const result = deleteServer(server.serverId);
    setMessage(result.message);

    if (result.ok) {
      const nextServer = servers.find(
        (item) => item.serverId !== server.serverId
      );
      setSelectedServerId(nextServer?.serverId ?? 0);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">서버 관리</h3>
            <p className="mt-1 text-sm text-gray-500">
              서버가 많아도 검색, 환경, 상태 기준으로 빠르게 좁혀 볼 수 있습니다.
            </p>
          </div>
          <button
            onClick={() => setShowServerForm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f60] px-4 py-2 text-white transition-colors hover:bg-[#e65c00]"
          >
            <Plus size={18} />
            서버 등록
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Summary label="전체 서버" value={servers.length} />
        <Summary label="검색 결과" value={filteredServers.length} />
        <Summary label="정상 서버" value={normalServerCount} />
        <Summary label="연결 서비스" value={services.length} />
      </section>

      <Modal
        open={showServerForm}
        title="신규 서버 등록"
        onClose={() => setShowServerForm(false)}
      >
        <ServerForm
          onCancel={() => setShowServerForm(false)}
          onSubmit={(input) => {
            const server = addServer(input);
            setSelectedServerId(server.serverId);
            setShowServerForm(false);
            setMessage("서버가 등록되었습니다.");
          }}
        />
      </Modal>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-4 lg:grid-cols-[minmax(260px,1fr)_180px_180px]">
            <label className="relative block">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="서버명, 호스트명, IP로 검색"
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#f60]"
              />
            </label>
            <select
              value={envFilter}
              onChange={(event) => setEnvFilter(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#f60]"
            >
              <option value="ALL">전체 환경</option>
              {Object.entries(codeLabels.envType).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#f60]"
            >
              <option value="ALL">전체 상태</option>
              {Object.entries(codeLabels.serverStatus).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[620px] overflow-auto">
            <table className="w-full min-w-[900px]">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    서버
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    IP
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    환경
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    OS
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    상태
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase text-gray-500">
                    서비스
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredServers.map((server) => {
                  const active = selectedServer?.serverId === server.serverId;
                  const count = services.filter(
                    (service) => service.serverId === server.serverId
                  ).length;

                  return (
                    <tr
                      key={server.serverId}
                      onClick={() => setSelectedServerId(server.serverId)}
                      className={`cursor-pointer transition-colors ${
                        active ? "bg-orange-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-[#f60]">
                            <Server size={18} />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {server.serverName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {server.hostName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {server.ipAddress}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {codeLabels.envType[server.envCode]}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {codeLabels.osType[server.osTypeCode]}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          {codeLabels.serverStatus[server.statusCode]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-gray-900">
                        {count}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredServers.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500">
                조건에 맞는 서버가 없습니다.
              </div>
            )}
          </div>
        </div>

        {selectedServer && (
          <aside className="space-y-4">
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    {selectedServer.serverName}
                  </h4>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedServer.description || "서버 설명 없음"}
                  </p>
                </div>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  #{selectedServer.serverId}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3">
                <Info label="호스트명" value={selectedServer.hostName} />
                <Info label="IP" value={selectedServer.ipAddress} />
                <Info
                  label="환경"
                  value={codeLabels.envType[selectedServer.envCode]}
                />
                <Info
                  label="OS"
                  value={`${codeLabels.osType[selectedServer.osTypeCode]} ${selectedServer.osVersion}`}
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    updateServer(selectedServer.serverId, {
                      statusCode:
                        selectedServer.statusCode === "NORMAL"
                          ? "MAINTENANCE"
                          : "NORMAL",
                    });
                    setMessage("서버 상태가 변경되었습니다.");
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
                >
                  <Edit2 size={16} />
                  상태 변경
                </button>
                <button
                  onClick={() => handleDeleteServer(selectedServer)}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100"
                >
                  <Trash2 size={16} />
                  삭제
                </button>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h4 className="font-semibold text-gray-900">연결 서비스</h4>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {selectedServices.length}
                </span>
              </div>
              <div className="max-h-[280px] space-y-2 overflow-auto">
                {selectedServices.map((service) => (
                  <div
                    key={service.serviceId}
                    className="rounded-lg border border-gray-200 px-4 py-3"
                  >
                    <div className="font-semibold text-gray-900">
                      {service.serviceName}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {service.serviceCode} ·{" "}
                      {codeLabels.serviceStatus[service.statusCode]}
                    </div>
                  </div>
                ))}
                {selectedServices.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                    이 서버에 연결된 서비스가 없습니다.
                  </div>
                )}
              </div>
            </section>
          </aside>
        )}
      </section>

      {message && (
        <div className="fixed bottom-5 right-5 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          {message}
        </div>
      )}
    </div>
  );
}

function ServerForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: {
    serverName: string;
    hostName: string;
    ipAddress: string;
    envCode: EnvCode;
    osTypeCode: OsTypeCode;
    osVersion: string;
    statusCode: ServerStatusCode;
    description: string;
  }) => void;
  onCancel: () => void;
}) {
  const [serverName, setServerName] = useState("");
  const [hostName, setHostName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [envCode, setEnvCode] = useState<EnvCode>("PROD");
  const [osTypeCode, setOsTypeCode] = useState<OsTypeCode>("LINUX");
  const [osVersion, setOsVersion] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Input
          label="서버명 *"
          value={serverName}
          onChange={setServerName}
          placeholder="prod-was-01"
        />
        <Input
          label="호스트명 *"
          value={hostName}
          onChange={setHostName}
          placeholder="prod-was-01.internal"
        />
        <Input
          label="IP 주소 *"
          value={ipAddress}
          onChange={setIpAddress}
          placeholder="10.0.1.10"
        />
        <Select
          label="환경"
          value={envCode}
          onChange={(value) => setEnvCode(value as EnvCode)}
          options={codeLabels.envType}
        />
        <Select
          label="OS 유형"
          value={osTypeCode}
          onChange={(value) => setOsTypeCode(value as OsTypeCode)}
          options={codeLabels.osType}
        />
        <Input
          label="OS 버전"
          value={osVersion}
          onChange={setOsVersion}
          placeholder="Ubuntu 22.04"
        />
        <div className="md:col-span-3">
          <Input
            label="설명"
            value={description}
            onChange={setDescription}
            placeholder="서버 설명"
          />
        </div>
      </div>
      <div className="mt-5 flex gap-3">
        <button
          onClick={() =>
            onSubmit({
              serverName,
              hostName,
              ipAddress,
              envCode,
              osTypeCode,
              osVersion,
              statusCode: "NORMAL",
              description,
            })
          }
          disabled={!serverName || !hostName || !ipAddress}
          className="rounded-lg bg-[#f60] px-5 py-2 text-white hover:bg-[#e65c00] disabled:opacity-40"
        >
          등록
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg bg-gray-100 px-5 py-2 text-gray-700 hover:bg-gray-200"
        >
          취소
        </button>
      </div>
    </div>
  );
}
