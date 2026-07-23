import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AppShell } from "../../components/AppShell.jsx";
import { ModalBackdrop } from "../../components/ModalBackdrop.jsx";
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
  const [editingIncident, setEditingIncident] = useState(null);
  const [deletingIncident, setDeletingIncident] = useState(null);
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
  const filteredRows = rows.filter((row) =>
    matchesSearchText(
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
    )
  );
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

      <div className="toolbar">
        <select><option>상태 · 전체</option><option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option><option>CLOSED</option></select>
        <select><option>심각도 · 전체</option><option>치명(CRITICAL)</option><option>높음(HIGH)</option><option>중간(MEDIUM)</option><option>낮음(LOW)</option><option>정보(INFO)</option></select>
        <select><option>유형 · 전체</option><option>장애</option><option>성능저하</option><option>보안</option><option>장애예측</option><option>점검</option></select>
        <select><option>대상유형 · 전체</option><option>SERVICE</option><option>SERVER</option><option>DEPLOYMENT</option></select>
        <input type="date" />
        <input type="date" />
        <div className="search">🔍<input type="text" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="ID, 제목, 대상 검색..." /></div>
        <div className="right"><button className="btn btn--ghost btn--sm">초기화</button></div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th className="col-check"><input type="checkbox" className="chk" /></th>
              <th>ID</th><th>유형</th><th>심각도</th><th>상태</th>
              <th>대상</th><th>제목</th><th>영향 서비스</th>
              <th>발생시각</th><th>종료시각</th>
              <th className="col-actions">관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const isOpen = !row.endedAt;
              return (
                <tr
                  className={isOpen ? "is-clickable-incident" : undefined}
                  key={`${row.source}-${row.code}-${row.startedAt}`}
                  onClick={() => openIncident(row)}
                >
                  <td className="col-check"><input type="checkbox" className="chk" onClick={(event) => event.stopPropagation()} /></td>
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
        <div className="pager">
          <div className="pager__info">전체 {filteredRows.length}건 · 1-{filteredRows.length} / 1 페이지</div>
          <div className="pager__nav"><button disabled>‹</button><button className="is-on">1</button><button disabled>›</button></div>
        </div>
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
  const { incidents } = usePortalData();
  const activeIncidentId = Number(new URLSearchParams(location.search).get("incidentId")) || undefined;
  const isIncidentMode = Boolean(
    activeIncidentId &&
      incidents.some(
        (incident) =>
          incident.incidentId === activeIncidentId &&
          incident.incidentStatusCode !== "RESOLVED"
      )
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
          <IncidentDemoDashboard activeIncidentId={activeIncidentId} />
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
  } = usePortalData();
  const [now, setNow] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState("overview");
  const incidentId = Number(new URLSearchParams(location.search).get("incidentId")) || undefined;
  const incident =
    incidents.find((item) => item.incidentId === incidentId) ??
    (!incidentId
      ? incidents.find((item) => item.incidentStatusCode !== "RESOLVED")
      : undefined);
  const service =
    services.find((item) => item.serviceId === incident?.serviceId) ??
    services.find((item) => item.serviceCode === incident?.targetCode);
  const impactedServices = incidentImpacts
    .filter((impact) => impact.incidentId === incident?.incidentId)
    .map((impact) => services.find((item) => item.serviceId === impact.impactedServiceId))
    .filter(Boolean);
  const relatedRelations = relations
    .filter(
      (relation) =>
        relation.sourceServiceId === service?.serviceId ||
        relation.targetServiceId === service?.serviceId
    )
    .slice(0, 6);
  const relationServiceName = (serviceId) =>
    services.find((item) => item.serviceId === serviceId)?.serviceName ?? `SERVICE-${serviceId}`;
  const elapsedLabel = incident?.startedAt ? formatIncidentElapsed(incident.startedAt, now) : "00:00:00";
  const timelineRows = incidentEvents
    .filter((event) => event.incidentId === incident?.incidentId)
    .map((event) => [event.createdAt?.slice(11, 16) || "-", event.message, event.actor]);
  const recentDeploymentRows = deployments
    .filter((deployment) => Number(deployment.serviceId) === service?.serviceId)
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
        owner.serviceId === service?.serviceId ||
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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
            <article className="incident-detail__card incident-detail__card--danger incident-detail__card--summary">
              <div className="incident-detail__card-head">
                <h2>🚨 진행 중 인시던트</h2>
                <span>id: {incident.externalIncidentCode ?? `#${incident.incidentId}`} · severity: {incident.severityCode} · occurredAt: {incident.startedAt}</span>
              </div>
              <div className="incident-detail__summary">
                <b>title</b>
                <p>{incident.title} · incidentType: 서비스 장애 · affectedServices: {impactedServices.length}</p>
              </div>
              <p className="incident-detail__description">{incident.description || "등록된 인시던트 설명이 없습니다."}</p>
            </article>
            </section>
            <aside className="incident-detail__right">
            <article className="incident-detail__card incident-detail__card--summary">
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
          <article className="incident-detail__card incident-detail__tab-card" role="tabpanel">
            <div className="incident-detail__card-head">
              <h2>감지 및 알림 이력</h2>
              <span>인시던트 발생 이후 기록</span>
            </div>
            <div className="incident-detail__timeline incident-detail__scroll-area">
              {timelineRows.length ? timelineRows.map(([time, message, actor], index) => (
                <div className="incident-detail__timeline-row" key={`${time}-${message}`}>
                  <span>{time}</span>
                  <i className={index < 2 ? "is-danger" : index < 4 ? "is-warn" : ""} />
                  <p>{message}</p>
                  <em>{actor}</em>
                </div>
              )) : <div className="incident-detail__empty">등록된 감지 및 알림 이력이 없습니다.</div>}
            </div>
          </article>
        ) : null}

        {activeTab === "impact" ? (
          <article className="incident-detail__card incident-detail__card--graph incident-detail__tab-card" role="tabpanel">
            <div className="incident-detail__card-head">
              <h2>영향 범위 (BLAST RADIUS)</h2>
              <Link to={`/topology?incidentId=${incident.incidentId}&serviceId=${service?.serviceId ?? ""}`}>전체 토폴로지 보기 →</Link>
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
                incidentMode
                initialRelationDepth={2}
                initialServiceId={service?.serviceId}
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
            <h2>👥 담당자 (SERVICE_OWNER)</h2>
            <div className="incident-detail__owner-grid">
              {incidentOwners.length ? incidentOwners.map((owner) => (
                <div className="incident-detail__owner" key={owner.id}>
                  <b>{owner.name.slice(0, 1)}</b>
                  <span>{owner.name} · {owner.role}<small>{owner.organization}{owner.email ? ` · ${owner.email}` : ""}</small></span>
                  <em title={owner.email || "이메일 미등록"}>✉</em>
                </div>
              )) : <div className="incident-detail__empty">등록된 서비스 담당자가 없습니다.</div>}
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
