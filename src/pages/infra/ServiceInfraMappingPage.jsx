import { useMemo, useState } from "react";
import { Eye, RotateCcw, Save, Server, X } from "lucide-react";
import { AppShell } from "../../components/AppShell.jsx";
import { ModalBackdrop } from "../../components/ModalBackdrop.jsx";
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
  const { services, servers, updateService, remoteApi } = usePortalData();
  const isDataLoading =
    remoteApi.initialLoading ||
    (remoteApi.status.state === "loading" && remoteApi.status.source === "snapshot");
  const [keyword, setKeyword] = useState("");
  const [serverFilter, setServerFilter] = useState("");
  const [mappingFilter, setMappingFilter] = useState("");
  const [draftServerIds, setDraftServerIds] = useState({});
  const [detailServiceId, setDetailServiceId] = useState(null);
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
  const detailRow = rows.find(
    (row) => row.service.serviceId === detailServiceId
  );
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
          {isDataLoading ? (
            <div className="inline-data-loader" role="status" aria-live="polite">
              <span className="portal-initial-loader__ring" aria-hidden="true" />
              <strong>배치 현황을 불러오는 중입니다.</strong>
            </div>
          ) : (
            <>
              <div><b>{services.length}</b><span>전체 서비스</span></div>
              <div><b>{servers.length}</b><span>전체 서버</span></div>
              <div><b>{rows.length - unmappedCount}</b><span>인프라 매핑 완료</span></div>
              <div><b>{unmappedCount}</b><span>인프라 미매핑</span></div>
            </>
          )}
        </div>

        <div className="card">
          <table className="tbl service-infra-table">
            <thead>
              <tr>
                <th>서비스</th><th>현재 배치</th><th>매핑 상태</th><th className="col-actions">관리</th>
              </tr>
            </thead>
            <tbody>
              {isDataLoading ? (
                <tr>
                  <td colSpan={4}>
                    <div className="inline-data-loader" role="status" aria-live="polite">
                      <span className="portal-initial-loader__ring" aria-hidden="true" />
                      <strong>서비스 배치 매핑을 불러오는 중입니다.</strong>
                    </div>
                  </td>
                </tr>
              ) : null}
              {!isDataLoading && filteredRows.map((row) => (
                <tr className={row.isDirty ? "is-dirty" : ""} key={row.service.serviceId}>
                  <td>
                    <button
                      className="service-infra-table__service"
                      onClick={() => setDetailServiceId(row.service.serviceId)}
                      type="button"
                    >
                      <b>{row.service.serviceName}</b>
                      <code>{row.service.serviceCode}</code>
                    </button>
                  </td>
                  <td>
                    <b className="service-infra-table__primary">{row.currentServer?.serverName || "서버 미지정"}</b>
                    <span className="service-infra-table__sub">{row.currentServer?.hostName || "배치 정보 없음"}</span>
                  </td>
                  <td>
                    <span className={`pill ${row.hasInfra ? "pill--ok" : "pill--warn"}`}>{row.hasInfra ? "매핑 완료" : "미매핑"}</span>
                    {row.isDirty ? <span className="service-infra-table__changed">변경 대기</span> : null}
                  </td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button
                        aria-label={`${row.service.serviceName} 배치 상세`}
                        className="ibtn"
                        onClick={() => setDetailServiceId(row.service.serviceId)}
                        title="배치 상세"
                        type="button"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isDataLoading && !filteredRows.length ? <tr><td colSpan={4}><div className="empty">조회된 서비스 배치 매핑이 없습니다.</div></td></tr> : null}
            </tbody>
          </table>
          <div className="pager">
            <div className="pager__info">{isDataLoading ? "데이터 조회 중" : `전체 ${filteredRows.length}건 · 서비스의 배포 서버를 기준으로 인프라 노드를 표시합니다.`}</div>
          </div>
        </div>

        {detailRow ? (
          <ServiceMappingDetailModal
            row={detailRow}
            servers={servers}
            onChangeServer={(serverId) => updateDraft(detailRow.service.serviceId, serverId)}
            onClose={() => setDetailServiceId(null)}
            onReset={() => resetDraft(detailRow.service.serviceId)}
            onSave={() => saveRow(detailRow)}
          />
        ) : null}
      </main>
    </AppShell>
  );
}

function ServiceMappingDetailModal({
  onChangeServer,
  onClose,
  onReset,
  onSave,
  row,
  servers,
}) {
  const { service, currentServer, selectedServer } = row;

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal service-mapping-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head">
          <div className="service-mapping-modal__heading">
            <span className="service-mapping-modal__icon" aria-hidden="true"><Server size={18} /></span>
            <div><h3>서비스 배치 상세</h3><span>{service.serviceName}</span></div>
          </div>
          <button aria-label="닫기" className="close" onClick={onClose} type="button"><X size={19} /></button>
        </div>
        <div className="modal__body">
          <section className="service-mapping-modal__section">
            <h4>서비스 정보</h4>
            <dl className="service-mapping-modal__grid">
              <div><dt>서비스 코드</dt><dd><code>{service.serviceCode}</code></dd></div>
              <div><dt>서비스명</dt><dd>{service.serviceName}</dd></div>
              <div className="is-wide"><dt>분류</dt><dd>{service.categoryPath?.join(" / ") || "-"}</dd></div>
            </dl>
          </section>

          <section className="service-mapping-modal__section">
            <div className="service-mapping-modal__section-head">
              <h4>현재 배치 정보</h4>
              <span className={`pill ${row.hasInfra ? "pill--ok" : "pill--warn"}`}>{row.hasInfra ? "매핑 완료" : "미매핑"}</span>
            </div>
            <dl className="service-mapping-modal__grid">
              <div><dt>서버</dt><dd>{currentServer?.serverName || "서버 미지정"}</dd></div>
              <div><dt>호스트</dt><dd>{currentServer?.hostName || "-"}</dd></div>
              <div><dt>환경 / 상태</dt><dd>{currentServer ? `${codeLabels.envType[currentServer.envCode] || currentServer.envCode} / ${codeLabels.serverStatus[currentServer.statusCode] || currentServer.statusCode}` : "-"}</dd></div>
              <div><dt>IP 주소</dt><dd>{currentServer?.ipAddress || "-"}</dd></div>
              <div><dt>인프라 노드</dt><dd>{currentServer?.infraNodeName || "인프라 미매핑"}</dd></div>
              <div><dt>노드 코드</dt><dd>{currentServer?.infraNodeCode || "-"}</dd></div>
            </dl>
          </section>

          <section className="service-mapping-modal__section is-change">
            <div className="service-mapping-modal__section-head">
              <div><h4>배치 서버 변경</h4><p>저장 전까지 실제 배치 정보는 변경되지 않습니다.</p></div>
              {row.isDirty ? <span className="service-infra-table__changed">변경 대기</span> : null}
            </div>
            <label className="service-mapping-modal__select">
              <span>변경할 서버</span>
              <select value={row.selectedServerId || ""} onChange={(event) => onChangeServer(event.target.value)}>
                {servers.map((server) => (
                  <option key={server.serverId} value={server.serverId}>
                    {server.serverName} · {codeLabels.envType[server.envCode] || server.envCode} · {server.infraNodeName || "인프라 미매핑"}
                  </option>
                ))}
              </select>
            </label>
            <div className="service-mapping-modal__selection">
              <span>선택 결과</span>
              <strong>{formatServer(selectedServer)}</strong>
              <small>{formatInfra(selectedServer)}</small>
            </div>
          </section>
        </div>
        <div className="modal__foot">
          <button className="btn" disabled={!row.isDirty} onClick={onReset} type="button"><RotateCcw size={15} /> 되돌리기</button>
          <button className="btn" onClick={onClose} type="button">닫기</button>
          <button className="btn btn--primary" disabled={!row.isDirty} onClick={onSave} type="button"><Save size={15} /> 저장</button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
