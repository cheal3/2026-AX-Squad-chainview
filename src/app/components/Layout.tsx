import { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import {
  AlertTriangle,
  Box,
  Boxes,
  Code2,
  Database,
  GitBranch,
  Layers3,
  LayoutDashboard,
  Menu,
  PackageCheck,
  RefreshCw,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react";
import { usePortalData } from "../PortalDataStore";

type NavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
};

function isActivePath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function Layout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { incidents, services } = usePortalData();
  const incidentCount = services.filter(
    (service) =>
      service.statusCode === "INCIDENT" || service.statusCode === "INACTIVE"
  ).length;
  const activeIncidentAlert = useMemo(() => {
    const serviceById = new Map(
      services.map((service) => [service.serviceId, service])
    );

    return incidents
      .filter(
        (incident) =>
          incident.incidentStatusCode !== "RESOLVED" &&
          (incident.manualRegisteredYn === "Y" || incident.registeredBy === "admin")
      )
      .map((incident) => ({
        incident,
        service: incident.serviceId
          ? serviceById.get(incident.serviceId)
          : undefined,
      }))
      .filter(
        (item): item is {
          incident: (typeof incidents)[number];
          service: (typeof services)[number];
        } => Boolean(item.service)
      )
      .sort((first, second) =>
        second.incident.startedAt.localeCompare(first.incident.startedAt)
      )[0];
  }, [incidents, services]);

  const sections: { label: string; items: NavItem[] }[] = [
    {
      label: "모니터링",
      items: [
        {
          path: "/dashboard",
          label: "대시보드",
          icon: LayoutDashboard,
          badge: incidentCount,
        },
        { path: "/incidents", label: "인시던트 관리", icon: AlertTriangle },
      ],
    },
    {
      label: "서비스 카탈로그",
      items: [
        { path: "/services", label: "서비스 관리", icon: Box },
        { path: "/service-categories", label: "서비스 분류 관리", icon: Layers3 },
        { path: "/service-catalog/relations", label: "관계 그래프", icon: GitBranch },
        { path: "/tech-stacks", label: "기술스택 마스터", icon: Code2 },
        { path: "/service-relations", label: "서비스 관계 관리", icon: PackageCheck },
      ],
    },
    {
      label: "배포 인프라",
      items: [
        { path: "/servers", label: "서버 관리", icon: Server },
        { path: "/deployments", label: "배포 정보", icon: Database },
      ],
    },
    {
      label: "소유권",
      items: [
        { path: "/users", label: "사용자 관리", icon: Users },
        { path: "/groups", label: "그룹 관리", icon: Boxes },
        { path: "/service-owners", label: "서비스 담당자", icon: ShieldCheck },
      ],
    },
    {
      label: "시스템",
      items: [{ path: "/common-codes", label: "공통코드 관리", icon: RefreshCw }],
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      <aside
        className={`relative flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          sidebarCollapsed ? "w-[82px]" : "w-[252px]"
        }`}
      >
        <div
          className={`flex h-[88px] items-center border-b border-slate-100 transition-all duration-300 ${
            sidebarCollapsed ? "justify-center px-3" : "gap-3 px-5"
          }`}
        >
          <div
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#3182f6] font-black text-white transition-all duration-300 ${
              sidebarCollapsed
                ? "h-0 w-0 scale-75 opacity-0"
                : "h-10 w-10 scale-100 text-sm opacity-100"
            }`}
          >
            CV
          </div>
          <div
            className={`min-w-0 overflow-hidden transition-all duration-300 ${
              sidebarCollapsed
                ? "max-w-0 translate-x-1 opacity-0"
                : "max-w-[150px] translate-x-0 opacity-100"
            }`}
          >
            <h1 className="truncate text-lg font-black leading-6 text-slate-900">
              ChainView
            </h1>
            <p className="truncate text-sm font-semibold text-slate-500">
              Service Monitor
            </p>
          </div>
          <button
            type="button"
            aria-label={sidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
            onClick={() => setSidebarCollapsed((current) => !current)}
            className={`group flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 ${
              sidebarCollapsed
                ? "h-10 w-10"
                : "ml-auto h-8 w-8"
            }`}
          >
            <Menu
              size={17}
              className={`transition-transform duration-300 ${
                sidebarCollapsed ? "rotate-0" : "rotate-180"
              }`}
            />
          </button>
        </div>

        <nav
          className={`min-h-0 flex-1 overflow-hidden py-3 transition-all duration-300 ${
            sidebarCollapsed ? "px-3" : "px-3"
          }`}
        >
          {sections.map((section) => (
            <div key={section.label} className="mb-3 last:mb-0">
              <div
                className={`mb-1 overflow-hidden px-2 text-[11px] font-black text-slate-400 transition-all duration-300 ${
                  sidebarCollapsed
                    ? "h-0 translate-y-[-4px] opacity-0"
                    : "h-4 translate-y-0 opacity-100"
                }`}
              >
                {section.label}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(location.pathname, item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`relative flex h-8 items-center rounded-lg text-[13px] font-bold transition ${
                        sidebarCollapsed
                          ? "justify-center px-0"
                          : "gap-2 px-3"
                      } ${
                        active
                          ? "bg-[#f2f7ff] text-[#1f6feb] ring-1 ring-[#c7dbff]"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                      }`}
                    >
                      <Icon size={17} className="shrink-0" />
                      <span
                        className={`min-w-0 flex-1 overflow-hidden truncate transition-all duration-300 ${
                          sidebarCollapsed
                            ? "max-w-0 translate-x-2 opacity-0"
                            : "max-w-[150px] translate-x-0 opacity-100"
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.badge ? (
                        <span
                          className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff4d5a] px-1 text-xs font-black text-white transition-all duration-300 ${
                            sidebarCollapsed
                              ? "absolute right-1 top-1 scale-90"
                              : "relative scale-100"
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 overflow-hidden">
        <main className="h-full overflow-auto p-6">
          {activeIncidentAlert ? (
            <section className="mx-auto mb-4 flex w-full max-w-[1680px] items-center justify-between gap-4 rounded-xl border border-[#ffd1d6] bg-[#fff5f6] px-5 py-3 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ffe5e8] text-[#f04452]">
                  <AlertTriangle size={19} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-[#f04452]">
                    인시던트 알림
                  </div>
                  <div className="mt-0.5 truncate text-xs font-bold text-[#b4232f]">
                    {activeIncidentAlert.service.serviceName} ·{" "}
                    {activeIncidentAlert.incident.title} · 발생{" "}
                    {activeIncidentAlert.incident.startedAt}
                  </div>
                </div>
              </div>
              <Link
                to={`/dashboard?incidentId=${activeIncidentAlert.incident.incidentId}`}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#3182f6] px-4 text-xs font-black text-white transition hover:bg-[#1b64da]"
              >
                상세 보기
              </Link>
            </section>
          ) : null}
          <Outlet />
        </main>
      </div>

    </div>
  );
}
