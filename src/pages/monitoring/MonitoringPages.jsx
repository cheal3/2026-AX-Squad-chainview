import { useEffect, useMemo, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AppShell } from "../../components/AppShell.jsx";
import { ModalBackdrop } from "../../components/ModalBackdrop.jsx";
import { PAGE_SIZE, Pagination } from "../../components/Pagination.jsx";
import { usePortalData } from "../../dashboardModule/PortalDataStore";
import { IncidentDemoDashboard } from "../../dashboardModule/pages/IncidentDemoDashboard";
import { ServiceRelationFlow } from "../../dashboardModule/pages/ServiceRelationFlow";
import { codeLabels } from "../../dashboardModule/mockData";
import { matchesSearchText, searchableText } from "../../utils/search";

const staticIncidentRows = [
  {
    code: "INC-2026-0142",
    endedAt: "",
    impactCount: 4,
    incidentTypeLabel: "장애",
    severityCode: "CRITICAL",
    severityLabel: "치명",
    startedAt: "2026-06-01 14:02",
    statusCode: "OPEN",
    targetCode: "EXT-001",
    targetLabel: "SERVICE · EXT-001",
    title: "카드승인연계 응답지연 (P99 > 3s)",
  },
  {
    code: "INC-2026-0141",
    endedAt: "",
    impactCount: 3,
    incidentTypeLabel: "성능저하",
    severityCode: "MAJOR",
    severityLabel: "높음",
    startedAt: "2026-06-01 13:48",
    statusCode: "IN_PROGRESS",
    targetCode: "DEP-001",
    targetLabel: "SERVICE · DEP-001",
    title: "예금이체 TPS 30% 하락",
  },
  {
    code: "INC-2026-0140",
    endedAt: "",
    impactCount: 2,
    incidentTypeLabel: "성능저하",
    severityCode: "MINOR",
    severityLabel: "중간",
    startedAt: "2026-06-01 13:25",
    statusCode: "OPEN",
    targetCode: "WAS-PRD-12",
    targetLabel: "SERVER · WAS-PRD-12",
    title: "WAS CPU 사용률 92% 지속",
  },
  {
    code: "INC-2026-0139",
    endedAt: "2026-06-01 03:10",
    impactCount: 0,
    incidentTypeLabel: "점검",
    severityCode: "NOTICE",
    severityLabel: "정보",
    startedAt: "2026-06-01 02:00",
    statusCode: "RESOLVED",
    targetCode: "NOTI-001",
    targetLabel: "SERVICE · NOTI-001",
    title: "알림서비스 정기점검 완료",
  },
  {
    code: "INC-2026-0138",
    endedAt: "2026-05-31 23:40",
    impactCount: 1,
    incidentTypeLabel: "보안",
    severityCode: "MAJOR",
    severityLabel: "높음",
    startedAt: "2026-05-31 22:14",
    statusCode: "CLOSED",
    targetCode: "AUTH-001",
    targetLabel: "SERVICE · AUTH-001",
    title: "비정상 로그인 시도 다발",
  },
];

export function IncidentAdminPage() {
  const navigate = useNavigate();
  const portalData = usePortalData();
  const [keyword, setKeyword] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [incidentTypeFilter, setIncidentTypeFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingIncident, setEditingIncident] = useState(null);
  const [deletingIncident, setDeletingIncident] = useState(null);
  const [selectedIncidentRowKeys, setSelectedIncidentRowKeys] = useState([]);
  const [page, setPage] = useState(1);
  const isTableLoading =
    portalData.remoteApi.initialLoading ||
    (portalData.remoteApi.status.state === "loading" &&
      portalData.remoteApi.status.source === "snapshot");
  const serviceById = useMemo(
    () => new Map(portalData.services.map((service) => [service.serviceId, service])),
    [portalData.services]
  );
  const dynamicRows = portalData.incidents.map((incident) => {
    const service = incident.serviceId ? serviceById.get(incident.serviceId) : undefined;
    const targetCode = incident.targetCode || service?.serviceCode || "-";
    const targetLabel = incident.targetLabel || `${incident.incidentTypeCode} · ${targetCode}`;

    return {
      code: incident.externalIncidentCode || `INC-${String(incident.incidentId).padStart(4, "0")}`,
      endedAt: incident.endedAt || "",
      impactCount: portalData.incidentImpacts.filter((impact) => impact.incidentId === incident.incidentId).length,
      incident,
      incidentTypeLabel: incident.incidentTypeCode === "SERVER" ? "장애" : "장애",
      severityCode: incident.severityCode,
      severityLabel: severityLabelFor(incident.severityCode),
      source: "dynamic",
      startedAt: incident.startedAt,
      statusCode: incident.incidentStatusCode,
      targetCode,
      targetLabel,
      title: incident.title,
    };
  });
  const rows = portalData.remoteApi.enabled
    ? dynamicRows
    : dynamicRows.length
      ? dynamicRows
      : staticIncidentRows.map((row) => ({ ...row, source: "static" }));
  const incidentTypeOptions = useMemo(
    () => uniqueIncidentOptions(rows, "incidentTypeLabel"),
    [rows]
  );
  const severityOptions = useMemo(
    () => uniqueIncidentOptions(rows, "severityCode", "severityLabel"),
    [rows]
  );
  const statusOptions = useMemo(
    () => uniqueIncidentOptions(rows, "statusCode"),
    [rows]
  );
  const filteredRows = rows.filter((row) => {
    if (incidentTypeFilter && row.incidentTypeLabel !== incidentTypeFilter) return false;
    if (severityFilter && row.severityCode !== severityFilter) return false;
    if (statusFilter && row.statusCode !== statusFilter) return false;
    return matchesSearchText(
      searchableText(
        row.code,
        row.incidentTypeLabel,
        row.severityLabel,
        row.statusCode,
        row.targetCode,
        row.targetLabel,
        row.title
      ),
      keyword
    );
  });
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filteredRowKeys = useMemo(
    () => filteredRows.map((row) => incidentRowKey(row)),
    [filteredRows]
  );
  const pagedRowKeys = useMemo(
    () => pagedRows.map((row) => incidentRowKey(row)),
    [pagedRows]
  );
  const isAllChecked =
    pagedRowKeys.length > 0 &&
    pagedRowKeys.every((key) => selectedIncidentRowKeys.includes(key));
  const toggleAllRows = (checked) => {
    if (!checked) {
      setSelectedIncidentRowKeys((current) =>
        current.filter((key) => !pagedRowKeys.includes(key))
      );
      return;
    }

    setSelectedIncidentRowKeys((current) =>
      Array.from(new Set([...current, ...pagedRowKeys]))
    );
  };
  const toggleRow = (key, checked) => {
    setSelectedIncidentRowKeys((current) =>
      checked
        ? Array.from(new Set([...current, key]))
        : current.filter((selectedKey) => selectedKey !== key)
    );
  };

  useEffect(() => {
    setSelectedIncidentRowKeys((current) => {
      const next = current.filter((key) => filteredRowKeys.includes(key));
      return next.length === current.length ? current : next;
    });
  }, [filteredRowKeys]);

  useEffect(() => {
    setPage(1);
  }, [incidentTypeFilter, keyword, severityFilter, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const openIncident = (row) => {
    if (row.endedAt) {
      return;
    }

    if (row.incident) {
      navigate(`/dashboard?incidentId=${row.incident.incidentId}`);
      return;
    }

    const service =
      portalData.services.find((item) => item.serviceCode === row.targetCode) ??
      portalData.services[0];
    const existing = portalData.incidents.find((incident) => incident.externalIncidentCode === row.code);
    const incident =
      existing ??
      portalData.createIncident({
        serviceId: service?.serviceId ?? 1,
        severityCode: row.severityCode,
        externalIncidentCode: row.code,
        targetCode: row.targetCode,
        targetLabel: row.targetLabel,
        title: row.title,
        description: `${row.code} 관리 화면에서 선택한 인시던트입니다.`,
        startedAt: row.startedAt,
        manualRegisteredYn: "Y",
        registeredBy: "admin",
      });

    navigate(`/dashboard?incidentId=${incident.incidentId}`);
  };

  const handleCreateIncident = () => {
    const service = portalData.services[0];
    const nextSeq =
      portalData.incidents.reduce((maxSeq, incident) => {
        const [, seqText] =
          incident.externalIncidentCode?.match(/^INC-\d{4}-(\d+)$/) ?? [];
        const seq = Number(seqText);
        return Number.isFinite(seq) ? Math.max(maxSeq, seq) : maxSeq;
      }, 142) + 1;

    const incident = portalData.createIncident({
      serviceId: service?.serviceId ?? 1,
      severityCode: "MAJOR",
      externalIncidentCode: `INC-2026-${String(nextSeq).padStart(4, "0")}`,
      targetCode: service?.serviceCode ?? "SVC-001",
      targetLabel: `SERVICE · ${service?.serviceCode ?? "SVC-001"}`,
      title: `${service?.serviceName ?? "대표 서비스"} 시연용 인시던트`,
      description: "시연을 위한 수동 등록 인시던트입니다.",
      manualRegisteredYn: "Y",
      registeredBy: "admin",
    });

    navigate(`/dashboard?incidentId=${incident.incidentId}`);
  };

  return (
    <>
      <div className="page-header-stack">
        <div className="crumb crumb--standardized">
          <span>모니터링</span><span className="sep">/</span><span>인시던트 현황</span>
        </div>

        <div className="page-head page-head--standardized">
          <div>
            <h1 className="page-head__title"><span className="page-head__icon" aria-hidden="true">🚨</span><span>인시던트 현황</span></h1>
          </div>
          <div className="page-head__right">
            <button className="btn">📥 CSV 내보내기</button>
            <button className="btn btn--primary" onClick={handleCreateIncident} type="button">＋ 인시던트 등록</button>
          </div>
        </div>
      </div>

      <div className={`toolbar toolbar--admin${advancedOpen ? " is-expanded" : ""}`}>
        <div className="search"><Search size={15} aria-hidden="true" /><input type="text" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="ID, 제목, 대상 검색..." /></div>
        <button className="btn btn--dark toolbar-filter-button" onClick={() => setAdvancedOpen((current) => !current)} type="button">
          <Filter size={15} aria-hidden="true" /> 고급 필터
        </button>
        <div className="right"><button className="btn toolbar-reset-button" onClick={() => { setKeyword(""); setIncidentTypeFilter(""); setSeverityFilter(""); setStatusFilter(""); setAdvancedOpen(false); }} type="button">초기화</button></div>
        {advancedOpen ? (
          <div className="advanced-filter-row">
            <select value={incidentTypeFilter} onChange={(event) => setIncidentTypeFilter(event.target.value)}>
              <option value="">장애 유형 전체</option>
              {incidentTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
              <option value="">심각도 전체</option>
              {severityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">상태 전체</option>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <button className="btn btn--wide-reset" onClick={() => { setIncidentTypeFilter(""); setSeverityFilter(""); setStatusFilter(""); }} type="button"><X size={15} aria-hidden="true" /> 필터 초기화</button>
          </div>
        ) : null}
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th className="col-check">
                <input
                  type="checkbox"
                  className="chk"
                  checked={isAllChecked}
                  disabled={filteredRowKeys.length === 0}
                  onChange={(event) => toggleAllRows(event.target.checked)}
                />
              </th>
              <th>인시던트 ID</th><th>유형</th><th>심각도</th><th>상태</th>
              <th>대상</th><th>인시던트명</th><th>영향서비스</th>
              <th>발생 일시</th><th>종료 일시</th>
              <th className="col-actions">관리</th>
            </tr>
          </thead>
          <tbody>
            {isTableLoading ? (
              <tr>
                <td colSpan={11}>
                  <div className="inline-data-loader" role="status" aria-live="polite">
                    <span className="portal-initial-loader__ring" aria-hidden="true" />
                    <strong>인시던트 현황을 불러오는 중입니다.</strong>
                  </div>
                </td>
              </tr>
            ) : null}
            {!isTableLoading && pagedRows.map((row) => {
              const isOpen = !row.endedAt;
              const rowKey = incidentRowKey(row);
              return (
                <tr
                  className={isOpen ? "is-clickable-incident" : undefined}
                  key={rowKey}
                  onClick={() => openIncident(row)}
                >
                  <td className="col-check">
                    <input
                      type="checkbox"
                      className="chk"
                      checked={selectedIncidentRowKeys.includes(rowKey)}
                      onChange={(event) => toggleRow(rowKey, event.target.checked)}
                      onClick={(event) => event.stopPropagation()}
                    />
                  </td>
                  <td><code>{row.code}</code></td>
                  <td><span className={`pill ${severityPillClass(row.severityCode)}`}>{row.incidentTypeLabel}</span></td>
                  <td><span className={`pill ${severityPillClass(row.severityCode)}`}>{row.severityLabel}</span></td>
                  <td><span className={`dot ${statusDotClass(row.statusCode, row.endedAt)}`}></span>{row.statusCode}</td>
                  <td>{formatTargetLabel(row.targetLabel, row.targetCode)}</td>
                  <td>{row.title}</td>
                  <td>{row.impactCount}건</td>
                  <td>{row.startedAt}</td>
                  <td>{row.endedAt || "-"}</td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button
                        className="ibtn"
                        disabled={!row.incident}
                        title={row.incident ? "인시던트 수정" : "예시 데이터는 수정할 수 없습니다."}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (row.incident) setEditingIncident(row.incident);
                        }}
                        type="button"
                      >
                        ✏️
                      </button>
                      <button
                        className="ibtn ibtn--danger"
                        disabled={!row.incident}
                        title={row.incident ? "인시던트 삭제" : "예시 데이터는 삭제할 수 없습니다."}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (row.incident) setDeletingIncident(row.incident);
                        }}
                        type="button"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination
          loading={isTableLoading}
          page={currentPage}
          selectedCount={selectedIncidentRowKeys.length}
          setPage={setPage}
          total={filteredRows.length}
        />
      </div>
      {editingIncident ? (
        <IncidentEditModal
          incident={editingIncident}
          onClose={() => setEditingIncident(null)}
          onSave={(input) => {
            portalData.updateIncident(editingIncident.incidentId, input);
            setEditingIncident(null);
          }}
        />
      ) : null}
      {deletingIncident ? (
        <IncidentDeleteModal
          incident={deletingIncident}
          onClose={() => setDeletingIncident(null)}
          onDelete={() => {
            portalData.deleteIncident(deletingIncident.incidentId);
            setDeletingIncident(null);
          }}
        />
      ) : null}
    </>
  );
}

function IncidentEditModal({ incident, onClose, onSave }) {
  const [form, setForm] = useState({
    title: incident.title || "",
    severityCode: incident.severityCode || "MAJOR",
    incidentStatusCode: incident.incidentStatusCode || "OPEN",
    description: incident.description || "",
  });

  return (
    <ModalBackdrop onClose={onClose}>
      <form
        className="modal"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.title.trim()) return;
          onSave({ ...form, title: form.title.trim(), description: form.description.trim() });
        }}
      >
        <div className="modal__head">
          <h3>인시던트 수정</h3>
          <button className="close" onClick={onClose} type="button">×</button>
        </div>
        <div className="modal__body">
          <div className="form-row">
            <label>인시던트 ID</label>
            <input disabled value={incident.externalIncidentCode || incident.incidentId} />
          </div>
          <div className="form-row">
            <label>제목<span className="req">*</span></label>
            <input
              required
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          <div className="form-row">
            <label>심각도</label>
            <select
              value={form.severityCode}
              onChange={(event) => setForm((current) => ({ ...current, severityCode: event.target.value }))}
            >
              <option value="CRITICAL">치명 (CRITICAL)</option>
              <option value="MAJOR">높음 (MAJOR)</option>
              <option value="MINOR">중간 (MINOR)</option>
              <option value="NOTICE">정보 (NOTICE)</option>
            </select>
          </div>
          <div className="form-row">
            <label>상태</label>
            <select
              value={form.incidentStatusCode}
              onChange={(event) => setForm((current) => ({ ...current, incidentStatusCode: event.target.value }))}
            >
              <option value="OPEN">진행중 (OPEN)</option>
              <option value="MONITORING">모니터링 (MONITORING)</option>
            </select>
            <span className="help">종료 처리는 인시던트 종료 버튼을 이용해주세요.</span>
          </div>
          <div className="form-row">
            <label>설명</label>
            <textarea
              rows="4"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>
        </div>
        <div className="modal__foot">
          <button className="btn" onClick={onClose} type="button">취소</button>
          <button className="btn btn--primary" type="submit">저장</button>
        </div>
      </form>
    </ModalBackdrop>
  );
}

function IncidentDeleteModal({ incident, onClose, onDelete }) {
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal confirm">
        <div className="modal__head">
          <h3>인시던트 삭제</h3>
          <button className="close" onClick={onClose} type="button">×</button>
        </div>
        <div className="modal__body">
          <div className="confirm__icon">⚠</div>
          <div className="confirm__msg"><b>{incident.title}</b>을 삭제하시겠습니까?</div>
          <div className="confirm__note">관련 영향 정보와 이벤트 이력도 함께 삭제됩니다.</div>
        </div>
        <div className="modal__foot">
          <button className="btn" onClick={onClose} type="button">취소</button>
          <button className="btn btn--danger" onClick={onDelete} type="button">삭제</button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

function severityLabelFor(severityCode) {
  return {
    CRITICAL: "치명",
    MAJOR: "높음",
    MINOR: "중간",
    NOTICE: "정보",
  }[severityCode] || codeLabels.severity[severityCode] || severityCode;
}

function uniqueIncidentOptions(rows, valueField, labelField = valueField) {
  const optionByValue = new Map();
  rows.forEach((row) => {
    const value = String(row?.[valueField] ?? "").trim();
    if (!value || optionByValue.has(value)) return;
    optionByValue.set(value, {
      value,
      label: String(row?.[labelField] || value),
    });
  });
  return Array.from(optionByValue.values())
    .sort((left, right) => left.label.localeCompare(right.label, "ko"));
}

function severityPillClass(severityCode) {
  if (severityCode === "CRITICAL" || severityCode === "MAJOR") {
    return "pill--crit";
  }

  if (severityCode === "MINOR") {
    return "pill--warn";
  }

  return "pill--gray";
}

function statusDotClass(statusCode, endedAt) {
  if (endedAt || statusCode === "RESOLVED") {
    return "";
  }

  if (statusCode === "CLOSED") {
    return "dot--idle";
  }

  if (statusCode === "IN_PROGRESS" || statusCode === "MONITORING") {
    return "dot--warn";
  }

  return "dot--crit";
}

function formatTargetLabel(targetLabel, targetCode) {
  if (!targetLabel) {
    return <code>{targetCode}</code>;
  }

  const [prefix] = targetLabel.split("·");
  return (
    <>
      {prefix.trim()} · <code>{targetCode}</code>
    </>
  );
}

function incidentRowKey(row) {
  return `${row.source ?? "incident"}-${row.code}-${row.startedAt}`;
}

export function DashboardPage() {
  return <DashboardFrame />;
}

export function TopologyPage() {
  const location = useLocation();
  const { incidents, services } = usePortalData();
  const searchParams = new URLSearchParams(location.search);
  const incidentId = Number(searchParams.get("incidentId")) || undefined;
  const incident =
    incidents.find((item) => item.incidentId === incidentId) ??
    incidents.find((item) => item.incidentStatusCode !== "RESOLVED");
  const initialServiceId =
    Number(searchParams.get("serviceId")) ||
    incident?.serviceId ||
    services[0]?.serviceId;

  return (
    <AppShell activeMenu="relations" isDark={Boolean(incident)}>
      <main className="main chain-dashboard-main topology-page-main">
        <div className="page-header-stack">
          <div className="crumb crumb--standardized">
            <Link to="/dashboard">모니터링</Link><span className="sep">/</span><span>서비스 관계도</span>
          </div>
          <div className="page-head page-head--standardized">
            <div>
              <h1 className="page-head__title"><span className="page-head__icon" aria-hidden="true">🗺️</span><span>{incident ? "장애 영향도 그래프" : "서비스 관계도"}</span></h1>
            </div>
          </div>
        </div>
        {incident ? (
          <IncidentTopologyPrototype incident={incident} service={services.find((item) => item.serviceId === initialServiceId) ?? services[0]} />
        ) : (
          <div className="topology-page-panel">
            <ServiceRelationFlow
              autoCenter
              embedded
              embeddedHeightClassName="h-full"
              frameless
              initialFitView
              initialRelationDepth={1}
              initialServiceId={initialServiceId}
              showAllServices
            />
          </div>
        )}
      </main>
    </AppShell>
  );
}

function IncidentTopologyPrototype({ incident, service }) {
  const serviceName = service?.serviceName ?? "카드승인연계";
  const serviceCode = service?.serviceCode ?? incident.targetCode ?? "EXT-001";
  const category = service?.categoryPath?.join(" / ") ?? "대외계 / 결제 / 승인";
  const elapsedLabel = incident.startedAt ? formatIncidentElapsed(incident.startedAt) : "14:32 경과";

  return (
    <div className="topology-proto topology-proto--embedded topology-proto--dark">
      <main className="topology-proto__canvas-wrap">
        <div className="topology-proto__canvas-top">
          <h1>🎯 {serviceName} <span>· {serviceCode} · {category}</span></h1>
        </div>

        <div className="topology-proto__canvas">
          <svg viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker id="topology-arr-dark" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="#64748b" />
              </marker>
              <marker id="topology-arr-red-dark" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="#ff6673" />
              </marker>
              <marker id="topology-arr-warn-dark" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="#fbbf24" />
              </marker>
            </defs>

            <text x="120" y="42" className="topology-proto__svg-muted">↘ 2-hop 상위</text>
            <text x="330" y="42" className="topology-proto__svg-muted">↘ 직접 수신</text>
            <text x="580" y="42" className="topology-proto__svg-title">선택 서비스</text>
            <text x="830" y="42" className="topology-proto__svg-muted">↗ 직접 발신</text>
            <text x="1060" y="42" className="topology-proto__svg-muted">↗ 2-hop 하위</text>

            <path className="topology-proto__edge" d="M180 200 L320 270 M180 370 L320 270 M180 370 L320 430 M180 540 L320 430" markerEnd="url(#topology-arr-dark)" />
            <path className="topology-proto__edge is-strong" d="M430 285 L560 355 M430 445 L560 385" markerEnd="url(#topology-arr-dark)" />
            <path className="topology-proto__edge is-crit" d="M690 355 L820 200 M690 370 L820 330 M930 200 L1060 160 M930 200 L1060 240" markerEnd="url(#topology-arr-red-dark)" />
            <path className="topology-proto__edge is-warn" d="M930 330 L1060 330" markerEnd="url(#topology-arr-warn-dark)" />
            <path className="topology-proto__edge is-strong" d="M690 385 L820 460 M690 400 L820 590 M930 460 L1060 460 M930 590 L1060 590" markerEnd="url(#topology-arr-dark)" />

            <TopologyNode x={80} y={180} label="고객앱" tone="ok" small />
            <TopologyNode x={80} y={350} label="PC 브라우저" tone="ok" small />
            <TopologyNode x={80} y={520} label="제휴몰" tone="ok" small />
            <TopologyNode x={320} y={252} code="PORTAL-M01" label="모바일포탈" tone="ok" />
            <TopologyNode x={320} y={412} code="PORTAL-W01" label="웹포탈" tone="ok" />
            <TopologyNode x={560} y={335} code={`${serviceCode} · ${category.split(" / ")[0] ?? "대외계"}`} label={serviceName} tone="crit" focus elapsed={elapsedLabel} />
            <TopologyNode x={820} y={180} code="EXT-004" label="카드취소연계" tone="crit" />
            <TopologyNode x={820} y={310} code="EXT-007" label="카드정산연계" tone="crit" />
            <TopologyNode x={820} y={440} code="PAY-HIST" label="결제이력 (DB)" tone="ok" />
            <TopologyNode x={820} y={570} code="NOTI-001" label="알림서비스" tone="ok" />
            <TopologyNode x={1060} y={140} label="취소이력" tone="crit" small />
            <TopologyNode x={1060} y={220} label="고객알림" tone="crit" small />
            <TopologyNode x={1060} y={310} label="정산배치" tone="warn" small />
            <TopologyNode x={1060} y={440} label="BI 리포트" tone="ok" small />
            <TopologyNode x={1060} y={570} label="SMS 게이트웨이" tone="ok" small />
          </svg>
        </div>

        <div className="topology-proto__canvas-bottom">
          <button type="button">＋</button><span>100%</span><button type="button">－</button>
          <button type="button">⤢</button><button type="button">↻</button><button type="button">▦</button>
        </div>

        <div className="topology-proto__hint">
          <span><kbd>드래그</kbd> 화면 이동</span>
          <span><kbd>휠</kbd> 줌</span>
          <span><kbd>클릭</kbd> 노드 포커스</span>
        </div>
      </main>

      <aside className="topology-proto__info">
        <div className="topology-proto__info-head">
          <span />
          <div>
            <h3>{serviceName}</h3>
            <p>{serviceCode} · {category} · SERVICE_TYPE: {service?.serviceTypeCode ?? "API"}</p>
            <b>{incident.externalIncidentCode ?? `INC-${incident.incidentId}`} · {incident.severityCode} · {elapsedLabel}</b>
          </div>
        </div>
        <TopologyInfo title="인시던트 title">{incident.title || "외부 카드사 응답 timeout 다발"} · affectedServices: 2</TopologyInfo>
        <TopologyInfo title="영향 분석">1-hop 영향 2개, 2-hop 전파 3개, 최종 영향 사용자: 카드 결제 시도 고객 전체</TopologyInfo>
        <TopologyInfo title="SERVICE 명세">importance {service?.importanceCode ?? "높음"} · status {service?.statusCode ?? "운영중"} · 인스턴스 {service?.instanceCount ?? 3}대</TopologyInfo>
        <TopologyInfo title="↘ 수신">모바일포탈 (API 호출), 웹포탈 (API 호출)</TopologyInfo>
        <TopologyInfo title="↗ 발신">카드취소연계, 카드정산연계, 결제이력, 알림서비스</TopologyInfo>
      </aside>
    </div>
  );
}

function TopologyFilter({ rows, title }) {
  return (
    <div className="topology-proto__group">
      <div className="topology-proto__group-title">{title}</div>
      {rows.map((row, index) => (
        <button className={`topology-proto__filter${index < 3 ? " is-on" : ""}`} key={row} type="button">{row}</button>
      ))}
    </div>
  );
}

function TopologyNode({ code = "", elapsed = "14:32 경과", focus = false, label, small = false, tone, x, y }) {
  const width = focus ? 130 : small ? 100 : 110;
  const height = focus ? 70 : small ? 36 : 42;
  return (
    <g className={`topology-proto__node is-${tone}${focus ? " is-focus" : ""}`}>
      <rect x={x} y={y} width={width} height={height} rx={focus ? 12 : 7} />
      <circle cx={x + 14} cy={y + height / 2} r={focus ? 6 : 5} />
      <text x={x + 26} y={y + (focus ? 27 : small ? 22 : 18)} className="topology-proto__node-label">{label}</text>
      {code ? <text x={x + 26} y={y + (focus ? 44 : 32)} className="topology-proto__node-code">{code}</text> : null}
      {focus ? (
        <>
          <rect className="topology-proto__node-badge" x={x + 12} y={y + 51} width="58" height="14" rx="7" />
          <text x={x + 41} y={y + 61} className="topology-proto__badge-label" textAnchor="middle">CRITICAL</text>
          <text x={x + 75} y={y + 61} className="topology-proto__elapsed">{elapsed}</text>
        </>
      ) : null}
    </g>
  );
}

function TopologyInfo({ children, title }) {
  return (
    <section className="topology-proto__info-section">
      <h4>{title}</h4>
      <p>{children}</p>
    </section>
  );
}

function DashboardFrame() {
  const location = useLocation();
  const { incidents, remoteApi } = usePortalData();
  const activeIncidentId = Number(new URLSearchParams(location.search).get("incidentId")) || undefined;
  const isIncidentMode = Boolean(
    activeIncidentId &&
      (remoteApi.initialLoading || incidents.some(
        (incident) =>
          incident.incidentId === activeIncidentId &&
          incident.incidentStatusCode !== "RESOLVED"
      ))
  );

  return (
    <AppShell activeMenu="dashboard" isDark={isIncidentMode}>
      <main className="main chain-dashboard-main">
        {!isIncidentMode ? (
          <>
            <div className="crumb crumb--standardized">
              <span>모니터링</span><span className="sep">/</span>
              <span>대시보드</span>
            </div>
            <div className="page-head page-head--standardized">
              <div>
                <h1 className="page-head__title"><span className="page-head__icon" aria-hidden="true">📊</span><span>대시보드</span></h1>
              </div>
            </div>
          </>
        ) : null}
        <div className="chain-dashboard-scope">
          {remoteApi.initialLoading ? (
            <div className="dashboard-data-loader inline-data-loader" role="status" aria-live="polite">
              <span className="portal-initial-loader__ring" aria-hidden="true" />
              <strong>대시보드 데이터를 불러오는 중입니다.</strong>
            </div>
          ) : (
            <IncidentDemoDashboard activeIncidentId={activeIncidentId} />
          )}
        </div>
      </main>
    </AppShell>
  );
}

export function IncidentDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    incidentEvents,
    incidentImpacts,
    incidents,
    owners,
    users,
    groups,
    deployments,
    relations,
    services,
    updateIncidentStatus,
    remoteApi,
  } = usePortalData();
  const [now, setNow] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState("overview");
  const incidentId = Number(new URLSearchParams(location.search).get("incidentId")) || undefined;
  const incident =
    incidents.find((item) => item.incidentId === incidentId) ??
    (!incidentId
      ? incidents.find((item) => item.incidentStatusCode !== "RESOLVED")
      : undefined);
  const incidentServiceId = Number(incident?.serviceId) || 0;
  const incidentTargetCode = String(incident?.targetCode || "");
  const service =
    services.find((item) => Number(item.serviceId) === incidentServiceId) ??
    services.find((item) =>
      [item.serviceCode, item.serviceName].map(String).includes(incidentTargetCode)
    );
  const impactedServices = incidentImpacts
    .filter((impact) => Number(impact.incidentId) === Number(incident?.incidentId))
    .map((impact) => services.find((item) => Number(item.serviceId) === Number(impact.impactedServiceId)))
    .filter(Boolean);
  const relationImpactedServices = buildRelationImpactedServices(service, services, relations);
  const displayImpactedServices = impactedServices.length ? impactedServices : relationImpactedServices;
  const allRelatedRelations = relations.filter(
    (relation) =>
      Number(relation.sourceServiceId) === Number(service?.serviceId) ||
      Number(relation.targetServiceId) === Number(service?.serviceId)
  );
  const relatedRelations = allRelatedRelations.slice(0, 6);
  const relationServiceName = (serviceId) =>
    services.find((item) => Number(item.serviceId) === Number(serviceId))?.serviceName ?? `SERVICE-${serviceId}`;
  const elapsedLabel = incident?.startedAt ? formatIncidentElapsed(incident.startedAt, now) : "00:00:00";
  const affectedServiceCount = Math.max(displayImpactedServices.length, allRelatedRelations.length);
  const timelineRows = incidentEvents
    .filter((event) => event.incidentId === incident?.incidentId)
    .map((event) => [event.createdAt?.slice(11, 16) || "-", event.message, event.actor]);
  const recentDeploymentRows = deployments
    .filter((deployment) => Number(deployment.serviceId) === Number(service?.serviceId))
    .slice(0, 5)
    .map((deployment) => ({
      date: String(deployment.deployedAt ?? deployment.updatedAt ?? deployment.createdAt ?? "-").slice(0, 10),
      title: String(deployment.versionText ?? deployment.releaseVersion ?? deployment.deployPath ?? "배포 정보"),
      owner: String(deployment.deployedBy ?? deployment.updatedBy ?? "-"),
      status: String(deployment.deploymentStatusName ?? deployment.deploymentStatusCode ?? "-"),
    }));
  const incidentOwners = owners
    .filter(
      (owner) =>
        Number(owner.serviceId) === Number(service?.serviceId) ||
        (owner.serviceCode && owner.serviceCode === service?.serviceCode)
    )
    .map((owner) => {
      const user = users.find((item) => Number(item.userId) === Number(owner.userId));
      const group = groups.find((item) => Number(item.groupId) === Number(owner.groupId));
      const name = owner.ownerName || String(user?.userName ?? group?.groupName ?? "담당자 미등록");
      const organization = String(
        user?.departmentName ?? user?.orgName ?? group?.groupName ??
        (owner.ownerTypeCode === "GROUP" ? "담당 그룹" : "담당자")
      );
      return {
        id: owner.serviceOwnerId,
        name,
        role: codeLabels.responsibilityType[owner.responsibilityCode] || owner.responsibilityCode,
        organization,
        email: String(user?.email ?? ""),
      };
    });
  const notificationRows = buildIncidentNotificationRows({
    impactedServices: displayImpactedServices,
    incident,
    owners: incidentOwners,
    service,
  });
  const generatedProgressRows = buildIncidentProgressRows({
    deployments: recentDeploymentRows,
    impactedServices: displayImpactedServices,
    incident,
    notificationRows,
    owners: incidentOwners,
    relatedRelations: allRelatedRelations,
    service,
    timelineRows,
  });
  const ownerHistoryRows = buildIncidentOwnerHistoryRows({
    incident,
    notificationRows,
    owners: incidentOwners,
    service,
  });
  const successfulNotificationCount = notificationRows.filter((row) => row.status === "성공").length;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (remoteApi.initialLoading) {
    return (
      <AppShell activeMenu="incidents" isDark>
        <main className="main chain-dashboard-main incident-detail-page">
          <section className="incident-detail__loading">
            <div className="inline-data-loader" role="status" aria-live="polite">
              <span className="portal-initial-loader__ring" aria-hidden="true" />
              <strong>인시던트 상세 정보를 불러오는 중입니다.</strong>
            </div>
          </section>
        </main>
      </AppShell>
    );
  }

  if (!incident) {
    return (
      <AppShell activeMenu="incidents" isDark>
        <main className="main chain-dashboard-main incident-detail-page">
          <div className="incident-detail__empty">조회된 인시던트가 없습니다.</div>
        </main>
      </AppShell>
    );
  }

  const resolveIncident = () => {
    if (
      !incident.incidentId ||
      !window.confirm(`${incident.title} 인시던트를 종료 처리하시겠습니까?`)
    ) {
      return;
    }
    updateIncidentStatus(
      incident.incidentId,
      "RESOLVED",
      "운영자가 인시던트를 종료 처리했습니다."
    );
    navigate("/dashboard", { replace: true });
  };

  return (
    <AppShell activeMenu="dashboard" isDark>
      <main className="main chain-dashboard-main incident-detail-page">
        <div className="incident-detail__crumb">
          <Link to="/dashboard">📊 실시간 대시보드</Link>
          <span>/</span>
          <span>{service?.categoryPath?.[0] ?? "-"}</span>
          <span>/</span>
          <span>{service?.serviceName ?? incident.targetCode}</span>
        </div>

        <section className="incident-detail__hero">
          <div className="incident-detail__alarm">🚨</div>
          <div className="incident-detail__hero-main">
            <div className="incident-detail__title-row">
              <h1>{service?.serviceName ?? incident.title}</h1>
              <span>{incident.severityCode} · 진행중</span>
            </div>
            <div className="incident-detail__meta">
              <span>serviceCode <b>{service?.serviceCode ?? incident.targetCode}</b></span>
              <span>분류 <b>{service?.categoryPath?.join(" > ") || "-"}</b></span>
              <span>SERVICE_TYPE <b>{service?.serviceTypeCode ?? "-"}</b></span>
              <span>IMPORTANCE <b>{service?.importanceCode ?? "-"}</b></span>
              <span>STATUS <b>{service ? codeLabels.serviceStatus?.[service.statusCode] ?? service.statusCode : "-"}</b></span>
            </div>
          </div>
          <div className="incident-detail__actions">
            <div className="incident-detail__timer">
              <span>경과시간</span>
              <strong>{elapsedLabel}</strong>
            </div>
            {incident.incidentStatusCode !== "RESOLVED" ? (
              <button type="button" onClick={resolveIncident}>인시던트 종료</button>
            ) : null}
          </div>
        </section>

        <nav className="incident-detail__tabs" aria-label="인시던트 상세 메뉴" role="tablist">
          {[
            ["overview", "개요"],
            ["history", "감지/알림 이력"],
            ["impact", "영향도"],
            ["deployments", "최근 배포"],
            ["owners", "담당자"],
          ].map(([tabKey, label]) => (
            <button
              aria-selected={activeTab === tabKey}
              className={activeTab === tabKey ? "is-active" : ""}
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        {activeTab === "overview" ? (
          <div className="incident-detail__layout" role="tabpanel">
            <section className="incident-detail__left">
            <article className="incident-detail__card incident-detail__card--danger incident-detail__card--summary incident-detail__card--overview-primary">
              <div className="incident-detail__card-head">
                <h2>🚨 진행 중 인시던트</h2>
                <span>id: {incident.externalIncidentCode ?? `#${incident.incidentId}`} · severity: {incident.severityCode} · occurredAt: {incident.startedAt}</span>
              </div>
              <div className="incident-detail__summary">
                <b>title</b>
                <p>{incident.title} · incidentType: 서비스 장애 · affectedServices: {affectedServiceCount}</p>
              </div>
              {incident.description ? <p className="incident-detail__description">{incident.description}</p> : null}
              <div className="incident-detail__progress">
                <h3>진행상황</h3>
                {generatedProgressRows.map(([time, message, actor], index) => (
                  <div className="incident-detail__progress-row" key={`${time}-${message}`}>
                    <span>{time}</span>
                    <p>{message}</p>
                    <em>{actor}</em>
                  </div>
                ))}
              </div>
            </article>
            <article className="incident-detail__card incident-detail__card--graph">
              <div className="incident-detail__card-head">
                <h2>영향 범위 (BLAST RADIUS)</h2>
              </div>
              <div className="incident-detail__blast">
                <ServiceRelationFlow
                  embedded
                  embeddedHeightClassName="h-full"
                  frameless
                  hideDepthToggle
                  hideDetailPanel
                  hideNodeActions
                  hideTopControl
                  incident={incident}
                  incidentMode
                  initialRelationDepth={1}
                  initialServiceId={service?.serviceId}
                  showAllServices={incident.incidentTypeCode === "SERVER"}
                />
              </div>
            </article>
            </section>
            <aside className="incident-detail__right">
            <article className="incident-detail__card incident-detail__card--summary incident-detail__card--overview-primary">
              <h2>📦 기본 정보 (SERVICE)</h2>
              <dl className="incident-detail__dl">
                <dt>serviceCode</dt><dd><code>{service?.serviceCode ?? incident.targetCode}</code></dd>
                <dt>serviceName</dt><dd>{service?.serviceName ?? incident.title}</dd>
                <dt>categoryL1/L2/L3</dt><dd>{service?.categoryPath?.join(" > ") ?? "-"}</dd>
                <dt>serviceType</dt><dd>{service?.serviceTypeCode ?? "-"}</dd>
                <dt>importance</dt><dd>{service?.importanceCode ?? "-"}</dd>
                <dt>status</dt><dd>{service?.statusCode ?? "-"}</dd>
                <dt>endpointUrl</dt><dd>{service?.endpointUrl ?? "-"}</dd>
                <dt>description</dt><dd>{service?.description ?? incident.description}</dd>
              </dl>
            </article>

            <article className="incident-detail__card incident-detail__card--graph">
              <h2>🔗 서비스 관계 (SERVICE_RELATION)</h2>
              <div className="incident-detail__relation-list incident-detail__scroll-area">
                {relatedRelations.map((relation) => (
                  <div className={relation.relationStatusCode === "ACTIVE" ? "" : "is-danger"} key={relation.relationId}>
                    <span>{relationServiceName(relation.sourceServiceId)} → {relationServiceName(relation.targetServiceId)}</span>
                    <code>{relation.relationTypeCode}</code>
                  </div>
                ))}
                {!relatedRelations.length ? <div className="incident-detail__empty">등록된 서비스 관계가 없습니다.</div> : null}
              </div>
            </article>
            </aside>
          </div>
        ) : null}

        {activeTab === "history" ? (
          <div className="incident-detail__history-layout" role="tabpanel">
            <article className="incident-detail__card incident-detail__tab-card">
              <div className="incident-detail__card-head">
                <h2>감지 이력</h2>
                <span>인시던트 발생 이후 기록</span>
              </div>
              <div className="incident-detail__timeline incident-detail__scroll-area">
                {generatedProgressRows.length ? generatedProgressRows.map(([time, message, actor], index) => (
                  <div className="incident-detail__timeline-row" key={`${time}-${message}`}>
                    <span>{time}</span>
                    <i className={index < 2 ? "is-danger" : index < 4 ? "is-warn" : ""} />
                    <p>{message}</p>
                    <em>{actor}</em>
                  </div>
                )) : <div className="incident-detail__empty">등록된 감지 이력이 없습니다.</div>}
              </div>
            </article>
            <article className="incident-detail__card incident-detail__notification-panel">
              <div className="incident-detail__card-head">
                <h2>알림 내역</h2>
                <span>{successfulNotificationCount}/{notificationRows.length}건 전송 성공</span>
              </div>
              <div className="incident-detail__notification-summary">
                <div>
                  <span>대상 인시던트</span>
                  <strong>{incident.externalIncidentCode ?? `#${incident.incidentId}`}</strong>
                  <small>{incident.title}</small>
                </div>
                <div>
                  <span>영향 서비스</span>
                  <strong>{displayImpactedServices.length}건</strong>
                  <small>{service?.serviceName ?? incident.targetCode}</small>
                </div>
                <div>
                  <span>수신 대상</span>
                  <strong>{notificationRows.length}건</strong>
                  <small>{incidentOwners.length ? "담당자/그룹 기준" : "시스템 기본 대상"}</small>
                </div>
              </div>
              <div className="incident-detail__notification-list incident-detail__scroll-area">
                {notificationRows.length ? notificationRows.map((row) => (
                  <div className="incident-detail__notification-row" key={`${row.sentAt}-${row.recipient}-${row.channel}`}>
                    <time>{row.sentAt}</time>
                    <span className={`incident-detail__notification-channel is-${row.channelTone}`}>{row.channel}</span>
                    <div className="incident-detail__notification-message">
                      <strong>{row.title}</strong>
                      <p>{row.message}</p>
                      <small>{row.template} · {row.targetType} · {row.contact}</small>
                    </div>
                    <div className="incident-detail__notification-recipient">
                      <b>{row.recipient}</b>
                      <em className={row.status === "성공" ? "is-success" : "is-waiting"}>{row.status}</em>
                    </div>
                  </div>
                )) : <div className="incident-detail__empty">등록된 알림 내역이 없습니다.</div>}
              </div>
            </article>
          </div>
        ) : null}

        {activeTab === "impact" ? (
          <article className="incident-detail__card incident-detail__card--graph incident-detail__tab-card" role="tabpanel">
            <div className="incident-detail__card-head">
              <h2>영향 범위 (BLAST RADIUS)</h2>
            </div>
            <div className="incident-detail__blast">
              <ServiceRelationFlow
                embedded
                embeddedHeightClassName="h-full"
                frameless
                hideDepthToggle
                hideDetailPanel
                hideNodeActions
                hideTopControl
                incident={incident}
                incidentMode
                initialRelationDepth={1}
                initialServiceId={service?.serviceId}
                showAllServices={incident.incidentTypeCode === "SERVER"}
              />
            </div>
          </article>
        ) : null}

        {activeTab === "deployments" ? (
          <article className="incident-detail__card incident-detail__tab-card" role="tabpanel">
            <div className="incident-detail__card-head">
              <h2>최근 배포 이력</h2>
              <span>장애 발생 전후 변경사항</span>
            </div>
            <div className="incident-detail__deploy-list incident-detail__scroll-area">
              {recentDeploymentRows.length ? recentDeploymentRows.map((row) => (
                <div className="incident-detail__deploy-row" key={row.date + row.title}>
                  <time>{row.date}</time>
                  <strong>{row.title}</strong>
                  <span>{row.owner}</span>
                  <em>{row.status}</em>
                </div>
              )) : <div className="incident-detail__empty">등록된 배포 이력이 없습니다.</div>}
            </div>
          </article>
        ) : null}

        {activeTab === "owners" ? (
          <article className="incident-detail__card incident-detail__tab-card" role="tabpanel">
            <div className="incident-detail__card-head">
              <h2>👥 담당자 (SERVICE_OWNER)</h2>
              <span>장애 담당자 이력 포함</span>
            </div>
            <div className="incident-detail__owner-layout">
              <div className="incident-detail__owner-grid">
                {incidentOwners.length ? incidentOwners.map((owner) => (
                  <div className="incident-detail__owner" key={owner.id}>
                    <b>{owner.name.slice(0, 1)}</b>
                    <span>{owner.name} · {owner.role}<small>{owner.organization}{owner.email ? ` · ${owner.email}` : ""}</small></span>
                    <em title={owner.email || "이메일 미등록"}>✉</em>
                  </div>
                )) : <div className="incident-detail__empty">등록된 서비스 담당자가 없습니다.</div>}
              </div>
              <div className="incident-detail__owner-history">
                <h3>장애 담당자 이력</h3>
                <div className="incident-detail__owner-history-list incident-detail__scroll-area">
                  {ownerHistoryRows.map((row) => (
                    <div className="incident-detail__owner-history-row" key={`${row.time}-${row.stage}-${row.owner}`}>
                      <time>{row.time}</time>
                      <span className={`is-${row.tone}`}>{row.stage}</span>
                      <div>
                        <strong>{row.owner}</strong>
                        <p>{row.action}</p>
                      </div>
                      <em>{row.status}</em>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ) : null}
      </main>
    </AppShell>
  );
}

function formatIncidentElapsed(startedAt, now = new Date()) {
  const date = new Date(startedAt.includes("T") ? startedAt : startedAt.replace(" ", "T"));
  const elapsed = Number.isNaN(date.getTime()) ? 0 : Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function buildIncidentProgressRows({
  deployments = [],
  impactedServices = [],
  incident,
  notificationRows = [],
  owners = [],
  relatedRelations = [],
  service,
  timelineRows = [],
}) {
  const startedAt = String(incident?.startedAt || incident?.occurredAt || "");
  const serviceName = service?.serviceName || incident?.targetCode || "대상 서비스";
  const serviceCode = service?.serviceCode || incident?.targetCode || "-";
  const severity = severityLabelFor(String(incident?.severityCode || "MAJOR").toUpperCase());
  const primaryOwner = owners[0];
  const backupOwner = owners[1];
  const ownerLabel = primaryOwner
    ? `${primaryOwner.name}${primaryOwner.organization ? ` (${primaryOwner.organization})` : ""}`
    : "담당자/담당그룹 미등록";
  const ownerContact = primaryOwner?.email ? ` · ${primaryOwner.email}` : "";
  const backupLabel = backupOwner
    ? `${backupOwner.name}${backupOwner.organization ? ` (${backupOwner.organization})` : ""}`
    : null;
  const relationCount = Math.max(relatedRelations.length, impactedServices.length);
  const relationTypeSummary = summarizeRelationTypes(relatedRelations);
  const affectedNames = impactedServices
    .map((item) => item.serviceName || item.serviceCode)
    .filter(Boolean)
    .slice(0, 3);
  const relationAffectedNames = relationServiceNames(relatedRelations, service).slice(0, 3);
  const affectedLabel = affectedNames.length
    ? `${affectedNames.join(", ")}${impactedServices.length > affectedNames.length ? ` 외 ${impactedServices.length - affectedNames.length}개` : ""}`
    : relationAffectedNames.length
      ? relationAffectedNames.join(", ")
      : "추가 영향 서비스 미확인";
  const deploy = deployments[0];

  const rows = [
    [
      formatIncidentProgressTime(startedAt, 0),
      `${serviceName}(${serviceCode}) ${severity} 인시던트가 접수되어 서비스 기준 영향도 산출을 시작했습니다.`,
      incident?.registeredBy || "SYSTEM",
    ],
    [
      formatIncidentProgressTime(startedAt, 2),
      `담당자 매핑을 조회해 ${ownerLabel}${ownerContact}을 1차 대응 대상으로 지정했습니다.`,
      "담당 조회",
    ],
    [
      formatIncidentProgressTime(startedAt, 4),
      `서비스 관계 ${relationCount}건${relationTypeSummary ? `(${relationTypeSummary})` : ""}을 분석했습니다. 예상 영향: ${affectedLabel}`,
      "영향도 분석",
    ],
  ];

  if (notificationRows.length) {
    const notification = notificationRows[0];
    rows.push([
      formatIncidentProgressTime(startedAt, 6),
      `${notification.channel} 채널로 ${notification.recipient}에게 템플릿 ${notification.template} 알림을 전송했습니다. 상태: ${notification.status}`,
      "알림 전송",
    ]);
  }

  if (backupLabel) {
    rows.push([
      formatIncidentProgressTime(startedAt, 8),
      `백업 담당 ${backupLabel}에게 서비스 연계 구간 확인을 요청했습니다.`,
      "에스컬레이션",
    ]);
  }

  if (deploy) {
    rows.push([
      formatIncidentProgressTime(startedAt, 10),
      `최근 배포 ${deploy.title}(${deploy.date}, ${deploy.status})와 장애 발생 시점을 대조했습니다.`,
      deploy.owner || "배포 확인",
    ]);
  } else {
    rows.push([
      formatIncidentProgressTime(startedAt, 10),
      `${serviceName}의 최근 배포 이력은 확인되지 않아 관계 서비스와 런타임 상태를 우선 점검 중입니다.`,
      "운영 확인",
    ]);
  }

  timelineRows.slice(0, 3).forEach(([time, message, actor], index) => {
    rows.push([
      time && time !== "-" ? time : formatIncidentProgressTime(startedAt, 12 + index * 2),
      normalizeIncidentTimelineMessage(message, {
        affectedLabel,
        relationCount,
        serviceName,
      }),
      actor || "remote",
    ]);
  });

  return ensureUniqueProgressTimes(rows, startedAt);
}

function summarizeRelationTypes(relations = []) {
  const summary = new Map();
  relations.forEach((relation) => {
    const type = relation.relationTypeCode || relation.relationTypeName || "REL";
    summary.set(type, (summary.get(type) || 0) + 1);
  });
  return Array.from(summary.entries())
    .slice(0, 3)
    .map(([type, count]) => `${type} ${count}`)
    .join(", ");
}

function relationServiceNames(relations = [], service) {
  const serviceId = Number(service?.serviceId);
  return relations
    .map((relation) => {
      const sourceName =
        relation.sourceServiceName ||
        relation.sourceServiceCode ||
        (relation.sourceServiceId ? `SERVICE-${relation.sourceServiceId}` : "");
      const targetName =
        relation.targetServiceName ||
        relation.targetServiceCode ||
        (relation.targetServiceId ? `SERVICE-${relation.targetServiceId}` : "");
      if (Number(relation.sourceServiceId) === serviceId) {
        return targetName;
      }
      if (Number(relation.targetServiceId) === serviceId) {
        return sourceName;
      }
      return targetName || sourceName;
    })
    .filter(Boolean);
}

function normalizeIncidentTimelineMessage(message, { affectedLabel, relationCount, serviceName }) {
  const text = String(message || "").trim();
  if (!text) {
    return `${serviceName} 관련 원격 이벤트가 수신되어 진행 이력에 반영했습니다.`;
  }
  if (text.includes("서비스 관계") && text.includes("0건")) {
    return `서비스 관계 기준 예상 영향 ${relationCount}건을 재계산했습니다. 대상: ${affectedLabel}`;
  }
  if (text.includes("인시던트가 등록")) {
    return `${serviceName} 장애 이벤트가 원격 API에서 수신되어 상세 진행상황에 반영되었습니다.`;
  }
  return text;
}

function ensureUniqueProgressTimes(rows, startedAt) {
  const usedTimes = new Set();
  return rows.map(([time, message, actor], index) => {
    let nextTime = time && time !== "-" ? time : formatIncidentProgressTime(startedAt, index * 2);
    let offset = index * 2;
    while (usedTimes.has(nextTime)) {
      offset += 1;
      nextTime = formatIncidentProgressTime(startedAt, offset);
    }
    usedTimes.add(nextTime);
    return [nextTime, message, actor];
  });
}

function buildIncidentNotificationRows({
  impactedServices = [],
  incident,
  owners = [],
  service,
}) {
  const startedAt = String(incident?.startedAt || incident?.occurredAt || "");
  const serviceName = service?.serviceName || incident?.targetCode || "대상 서비스";
  const severity = String(incident?.severityCode || "MAJOR").toUpperCase();
  const incidentCode = incident?.externalIncidentCode || `#${incident?.incidentId ?? "-"}`;
  const recipientRows = owners.length
    ? owners.slice(0, 5)
    : [
        { email: "ops@chainview.local", name: "운영 관제", organization: "SYSTEM", role: "ONCALL" },
        { email: "manager@chainview.local", name: "서비스 운영", organization: "담당 그룹", role: "GROUP" },
      ];
  const channels = severity === "CRITICAL"
    ? ["알림톡", "SMS", "이메일"]
    : ["알림톡", "이메일", "SMS"];
  const template = severity === "CRITICAL" ? "INCIDENT_CRITICAL_V1" : "INCIDENT_MAJOR_V1";

  return recipientRows.map((owner, index) => {
    const channel = channels[index % channels.length];
    const targetType = owner.role === "GROUP" || owner.organization?.includes("그룹") ? "그룹" : "사용자";
    const status = index === recipientRows.length - 1 && severity !== "CRITICAL" ? "대기" : "성공";
    return {
      channel,
      channelTone: channel === "SMS" ? "sms" : channel === "이메일" ? "mail" : "talk",
      contact: owner.email || owner.organization || "-",
      message: `${incidentCode} · ${serviceName} 장애 알림 · 영향 서비스 ${impactedServices.length}건`,
      recipient: owner.name || "수신자 미등록",
      sentAt: formatIncidentProgressTime(startedAt, index + 1),
      status,
      targetType,
      template,
      title: `[${severityLabelFor(severity)}] ${incident?.title || `${serviceName} 인시던트`}`,
    };
  });
}

function buildIncidentOwnerHistoryRows({
  incident,
  notificationRows = [],
  owners = [],
  service,
}) {
  const startedAt = String(incident?.startedAt || incident?.occurredAt || "");
  const serviceName = service?.serviceName || incident?.targetCode || "대상 서비스";
  const primaryOwner = owners[0];
  const backupOwner = owners[1];
  const rows = [
    {
      action: `${serviceName} 장애 접수 후 담당자/담당그룹을 조회했습니다.`,
      owner: "SYSTEM",
      stage: "담당 조회",
      status: owners.length ? `${owners.length}명 확인` : "미등록",
      time: formatIncidentProgressTime(startedAt, 0),
      tone: owners.length ? "success" : "warn",
    },
    {
      action: primaryOwner
        ? `${primaryOwner.role || "주담당"}에게 1차 알림을 발송했습니다.`
        : "주담당 미등록으로 기본 운영 수신자에게 알림을 발송했습니다.",
      owner: primaryOwner?.name || "운영 관제",
      stage: "1차 알림",
      status: notificationRows[0]?.status || "대기",
      time: notificationRows[0]?.sentAt || formatIncidentProgressTime(startedAt, 1),
      tone: notificationRows[0]?.status === "성공" ? "success" : "warn",
    },
  ];

  if (backupOwner || notificationRows[1]) {
    rows.push({
      action: backupOwner
        ? `${backupOwner.role || "백업 담당"}에게 후속 확인을 요청했습니다.`
        : "보조 수신자에게 장애 알림을 전파했습니다.",
      owner: backupOwner?.name || notificationRows[1]?.recipient || "보조 수신자",
      stage: "에스컬레이션",
      status: notificationRows[1]?.status || "진행",
      time: notificationRows[1]?.sentAt || formatIncidentProgressTime(startedAt, 3),
      tone: notificationRows[1]?.status === "성공" ? "success" : "info",
    });
  }

  rows.push({
    action: "장애 대응 현황과 알림 수신 상태를 인시던트 상세에 기록했습니다.",
    owner: incident?.updatedBy || incident?.createdBy || "SYSTEM",
    stage: "이력 기록",
    status: incident?.incidentStatusCode === "RESOLVED" ? "종료" : "진행중",
    time: formatIncidentProgressTime(startedAt, 5),
    tone: incident?.incidentStatusCode === "RESOLVED" ? "success" : "info",
  });

  return rows;
}

function buildRelationImpactedServices(service, services = [], relations = []) {
  if (!service?.serviceId) {
    return [];
  }
  const serviceId = Number(service.serviceId);
  const relatedIds = new Set();
  relations.forEach((relation) => {
    if (Number(relation.sourceServiceId) === serviceId && relation.targetServiceId) {
      relatedIds.add(Number(relation.targetServiceId));
    }
    if (Number(relation.targetServiceId) === serviceId && relation.sourceServiceId) {
      relatedIds.add(Number(relation.sourceServiceId));
    }
  });
  return services.filter((item) => relatedIds.has(Number(item.serviceId)));
}

function formatIncidentProgressTime(startedAt, plusMinutes = 0) {
  const date = new Date(String(startedAt).includes("T") ? startedAt : String(startedAt).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  date.setMinutes(date.getMinutes() + plusMinutes);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
