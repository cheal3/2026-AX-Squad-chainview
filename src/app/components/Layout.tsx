import { Outlet, Link, useLocation } from "react-router";
import { useState, type ComponentType } from "react";
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  LayoutDashboard,
  Map,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Server,
  SquareStack,
  User,
} from "lucide-react";

type NavItem = {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const navItems: NavItem[] = [
  { path: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { path: "/incident-status", label: "장애 현황", icon: AlertTriangle },
  { path: "/world-map", label: "서버 맵", icon: Map },
  { path: "/servers", label: "서버 조회", icon: Server },
  { path: "/services", label: "서비스 조회", icon: SquareStack },
  { path: "/relations", label: "관계 그래프", icon: Network },
];

const pageTitles = [
  { path: "/dashboard", label: "서비스 대시보드" },
  { path: "/incident-status", label: "장애 현황 대시보드" },
  { path: "/world-map", label: "서버 맵" },
  { path: "/servers", label: "서버 관리" },
  { path: "/services", label: "서비스 관리" },
  { path: "/relations", label: "서비스 관계도" },
];

const navSections = [
  { label: "포털", items: navItems.slice(0, 2) },
  { label: "배포 인프라", items: navItems.slice(2, 4) },
  { label: "서비스 관계", items: navItems.slice(4) },
];

export function Layout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const currentTitle =
    pageTitles.find((item) => isActive(item.path))?.label || "서비스 포털";
  const worldMapPage = isActive("/world-map");

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900">
      <aside
        className={`flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ${
          sidebarCollapsed ? "w-[88px]" : "w-[292px]"
        }`}
      >
        <div className="relative border-b border-slate-200 px-4 py-4">
          <div
            className={`flex items-center ${
              sidebarCollapsed ? "justify-center" : "gap-3"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              CV
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-slate-950">ChainView</h1>
                <p className="text-sm text-slate-500">Service Portal</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed((current) => !current)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 ${
                sidebarCollapsed ? "absolute left-[68px] top-5 border border-slate-200 bg-white shadow-sm" : ""
              }`}
              title={sidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </button>
          </div>
        </div>

        <nav
          className={`flex-1 overflow-auto py-6 ${
            sidebarCollapsed ? "space-y-4 px-3" : "space-y-6 px-4"
          }`}
        >
          {navSections.map((section) => (
            <div key={section.label}>
              <div
                className={`mb-3 flex items-center justify-between text-xs font-semibold text-slate-500 ${
                  sidebarCollapsed ? "sr-only" : ""
                }`}
              >
                <span>{section.label}</span>
                <ChevronDown size={16} />
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`flex items-center rounded-lg py-3 text-sm font-medium transition-colors ${
                        active
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                      } ${sidebarCollapsed ? "justify-center px-0" : "gap-3 px-4"}`}
                    >
                      <Icon size={20} />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className={`flex items-center justify-between border-b border-slate-200 bg-white ${
            worldMapPage ? "h-16 px-6" : "h-[72px] px-8"
          }`}
        >
          <div className="flex min-w-0 items-center gap-6">
            <h2 className="whitespace-nowrap text-lg font-semibold text-slate-950">
              {currentTitle}
            </h2>
            {!worldMapPage && (
              <label className="relative hidden w-[560px] max-w-[42vw] lg:block">
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  placeholder="서비스명, 서비스 코드, 서버명, IP 검색..."
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </label>
            )}
          </div>

          <div className="flex items-center gap-5">
            <button className="relative rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100">
              <Bell size={21} />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
                3
              </span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                <User size={16} className="text-white" />
              </div>
              <div className="text-sm">
                <div className="font-semibold text-slate-950">서비스 담당자</div>
                <div className="text-slate-500">owner@chainview.com</div>
              </div>
            </div>
          </div>
        </header>

        <main className={`flex-1 overflow-auto ${worldMapPage ? "p-3" : "p-8"}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
