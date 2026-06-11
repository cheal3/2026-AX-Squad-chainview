import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Eye, Pencil, Plus, Search, Server as ServerIcon, Trash2 } from "lucide-react";
import { usePortalData } from "../PortalDataStore";
import { PageHeader } from "../components/PageHeader";
import { TableActionButton } from "../components/TableActionButton";
import {
  codeLabels,
  type EnvCode,
  type OsTypeCode,
  type ServerRecord,
  type ServerStatusCode,
} from "../mockData";
import { Info, Input, Modal, Select, SelectBox } from "../components/PortalUi";

export function ServerPortal() {
  const { servers, services, addServer, updateServer, deleteServer } =
    usePortalData();
  const [query, setQuery] = useState("");
  const [envFilter, setEnvFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [detailServerId, setDetailServerId] = useState<number | null>(null);
  const [editServerId, setEditServerId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
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

  const detailServer =
    servers.find((server) => server.serverId === detailServerId) ?? null;
  const editServer =
    servers.find((server) => server.serverId === editServerId) ?? null;

  const getServiceCount = (serverId: number) =>
    services.filter((service) => service.serverId === serverId).length;

  const handleDelete = (server: ServerRecord) => {
    const result = deleteServer(server.serverId);
    setMessage(result.message);
    if (result.ok) {
      setDetailServerId(null);
      setEditServerId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader
        description="목록에서 서버를 찾고 상세보기, 수정, 삭제를 바로 실행합니다."
        icon={<ServerIcon />}
        title="서버 관리"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus size={16} />
            서버 등록
          </button>
        }
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 lg:grid-cols-[minmax(260px,1fr)_180px_180px]">
          <label className="relative block">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="서버명, 호스트명, IP 검색"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />
          </label>
          <SelectBox
            value={envFilter}
            onChange={setEnvFilter}
            options={{ ALL: "전체 환경", ...codeLabels.envType }}
          />
          <SelectBox
            value={statusFilter}
            onChange={setStatusFilter}
            options={{ ALL: "전체 상태", ...codeLabels.serverStatus }}
          />
        </div>

        <div className="overflow-auto">
          <table className="w-full min-w-[1320px]">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-black text-slate-400">
              <tr>
                <Th className="w-[260px]">서버명</Th>
                <Th className="w-[340px]">호스트/IP</Th>
                <Th className="w-[140px]">환경</Th>
                <Th className="w-[260px]">OS</Th>
                <Th className="w-[130px]">상태</Th>
                <Th align="right" className="w-[110px]">서비스 수</Th>
                <Th align="right" className="sticky right-0 z-10 w-[210px] bg-slate-50 px-3 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)]">작업</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredServers.map((server) => (
                <tr key={server.serverId} className="group hover:bg-gray-50">
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="font-semibold text-gray-900">
                      {server.serverName}
                    </div>
                    <div className="text-sm text-gray-500">
                      #{server.serverId}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                    <div>{server.hostName}</div>
                    <div className="text-gray-500">{server.ipAddress}</div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                    {codeLabels.envType[server.envCode]}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                    {codeLabels.osType[server.osTypeCode]} {server.osVersion}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <BadgeText>{codeLabels.serverStatus[server.statusCode]}</BadgeText>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold">
                    {getServiceCount(server.serverId)}
                  </td>
                  <td className="sticky right-0 z-10 w-[210px] whitespace-nowrap bg-white px-3 py-4 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)] group-hover:bg-gray-50">
                    <div className="flex flex-nowrap justify-end gap-1.5">
                      <ActionButton onClick={() => setDetailServerId(server.serverId)}>
                        <Eye size={14} />
                        상세
                      </ActionButton>
                      <ActionButton onClick={() => setEditServerId(server.serverId)}>
                        <Pencil size={14} />
                        수정
                      </ActionButton>
                      <TableActionButton
                        onClick={() => handleDelete(server)}
                        tone="danger"
                      >
                        <Trash2 size={14} />
                        삭제
                      </TableActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredServers.length === 0 && (
            <div className="p-10 text-center text-sm text-gray-500">
              조건에 맞는 서버가 없습니다.
            </div>
          )}
        </div>
      </section>

      <Modal
        open={showCreate}
        title="서버 등록"
        onClose={() => setShowCreate(false)}
        maxWidth="max-w-2xl"
      >
        <ServerForm
          submitLabel="등록"
          onCancel={() => setShowCreate(false)}
          onSubmit={(input) => {
            addServer(input);
            setShowCreate(false);
            setMessage("서버가 등록되었습니다.");
          }}
        />
      </Modal>

      <Modal
        open={!!editServer}
        title="서버 수정"
        onClose={() => setEditServerId(null)}
        maxWidth="max-w-2xl"
      >
        {editServer && (
          <ServerForm
            initialValue={editServer}
            submitLabel="저장"
            onCancel={() => setEditServerId(null)}
            onSubmit={(input) => {
              updateServer(editServer.serverId, input);
              setEditServerId(null);
              setMessage("서버 정보가 수정되었습니다.");
            }}
          />
        )}
      </Modal>

      <Modal
        open={!!detailServer}
        title="서버 상세"
        onClose={() => setDetailServerId(null)}
        maxWidth="max-w-2xl"
      >
        {detailServer && (
          <ServerDetail
            server={detailServer}
            services={services.filter(
              (service) => service.serverId === detailServer.serverId
            )}
          />
        )}
      </Modal>

      {message && (
        <div className="fixed bottom-5 right-5 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          {message}
        </div>
      )}
    </div>
  );
}

function ServerForm({
  initialValue,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialValue?: ServerRecord;
  submitLabel: string;
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
  const [serverName, setServerName] = useState(initialValue?.serverName ?? "");
  const [hostName, setHostName] = useState(initialValue?.hostName ?? "");
  const [ipAddress, setIpAddress] = useState(initialValue?.ipAddress ?? "");
  const [envCode, setEnvCode] = useState<EnvCode>(
    initialValue?.envCode ?? "PROD"
  );
  const [osTypeCode, setOsTypeCode] = useState<OsTypeCode>(
    initialValue?.osTypeCode ?? "LINUX"
  );
  const [statusCode, setStatusCode] = useState<ServerStatusCode>(
    initialValue?.statusCode ?? "NORMAL"
  );
  const [osVersion, setOsVersion] = useState(initialValue?.osVersion ?? "");
  const [description, setDescription] = useState(
    initialValue?.description ?? ""
  );

  return (
    <div className="space-y-8">
      <FormSection title="기본 정보">
        <Input label="서버명 *" value={serverName} onChange={setServerName} />
        <Input label="호스트명 *" value={hostName} onChange={setHostName} />
        <Input label="IP 주소 *" value={ipAddress} onChange={setIpAddress} />
      </FormSection>
      <FormSection title="운영 정보">
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
        <Input label="OS 버전" value={osVersion} onChange={setOsVersion} />
        <Select
          label="상태"
          value={statusCode}
          onChange={(value) => setStatusCode(value as ServerStatusCode)}
          options={codeLabels.serverStatus}
        />
        <Input label="설명" value={description} onChange={setDescription} />
      </FormSection>
      <FormActions
        submitLabel={submitLabel}
        disabled={!serverName || !hostName || !ipAddress}
        onCancel={onCancel}
        onSubmit={() =>
          onSubmit({
            serverName,
            hostName,
            ipAddress,
            envCode,
            osTypeCode,
            osVersion,
            statusCode,
            description,
          })
        }
      />
    </div>
  );
}

function ServerDetail({
  server,
  services,
}: {
  server: ServerRecord;
  services: ReturnType<typeof usePortalData>["services"];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Info label="서버명" value={server.serverName} />
        <Info label="호스트명" value={server.hostName} />
        <Info label="IP" value={server.ipAddress} />
        <Info label="환경" value={codeLabels.envType[server.envCode]} />
        <Info
          label="OS"
          value={`${codeLabels.osType[server.osTypeCode]} ${server.osVersion}`}
        />
        <Info label="상태" value={codeLabels.serverStatus[server.statusCode]} />
      </div>
      <div>
        <h5 className="mb-3 font-semibold text-gray-900">연결 서비스</h5>
        <div className="space-y-2">
          {services.map((service) => (
            <div
              key={service.serviceId}
              className="rounded-lg border border-gray-200 px-4 py-3"
            >
              <div className="font-semibold text-gray-900">
                {service.serviceName}
              </div>
              <div className="text-sm text-gray-500">
                {service.serviceCode} ·{" "}
                {codeLabels.serviceStatus[service.statusCode]}
              </div>
            </div>
          ))}
          {services.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
              연결된 서비스가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
  className = "",
}: {
  children: string;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={`whitespace-nowrap px-5 py-3 text-xs font-black text-slate-400 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

function ActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <TableActionButton onClick={onClick} tone="neutral">
      {children}
    </TableActionButton>
  );
}

function BadgeText({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-w-fit whitespace-nowrap break-keep rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold leading-none text-slate-700">
      {children}
    </span>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h5 className="mb-4 border-b border-gray-200 pb-2 font-semibold text-gray-900">
        {title}
      </h5>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FormActions({
  submitLabel,
  disabled,
  onSubmit,
  onCancel,
}: {
  submitLabel: string;
  disabled: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
      <button
        onClick={onCancel}
        className="rounded-lg bg-gray-100 px-5 py-2 text-gray-700 hover:bg-gray-200"
      >
        취소
      </button>
      <button
        onClick={onSubmit}
        disabled={disabled}
        className="rounded-lg bg-[#2563eb] px-5 py-2 text-white hover:bg-[#1d4ed8] disabled:opacity-40"
      >
        {submitLabel}
      </button>
    </div>
  );
}
