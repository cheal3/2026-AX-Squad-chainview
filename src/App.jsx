import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { initAdminInteractions } from "./adminInteractions.js";
import { AppShell } from "./components/AppShell.jsx";
import { pages } from "./pagesData.js";
import { PortalDataProvider, usePortalData } from "./dashboardModule/PortalDataStore";
import { remoteQueryKeys } from "./dashboardModule/remoteQueries";

const DynamicAdminListPage = lazy(() => import("./pages/admin/AdminListPage.jsx").then((module) => ({ default: module.DynamicAdminListPage })));
const InfraRelationsPage = lazy(() => import("./pages/infra/InfraPages.jsx").then((module) => ({ default: module.InfraRelationsPage })));
const InfraTopologyPage = lazy(() => import("./pages/infra/InfraPages.jsx").then((module) => ({ default: module.InfraTopologyPage })));
const ServiceInfraMappingPage = lazy(() => import("./pages/infra/ServiceInfraMappingPage.jsx").then((module) => ({ default: module.ServiceInfraMappingPage })));
const DashboardPage = lazy(() => import("./pages/monitoring/MonitoringPages.jsx").then((module) => ({ default: module.DashboardPage })));
const IncidentAdminPage = lazy(() => import("./pages/monitoring/MonitoringPages.jsx").then((module) => ({ default: module.IncidentAdminPage })));
const IncidentDetailPage = lazy(() => import("./pages/monitoring/MonitoringPages.jsx").then((module) => ({ default: module.IncidentDetailPage })));
const NotificationHistoryPage = lazy(() => import("./pages/operation/OperationPages.jsx").then((module) => ({ default: module.NotificationHistoryPage })));
const NotificationTemplatePage = lazy(() => import("./pages/operation/OperationPages.jsx").then((module) => ({ default: module.NotificationTemplatePage })));
const ServiceCheckPage = lazy(() => import("./pages/operation/OperationPages.jsx").then((module) => ({ default: module.ServiceCheckPage })));
const ServiceAdminPage = lazy(() => import("./pages/service/ServiceAdminPage.jsx").then((module) => ({ default: module.ServiceAdminPage })));
const StatisticsPage = lazy(() => import("./pages/statistics/StatisticsPage.jsx").then((module) => ({ default: module.StatisticsPage })));

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


const menuMetaByKey = {
  dashboard: { section: "모니터링", label: "대시보드", icon: "📊" },
  incidents: { section: "모니터링", label: "인시던트 현황", icon: "🚨" },
  topology: { section: "모니터링", label: "서비스 관계도", icon: "🗺️" },
  services: { section: "서비스", label: "서비스 조회", icon: "📦" },
  relations: { section: "서비스", label: "서비스 관계조회", icon: "🔗" },
  techstacks: { section: "서비스", label: "기술 스택", icon: "🧩" },
  servers: { section: "인프라", label: "서버 조회", icon: "🖥️" },
  deployments: { section: "인프라", label: "배포 현황", icon: "🚀" },
  "infra-topology": { section: "인프라", label: "인프라 토폴로지", icon: "🧱" },
  "infra-relations": { section: "인프라", label: "인프라 관계조회", icon: "🔌" },
  "service-infra-mapping": { section: "인프라", label: "서비스 배치 매핑", icon: "🧭" },
  "service-checks": { section: "운영", label: "서비스 점검", icon: "🧪" },
  "notification-history": { section: "운영", label: "알림 전송 이력", icon: "🔔" },
  "notification-templates": { section: "운영", label: "알림 템플릿 관리", icon: "📄" },
  "analysis-statistics": { section: "분석", label: "운영 통계", icon: "📈" },
  "analysis-incidents": { section: "분석", label: "인시던트 관리", icon: "🚨" },
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

function AppRoutes() {
  const adminPages = Object.keys(pages).filter((slug) => pages[slug].isAdmin);

  return (
    <Suspense fallback={<div className="route-loading">화면을 불러오는 중입니다.</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/operation/service-checks" element={<ServiceCheckPage />} />
        <Route path="/operation/notification-history" element={<NotificationHistoryPage />} />
        <Route path="/operation/notification-templates" element={<NotificationTemplatePage />} />
        <Route path="/analysis/statistics" element={<StatisticsPage />} />
        <Route path="/analysis/incidents" element={<RoutePage activeMenuOverride="analysis-incidents" slug="admin-incidents" />} />
        <Route path="/admin-infra-topology" element={<InfraTopologyPage />} />
        <Route path="/admin-infra-relations" element={<InfraRelationsPage />} />
        <Route path="/admin-service-infra-mapping" element={<ServiceInfraMappingPage />} />
        <Route path="/dashboard-proto" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard-proto-detail" element={<IncidentDetailPage />} />
        <Route path="/admin-services/:serviceCode" element={<AppShell activeMenu="services"><main className="main"><ServiceAdminPage /></main></AppShell>} />
        <Route path="/admin-permissions" element={<RoutePage activeMenuOverride="permissions" slug="admin-users" />} />
        <Route path="/admin-owner-management" element={<RoutePage activeMenuOverride="owner-management" slug="admin-owners" />} />
        {adminPages.map((slug) => (
          <Route key={slug} path={`/${slug}`} element={<RoutePage slug={slug} />} />
        ))}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

function RealtimeRemoteGetRefresh() {
  const location = useLocation();
  const { remoteApi } = usePortalData();
  const lastRefreshKeyRef = useRef("");

  useEffect(() => {
    if (!remoteApi.enabled || remoteApi.initialLoading) {
      return;
    }

    const refreshKey = `${location.pathname}${location.search}`;
    if (lastRefreshKeyRef.current === refreshKey) {
      return;
    }

    lastRefreshKeyRef.current = refreshKey;
    void remoteApi.refreshQueries(remoteQueryKeys);
  }, [location.pathname, location.search, remoteApi]);

  return null;
}

export default function App() {
  return (
    <PortalDataProvider>
      <RealtimeRemoteGetRefresh />
      <AppRoutes />
    </PortalDataProvider>
  );
}
