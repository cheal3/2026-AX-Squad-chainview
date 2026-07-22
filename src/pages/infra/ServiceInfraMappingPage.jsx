import { useMemo, useState } from "react";
import { AppShell } from "../../components/AppShell.jsx";
import { usePortalData } from "../../dashboardModule/PortalDataStore";
import { codeLabels } from "../../dashboardModule/mockData";
import { matchesSearchText, searchableText } from "../../utils/search";

function formatServer(server) {
  if (!server) {
    return "서버 미지정";
  }
  return `${server.serverName} (${server.hostName})`;
}

function formatInfra(server) {
  if (!server?.infraNodeId) {
    return "인프라 미매핑";
  }
  return `${server.infraNodeName || "인프라 노드"} ${server.infraNodeCode ? `(${server.infraNodeCode})` : ""}`.trim();
}

export function ServiceInfraMappingPage() {
  const { services, servers, updateService } = usePortalData();
  const [keyword, setKeyword] = useState("");
  const [serverFilter, setServerFilter] = useState("");
  const [mappingFilter, setMappingFilter] = useState("");
  const [draftServerIds, setDraftServerIds] = useState({});
  const serverById = useMemo(
    () => new Map(servers.map((server) => [Number(server.serverId), server])),
    [servers]
  );
  const rows = useMemo(
    () =>
      services.map((service) => {
        const draftServerId = draftServerIds[service.serviceId];
        const selectedServerId = draftServerId ? Number(draftServerId) : Number(service.serverId);
        const currentServer = serverById.get(Number(service.serverId));
        const selectedServer = serverById.get(selectedServerId);
        return {
          service,
          currentServer,
          selectedServer,
          selectedServerId,
          isDirty: selectedServerId !== Number(service.serverId),
          hasInfra: Boolean(selectedServer?.infraNodeId),
        };
      }),
    [draftServerIds, serverById, services]
  );
  const filteredRows = rows.filter(({ service, currentServer, selectedServer, hasInfra }) => {
    const haystack = searchableText(
      service.serviceCode,
      service.serviceName,
      service.categoryPath?.join(" "),
      currentServer?.serverName,
      currentServer?.hostName,
      selectedServer?.serverName,
      selectedServer?.infraNodeCode,
      selectedServer?.infraNodeName,
    );
    if (!matchesSearchText(haystack, keyword)) return false;
    if (serverFilter && Number(service.serverId) !== Number(serverFilter)) return false;
    if (mappingFilter === "mapped" && !hasInfra) return false;
    if (mappingFilter === "unmapped" && hasInfra) return false;
    return true;
  });
  const unmappedCount = rows.filter((row) => !row.hasInfra).length;
  const dirtyCount = rows.filter((row) => row.isDirty).length;
  const updateDraft = (serviceId, serverId) => {
    setDraftServerIds((current) => ({ ...current, [serviceId]: serverId }));
  };
  const resetDraft = (serviceId) => {
    setDraftServerIds((current) => {
      const next = { ...current };
      delete next[serviceId];
      return next;
    });
  };
  const saveRow = (row) => {
    updateService(row.service.serviceId, {
      serverId: Number(row.selectedServerId),
      deployPath: row.service.deployPath,
      portInfo: row.service.portInfo,
    });
    resetDraft(row.service.serviceId);
  };

  return (
    <AppShell activeMenu="service-infra-mapping">
      <main className="main infra-page service-infra-page">
        <div className="page-header-stack">
          <div className="crumb crumb--standardized"><span>인프라</span><span className="sep">/</span><span>서비스 배치 매핑</span></div>
          <div className="page-head page-head--standardized">
            <div>
              <h1 className="page-head__title"><span className="page-head__icon" aria-hidden="true">🧭</span><span>서비스 배치 매핑</span></h1>
            </div>
            <div className="page-head__right">
              <span className="service-infra-page__metric">미매핑 {unmappedCount}건</span>
              <span className="service-infra-page__metric is-dirty">변경 대기 {dirtyCount}건</span>
            </div>
          </div>
        </div>

        <div className="toolbar">
          <div className="search">🔍<input type="text" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="서비스, 서버, 인프라 검색..." /></div>
          <select value={serverFilter} onChange={(event) => setServerFilter(event.target.value)}>
            <option value="">배포 서버 전체</option>
            {servers.map((server) => <option key={server.serverId} value={server.serverId}>{formatServer(server)}</option>)}
          </select>
          <select value={mappingFilter} onChange={(event) => setMappingFilter(event.target.value)}>
            <option value="">인프라 매핑 전체</option>
            <option value="mapped">매핑 완료</option>
            <option value="unmapped">미매핑</option>
          </select>
          <div className="right"><button className="btn btn--ghost btn--sm" onClick={() => { setKeyword(""); setServerFilter(""); setMappingFilter(""); }} type="button">초기화</button></div>
        </div>

        <div className="service-infra-page__summary">
          <div><b>{services.length}</b><span>전체 서비스</span></div>
          <div><b>{servers.length}</b><span>전체 서버</span></div>
          <div><b>{rows.length - unmappedCount}</b><span>인프라 매핑 완료</span></div>
          <div><b>{unmappedCount}</b><span>인프라 미매핑</span></div>
        </div>

        <div className="card">
          <table className="tbl service-infra-table">
            <thead>
              <tr>
                <th>서비스</th><th>분류</th><th>현재 서버</th><th>인프라 노드</th><th>배치 서버 변경</th><th className="col-actions">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr className={row.isDirty ? "is-dirty" : ""} key={row.service.serviceId}>
                  <td>
                    <code>{row.service.serviceCode}</code>
                    <b>{row.service.serviceName}</b>
                  </td>
                  <td>{row.service.categoryPath?.join(" / ") || "-"}</td>
                  <td>{formatServer(row.currentServer)}</td>
                  <td>
                    <span className={`pill ${row.hasInfra ? "pill--ok" : "pill--warn"}`}>{row.hasInfra ? "매핑 완료" : "미매핑"}</span>
                    <span className="service-infra-table__sub">{formatInfra(row.selectedServer)}</span>
                  </td>
                  <td>
                    <select value={row.selectedServerId || ""} onChange={(event) => updateDraft(row.service.serviceId, event.target.value)}>
                      {servers.map((server) => (
                        <option key={server.serverId} value={server.serverId}>
                          {server.serverName} · {codeLabels.envType[server.envCode] || server.envCode} · {server.infraNodeName || "인프라 미매핑"}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button className="ibtn" disabled={!row.isDirty} onClick={() => saveRow(row)} title="저장" type="button">💾</button>
                      <button className="ibtn" disabled={!row.isDirty} onClick={() => resetDraft(row.service.serviceId)} title="되돌리기" type="button">↩</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredRows.length ? <tr><td colSpan={6}><div className="empty">조회된 서비스 배치 매핑이 없습니다.</div></td></tr> : null}
            </tbody>
          </table>
          <div className="pager">
            <div className="pager__info">전체 {filteredRows.length}건 · 서비스의 배포 서버를 기준으로 인프라 노드를 표시합니다.</div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
