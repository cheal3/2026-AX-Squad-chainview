import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  Eye,
  LogOut,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  UserRound,
} from "lucide-react";
import { initAdminInteractions } from "./adminInteractions.js";
import { pages } from "./pagesData.js";
import { PortalDataProvider, usePortalData } from "./dashboardModule/PortalDataStore";
import { IncidentDemoDashboard } from "./dashboardModule/pages/IncidentDemoDashboard";
import { ServiceRelationFlow } from "./dashboardModule/pages/ServiceRelationFlow";
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

const menuMetaByKey = {
  dashboard: { section: "모니터링", label: "대시보드", icon: "📊" },
  incidents: { section: "모니터링", label: "인시던트 현황", icon: "🚨" },
  topology: { section: "모니터링", label: "서비스 관계도", icon: "🗺️" },
  services: { section: "서비스", label: "서비스 조회", icon: "📦" },
  relations: { section: "서비스", label: "서비스 관계조회", icon: "🔗" },
  techstacks: { section: "서비스", label: "기술 스택", icon: "🧩" },
  servers: { section: "인프라", label: "서버 조회", icon: "🖥️" },
  deployments: { section: "인프라", label: "배포 현황", icon: "🚀" },
  owners: { section: "담당자", label: "담당자 조회", icon: "👨‍💼" },
  groups: { section: "담당자", label: "그룹 조회", icon: "📁" },
  users: { section: "시스템 관리", label: "사용자 관리", icon: "👥" },
  "owner-management": { section: "시스템 관리", label: "서비스 담당자 관리", icon: "👨‍💼" },
  categories: { section: "시스템 관리", label: "서비스 분류 관리", icon: "🗂️" },
  codes: { section: "시스템 관리", label: "공통코드 관리", icon: "⚙️" },
};

function getMenuMeta(menu) {
  return menuMetaByKey[menu] || { section: "서비스", label: "화면", icon: "📄" };
}

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

    const menuMeta = getMenuMeta(page.menu);
    const crumb = root.querySelector(".crumb");
    if (crumb) {
      crumb.classList.add("crumb--standardized");
      crumb.innerHTML = `<span>${menuMeta.section}</span><span class="sep">/</span><span>${menuMeta.label}</span>`;
    }

    const pageHead = root.querySelector(".page-head");
    if (pageHead) {
      pageHead.classList.add("page-head--standardized");
    }

    const pageHeadTitle = root.querySelector(".page-head__title");
    if (pageHeadTitle) {
      pageHeadTitle.innerHTML = `<span class="page-head__icon" aria-hidden="true">${menuMeta.icon}</span><span>${menuMeta.label}</span>`;
    }

    root.querySelectorAll(".page-head__title small, .page-head__desc").forEach((element) => {
      element.remove();
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

    const handleServiceDetailClick = (event) => {
      if (page.menu !== "services") {
        return;
      }

      const detailTrigger = event.target.closest?.('a[href="/admin-services"], button[title="상세"]');
      if (!detailTrigger || !root.contains(detailTrigger)) {
        return;
      }

      const row = detailTrigger.closest?.("tbody tr");
      const serviceCode = row?.querySelector?.("td:nth-child(2) code")?.textContent?.trim();
      if (!serviceCode) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      navigate(`/admin-services/${serviceCode}?tab=overview`);
    };

    if (page.menu === "services") {
      root.addEventListener("click", handleServiceDetailClick, true);
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
      root.removeEventListener("click", handleServiceDetailClick, true);
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
      <AppShell activeMenu={activeMenu}>
        <main className="main is-incident-list">
          <IncidentAdminPage />
        </main>
      </AppShell>
    );
  }

  if ([
    "services",
    "servers",
    "relations",
    "techstacks",
    "owners",
    "users",
    "groups",
    "categories",
    "codes",
    "deployments",
  ].includes(page.menu)) {
    return (
      <AppShell activeMenu={activeMenu}>
        <main className="main">
          <DynamicAdminListPage activeMenu={activeMenu} menu={page.menu} />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell activeMenu={activeMenu}>
      <main className={`main${page.menu === "incidents" ? " is-incident-list" : ""}`}>
        <LegacyPage onIncidentOpen={handleIncidentOpen} page={page} />
      </main>
    </AppShell>
  );
}

function DynamicAdminListPage({ activeMenu, menu }) {
  const navigate = useNavigate();
  const portalData = usePortalData();
  const [ownerModal, setOwnerModal] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [adminModal, setAdminModal] = useState(null);
  const [apiDetailModal, setApiDetailModal] = useState(null);
  const serviceById = useMemo(
    () => new Map(portalData.services.map((service) => [service.serviceId, service])),
    [portalData.services]
  );
  const serverById = useMemo(
    () => new Map(portalData.servers.map((server) => [server.serverId, server])),
    [portalData.servers]
  );
  const meta = getMenuMeta(activeMenu || menu);
  const remoteQueryKey = getRemoteQueryKey(menu);
  const remoteStatus = portalData.remoteApi.status;
  const isRemoteLoading =
    remoteStatus.state === "loading" && remoteStatus.source === remoteQueryKey;
  const showRemoteStatus =
    remoteStatus.source === remoteQueryKey || remoteStatus.source === "snapshot";
  const showRemoteApiButton =
    remoteQueryKey && (portalData.remoteApi.debugEnabled || menu === "services");
  const handleRemoteApiTest = async () => {
    if (!remoteQueryKey) {
      return;
    }
    const status = await portalData.remoteApi.testQuery(remoteQueryKey);
    if (status.detail) {
      setApiDetailModal(status.detail);
    }
  };

  const configs = {
    services: {
      actionLabel: "＋ 서비스 등록",
      columns: ["serviceId", "서비스", "분류", "유형", "중요도", "상태", "엔드포인트", "서버"],
      rows: portalData.services.map((service) => ({
        key: service.serviceId,
        record: service,
        onClick: () => navigate(`/admin-services/${service.serviceCode}`),
        cells: [
          <code>{service.serviceId}</code>,
          <><code>{service.serviceCode}</code> {service.serviceName}</>,
          service.categoryPath?.join(" > ") || "미분류",
          codeLabels.serviceType[service.serviceTypeCode] || service.serviceTypeCode,
          codeLabels.importance[service.importanceCode] || service.importanceCode || "-",
          codeLabels.serviceStatus[service.statusCode] || service.statusCode,
          service.endpointUrl || "-",
          serverById.get(service.serverId)?.serverName || "-",
        ],
      })),
    },
    servers: {
      actionLabel: "＋ 서버 등록",
      columns: ["serverId", "서버명", "호스트", "IP", "환경", "OS", "상태", "설명"],
      rows: portalData.servers.map((server) => ({
        key: server.serverId,
        record: server,
        cells: [
          <code>{server.serverId}</code>,
          <b>{server.serverName}</b>,
          server.hostName,
          server.ipAddress,
          codeLabels.envType[server.envCode] || server.envCode,
          `${codeLabels.osType[server.osTypeCode] || server.osTypeCode} ${server.osVersion}`,
          codeLabels.serverStatus[server.statusCode] || server.statusCode,
          server.description || "-",
        ],
      })),
    },
    relations: {
      actionLabel: "＋ 관계 등록",
      columns: ["relationId", "송신 서비스", "수신 서비스", "유형", "필수", "상태", "설명"],
      rows: portalData.relations.map((relation) => ({
        key: relation.relationId,
        record: relation,
        cells: [
          <code>{relation.relationId}</code>,
          formatServiceCell(serviceById.get(relation.sourceServiceId)),
          formatServiceCell(serviceById.get(relation.targetServiceId)),
          codeLabels.relationType[relation.relationTypeCode] || relation.relationTypeCode,
          relation.mandatoryYn,
          codeLabels.relationStatus[relation.relationStatusCode] || relation.relationStatusCode,
          relation.description || "-",
        ],
      })),
    },
    techstacks: {
      actionLabel: "＋ 기술스택 등록",
      columns: ["techStackId", "서비스", "유형", "기술명", "버전", "벤더"],
      rows: portalData.techStacks.map((stack) => ({
        key: stack.techStackId,
        record: stack,
        cells: [
          <code>{stack.techStackId}</code>,
          formatServiceCell(serviceById.get(stack.serviceId)),
          stack.techTypeName,
          <b>{stack.techName}</b>,
          stack.versionText,
          stack.vendorName,
        ],
      })),
    },
    owners: {
      actionLabel: "＋ 담당자 지정",
      columns: ["serviceOwnerId", "서비스", "담당 유형", "담당자/그룹", "책임"],
      rows: portalData.owners.map((owner) => ({
        key: owner.serviceOwnerId,
        owner,
        cells: [
          <code>{owner.serviceOwnerId}</code>,
          formatServiceCell(serviceById.get(owner.serviceId)),
          codeLabels.ownerType[owner.ownerTypeCode] || owner.ownerTypeCode,
          <b>{owner.ownerName}</b>,
          codeLabels.responsibilityType[owner.responsibilityCode] || owner.responsibilityCode,
        ],
      })),
    },
    users: {
      readOnly: true,
      columns: ["userId", "사번", "이름", "조직", "부서", "역할", "연락처", "이메일", "활성"],
      rows: portalData.users.map((user) => ({
        key: recordKey(user, "userId", "employeeNo"),
        record: user,
        cells: [
          <code>{field(user, "userId")}</code>,
          <code>{field(user, "employeeNo")}</code>,
          <b>{field(user, "userName")}</b>,
          field(user, "orgName"),
          field(user, "departmentName"),
          field(user, "roleName"),
          field(user, "phoneNumber"),
          field(user, "email"),
          yesNoPill(field(user, "activeYn")),
        ],
      })),
    },
    groups: {
      readOnly: true,
      columns: ["groupId", "groupCode", "그룹명", "설명"],
      rows: portalData.groups.map((group) => ({
        key: recordKey(group, "groupId", "groupCode"),
        record: group,
        cells: [
          <code>{field(group, "groupId")}</code>,
          <code>{field(group, "groupCode")}</code>,
          <b>{field(group, "groupName")}</b>,
          field(group, "description"),
        ],
      })),
    },
    categories: {
      readOnly: true,
      columns: ["categoryId", "분류코드", "분류명", "레벨", "상위 ID", "정렬", "수정일"],
      rows: portalData.categories.map((category) => ({
        key: recordKey(category, "categoryId", "categoryCode"),
        record: category,
        cells: [
          <code>{field(category, "categoryId")}</code>,
          <code>{field(category, "categoryCode")}</code>,
          <b>{field(category, "categoryName")}</b>,
          field(category, "categoryLevel"),
          field(category, "parentCategoryId"),
          field(category, "sortOrder"),
          formatDateCell(field(category, "updatedAt") || field(category, "createdAt")),
        ],
      })),
    },
    codes: {
      readOnly: true,
      columns: ["코드그룹", "코드", "코드명", "정렬", "사용", "비고"],
      rows: portalData.codes.map((code) => ({
        key: `${field(code, "codeGroup")}-${field(code, "code")}`,
        record: code,
        cells: [
          <code>{field(code, "codeGroup")}</code>,
          <code>{field(code, "code")}</code>,
          <b>{field(code, "codeName")}</b>,
          field(code, "sortOrder"),
          yesNoPill(field(code, "useYn")),
          field(code, "remarks"),
        ],
      })),
    },
    deployments: {
      readOnly: true,
      columns: ["서비스", "서버", "배포 경로", "포트", "상태", "인스턴스"],
      rows: portalData.deployments.map((deployment) => ({
        key: field(deployment, "deploymentKey") || recordKey(deployment, "deploymentId", "serverId"),
        record: deployment,
        cells: [
          <><code>{field(deployment, "serviceCode")}</code> {field(deployment, "serviceName")}</>,
          field(deployment, "serverName") || field(deployment, "hostName") || field(deployment, "serverId"),
          <code>{field(deployment, "deployPath")}</code>,
          field(deployment, "portInfo") || field(deployment, "port"),
          field(deployment, "deploymentStatusName") || field(deployment, "deploymentStatusCode"),
          field(deployment, "instanceCount"),
        ],
      })),
    },
  };
  const config = configs[menu];
  const closeOwnerModal = () => {
    setOwnerModal(null);
    setSelectedOwner(null);
  };
  const closeAdminModal = () => {
    setAdminModal(null);
  };
  const openOwnerModal = (modal, owner) => {
    setSelectedOwner(owner);
    setOwnerModal(modal);
  };
  const openAdminModal = (mode, row) => {
    setAdminModal({ mode, menu, record: row?.record ?? null });
  };
  const handleEditRow = (row) => {
    if (menu === "owners") {
      openOwnerModal("edit", row.owner);
      return;
    }

    openAdminModal("edit", row);
  };
  const handleDeleteRow = (row) => {
    if (menu === "owners") {
      openOwnerModal("delete", row.owner);
      return;
    }

    openAdminModal("delete", row);
  };

  return (
    <>
      <div className="page-header-stack">
        <div className="crumb crumb--standardized">
          <span>{meta.section}</span><span className="sep">/</span><span>{meta.label}</span>
        </div>
        <div className="page-head page-head--standardized">
          <div>
            <h1 className="page-head__title"><span className="page-head__icon" aria-hidden="true">{meta.icon}</span><span>{meta.label}</span></h1>
          </div>
          <div className="page-head__right">
            {showRemoteApiButton ? (
              <>
                <button
                  className="btn btn--ghost btn--sm"
                  disabled={isRemoteLoading}
                  onClick={handleRemoteApiTest}
                  title={`${meta.label} API 실행`}
                  type="button"
                >
                  <RefreshCw size={14} />
                  {isRemoteLoading ? "실행 중" : "API 실행"}
                </button>
                {showRemoteStatus ? (
                  <span
                    className={`pill ${remoteStatus.state === "success" ? "pill--ok" : remoteStatus.state === "error" || remoteStatus.state === "blocked" ? "pill--warn" : "pill--gray"}`}
                    title={`${portalData.remoteApi.origin}${remoteStatus.lastLoadedAt ? ` · ${remoteStatus.lastLoadedAt}` : ""}`}
                  >
                    {remoteStatus.message}
                  </span>
                ) : null}
              </>
            ) : null}
            <button className="btn">📥 CSV 내보내기</button>
            {config.actionLabel ? (
              <button
                className="btn btn--primary"
                onClick={menu === "owners" ? () => setOwnerModal("create") : () => openAdminModal("create")}
                type="button"
              >
                {config.actionLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">🔍<input type="text" placeholder={`${meta.label} 검색...`} /></div>
        <div className="right"><button className="btn btn--ghost btn--sm">초기화</button></div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th className="col-check"><input type="checkbox" className="chk" /></th>
              {config.columns.map((column) => <th key={column}>{column}</th>)}
              <th className="col-actions">관리</th>
            </tr>
          </thead>
          <tbody>
            {config.rows.map((row) => (
              <tr className={row.onClick ? "is-clickable-incident" : undefined} key={row.key} onClick={row.onClick}>
                <td className="col-check"><input className="chk" onClick={(event) => event.stopPropagation()} type="checkbox" /></td>
                {row.cells.map((cell, index) => <td key={index}>{cell}</td>)}
                <td className="col-actions">
                  {config.readOnly ? (
                    <span className="pill pill--gray">조회</span>
                  ) : (
                    <div className="row-actions">
                      <button
                        className="ibtn"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditRow(row);
                        }}
                        type="button"
                        title="수정"
                      >
                        ✏️
                      </button>
                      <button
                        className="ibtn ibtn--danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteRow(row);
                        }}
                        type="button"
                        title="삭제"
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pager">
          <div className="pager__info">전체 {config.rows.length}건 · 1-{config.rows.length} / 1 페이지</div>
          <div className="pager__nav"><button disabled>‹</button><button className="is-on">1</button><button disabled>›</button></div>
        </div>
      </div>
      {menu === "owners" ? (
        <OwnerManagementModals
          modal={ownerModal}
          onClose={closeOwnerModal}
          owner={selectedOwner}
          services={portalData.services}
        />
      ) : null}
      {adminModal ? (
        <AdminRecordModal
          modal={adminModal}
          onClose={closeAdminModal}
          portalData={portalData}
          serverById={serverById}
          serviceById={serviceById}
        />
      ) : null}
      {apiDetailModal ? (
        <ApiQueryDetailModal
          detail={apiDetailModal}
          onClose={() => setApiDetailModal(null)}
        />
      ) : null}
    </>
  );
}

function ApiQueryDetailModal({ detail, onClose }) {
  const isSuccess = detail.state === "success";
  const stateLabel = {
    blocked: "차단",
    error: "실패",
    loading: "진행 중",
    success: "성공",
  }[detail.state] || detail.state;
  const previewText = JSON.stringify(detail.responsePreview ?? null, null, 2);

  return (
    <div className="modal-backdrop is-open" onClick={onClose}>
      <div className="modal modal--lg api-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head">
          <h3>API 조회 상세</h3>
          <button className="close" onClick={onClose} type="button">×</button>
        </div>
        <div className="modal__body">
          <div className="api-detail-summary">
            <span className={`pill ${isSuccess ? "pill--ok" : "pill--warn"}`}>{stateLabel}</span>
            <b>{detail.label}</b>
            <span>{detail.durationMs ?? 0}ms</span>
          </div>
          <div className="api-detail-grid">
            <div><span>Method</span><b>{detail.method}</b></div>
            <div><span>Path</span><code>{detail.path}</code></div>
            <div><span>Origin</span><code>{detail.origin}</code></div>
            <div><span>URL</span><code>{detail.url}</code></div>
            <div><span>시작</span><b>{formatApiDate(detail.startedAt)}</b></div>
            <div><span>완료</span><b>{formatApiDate(detail.finishedAt)}</b></div>
            <div><span>결과 건수</span><b>{detail.rowCount ?? "-"}</b></div>
            <div><span>실행 가능 모드</span><b>development / test / production 서비스 조회</b></div>
          </div>
          {detail.errorMessage ? (
            <div className="api-detail-error">
              <b>오류</b>
              <p>{detail.errorMessage}</p>
            </div>
          ) : null}
          <div className="api-detail-response">
            <div className="api-detail-response__head">
              <b>응답 미리보기</b>
              <span>배열 응답은 앞 3건만 표시</span>
            </div>
            <pre>{previewText}</pre>
          </div>
        </div>
        <div className="modal__foot">
          <button className="btn btn--primary" onClick={onClose} type="button">확인</button>
        </div>
      </div>
    </div>
  );
}

function formatApiDate(value) {
  if (!value) {
    return "-";
  }
  return value.replace("T", " ").slice(0, 19);
}

function AdminRecordModal({ modal, onClose, portalData, serverById, serviceById }) {
  const { mode, menu, record } = modal;
  const isEdit = mode === "edit";
  const isCreate = mode === "create";
  const isDelete = mode === "delete";
  const [form, setForm] = useState(() => buildAdminFormState(menu, record, portalData));
  const title = getAdminModalTitle(menu, mode, record);

  useEffect(() => {
    setForm(buildAdminFormState(menu, record, portalData));
  }, [menu, mode, record, portalData]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };
  const requireValue = (value, label) => {
    const cleaned = String(value ?? "").trim();
    if (!cleaned) {
      window.alert(`${label} 값을 입력해주세요.`);
      return null;
    }
    return cleaned;
  };
  const handleSubmit = () => {
    if (isDelete) {
      if (menu === "services") {
        portalData.deleteService(record.serviceId);
      } else if (menu === "servers") {
        const result = portalData.deleteServer(record.serverId);
        window.alert(result.message);
        if (!result.ok) return;
      } else if (menu === "relations") {
        portalData.removeRelation(record.relationId);
      } else if (menu === "techstacks") {
        portalData.deleteTechStack(record.techStackId);
      }
      onClose();
      return;
    }

    if (menu === "services") {
      const serviceCode = requireValue(form.serviceCode, "serviceCode");
      const serviceName = requireValue(form.serviceName, "서비스명");
      if (!serviceCode || !serviceName) return;
      const payload = {
        serviceCode,
        serviceName,
        categoryPath: [form.categoryL1, form.categoryL2, form.categoryL3].map((item) => item.trim()).filter(Boolean),
        serviceTypeCode: form.serviceTypeCode,
        importanceCode: form.importanceCode,
        statusCode: form.statusCode,
        endpointUrl: form.endpointUrl.trim(),
        serverId: Number(form.serverId) || portalData.servers[0]?.serverId || 1,
        deployPath: form.deployPath.trim(),
        portInfo: form.portInfo.trim(),
        deploymentStatusCode: form.deploymentStatusCode,
        instanceCount: Number(form.instanceCount) || 1,
        description: form.description.trim(),
      };
      if (isCreate) {
        portalData.addService(payload);
      } else {
        portalData.updateService(record.serviceId, payload);
      }
    } else if (menu === "servers") {
      const serverName = requireValue(form.serverName, "serverName");
      const hostName = requireValue(form.hostName, "hostname");
      const ipAddress = requireValue(form.ipAddress, "IP 주소");
      if (!serverName || !hostName || !ipAddress) return;
      const payload = {
        serverName,
        hostName,
        ipAddress,
        envCode: form.envCode,
        osTypeCode: form.osTypeCode,
        osVersion: form.osVersion.trim(),
        statusCode: form.statusCode,
        description: form.description.trim(),
      };
      if (isCreate) {
        portalData.addServer(payload);
      } else {
        portalData.updateServer(record.serverId, payload);
      }
    } else if (menu === "relations") {
      const sourceServiceId = Number(form.sourceServiceId);
      const targetServiceId = Number(form.targetServiceId);
      if (!sourceServiceId || !targetServiceId) {
        window.alert("source/target 서비스를 선택해주세요.");
        return;
      }
      if (sourceServiceId === targetServiceId) {
        window.alert("source와 target 서비스는 서로 달라야 합니다.");
        return;
      }
      const payload = {
        sourceServiceId,
        targetServiceId,
        relationTypeCode: form.relationTypeCode,
        mandatoryYn: form.mandatoryYn,
        relationStatusCode: form.relationStatusCode,
        description: form.description.trim(),
      };
      if (isCreate) {
        const result = portalData.addRelation(payload);
        if (!result.ok) {
          window.alert(result.message);
          return;
        }
      } else {
        portalData.updateRelation(record.relationId, payload);
      }
    } else if (menu === "techstacks") {
      const techName = requireValue(form.techName, "기술명");
      if (!techName) return;
      const serviceId = Number(form.serviceId) || portalData.services[0]?.serviceId;
      if (!serviceId) {
        window.alert("서비스를 선택해주세요.");
        return;
      }
      const payload = {
        serviceId,
        techTypeName: form.techTypeName.trim() || "서비스 기술",
        techName,
        versionText: form.versionText.trim() || "-",
        vendorName: form.vendorName.trim() || "-",
      };
      if (isCreate) {
        portalData.addTechStack(payload);
      } else {
        portalData.updateTechStack(record.techStackId, payload);
      }
    }

    onClose();
  };

  if (isDelete) {
    return (
      <div className="modal-backdrop is-open" onClick={onClose}>
        <div className="modal confirm" onClick={(event) => event.stopPropagation()}>
          <div className="modal__head"><h3>{title}</h3><button className="close" onClick={onClose} type="button">×</button></div>
          <div className="modal__body">
            <div className="confirm__icon">⚠</div>
            <div className="confirm__msg"><b>{getAdminRecordLabel(menu, record, serviceById, serverById)}</b> 항목을 삭제하시겠습니까?</div>
            <div className="confirm__note">삭제 후 목록과 연결 데이터에 즉시 반영됩니다.</div>
          </div>
          <div className="modal__foot"><button className="btn" onClick={onClose} type="button">취소</button><button className="btn btn--danger" onClick={handleSubmit} type="button">삭제</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop is-open" onClick={onClose}>
      <div className={menu === "techstacks" ? "modal" : "modal modal--lg"} onClick={(event) => event.stopPropagation()}>
        <div className="modal__head">
          <h3>{title}</h3>
          <button className="close" onClick={onClose} type="button">×</button>
        </div>
        <div className="modal__body">
          {menu === "services" ? (
            <ServiceAdminForm form={form} onChange={updateField} servers={portalData.servers} isEdit={isEdit} />
          ) : null}
          {menu === "servers" ? (
            <ServerAdminForm form={form} onChange={updateField} isEdit={isEdit} />
          ) : null}
          {menu === "relations" ? (
            <RelationAdminForm form={form} onChange={updateField} services={portalData.services} serviceById={serviceById} isEdit={isEdit} />
          ) : null}
          {menu === "techstacks" ? (
            <TechStackAdminForm form={form} onChange={updateField} services={portalData.services} isEdit={isEdit} />
          ) : null}
        </div>
        <div className="modal__foot">
          <button className="btn" onClick={onClose} type="button">취소</button>
          <button className="btn btn--primary" onClick={handleSubmit} type="button">{isCreate ? "등록" : "저장"}</button>
        </div>
      </div>
    </div>
  );
}

function ServiceAdminForm({ form, onChange, servers, isEdit }) {
  return (
    <>
      <div className="form-section">
        <h4 className="form-section__title">기본 정보</h4>
        <div className="form-grid">
          <div className="form-row">
            <label>serviceCode<span className="req">*</span></label>
            <input type="text" value={form.serviceCode} onChange={(event) => onChange("serviceCode", event.target.value)} disabled={isEdit} placeholder="예: PAY-API-001" />
            <span className="help">{isEdit ? "PK · 수정 불가" : "고유 식별자. 등록 후 수정 불가"}</span>
          </div>
          <div className="form-row"><label>서비스명<span className="req">*</span></label><input type="text" value={form.serviceName} onChange={(event) => onChange("serviceName", event.target.value)} placeholder="예: 결제 API" /></div>
          <div className="form-row full"><label>엔드포인트 URL</label><input type="text" value={form.endpointUrl} onChange={(event) => onChange("endpointUrl", event.target.value)} placeholder="https://..." /></div>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">분류 및 상태</h4>
        <div className="form-grid">
          <div className="form-row"><label>대분류 (categoryL1)</label><input type="text" value={form.categoryL1} onChange={(event) => onChange("categoryL1", event.target.value)} placeholder="예: 대외계" /></div>
          <div className="form-row"><label>중분류 (categoryL2)</label><input type="text" value={form.categoryL2} onChange={(event) => onChange("categoryL2", event.target.value)} placeholder="예: 결제" /></div>
          <div className="form-row"><label>소분류 (categoryL3)</label><input type="text" value={form.categoryL3} onChange={(event) => onChange("categoryL3", event.target.value)} placeholder="예: 승인" /></div>
          <div className="form-row"><label>서비스 유형 (SERVICE_TYPE)<span className="req">*</span></label><CodeSelect labels={codeLabels.serviceType} value={form.serviceTypeCode} onChange={(value) => onChange("serviceTypeCode", value)} /></div>
          <div className="form-row"><label>중요도 (IMPORTANCE)<span className="req">*</span></label><CodeSelect labels={codeLabels.importance} value={form.importanceCode} onChange={(value) => onChange("importanceCode", value)} /></div>
          <div className="form-row"><label>상태 (STATUS)<span className="req">*</span></label><CodeSelect labels={codeLabels.serviceStatus} value={form.statusCode} onChange={(value) => onChange("statusCode", value)} /></div>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">배포 정보</h4>
        <div className="form-grid">
          <div className="form-row"><label>배포 서버</label><select value={form.serverId} onChange={(event) => onChange("serverId", event.target.value)}>{servers.map((server) => <option key={server.serverId} value={server.serverId}>{server.serverName}</option>)}</select></div>
          <div className="form-row"><label>배포 상태</label><CodeSelect labels={codeLabels.deploymentStatus} value={form.deploymentStatusCode} onChange={(value) => onChange("deploymentStatusCode", value)} /></div>
          <div className="form-row"><label>배포 경로</label><input type="text" value={form.deployPath} onChange={(event) => onChange("deployPath", event.target.value)} placeholder="/opt/app" /></div>
          <div className="form-row"><label>포트</label><input type="text" value={form.portInfo} onChange={(event) => onChange("portInfo", event.target.value)} placeholder="8080,8443" /></div>
          <div className="form-row"><label>인스턴스 수</label><input type="number" min="1" value={form.instanceCount} onChange={(event) => onChange("instanceCount", event.target.value)} /></div>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">설명</h4>
        <div className="form-row"><label>설명</label><textarea value={form.description} onChange={(event) => onChange("description", event.target.value)} placeholder="서비스 상세 설명" /></div>
      </div>
    </>
  );
}

function ServerAdminForm({ form, onChange, isEdit }) {
  return (
    <>
      <div className="form-section">
        <h4 className="form-section__title">기본 정보</h4>
        <div className="form-grid">
          <div className="form-row">
            <label>serverName<span className="req">*</span></label>
            <input type="text" value={form.serverName} onChange={(event) => onChange("serverName", event.target.value)} disabled={isEdit} placeholder="예: WAS-PRD-14" />
            {isEdit ? <span className="help">PK · 수정 불가</span> : <span className="help">고유 · 명명규칙 준수</span>}
          </div>
          <div className="form-row"><label>hostname<span className="req">*</span></label><input type="text" value={form.hostName} onChange={(event) => onChange("hostName", event.target.value)} placeholder="예: was-prd-14.bank.local" /></div>
          <div className="form-row"><label>IP 주소<span className="req">*</span></label><input type="text" value={form.ipAddress} onChange={(event) => onChange("ipAddress", event.target.value)} placeholder="예: 10.20.30.14" /></div>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">운영 환경</h4>
        <div className="form-grid">
          <div className="form-row"><label>환경 (ENVIRONMENT)<span className="req">*</span></label><CodeSelect labels={codeLabels.envType} value={form.envCode} onChange={(value) => onChange("envCode", value)} /></div>
          <div className="form-row"><label>상태</label><CodeSelect labels={codeLabels.serverStatus} value={form.statusCode} onChange={(value) => onChange("statusCode", value)} /></div>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">OS 정보</h4>
        <div className="form-grid">
          <div className="form-row"><label>OS 유형 (OS_TYPE)<span className="req">*</span></label><CodeSelect labels={codeLabels.osType} value={form.osTypeCode} onChange={(value) => onChange("osTypeCode", value)} /></div>
          <div className="form-row"><label>OS 버전</label><input type="text" value={form.osVersion} onChange={(event) => onChange("osVersion", event.target.value)} placeholder="예: RHEL 8.9" /></div>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">설명</h4>
        <div className="form-row"><label>설명</label><textarea value={form.description} onChange={(event) => onChange("description", event.target.value)} placeholder="서버 설명 또는 위치/IDC 정보" /></div>
      </div>
    </>
  );
}

function RelationAdminForm({ form, onChange, services, serviceById, isEdit }) {
  return (
    <>
      <div className="form-section">
        <h4 className="form-section__title">연결 서비스</h4>
        <div className="form-grid">
          <div className="form-row">
            <label>source 서비스<span className="req">*</span></label>
            <select value={form.sourceServiceId} onChange={(event) => onChange("sourceServiceId", event.target.value)} disabled={isEdit}>
              <option value="">선택</option>
              {services.map((service) => <option key={service.serviceId} value={service.serviceId}>{service.serviceCode} {service.serviceName}</option>)}
            </select>
            <span className="help">호출하는 쪽</span>
          </div>
          <div className="form-row">
            <label>target 서비스<span className="req">*</span></label>
            <select value={form.targetServiceId} onChange={(event) => onChange("targetServiceId", event.target.value)} disabled={isEdit}>
              <option value="">선택</option>
              {services.map((service) => <option key={service.serviceId} value={service.serviceId}>{service.serviceCode} {service.serviceName}</option>)}
            </select>
            <span className="help">호출받는 쪽</span>
          </div>
          {isEdit ? <div className="form-row full"><label>연결</label><input type="text" value={`${serviceLabel(serviceById.get(Number(form.sourceServiceId)))} → ${serviceLabel(serviceById.get(Number(form.targetServiceId)))}`} disabled /></div> : null}
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">관계 속성</h4>
        <div className="form-grid">
          <div className="form-row"><label>관계 유형 (RELATION_TYPE)<span className="req">*</span></label><CodeSelect labels={codeLabels.relationType} value={form.relationTypeCode} onChange={(value) => onChange("relationTypeCode", value)} /></div>
          <div className="form-row"><label>연결 상태</label><CodeSelect labels={codeLabels.relationStatus} value={form.relationStatusCode} onChange={(value) => onChange("relationStatusCode", value)} /></div>
          <div className="form-row"><label>필수 여부 (isRequired)</label><select value={form.mandatoryYn} onChange={(event) => onChange("mandatoryYn", event.target.value)}><option value="Y">Y (필수)</option><option value="N">N (선택)</option></select></div>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">설명</h4>
        <div className="form-row"><label>설명</label><textarea value={form.description} onChange={(event) => onChange("description", event.target.value)} placeholder="이 관계가 어떤 비즈니스 흐름인지" /></div>
      </div>
    </>
  );
}

function TechStackAdminForm({ form, onChange, services, isEdit }) {
  return (
    <>
      <div className="form-section">
        <h4 className="form-section__title">연결 서비스</h4>
        <div className="form-row">
          <label>서비스<span className="req">*</span></label>
          <select value={form.serviceId} onChange={(event) => onChange("serviceId", event.target.value)} disabled={isEdit}>
            {services.map((service) => <option key={service.serviceId} value={service.serviceId}>{service.serviceCode} {service.serviceName}</option>)}
          </select>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">기술 정보</h4>
        <div className="form-grid">
          <div className="form-row"><label>유형 (TECH_TYPE)<span className="req">*</span></label><input type="text" value={form.techTypeName} onChange={(event) => onChange("techTypeName", event.target.value)} placeholder="예: FRAMEWORK" /></div>
          <div className="form-row"><label>기술명<span className="req">*</span></label><input type="text" value={form.techName} onChange={(event) => onChange("techName", event.target.value)} placeholder="예: Spring Boot" /></div>
          <div className="form-row"><label>기본버전</label><input type="text" value={form.versionText} onChange={(event) => onChange("versionText", event.target.value)} placeholder="예: 3.2.5" /></div>
          <div className="form-row"><label>벤더</label><input type="text" value={form.vendorName} onChange={(event) => onChange("vendorName", event.target.value)} placeholder="예: VMware" /></div>
        </div>
      </div>
    </>
  );
}

function CodeSelect({ labels, value, onChange }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {Object.entries(labels).map(([code, label]) => (
        <option key={code} value={code}>{label} ({code})</option>
      ))}
    </select>
  );
}

function buildAdminFormState(menu, record, portalData) {
  if (menu === "services") {
    const categoryPath = record?.categoryPath ?? [];
    return {
      serviceCode: record?.serviceCode ?? "",
      serviceName: record?.serviceName ?? "",
      categoryL1: categoryPath[0] ?? "",
      categoryL2: categoryPath[1] ?? "",
      categoryL3: categoryPath[2] ?? "",
      serviceTypeCode: record?.serviceTypeCode ?? "API",
      importanceCode: record?.importanceCode ?? "NORMAL",
      statusCode: record?.statusCode ?? "NORMAL",
      endpointUrl: record?.endpointUrl ?? "",
      serverId: String(record?.serverId ?? portalData.servers[0]?.serverId ?? ""),
      deployPath: record?.deployPath ?? "/opt/app",
      portInfo: record?.portInfo ?? "8080",
      deploymentStatusCode: record?.deploymentStatusCode ?? "RUNNING",
      instanceCount: String(record?.instanceCount ?? 1),
      description: record?.description ?? "",
    };
  }

  if (menu === "servers") {
    return {
      serverName: record?.serverName ?? "",
      hostName: record?.hostName ?? "",
      ipAddress: record?.ipAddress ?? "",
      envCode: record?.envCode ?? "PROD",
      osTypeCode: record?.osTypeCode ?? "LINUX",
      osVersion: record?.osVersion ?? "",
      statusCode: record?.statusCode ?? "NORMAL",
      description: record?.description ?? "",
    };
  }

  if (menu === "relations") {
    return {
      sourceServiceId: String(record?.sourceServiceId ?? ""),
      targetServiceId: String(record?.targetServiceId ?? ""),
      relationTypeCode: record?.relationTypeCode ?? "REST",
      mandatoryYn: record?.mandatoryYn ?? "Y",
      relationStatusCode: record?.relationStatusCode ?? "ACTIVE",
      description: record?.description ?? "",
    };
  }

  if (menu === "techstacks") {
    return {
      serviceId: String(record?.serviceId ?? portalData.services[0]?.serviceId ?? ""),
      techTypeName: record?.techTypeName ?? "FRAMEWORK",
      techName: record?.techName ?? "",
      versionText: record?.versionText ?? "",
      vendorName: record?.vendorName ?? "",
    };
  }

  return {};
}

function getAdminModalTitle(menu, mode, record) {
  const action = mode === "create" ? "＋" : mode === "delete" ? "🗑" : "✏️";
  const verb = mode === "create" ? "등록" : mode === "delete" ? "삭제" : "수정";
  const labels = {
    services: "서비스",
    servers: "서버",
    relations: "서비스 관계",
    techstacks: "기술스택",
  };
  const id = record ? getAdminRecordId(menu, record) : "";
  return `${action} ${labels[menu]} ${verb}${id && mode !== "create" ? ` — ${id}` : ""}`;
}

function getAdminRecordId(menu, record) {
  if (menu === "services") return record.serviceCode;
  if (menu === "servers") return record.serverName;
  if (menu === "relations") return `REL-${String(record.relationId).padStart(4, "0")}`;
  if (menu === "techstacks") return `TECH-${String(record.techStackId).padStart(3, "0")}`;
  return "";
}

function getAdminRecordLabel(menu, record, serviceById, serverById) {
  if (menu === "services") return `${record.serviceCode} ${record.serviceName}`;
  if (menu === "servers") return `${record.serverName} (${record.ipAddress})`;
  if (menu === "relations") return `${serviceLabel(serviceById.get(record.sourceServiceId))} → ${serviceLabel(serviceById.get(record.targetServiceId))}`;
  if (menu === "techstacks") return `${serviceLabel(serviceById.get(record.serviceId))} / ${record.techName}`;
  return getAdminRecordId(menu, record);
}

function serviceLabel(service) {
  return service ? `${service.serviceCode} ${service.serviceName}` : "서비스 미지정";
}

function OwnerManagementModals({ modal, onClose, owner, services }) {
  if (!modal) {
    return null;
  }

  const service = owner ? services.find((item) => item.serviceId === owner.serviceId) : services[0];
  const serviceLabel = service ? `${service.serviceCode} ${service.serviceName}` : "서비스 선택";
  const ownerId = owner?.serviceOwnerId ? `OWN-${String(owner.serviceOwnerId).padStart(4, "0")}` : "신규";

  if (modal === "delete") {
    return (
      <div className="modal-backdrop is-open" onClick={onClose}>
        <div className="modal confirm" onClick={(event) => event.stopPropagation()}>
          <div className="modal__head"><h3>🗑 담당자 해제</h3><button className="close" onClick={onClose} type="button">×</button></div>
          <div className="modal__body">
            <div className="confirm__icon">⚠</div>
            <div className="confirm__msg"><b>{ownerId} ({serviceLabel} / {owner?.ownerName ?? "담당자"})</b>을 해제하시겠습니까?</div>
            <div className="confirm__note">해제 즉시 알림 수신 대상에서 제외됩니다.<br />일반적으로 종료일을 지정하여 이력 보존을 권장합니다.</div>
          </div>
          <div className="modal__foot"><button className="btn" onClick={onClose} type="button">취소</button><button className="btn btn--danger" onClick={onClose} type="button">해제</button></div>
        </div>
      </div>
    );
  }

  const isEdit = modal === "edit";

  return (
    <div className="modal-backdrop is-open" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head">
          <h3>{isEdit ? `✏️ 담당자 수정 — ${ownerId}` : "＋ 담당자 지정"}</h3>
          <button className="close" onClick={onClose} type="button">×</button>
        </div>
        <div className="modal__body">
          <div className="form-section">
            <h4 className="form-section__title">연결 서비스</h4>
            <div className="form-row">
              <label>서비스 (serviceCode)<span className="req">*</span></label>
              {isEdit ? (
                <input type="text" value={serviceLabel} disabled />
              ) : (
                <select defaultValue="">
                  <option value="">선택</option>
                  {services.slice(0, 12).map((item) => (
                    <option key={item.serviceId}>{item.serviceCode} {item.serviceName}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="form-section">
            <h4 className="form-section__title">담당자 정보</h4>
            <div className="form-grid">
              <div className="form-row">
                <label>담당자/그룹<span className="req">*</span></label>
                <input type="text" defaultValue={owner?.ownerName ?? ""} placeholder="예: 대외계 담당그룹" disabled={isEdit} />
              </div>
              <div className="form-row">
                <label>담당 유형</label>
                <select defaultValue={owner?.ownerTypeCode ?? "GROUP"}>
                  <option value="GROUP">그룹</option>
                  <option value="USER">사용자</option>
                </select>
              </div>
              <div className="form-row">
                <label>책임</label>
                <select defaultValue={owner?.responsibilityCode ?? "MAIN"}>
                  <option value="MAIN">주담당</option>
                  <option value="SUB">부담당</option>
                  <option value="ALERT">알림수신</option>
                </select>
              </div>
            </div>
          </div>
          <div className="form-section">
            <h4 className="form-section__title">적용 기간</h4>
            <div className="form-grid">
              <div className="form-row"><label>시작일</label><input type="date" defaultValue="2024-01-02" /></div>
              <div className="form-row"><label>종료일</label><input type="date" /></div>
            </div>
          </div>
        </div>
        <div className="modal__foot"><button className="btn" onClick={onClose} type="button">취소</button><button className="btn btn--primary" onClick={onClose} type="button">{isEdit ? "저장" : "등록"}</button></div>
      </div>
    </div>
  );
}

function formatServiceCell(service) {
  if (!service) {
    return "-";
  }
  return <><code>{service.serviceCode}</code> {service.serviceName}</>;
}

function field(record, key, fallback = "-") {
  const value = record?.[key];
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return String(value);
}

function recordKey(record, idKey, fallbackKey) {
  return field(record, idKey, field(record, fallbackKey, Math.random().toString(36)));
}

function formatDateCell(value) {
  if (!value || value === "-") {
    return "-";
  }
  return String(value).replace("T", " ").slice(0, 16);
}

function yesNoPill(value) {
  const normalized = String(value ?? "").toUpperCase();
  const enabled = normalized === "Y" || normalized === "TRUE" || normalized === "ACTIVE";
  return <span className={`pill ${enabled ? "pill--ok" : "pill--idle"}`}>{enabled ? "활성" : "비활성"}</span>;
}

function getRemoteQueryKey(menu) {
  return {
    services: "services",
    servers: "servers",
    relations: "relations",
    techstacks: "techstacks",
    owners: "owners",
    incidents: "incidents",
    users: "users",
    groups: "groups",
    categories: "categories",
    codes: "codes",
    deployments: "deployments",
  }[menu];
}

const sidebarSections = [
  {
    label: "모니터링",
    items: [
      { key: "dashboard", icon: "📊", label: "대시보드", to: "/dashboard" },
      { key: "incidents", icon: "🚨", label: "인시던트 현황", to: "/admin-incidents" },
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
    label: "시스템 관리",
    items: [
      { key: "users", icon: "👥", label: "사용자 관리", to: "/admin-users" },
      { key: "owner-management", icon: "👨‍💼", label: "서비스 담당자 관리", to: "/admin-owner-management" },
      { key: "categories", icon: "🗂️", label: "서비스 분류 관리", to: "/admin-categories" },
      { key: "codes", icon: "⚙️", label: "공통코드 관리", to: "/admin-codes" },
    ],
  },
];

function AppShell({ activeMenu = "", children, isDark = false }) {
  return (
    <div className={`app${isDark ? " is-dark" : ""}`}>
      <Sidebar activeMenu={activeMenu} isDark={isDark} />
      <div className="app__content">
        <TopBar isDark={isDark} />
        {children}
      </div>
    </div>
  );
}

function TopBar({ isDark = false }) {
  const { incidents } = usePortalData();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const openIncidentCount = incidents.filter(
    (incident) => incident.incidentStatusCode !== "RESOLVED"
  ).length;
  const handleAccountEdit = () => {
    window.alert("계정정보 수정 기능은 다음 단계에서 연결 예정입니다.");
    setIsAccountOpen(false);
  };
  const handleLogout = () => {
    window.alert("로그아웃 기능은 다음 단계에서 연결 예정입니다.");
    setIsAccountOpen(false);
  };

  return (
    <header className={`app-topbar${isDark ? " is-dark" : ""}`}>
      <div className="app-topbar__spacer" />
      <div className="app-topbar__actions">
        <button className="app-topbar__icon-button" aria-label="알림" type="button">
          <Bell size={18} />
          {openIncidentCount > 0 ? (
            <span className="app-topbar__notification">{openIncidentCount}</span>
          ) : null}
        </button>
        <div className="app-topbar__account">
          <button
            aria-expanded={isAccountOpen}
            className="app-topbar__account-button"
            onClick={() => setIsAccountOpen((current) => !current)}
            type="button"
          >
            <span className="app-topbar__avatar" aria-hidden="true">김</span>
            <span className="app-topbar__account-text">
              <strong>김OO</strong>
              <small>모니터링팀 · ADMIN</small>
            </span>
            <ChevronDown size={16} />
          </button>
          {isAccountOpen ? (
            <div className="app-topbar__menu">
              <strong>내 계정</strong>
              <button onClick={handleAccountEdit} type="button"><Settings size={15} />프로필 설정</button>
              <button onClick={handleAccountEdit} type="button"><UserRound size={15} />환경 설정</button>
              <button className="is-logout" onClick={handleLogout} type="button"><LogOut size={15} />로그아웃</button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function Sidebar({ activeMenu = "", isDark = false }) {
  const { incidents } = usePortalData();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const itemClass = (key) => `lnb__item${activeMenu === key ? " is-active" : ""}`;
  const openIncidentCount = incidents.filter(
    (incident) => incident.incidentStatusCode !== "RESOLVED"
  ).length;
  const sectionItems = useMemo(
    () =>
      sidebarSections.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          item.key === "dashboard"
            ? {
                ...item,
                badge: openIncidentCount > 0 ? String(openIncidentCount) : undefined,
              }
            : item
        ),
      })),
    [openIncidentCount]
  );
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
          <Link to="/dashboard"><h2>ChainView</h2></Link>
        </div>
      </div>
      {sectionItems.map((section) => (
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

const serviceDetailTabs = [
  { key: "overview", label: "개요" },
  { key: "incidents", label: "인시던트 이력" },
  { key: "deployments", label: "배포/서버" },
  { key: "impact", label: "영향도" },
  { key: "owners", label: "담당자" },
  { key: "relations", label: "서비스 관계" },
  { key: "techstack", label: "기술스택" },
  { key: "changes", label: "변경 이력" },
];

const serviceDetailSamples = {
  "EXT-001": {
    title: "카드승인연계",
    importanceLabel: "높음",
    statusLabel: "운영중",
    ownerSummary: "김OO (주담당자)",
    overviewIncidents: [
      { status: "완료", time: "05/22 03:14", title: "INC-2026-0287 · 외부 카드사 정기 점검 미공지로 timeout", duration: "26분" },
      { status: "최고대기", time: "05/15 14:02", title: "INC-2026-0245 · 응답시간 평소보다 3배 증가 (피크 시간대)", duration: "12분" },
      { status: "조치중", time: "05/08 21:47", title: "INC-2026-0198 · 서버 장애 (ext-card-02 OOM)", duration: "8분" },
      { status: "완료", time: "04/30 09:11", title: "INC-2026-0152 · 에러율 5% 초과 (네트워크 일시 지연)", duration: "4분" },
    ],
    owners: [
      { name: "김OO", role: "주담당자", meta: "20210034 · 대외계팀 · kim@bank.com" },
      { name: "박OO", role: "부담당자", meta: "20190112 · 대외계팀 · park@bank.com" },
      { name: "이OO", role: "운영자", meta: "20150088 · 대외계개발팀 · lee@bank.com" },
    ],
    deploymentRows: [
      { name: "ext-card-01.bank.local", meta: "10.0.3.30:8443 · Production · Linux (CentOS 7.9)", path: "deploy: /app/services/ext-card", status: "운영중" },
      { name: "ext-card-02.bank.local", meta: "10.0.3.31:8443 · Production · Linux (CentOS 7.9)", path: "deploy: /app/services/ext-card", status: "운영중" },
      { name: "ext-card-03.bank.local", meta: "10.0.3.32:8443 · Production · Linux (CentOS 7.9)", path: "deploy: /app/services/ext-card", status: "운영중" },
    ],
    techRows: [
      { type: "언어", name: "Java", master: "17", applied: "17.0.8", note: "-" },
      { type: "프레임워크", name: "Spring Boot", master: "3.2.0", applied: "3.2.0", note: "-" },
      { type: "데이터베이스", name: "PostgreSQL", master: "15", applied: "15.3", note: "Master-Slave 구성" },
      { type: "캐시", name: "Redis", master: "7", applied: "7.0.11", note: "결제 세션 처리" },
    ],
    serverRows: [
      { server: "pay-api-01", host: "pay-api-01.internal", ip: "10.0.1.101", env: "Production", os: "Ubuntu 22.04 LTS", path: "/app/payment-api", port: "8080", instances: "3", status: "운영중" },
      { server: "pay-api-02", host: "pay-api-02.internal", ip: "10.0.1.102", env: "Production", os: "Ubuntu 22.04 LTS", path: "/app/payment-api", port: "8080", instances: "3", status: "운영중" },
    ],
    changeRows: [
      { type: "수정", actor: "김철수", at: "2026-05-10 15:30", field: "인스턴스 수", before: "2", after: "3" },
      { type: "등록", actor: "이영희", at: "2026-01-15 10:00", field: "서비스", before: "-", after: "신규 등록" },
    ],
    relationRows: [
      { direction: "송신", service: "EAM 통합 인증", type: "AUTH_CALL", status: "주의", required: "Y", impact: "직접", description: "공통 API Gateway 인증 실패 시 로그인/권한 검증 영향" },
      { direction: "송신", service: "SSO 통합 인증", type: "AUTH_CALL", status: "주의", required: "Y", impact: "직접", description: "SSO 토큰 검증 장애 시 대외 API 전체 인증 영향" },
      { direction: "송신", service: "PG 게이트웨이", type: "API 호출", status: "활성", required: "Y", impact: "직접", description: "결제 승인 요청" },
      { direction: "수신", service: "주문 관리 서비스", type: "API 호출", status: "정상", required: "Y", impact: "간접", description: "결제 정보 조회" },
    ],
    impactRows: [
      { level: "직접", service: "EAM 통합 인증", scenario: "API Gateway 인증 실패", radius: "공통 인증 경로", action: "인증 우회/캐시 토큰 정책 확인" },
      { level: "직접", service: "SSO 통합 인증", scenario: "토큰 검증 지연", radius: "로그인 연계 서비스", action: "SSO 헬스체크 및 세션 재시도 확인" },
      { level: "1-hop", service: "PG 게이트웨이", scenario: "승인 요청 timeout", radius: "결제 승인", action: "PG failover 및 큐 적체 확인" },
    ],
    incidentRows: [
      { title: "결제 서버 응답 지연", severity: "HIGH", status: "RESOLVED", direct: "직접", startedAt: "2026-05-10 14:30", endedAt: "2026-05-10 15:45" },
      { title: "데이터베이스 연결 오류", severity: "CRITICAL", status: "RESOLVED", direct: "직접", startedAt: "2026-04-20 09:00", endedAt: "2026-04-20 10:30" },
    ],
  },
};

function cloneServiceDetailSample(serviceCode) {
  return JSON.parse(
    JSON.stringify(serviceDetailSamples[serviceCode] || serviceDetailSamples["EXT-001"])
  );
}

function ServiceAdminPage() {
  const { serviceCode } = useParams();
  const portalData = usePortalData();
  const sampleServices = [
    {
      serviceCode: "EXT-001",
      serviceName: "카드승인연계",
      categoryPath: ["대외계", "결제", "승인"],
      serviceType: "API",
      importance: "높음",
      status: "운영중",
      endpoint: "https://ext.bank.com/v2/card/auth",
      createdAt: "2023-04-12",
    },
    {
      serviceCode: "EXT-004",
      serviceName: "카드취소연계",
      categoryPath: ["대외계", "결제", "취소"],
      serviceType: "API",
      importance: "높음",
      status: "운영중",
      endpoint: "https://ext.bank.com/v2/card/cancel",
      createdAt: "2023-04-12",
    },
    {
      serviceCode: "DEP-001",
      serviceName: "예금이체서비스",
      categoryPath: ["기간계", "계좌", "이체"],
      serviceType: "API",
      importance: "높음",
      status: "운영중",
      endpoint: "https://core.bank.com/dep/transfer",
      createdAt: "2022-11-03",
    },
  ];
  const sampleService =
    sampleServices.find((service) => service.serviceCode === serviceCode) ??
    sampleServices[0];
  const selectedService =
    portalData.services.find((service) => service.serviceCode === serviceCode) ??
    {
      serviceId: 1001,
      categoryPath: sampleService.categoryPath,
      serviceCode: sampleService.serviceCode,
      serviceName: sampleService.serviceName,
      serviceTypeCode: sampleService.serviceType,
      importanceCode: "HIGH",
      statusCode: "NORMAL",
      description: "외부 카드사 승인 요청 중계 API",
      endpointUrl: sampleService.endpoint,
      serverId: 1,
      deployPath: "/app/services/ext-card",
      portInfo: "8443",
      deploymentStatusCode: "RUNNING",
      instanceCount: 3,
      createdBy: "20180023",
      updatedBy: "20210034",
      createdAt: "2023-04-12",
      updatedAt: "2026-05-30",
    };

  return <ServiceDetailPage service={selectedService} />;
}

function ServiceDetailPage({ service }) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = new URLSearchParams(location.search).get("tab") || "overview";
  const [detail, setDetail] = useState(() => cloneServiceDetailSample(service.serviceCode));
  const tabClassName = (tabKey) =>
    `service-detail__tab${activeTab === tabKey ? " is-active" : ""}`;

  useEffect(() => {
    setDetail(cloneServiceDetailSample(service.serviceCode));
  }, [service.serviceCode]);

  const setTab = (tabKey) => {
    navigate(`/admin-services/${service.serviceCode}?tab=${tabKey}`);
  };

  const handleTechEdit = (techName) => {
    const nextVersion = window.prompt("적용 버전을 입력하세요.", detail.techRows.find((row) => row.name === techName)?.applied || "");
    if (nextVersion === null) {
      return;
    }

    setDetail((current) => ({
      ...current,
      techRows: current.techRows.map((row) =>
        row.name === techName ? { ...row, applied: nextVersion } : row
      ),
    }));
  };

  const handleTechDelete = (techName) => {
    if (!window.confirm(`${techName} 기술스택을 삭제할까요?`)) {
      return;
    }

    setDetail((current) => ({
      ...current,
      techRows: current.techRows.filter((row) => row.name !== techName),
    }));
  };

  const handleServerDetail = (serverName) => {
    window.alert(`${serverName} 서버 상세 보기 기능은 다음 단계에서 연결 예정입니다.`);
  };

  const handleIncidentDetail = (incidentTitle) => {
    window.alert(`${incidentTitle} 상세 보기 기능은 다음 단계에서 연결 예정입니다.`);
  };

  return (
    <div className="service-detail-page">
      <div className="service-detail__crumb crumb--standardized">
        <Link to="/admin-services">서비스</Link>
        <span className="sep">/</span>
        <span>서비스 조회</span>
      </div>

      <section className="service-detail__hero">
        <div className="service-detail__hero-icon">✣</div>
        <div className="service-detail__hero-main">
          <div className="service-detail__title-row">
            <h1>{detail.title || service.serviceName}</h1>
            <span className="service-detail__status-badge">{detail.statusLabel}</span>
          </div>
          <div className="service-detail__meta">
            <span>serviceCode <b>{service.serviceCode}</b></span>
            <span>분류 <b>{service.categoryPath?.join(" > ")}</b></span>
            <span>SERVICE_TYPE <b>{service.serviceTypeCode}</b></span>
            <span>STATUS <b>{detail.statusLabel}</b></span>
            <span>{detail.ownerSummary}</span>
          </div>
        </div>
      </section>

      <nav className="service-detail__tabs" aria-label="서비스 상세 탭">
        {serviceDetailTabs.map((tab) => (
          <button
            className={tabClassName(tab.key)}
            key={tab.key}
            onClick={() => setTab(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? <ServiceOverviewTab detail={detail} onOpenDeployments={() => setTab("deployments")} service={service} /> : null}
      {activeTab === "techstack" ? <ServiceTechStackTab detail={detail} onDelete={handleTechDelete} onEdit={handleTechEdit} /> : null}
      {activeTab === "deployments" ? <ServiceDeploymentTab detail={detail} onOpenDetail={handleServerDetail} /> : null}
      {activeTab === "impact" ? <ServiceImpactTab detail={detail} /> : null}
      {activeTab === "owners" ? <ServiceOwnersTab detail={detail} /> : null}
      {activeTab === "relations" ? <ServiceRelationTab detail={detail} /> : null}
      {activeTab === "changes" ? <ServiceChangeTab detail={detail} /> : null}
      {activeTab === "incidents" ? <ServiceIncidentTab detail={detail} onOpenDetail={handleIncidentDetail} /> : null}
    </div>
  );
}

function ServiceOverviewTab({ detail, onOpenDeployments, service }) {
  return (
    <div className="service-detail__overview-grid">
      <article className="service-detail__panel">
        <h2>기본 정보 (SERVICE)</h2>
        <dl className="service-detail__definition-list">
          <dt>serviceCode</dt><dd>{service.serviceCode}</dd>
          <dt>serviceName</dt><dd>{service.serviceName}</dd>
          <dt>categoryL1/L2/L3</dt><dd>{service.categoryPath?.map((item) => <span className="tag" key={item}>{item}</span>)}</dd>
          <dt>serviceType</dt><dd>{service.serviceTypeCode}</dd>
          <dt>importance</dt><dd><span className="pill pill--crit">{detail.importanceLabel}</span></dd>
          <dt>status</dt><dd><span className="pill pill--ok">{detail.statusLabel}</span></dd>
          <dt>endpointUrl</dt><dd><code>{service.endpointUrl}</code></dd>
          <dt>description</dt><dd>{service.description || "외부 카드사 승인 요청 중계 API"}</dd>
          <dt>createdAt</dt><dd>2023-04-12 / createdBy: 20180023 홍OO</dd>
          <dt>updatedAt</dt><dd>2026-05-30 / updatedBy: 20210034 김OO</dd>
        </dl>
      </article>

      <article className="service-detail__panel">
        <div className="service-detail__panel-head">
          <h2>배포/서버</h2>
          <span>1 / 3 down · DEPLOYMENT ⇄ SERVER</span>
        </div>
        <div className="service-detail__stack-list">
          {detail.deploymentRows.map((row) => (
            <div className="service-detail__deploy-card" key={row.name}>
              <div className="service-detail__deploy-head">
                <div className="service-detail__deploy-title"><i />{row.name}</div>
                <button className="service-detail__icon-action" onClick={onOpenDeployments} type="button">
                  <Eye size={14} />
                  <span>상세</span>
                </button>
              </div>
              <div className="service-detail__deploy-meta">{row.meta}</div>
              <div className="service-detail__deploy-foot">
                <span>{row.path}</span>
                <span className="pill pill--ok">{row.status}</span>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="service-detail__panel">
        <div className="service-detail__panel-head">
          <h2>인시던트 이력 (30일)</h2>
          <button className="service-detail__text-action" type="button">전체 보기 →</button>
        </div>
        <div className="service-detail__compact-list">
          {detail.overviewIncidents.map((item) => (
            <div className="service-detail__compact-row" key={`${item.time}-${item.title}`}>
              <span className="pill pill--ok">{item.status}</span>
              <span>{item.time}</span>
              <strong>{item.title}</strong>
              <span>{item.duration}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="service-detail__panel">
        <h2>담당자 (SERVICE_OWNER)</h2>
        <div className="service-detail__owner-list">
          {detail.owners.map((owner) => (
            <div className="service-detail__owner-row" key={owner.name + owner.role}>
              <div className="service-detail__owner-avatar">{owner.name.slice(0, 1)}</div>
              <div className="service-detail__owner-meta">
                <strong>{owner.name}</strong>
                <span>{owner.role}</span>
                <small>{owner.meta}</small>
              </div>
              <div className="service-detail__owner-actions">
                <button type="button"><MessageCircle size={14} /></button>
                <button type="button"><Phone size={14} /></button>
                <button type="button"><Mail size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

function ServiceImpactTab({ detail }) {
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>영향도</h2>
          <p>관계 등록 시 함께 관리할 직접/간접 영향 정보</p>
        </div>
      </div>
      <div className="service-detail__impact-grid">
        {detail.impactRows.map((row) => (
          <article className="service-detail__impact-card" key={row.service + row.scenario}>
            <span className={`service-detail__impact-level ${row.level === "직접" ? "is-direct" : ""}`}>{row.level}</span>
            <h3>{row.service}</h3>
            <dl>
              <dt>영향 조건</dt><dd>{row.scenario}</dd>
              <dt>영향 범위</dt><dd>{row.radius}</dd>
              <dt>확인 조치</dt><dd>{row.action}</dd>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function ServiceOwnersTab({ detail }) {
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>담당자 정보</h2>
          <p>주담당/부담당/운영 담당을 분리해 확인</p>
        </div>
      </div>
      <div className="service-detail__owner-list">
        {detail.owners.map((owner) => (
          <div className="service-detail__owner-row" key={owner.name + owner.role}>
            <div className="service-detail__owner-avatar">{owner.name.slice(0, 1)}</div>
            <div className="service-detail__owner-meta">
              <strong>{owner.name}</strong>
              <span>{owner.role}</span>
              <small>{owner.meta}</small>
            </div>
            <div className="service-detail__owner-actions">
              <button type="button"><MessageCircle size={14} /></button>
              <button type="button"><Phone size={14} /></button>
              <button type="button"><Mail size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServiceTechStackTab({ detail, onDelete, onEdit }) {
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>기술스택</h2>
          <p>이 서비스에서 사용하는 기술 스택</p>
        </div>
        <button className="btn btn--ghost btn--sm" type="button"><Plus size={14} /> 기술스택 추가</button>
      </div>
      <table className="tbl service-detail__full-table">
        <thead>
          <tr>
            <th>기술 유형</th>
            <th>기술명</th>
            <th>마스터 버전</th>
            <th>적용 버전</th>
            <th>비고</th>
            <th className="col-actions">액션</th>
          </tr>
        </thead>
        <tbody>
          {detail.techRows.map((row) => (
            <tr key={row.type + row.name}>
              <td><span className="tag">{row.type}</span></td>
              <td><strong>{row.name}</strong></td>
              <td>{row.master}</td>
              <td>{row.applied}</td>
              <td>{row.note}</td>
              <td className="col-actions">
                <div className="service-detail__text-actions">
                  <button className="service-detail__text-action-button" onClick={() => onEdit(row.name)} type="button"><Pencil size={14} /> 수정</button>
                  <button className="service-detail__text-action-button is-danger" onClick={() => onDelete(row.name)} type="button"><Trash2 size={14} /> 삭제</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ServiceDeploymentTab({ detail, onOpenDetail }) {
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>서버/배포 정보</h2>
          <p>이 서비스가 배포된 서버 목록</p>
        </div>
        <button className="btn btn--ghost btn--sm" type="button"><Plus size={14} /> 서버 연결</button>
      </div>
      <table className="tbl service-detail__full-table">
        <thead>
          <tr>
            <th>서버명</th>
            <th>호스트명</th>
            <th>IP 주소</th>
            <th>환경</th>
            <th>OS</th>
            <th>배포 경로</th>
            <th>포트</th>
            <th>인스턴스</th>
            <th>상태</th>
            <th className="col-actions">액션</th>
          </tr>
        </thead>
        <tbody>
          {detail.serverRows.map((row) => (
            <tr key={row.server}>
              <td><strong>{row.server}</strong></td>
              <td>{row.host}</td>
              <td>{row.ip}</td>
              <td><span className="tag">{row.env}</span></td>
              <td>{row.os}</td>
              <td>{row.path}</td>
              <td>{row.port}</td>
              <td>{row.instances}</td>
              <td><span className="pill pill--ok">{row.status}</span></td>
              <td className="col-actions">
                <button className="service-detail__text-action-button" onClick={() => onOpenDetail(row.server)} type="button">
                  <Eye size={14} />
                  상세
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ServiceRelationTab({ detail }) {
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>서비스 관계</h2>
          <p>다른 서비스와의 연관 관계</p>
        </div>
        <button className="btn btn--ghost btn--sm" type="button">＋ 관계 추가</button>
      </div>
      <table className="tbl service-detail__full-table">
        <thead>
          <tr>
            <th>방향</th>
            <th>연관 서비스</th>
            <th>관계 유형</th>
            <th>관계 상태</th>
            <th>필수 여부</th>
            <th>영향도</th>
            <th>설명</th>
            <th className="col-actions">액션</th>
          </tr>
        </thead>
        <tbody>
          {detail.relationRows.map((row) => (
            <tr key={row.direction + row.service}>
              <td><span className={`service-detail__direction-badge ${row.direction === "송신" ? "is-outbound" : "is-inbound"}`}>{row.direction === "송신" ? "-> 송신" : "<- 수신"}</span></td>
              <td><strong className="service-detail__linkish">{row.service}</strong></td>
              <td><span className="tag">{row.type}</span></td>
              <td><span className="pill pill--ok">{row.status}</span></td>
              <td>{row.required}</td>
              <td><span className={row.impact === "직접" ? "pill pill--crit" : "tag"}>{row.impact}</span></td>
              <td>{row.description}</td>
              <td className="col-actions"><div className="row-actions"><button className="ibtn" type="button">✏️</button><button className="ibtn ibtn--danger" type="button">🗑</button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ServiceChangeTab({ detail }) {
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>변경 이력</h2>
          <p>서비스 정보 변경 기록</p>
        </div>
      </div>
      <table className="tbl service-detail__full-table">
        <thead>
          <tr>
            <th>변경 유형</th>
            <th>변경자</th>
            <th>변경 일시</th>
            <th>변경 항목</th>
            <th>이전 값</th>
            <th>변경 값</th>
          </tr>
        </thead>
        <tbody>
          {detail.changeRows.map((row) => (
            <tr key={row.actor + row.at}>
              <td><span className={`service-detail__change-badge ${row.type === "등록" ? "is-create" : "is-update"}`}>{row.type}</span></td>
              <td>{row.actor}</td>
              <td>{row.at}</td>
              <td><strong>{row.field}</strong></td>
              <td>{row.before}</td>
              <td>{row.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ServiceIncidentTab({ detail, onOpenDetail }) {
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>인시던트 이력</h2>
          <p>이 서비스와 관련된 장애 및 이슈</p>
        </div>
        <button className="btn btn--ghost btn--sm" type="button"><Plus size={14} /> 인시던트 등록</button>
      </div>
      <table className="tbl service-detail__full-table">
        <thead>
          <tr>
            <th>제목</th>
            <th>심각도</th>
            <th>상태</th>
            <th>직접 영향</th>
            <th>발생 일시</th>
            <th>종료 일시</th>
            <th className="col-actions">액션</th>
          </tr>
        </thead>
        <tbody>
          {detail.incidentRows.map((row) => (
            <tr key={row.title + row.startedAt}>
              <td><strong className="service-detail__linkish">{row.title}</strong></td>
              <td><span className={`pill ${row.severity === "CRITICAL" ? "pill--crit" : "pill--warn"}`}>{row.severity}</span></td>
              <td><span className="pill pill--ok">{row.status}</span></td>
              <td><span className="tag">{row.direct}</span></td>
              <td>{row.startedAt}</td>
              <td>{row.endedAt}</td>
              <td className="col-actions">
                <button className="service-detail__text-action-button" onClick={() => onOpenDetail(row.title)} type="button">
                  <Eye size={14} />
                  상세
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
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
  const isIncidentMode = incidents.some((incident) => incident.incidentStatusCode !== "RESOLVED");
  const activeIncidentId = Number(new URLSearchParams(location.search).get("incidentId")) || undefined;

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

function IncidentDetailPage() {
  const location = useLocation();
  const { incidentEvents, incidentImpacts, incidents, relations, services } = usePortalData();
  const [now, setNow] = useState(() => new Date());
  const incidentId = Number(new URLSearchParams(location.search).get("incidentId")) || undefined;
  const incident =
    incidents.find((item) => item.incidentId === incidentId) ??
    incidents.find((item) => item.incidentStatusCode !== "RESOLVED") ??
    {
      incidentId: 0,
      incidentStatusCode: "OPEN",
      severityCode: "CRITICAL",
      externalIncidentCode: "INC-2026-0312",
      targetCode: "EXT-001",
      targetLabel: "SERVICE · EXT-001",
      title: "외부 카드사 응답 timeout 다발",
      startedAt: "2026-06-01 14:08",
      description: "외부 카드사 승인 요청 지연으로 영향 서비스가 감지되었습니다.",
      manualRegisteredYn: "Y",
      registeredBy: "SYSTEM",
    };
  const service =
    services.find((item) => item.serviceId === incident.serviceId) ??
    services.find((item) => item.serviceCode === incident.targetCode) ??
    services[0];
  const impactedServices = incidentImpacts
    .filter((impact) => impact.incidentId === incident.incidentId)
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
  const elapsedLabel = incident.startedAt ? formatIncidentElapsed(incident.startedAt, now) : "00:00:00";
  const eventRows = incidentEvents.filter((event) => event.incidentId === incident.incidentId);
  const timelineRows = eventRows.length
    ? eventRows.map((event) => [event.createdAt?.slice(11, 16) || "-", event.message, event.actor])
    : [
        ["14:08", "자동 감지: 에러율 임계치 초과 · 외부 통신 5xx", "System"],
        ["14:08", "자동 감지: 인스턴스 1대 헬스체크 실패", "System"],
        ["14:09", "담당 그룹 알림 발송 · Slack · SMS 3명", "System"],
        ["14:11", "연쇄 영향 감지: 카드취소연계, 카드정산연계 상태 변화", "System"],
        ["14:12", "담당자 ACK 수신", "System"],
      ];
  const recentDeploymentRows = [
    { date: "2026-06-23", title: "결제 API 지연 반영", owner: "김OO", status: "운영 반영" },
    { date: "2026-06-22", title: "장애 대비 캐시 정책 긴급 반영", owner: "박OO", status: "운영 반영" },
    { date: "2026-06-20", title: "Gateway timeout 설정 변경", owner: "이OO", status: "검토 필요" },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <AppShell activeMenu="dashboard" isDark>
      <main className="main chain-dashboard-main incident-detail-page">
        <div className="incident-detail__crumb">
          <Link to="/dashboard">📊 실시간 대시보드</Link>
          <span>/</span>
          <span>{service?.categoryPath?.[0] ?? "대외계"}</span>
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
              <span>분류 <b>{service?.categoryPath?.join(" > ") ?? "대외계 > 결제 > 승인"}</b></span>
              <span>SERVICE_TYPE <b>{service?.serviceTypeCode ?? "API"}</b></span>
              <span>IMPORTANCE <b>{service?.importanceCode ?? "높음"}</b></span>
              <span>STATUS <b>{codeLabels.serviceStatus?.[service?.statusCode] ?? "운영중"}</b></span>
            </div>
          </div>
          <div className="incident-detail__timer">
            <span>경과시간</span>
            <strong>{elapsedLabel}</strong>
          </div>
        </section>

        <nav className="incident-detail__tabs">
          {["개요", "감지/알림 이력", "영향도", "최근 배포", "담당자"].map((tab, index) => (
            <span className={index === 0 ? "is-active" : ""} key={tab}>{tab}</span>
          ))}
        </nav>

        <div className="incident-detail__layout">
          <section className="incident-detail__left">
            <article className="incident-detail__card incident-detail__card--danger incident-detail__card--summary">
              <div className="incident-detail__card-head">
                <h2>🚨 진행 중 인시던트</h2>
                <span>id: {incident.externalIncidentCode ?? `#${incident.incidentId}`} · severity: {incident.severityCode} · occurredAt: {incident.startedAt}</span>
              </div>
              <div className="incident-detail__summary">
                <b>title</b>
                <p>{incident.title} · incidentType: 서비스 장애 · affectedServices: {Math.max(impactedServices.length, 2)}</p>
              </div>
              <h3>감지 및 알림 이력</h3>
              <div className="incident-detail__timeline incident-detail__scroll-area">
                {timelineRows.map(([time, message, actor], index) => (
                  <div className="incident-detail__timeline-row" key={`${time}-${message}`}>
                    <span>{time}</span>
                    <i className={index < 2 ? "is-danger" : index < 4 ? "is-warn" : ""} />
                    <p>{message}</p>
                    <em>{actor}</em>
                  </div>
                ))}
              </div>
            </article>

            <article className="incident-detail__card incident-detail__card--graph">
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

            <article className="incident-detail__card incident-detail__card--compact">
              <div className="incident-detail__card-head">
                <h2>최근 배포 이력</h2>
                <span>장애 발생 전후 변경사항</span>
              </div>
              <div className="incident-detail__deploy-list incident-detail__scroll-area">
                {recentDeploymentRows.map((row) => (
                  <div className="incident-detail__deploy-row" key={row.date + row.title}>
                    <time>{row.date}</time>
                    <strong>{row.title}</strong>
                    <span>{row.owner}</span>
                    <em>{row.status}</em>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <aside className="incident-detail__right">
            <article className="incident-detail__card incident-detail__card--summary">
              <h2>📦 기본 정보 (SERVICE)</h2>
              <dl className="incident-detail__dl">
                <dt>serviceCode</dt><dd><code>{service?.serviceCode ?? incident.targetCode}</code></dd>
                <dt>serviceName</dt><dd>{service?.serviceName ?? incident.title}</dd>
                <dt>categoryL1/L2/L3</dt><dd>{service?.categoryPath?.join(" > ") ?? "-"}</dd>
                <dt>serviceType</dt><dd>{service?.serviceTypeCode ?? "API"}</dd>
                <dt>importance</dt><dd>{service?.importanceCode ?? "높음"}</dd>
                <dt>status</dt><dd>{service?.statusCode ?? "INCIDENT"}</dd>
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
              </div>
            </article>

            <article className="incident-detail__card incident-detail__card--compact">
              <h2>👥 담당자 (SERVICE_OWNER)</h2>
              {["김OO · 주담당자", "박OO · 부담당자", "이OO · 운영자"].map((owner) => (
                <div className="incident-detail__owner" key={owner}>
                  <b>{owner.slice(0, 1)}</b>
                  <span>{owner}<small>대외계팀 · bank.com</small></span>
                  <em>✉</em>
                </div>
              ))}
            </article>
          </aside>
        </div>
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

function AppRoutes() {
  const adminPages = Object.keys(pages).filter((slug) => pages[slug].isAdmin);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/topology" element={<TopologyPage />} />
      <Route path="/dashboard-proto" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard-proto-detail" element={<IncidentDetailPage />} />
      <Route path="/dashboard-proto-topology" element={<Navigate to="/topology" replace />} />
      <Route path="/admin-services/:serviceCode" element={<AppShell activeMenu="services"><main className="main"><ServiceAdminPage /></main></AppShell>} />
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
