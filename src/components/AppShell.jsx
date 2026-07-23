import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { usePortalData } from "../dashboardModule/PortalDataStore";

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
      { key: "infra-relations", icon: "🔌", label: "인프라 관계조회", to: "/admin-infra-relations" },
      { key: "service-infra-mapping", icon: "🧭", label: "서비스 배치 매핑", to: "/admin-service-infra-mapping" },
      { key: "servers", icon: "🖥️", label: "서버 조회", to: "/admin-servers" },
      { key: "deployments", icon: "🚀", label: "배포 현황", to: "/admin-deployments" },
    ],
  },
  {
    label: "운영",
    items: [
      { key: "service-checks", icon: "🧪", label: "서비스 점검", to: "/operation/service-checks" },
      { key: "notification-history", icon: "🔔", label: "알림 전송 이력", to: "/operation/notification-history" },
      { key: "notification-templates", icon: "📄", label: "알림 템플릿 관리", to: "/operation/notification-templates" },
    ],
  },
  {
    label: "분석",
    items: [
      { key: "analysis-statistics", icon: "📈", label: "운영 통계", to: "/analysis/statistics" },
      { key: "analysis-incidents", icon: "🚨", label: "인시던트 관리", to: "/analysis/incidents" },
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

export function AppShell({ activeMenu = "", children, isDark = false }) {
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
  const navigate = useNavigate();
  const { incidents, remoteApi } = usePortalData();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef(null);
  const openIncidentCount = incidents.filter(
    (incident) => incident.incidentStatusCode !== "RESOLVED"
  ).length;
  const recentIncidents = useMemo(
    () =>
      [...incidents]
        .sort((left, right) => {
          const leftOpen = left.incidentStatusCode !== "RESOLVED" ? 1 : 0;
          const rightOpen = right.incidentStatusCode !== "RESOLVED" ? 1 : 0;
          if (leftOpen !== rightOpen) return rightOpen - leftOpen;
          return String(right.startedAt || "").localeCompare(String(left.startedAt || ""));
        })
        .slice(0, 6),
    [incidents]
  );

  useEffect(() => {
    if (!isNotificationOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!notificationRef.current?.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [isNotificationOpen]);

  const openIncidentDetail = (incidentId) => {
    setIsNotificationOpen(false);
    navigate(`/dashboard?incidentId=${incidentId}`);
  };
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
        <div className="app-topbar__alerts" ref={notificationRef}>
          <button
            aria-expanded={isNotificationOpen}
            aria-haspopup="dialog"
            className="app-topbar__icon-button"
            aria-label="인시던트 알림"
            onClick={() => {
              setIsNotificationOpen((current) => !current);
              setIsAccountOpen(false);
            }}
            type="button"
          >
            <Bell size={18} />
            {openIncidentCount > 0 ? (
              <span className="app-topbar__notification">{openIncidentCount}</span>
            ) : null}
          </button>
          {isNotificationOpen ? (
            <section className="app-topbar__incident-popover" aria-label="인시던트 현황">
              <div className="app-topbar__incident-head">
                <div>
                  <strong>인시던트 현황</strong>
                  <span>미종료 {openIncidentCount}건</span>
                </div>
                <Link onClick={() => setIsNotificationOpen(false)} to="/admin-incidents">전체보기</Link>
              </div>
              <div className="app-topbar__incident-list">
                {remoteApi.initialLoading ? (
                  <div className="app-topbar__incident-loading" role="status">
                    <span className="portal-initial-loader__ring" aria-hidden="true" />
                    <span>인시던트를 불러오는 중입니다.</span>
                  </div>
                ) : recentIncidents.length ? (
                  recentIncidents.map((incident) => (
                    <button
                      className="app-topbar__incident-item"
                      key={incident.incidentId}
                      onClick={() => openIncidentDetail(incident.incidentId)}
                      type="button"
                    >
                      <span className={`app-topbar__incident-dot is-${String(incident.severityCode || "notice").toLowerCase()}`} />
                      <span className="app-topbar__incident-copy">
                        <strong>{incident.title}</strong>
                        <small>{incident.externalIncidentCode || `INC-${incident.incidentId}`} · {formatTopbarIncidentTime(incident.startedAt)}</small>
                      </span>
                      <span className={`app-topbar__incident-status ${incident.incidentStatusCode === "RESOLVED" ? "is-resolved" : ""}`}>
                        {incident.incidentStatusCode}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="app-topbar__incident-empty">등록된 인시던트가 없습니다.</div>
                )}
              </div>
            </section>
          ) : null}
        </div>
        <div className="app-topbar__account">
          <button
            aria-expanded={isAccountOpen}
            className="app-topbar__account-button"
            onClick={() => {
              setIsAccountOpen((current) => !current);
              setIsNotificationOpen(false);
            }}
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

function formatTopbarIncidentTime(value) {
  if (!value) return "발생시각 미등록";
  return String(value).replace("T", " ").slice(0, 16);
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
