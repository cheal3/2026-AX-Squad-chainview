import { Outlet, Link, useLocation } from "react-router";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  Bell,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Monitor,
  Network,
  Server,
  User,
} from "lucide-react";

type NavItem = {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const navItems: NavItem[] = [
  { path: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { path: "/servers", label: "서버·서비스", icon: Server },
  { path: "/dependencies", label: "서비스 간 종속 관계", icon: GitBranch },
  { path: "/relations", label: "서비스 관계도", icon: Network },
  { path: "/incidents", label: "장애 영향", icon: AlertTriangle },
];

const pageTitles = [
  { path: "/dashboard", label: "서비스 대시보드" },
  { path: "/servers", label: "서버·서비스 등록" },
  { path: "/dependencies", label: "서비스 간 종속 관계" },
  { path: "/relations", label: "서비스 관계도" },
  { path: "/incidents", label: "장애 영향" },
];

export function Layout() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const currentTitle =
    pageTitles.find((item) => isActive(item.path))?.label || "서비스 포털";

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-[#182234] text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">ChainView</h1>
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-[#f60]">
              Portal
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            서비스 등록·연계·영향 분석
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? "bg-[#f60] text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#111827] text-white border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor size={20} className="text-[#f60]" />
            <h2 className="text-lg font-semibold">{currentTitle}</h2>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors relative">
              <Bell size={20} className="text-gray-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f60]">
                <User size={16} className="text-white" />
              </div>
              <div className="text-sm">
                <div className="font-medium">로그인 사용자</div>
                <div className="text-gray-400">서비스 담당자 관점</div>
              </div>
            </div>

            <button className="flex items-center gap-2 px-3 py-2 bg-white/10 text-gray-100 rounded-lg hover:bg-white/15 transition-colors">
              <LogOut size={18} />
              로그아웃
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
