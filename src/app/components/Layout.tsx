import { Outlet, Link, useLocation } from "react-router";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  Bell,
  Code2,
  GitBranch,
  LayoutDashboard,
  Link2,
  LogOut,
  Monitor,
  Network,
  Server,
  Settings,
  User,
  Users,
} from "lucide-react";

type NavItem = {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const portalNavGroups: NavGroup[] = [
  {
    title: "서비스 포털",
    items: [
      { path: "/portal", label: "서비스 대시보드", icon: LayoutDashboard },
      {
        path: "/portal/dependencies",
        label: "서비스 간 종속 관계",
        icon: GitBranch,
      },
      { path: "/portal/relations", label: "서비스 관계도", icon: Network },
    ],
  },
];

const adminNavGroups: NavGroup[] = [
  {
    title: "관리자",
    items: [
      { path: "/admin/services", label: "서비스 관리", icon: Settings },
      { path: "/admin/servers", label: "서버 관리", icon: Server },
      { path: "/admin/relations", label: "서비스 관계 관리", icon: Link2 },
      { path: "/admin/incidents", label: "인시던트", icon: AlertTriangle },
    ],
  },
];

const pageTitles = [
  { path: "/portal/dependencies", label: "서비스 간 종속 관계" },
  { path: "/portal/relations", label: "서비스 관계도" },
  { path: "/portal", label: "서비스 대시보드" },
  { path: "/admin/servers", label: "서버 관리" },
  { path: "/admin/services", label: "서비스 관리" },
  { path: "/admin/relations", label: "서비스 관계 관리" },
  { path: "/admin/incidents", label: "인시던트 영향" },
];

export function Layout() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const navGroups = isAdmin ? adminNavGroups : portalNavGroups;
  const badgeLabel = isAdmin ? "Admin" : "Portal";
  const sectionTitle = isAdmin ? "관리자 콘솔" : "서비스 포털";

  const isActive = (path: string) => {
    if (path === "/portal") {
      return location.pathname === "/portal";
    }
    return location.pathname.startsWith(path);
  };

  const currentTitle =
    pageTitles.find((item) => isActive(item.path))?.label || sectionTitle;

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-[#182234] text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">ChainView</h1>
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                isAdmin ? "bg-blue-600" : "bg-emerald-600"
              }`}
            >
              {badgeLabel}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-2">{sectionTitle}</p>
        </div>

        <div className="p-4 grid grid-cols-2 gap-2 border-b border-white/10">
          <Link
            to="/portal"
            className={`px-3 py-2 text-center text-sm rounded-lg transition-colors ${
              !isAdmin
                ? "bg-emerald-600 text-white"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            서비스
          </Link>
          <Link
            to="/admin/services"
            className={`px-3 py-2 text-center text-sm rounded-lg transition-colors ${
              isAdmin
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            어드민
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-5 overflow-auto">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="px-1 mb-2 text-xs font-medium text-gray-400">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        active
                          ? isAdmin
                            ? "bg-blue-600 text-white"
                            : "bg-emerald-600 text-white"
                          : "text-gray-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#111827] text-white border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor size={20} className={isAdmin ? "text-blue-300" : "text-emerald-300"} />
            <h2 className="text-lg font-semibold">{currentTitle}</h2>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <>
                <a className="text-sm text-gray-300 hover:text-white" href="#">
                  Swagger UI
                </a>
                <a className="text-sm text-gray-300 hover:text-white" href="#">
                  OpenAPI JSON
                </a>
                <Code2 size={18} className="text-gray-400" />
              </>
            )}

            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors relative">
              <Bell size={20} className="text-gray-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isAdmin ? "bg-blue-600" : "bg-emerald-600"
                }`}
              >
                {isAdmin ? (
                  <Users size={16} className="text-white" />
                ) : (
                  <User size={16} className="text-white" />
                )}
              </div>
              <div className="text-sm">
                <div className="font-medium">
                  {isAdmin ? "시스템관리자 (8913812)" : "로그인 사용자"}
                </div>
                <div className="text-gray-400">
                  {isAdmin ? "X-User-Id: 8913812" : "서비스 조회 및 관계 등록"}
                </div>
              </div>
            </div>

            <button className="flex items-center gap-2 px-3 py-2 bg-white/10 text-gray-100 rounded-lg hover:bg-white/15 transition-colors">
              <LogOut size={18} />
              로그아웃
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {isAdmin && (
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-5 py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <span className="font-semibold text-blue-700">X-User-Id</span>
                <input
                  type="text"
                  value="8913812"
                  readOnly
                  className="w-full md:w-64 px-4 py-2 bg-white border border-blue-100 rounded-lg text-gray-700"
                />
                <span className="text-sm text-gray-500">
                  등록/수정 API에 헤더로 전달됩니다.
                </span>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
