import { Outlet, Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Server,
  Settings,
  Network,
  AlertTriangle,
  User,
  Bell,
  LogOut,
} from "lucide-react";

export function Layout() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "대시보드", icon: LayoutDashboard },
    { path: "/servers", label: "서버 관리", icon: Server },
    { path: "/services", label: "서비스 관리", icon: Settings },
    { path: "/relations", label: "서비스 관계", icon: Network },
    { path: "/incidents", label: "장애 영향", icon: AlertTriangle },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 좌측 사이드바 */}
      <aside className="w-64 bg-[#1a2332] text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-semibold">ChainView</h1>
          <p className="text-sm text-gray-400 mt-1">운영 관리 포털</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            v1.0.0 | © 2026 ChainView
          </div>
        </div>
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단 사용자 바 */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {navItems.find((item) => isActive(item.path))?.label || "대시보드"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-800">관리자</div>
                <div className="text-gray-500">admin@company.com</div>
              </div>
            </div>

            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <LogOut size={20} className="text-gray-600" />
            </button>
          </div>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
