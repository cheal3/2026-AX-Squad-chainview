import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { initAdminInteractions } from "./adminInteractions.js";
import { pages } from "./pagesData.js";
import { PortalDataProvider, usePortalData } from "./dashboardModule/PortalDataStore";
import { IncidentDemoDashboard } from "./dashboardModule/pages/IncidentDemoDashboard";
import { codeLabels } from "./dashboardModule/mockData";

const htmlPageToRoute = (href) => {
  if (!href || /^(https?:|mailto:|tel:|#)/i.test(href)) {
    return href;
  }

  if (href.startsWith("/")) {
    return href;
  }

  const [pathPart, hashPart = ""] = href.split("#");
  const [filePart, queryPart = ""] = pathPart.split("?");
  if (!filePart.endsWith(".html")) {
    return href;
  }

  const slug = filePart.split("/").pop().replace(/\.html$/, "");
  const route = `/${slug}`;
  const query = queryPart ? `?${queryPart}` : "";
  const hash = hashPart ? `#${hashPart}` : "";
  return `${route}${query}${hash}`;
};

const severityByLabel = {
  치명: "CRITICAL",
  높음: "MAJOR",
  중간: "MINOR",
  낮음: "MINOR",
  정보: "MINOR",
};

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

function LegacyPage({ onIncidentOpen, page }) {
  const location = useLocation();
  const navigate = useNavigate();
  const title = page?.title || "ChainView";

  const html = useMemo(() => page?.html || "", [page]);

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    const root = document.getElementById("legacy-page-root");
    if (!root) {
      return undefined;
    }

    root.querySelectorAll("a[href]").forEach((anchor) => {
      const nextHref = htmlPageToRoute(anchor.getAttribute("href"));
      if (nextHref) {
        anchor.setAttribute("href", nextHref);
      }
    });

    const cleanups = [];

    if (page.menu === "incidents") {
      root.querySelectorAll("table.tbl tbody tr").forEach((row) => {
        const cells = Array.from(row.querySelectorAll("td"));
        const endedAt = cells[9]?.textContent?.trim() || "";
        const isOpenIncident = !endedAt || endedAt === "-";

        row.classList.toggle("is-clickable-incident", isOpenIncident);
        row.toggleAttribute("data-incident-openable", isOpenIncident);
      });
    }

    const handleIncidentRowClick = (event) => {
      if (page.menu !== "incidents") {
        return;
      }

      const row = event.target.closest?.("tbody tr");
      const ignoredControl = event.target.closest?.("button, a, input, select, textarea, label");

      if (!row || !root.contains(row) || ignoredControl || !row.hasAttribute("data-incident-openable")) {
        return;
      }

      const cells = Array.from(row.querySelectorAll("td"));
      const incidentCode = cells[1]?.textContent?.trim() || "";
      const severityLabel = cells[3]?.textContent?.trim() || "치명";

      event.preventDefault();
      event.stopPropagation();
      onIncidentOpen?.({
        code: incidentCode,
        severityCode: severityByLabel[severityLabel] || "MAJOR",
        serviceCode: cells[5]?.querySelector("code")?.textContent?.trim() || "",
        targetLabel: cells[5]?.textContent?.replace(/\s+/g, " ").trim() || "",
        startedAt: cells[8]?.textContent?.trim() || "",
        title: cells[6]?.textContent?.trim() || `${incidentCode} 인시던트`,
      });
    };

    if (page.menu === "incidents") {
      root.addEventListener("click", handleIncidentRowClick, true);
    }

    cleanups.push(initAdminInteractions({ root, activeMenu: page.menu }));

    const handleRouteClick = (event) => {
      const anchor = event.target.closest?.("a[href]");
      if (!anchor || !root.contains(anchor)) {
        return;
      }

      const href = anchor.getAttribute("href");
      const route = htmlPageToRoute(href);
      if (!route || /^(https?:|mailto:|tel:|#)/i.test(route)) {
        return;
      }

      if (route === href && !href?.startsWith("/")) {
        return;
      }

      event.preventDefault();
      navigate(route);
    };

    root.addEventListener("click", handleRouteClick);

    return () => {
      root.removeEventListener("click", handleIncidentRowClick, true);
      root.removeEventListener("click", handleRouteClick);
      cleanups.forEach((cleanup) => cleanup?.());
    };
  }, [html, location.pathname, navigate, onIncidentOpen, page]);

  return <div id="legacy-page-root" dangerouslySetInnerHTML={{ __html: html }} />;
}

function RoutePage({ activeMenuOverride, slug }) {
  const page = pages[slug] || pages["admin-services"];
  const navigate = useNavigate();
  const portalData = usePortalData();
  const activeMenu = activeMenuOverride || page.menu;

  const handleIncidentOpen = (incident) => {
    const service =
      portalData.services.find((item) => item.serviceCode === incident.serviceCode) ??
      portalData.services[0];

    portalData.createIncident({
      serviceId: service?.serviceId ?? 1,
      severityCode: incident.severityCode,
      externalIncidentCode: incident.code,
      targetCode: incident.serviceCode,
      targetLabel: incident.targetLabel,
      title: incident.title,
      description: `${incident.code} 관리 화면에서 선택한 인시던트입니다.`,
      startedAt: incident.startedAt,
      manualRegisteredYn: "Y",
      registeredBy: "admin",
    });

    navigate(`/dashboard?incident=${encodeURIComponent(incident.code)}`);
  };

  if (page.menu === "incidents") {
    return (
      <div className="app">
        <Sidebar activeMenu={activeMenu} />
        <main className="main is-incident-list">
          <IncidentAdminPage />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar activeMenu={activeMenu} />
      <main className={`main${page.menu === "incidents" ? " is-incident-list" : ""}`}>
        <LegacyPage onIncidentOpen={handleIncidentOpen} page={page} />
      </main>
    </div>
  );
}

const sidebarSections = [
  {
    label: "모니터링",
    items: [
      { key: "dashboard", icon: "📊", label: "대시보드", to: "/dashboard", badge: "2" },
      { key: "incidents", icon: "🚨", label: "인시던트 현황", to: "/admin-incidents" },
      { key: "topology", icon: "🗺️", label: "서비스 관계도", to: "/topology" },
    ],
  },
  {
    label: "서비스",
    items: [
      { key: "services", icon: "📦", label: "서비스 조회", to: "/admin-services" },
      { key: "relations", icon: "🔗", label: "서비스 관계조회", to: "/admin-relations" },
      { key: "techstacks", icon: "🧩", label: "기술 스택", to: "/admin-techstacks" },
    ],
  },
  {
    label: "인프라",
    items: [
      { key: "servers", icon: "🖥️", label: "서버 조회", to: "/admin-servers" },
      { key: "deployments", icon: "🚀", label: "배포 현황", to: "/admin-deployments" },
    ],
  },
  {
    label: "담당자",
    items: [
      { key: "owners", icon: "👨‍💼", label: "담당자 조회", to: "/admin-owners" },
      { key: "groups", icon: "📁", label: "그룹 조회", to: "/admin-groups" },
    ],
  },
  {
    label: "[관리자만 접근가능한 메뉴]",
    items: [
      { key: "permissions", icon: "🔐", label: "권한 관리", to: "/admin-permissions" },
    ],
  },
  {
    label: "시스템 관리",
    items: [
      { key: "users", icon: "👥", label: "사용자 관리", to: "/admin-users" },
      { key: "owner-management", icon: "👨‍💼", label: "서비스 담당자 관리", to: "/admin-owner-management" },
      { key: "categories", icon: "🗂️", label: "서비스 분류 관리", to: "/admin-categories" },
      { key: "codes", icon: "⚙️", label: "공통코드 관리", to: "/admin-codes" },
    ],
  },
];

function Sidebar({ activeMenu = "", isDark = false }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const itemClass = (key) => `lnb__item${activeMenu === key ? " is-active" : ""}`;

  return (
    <aside className={`lnb${isCollapsed ? " is-collapsed" : ""}${isDark ? " is-dark" : ""}`}>
      <div className="lnb__brand">
        <button
          aria-label={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
          className="lnb__toggle"
          onClick={() => setIsCollapsed((current) => !current)}
          title={isCollapsed ? "펼치기" : "접기"}
          type="button"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div className="lnb__brand-text">
          <h2>ChainView</h2>
          <p>Admin Console</p>
        </div>
      </div>
      {sidebarSections.map((section) => (
        <div className="lnb__group" key={section.label}>
          <div className="lnb__title">{section.label}</div>
          {section.items.map((item) => (
            <Link className={itemClass(item.key)} data-key={item.key} key={item.key} title={isCollapsed ? item.label : undefined} to={item.to}>
              <span className="lnb__item-icon" aria-hidden="true">{item.icon}</span>
              <span className="lnb__item-text">{item.label}</span>
              {item.badge ? <span className="badge">{item.badge}</span> : null}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}

function IncidentAdminPage() {
  const navigate = useNavigate();
  const portalData = usePortalData();
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
  const dynamicCodes = new Set(dynamicRows.map((row) => row.code));
  const rows = [
    ...dynamicRows,
    ...staticIncidentRows
      .filter((row) => !dynamicCodes.has(row.code))
      .map((row) => ({ ...row, source: "static" })),
  ];
  const openCount = rows.filter((row) => !row.endedAt && row.statusCode === "OPEN").length;
  const progressCount = rows.filter((row) => !row.endedAt && row.statusCode === "IN_PROGRESS").length;
  const newCount = portalData.incidents.length;

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

  return (
    <>
      <div className="crumb">
        <a href="/dashboard">대시보드</a><span className="sep">/</span>
        <span>모니터링</span><span className="sep">/</span><span>인시던트 관리</span>
      </div>

      <div className="page-head">
        <div>
          <h1 className="page-head__title">🚨 인시던트 관리 <small>INCIDENT</small></h1>
          <p className="page-head__desc">발생한 인시던트를 조회·수정·종결합니다. (OPEN {openCount} · IN_PROGRESS {progressCount} · 생성 이력 {newCount})</p>
        </div>
        <div className="page-head__right">
          <button className="btn">📥 CSV 내보내기</button>
          <button className="btn btn--primary" type="button">＋ 인시던트 등록</button>
        </div>
      </div>

      <div className="toolbar">
        <select><option>상태 · 전체</option><option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option><option>CLOSED</option></select>
        <select><option>심각도 · 전체</option><option>치명(CRITICAL)</option><option>높음(HIGH)</option><option>중간(MEDIUM)</option><option>낮음(LOW)</option><option>정보(INFO)</option></select>
        <select><option>유형 · 전체</option><option>장애</option><option>성능저하</option><option>보안</option><option>장애예측</option><option>점검</option></select>
        <select><option>대상유형 · 전체</option><option>SERVICE</option><option>SERVER</option><option>DEPLOYMENT</option></select>
        <input type="date" />
        <input type="date" />
        <div className="search">🔍<input type="text" placeholder="ID, 제목, 대상 검색..." /></div>
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
            {rows.map((row) => {
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
                      <button className="ibtn" onClick={(event) => event.stopPropagation()} type="button">✏️</button>
                      <button className="ibtn ibtn--danger" onClick={(event) => event.stopPropagation()} type="button">🗑</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="pager">
          <div className="pager__info">전체 {rows.length}건 · 1-{rows.length} / 1 페이지</div>
          <div className="pager__nav"><button disabled>‹</button><button className="is-on">1</button><button disabled>›</button></div>
        </div>
      </div>
    </>
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

function DashboardPage() {
  return <DashboardFrame />;
}

function TopologyPage() {
  return (
    <div className="topology-proto">
      <aside className="topology-proto__side">
        <h2>🗺 관계 그래프 <Link to="/dashboard">← 대시보드</Link></h2>
        <div className="topology-proto__search">🔍 <input placeholder="서비스 검색..." type="text" /></div>

        <TopologyFilter title="보기 모드" rows={["🎯 집중 모드 (선택 ± 2hop)", "🌐 전체 그래프", "🚨 장애 영향만 보기"]} />
        <TopologyFilter title="인시던트 상태 (SEVERITY)" rows={["🔴 CRITICAL 2", "🟠 HIGH 3", "🟡 MEDIUM 2", "🟢 LOW 8", "⚪ NOTICE 12"]} />
        <TopologyFilter title="서비스 상태 (STATUS)" rows={["운영중 40", "테스트 2", "개발 1", "중지 3"]} />
        <TopologyFilter title="관계 유형 (RELATION_TYPE)" rows={["API 호출", "DB 접근", "메시지 구독", "파일 참조", "isRequired=true 만"]} />
        <TopologyFilter title="대분류 (categoryL1)" rows={["핵심 서비스 28", "부가 서비스 14", "인프라 서비스 8"]} />

        <div className="topology-proto__group">
          <div className="topology-proto__group-title">진행중 장애로 점프</div>
          {["카드승인연계 EXT-001", "카드취소연계 EXT-004"].map((item, index) => (
            <button className={`topology-proto__focus${index === 0 ? " is-on" : ""}`} key={item} type="button">
              <span />{item}
            </button>
          ))}
        </div>

        <div className="topology-proto__legend">
          <b>범례</b>
          <span><i className="is-crit" />장애</span>
          <span><i className="is-warn" />지연</span>
          <span><i className="is-ok" />정상</span>
          <span><i className="is-idle" />중지/테스트</span>
        </div>
      </aside>

      <main className="topology-proto__canvas-wrap">
        <div className="topology-proto__canvas-top">
          <h1>🎯 카드승인연계 <span>· EXT-001 · 대외계</span></h1>
          <div className="topology-proto__toggle">
            <Link to="/dashboard">▦ 카드</Link>
            <button className="is-on" type="button">🗺 토폴로지</button>
          </div>
        </div>

        <div className="topology-proto__canvas">
          <svg viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker id="topology-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="#cbd5e1" />
              </marker>
              <marker id="topology-arr-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="#ef4444" />
              </marker>
              <marker id="topology-arr-warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="#f59e0b" />
              </marker>
            </defs>

            <text x="120" y="42" className="topology-proto__svg-muted">↘ 2-hop 상위</text>
            <text x="330" y="42" className="topology-proto__svg-muted">↘ 직접 수신</text>
            <text x="580" y="42" className="topology-proto__svg-title">선택 서비스</text>
            <text x="830" y="42" className="topology-proto__svg-muted">↗ 직접 발신</text>
            <text x="1060" y="42" className="topology-proto__svg-muted">↗ 2-hop 하위</text>

            <path className="topology-proto__edge" d="M180 200 L320 270 M180 370 L320 270 M180 370 L320 430 M180 540 L320 430" markerEnd="url(#topology-arr)" />
            <path className="topology-proto__edge is-strong" d="M430 285 L560 355 M430 445 L560 385" markerEnd="url(#topology-arr)" />
            <path className="topology-proto__edge is-crit" d="M690 355 L820 200 M690 370 L820 330 M930 200 L1060 160 M930 200 L1060 240" markerEnd="url(#topology-arr-red)" />
            <path className="topology-proto__edge is-warn" d="M930 330 L1060 330" markerEnd="url(#topology-arr-warn)" />
            <path className="topology-proto__edge is-strong" d="M690 385 L820 460 M690 400 L820 590 M930 460 L1060 460 M930 590 L1060 590" markerEnd="url(#topology-arr)" />

            <TopologyNode x={80} y={180} label="고객앱" tone="ok" small />
            <TopologyNode x={80} y={350} label="PC 브라우저" tone="ok" small />
            <TopologyNode x={80} y={520} label="제휴몰" tone="ok" small />
            <TopologyNode x={320} y={252} code="PORTAL-M01" label="모바일포탈" tone="ok" />
            <TopologyNode x={320} y={412} code="PORTAL-W01" label="웹포탈" tone="ok" />
            <TopologyNode x={560} y={335} code="EXT-001 · 대외계" label="카드승인연계" tone="crit" focus />
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
          <button type="button">⤢</button><button type="button">↻</button><button type="button">📸</button>
        </div>

        <div className="topology-proto__hint">
          <span><kbd>드래그</kbd> 화면 이동</span>
          <span><kbd>휠</kbd> 줌</span>
          <span><kbd>클릭</kbd> 노드 포커스</span>
          <span><kbd>더블클릭</kbd> 상세 페이지</span>
        </div>
      </main>

      <aside className="topology-proto__info">
        <div className="topology-proto__info-head">
          <span />
          <div>
            <h3>카드승인연계</h3>
            <p>EXT-001 · 대외계 / 결제 / 승인 · SERVICE_TYPE: API</p>
            <b>INC-2026-0312 · CRITICAL · 14:32 경과</b>
          </div>
        </div>
        <TopologyInfo title="인시던트 title">외부 카드사 응답 timeout 다발. 인스턴스 1/3 down · affectedServices: 2</TopologyInfo>
        <TopologyInfo title="영향 분석">1-hop 영향 2개, 2-hop 전파 3개, 최종 영향 사용자: 카드 결제 시도 고객 전체</TopologyInfo>
        <TopologyInfo title="SERVICE 명세">importance 높음 · status 운영중 · 담당 그룹 대외계팀 · 인스턴스 3대</TopologyInfo>
        <TopologyInfo title="↘ 수신">모바일포탈 (API 호출), 웹포탈 (API 호출)</TopologyInfo>
        <TopologyInfo title="↗ 발신">카드취소연계, 카드정산연계, 결제이력, 알림서비스</TopologyInfo>
        <Link className="topology-proto__primary" to="/dashboard-proto-detail">서비스 상세 →</Link>
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

function TopologyNode({ code = "", focus = false, label, small = false, tone, x, y }) {
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
          <text x={x + 75} y={y + 61} className="topology-proto__elapsed">14:32 경과</text>
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
  const isIncidentMode = incidents.some((incident) => incident.incidentStatusCode !== "RESOLVED");
  const activeIncidentId = Number(new URLSearchParams(location.search).get("incidentId")) || undefined;

  return (
    <div className={`app${isIncidentMode ? " is-dark" : ""}`}>
      <Sidebar activeMenu="dashboard" isDark={isIncidentMode} />
      <main className="main chain-dashboard-main">
        {!isIncidentMode ? (
          <>
            <div className="crumb">
              <span>대시보드</span><span className="sep">/</span>
              <span>모니터링</span><span className="sep">/</span><span>실시간 대시보드</span>
            </div>
            <div className="page-head">
              <div>
                <h1 className="page-head__title">📊 실시간 대시보드 <small>DASHBOARD</small></h1>
                <p className="page-head__desc">전체 서비스 운영 현황과 서비스 관계, 인시던트 영향을 확인합니다.</p>
              </div>
              <div className="page-head__right">
                <button className="btn">📥 CSV 내보내기</button>
                <button className="btn btn--primary">새로고침</button>
              </div>
            </div>
          </>
        ) : null}
        <div className="chain-dashboard-scope">
          <IncidentDemoDashboard activeIncidentId={activeIncidentId} />
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  const adminPages = Object.keys(pages).filter((slug) => pages[slug].isAdmin);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/topology" element={<TopologyPage />} />
      <Route path="/dashboard-proto" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard-proto-detail" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard-proto-topology" element={<Navigate to="/topology" replace />} />
      <Route path="/admin-permissions" element={<RoutePage activeMenuOverride="permissions" slug="admin-users" />} />
      <Route path="/admin-owner-management" element={<RoutePage activeMenuOverride="owner-management" slug="admin-owners" />} />
      {adminPages.map((slug) => (
        <Route key={slug} path={`/${slug}`} element={<RoutePage slug={slug} />} />
      ))}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <PortalDataProvider>
      <AppRoutes />
    </PortalDataProvider>
  );
}
