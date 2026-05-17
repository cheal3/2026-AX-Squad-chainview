import { Outlet, Link, useLocation } from "react-router";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Code2,
  FolderTree,
  Group,
  Layers,
  LayoutDashboard,
  Link2,
  LogOut,
  Monitor,
  Server,
  Settings,
  Tags,
  User,
  Users,
  Wrench,
} from "lucide-react";

type NavItem = {
  path?: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "참조 데이터",
    items: [{ label: "공통코드", icon: BookOpen }],
  },
  {
    title: "서비스 카탈로그",
    items: [
      { label: "서비스 분류", icon: FolderTree },
      { path: "/services", label: "서비스", icon: Settings },
      { label: "기술스택 마스터", icon: Wrench },
      { label: "서비스 기술스택", icon: Layers },
    ],
  },
  {
    title: "배포 인프라",
    items: [{ path: "/servers", label: "서버", icon: Server }],
  },
  {
    title: "서비스 관계",
    items: [{ path: "/relations", label: "서비스 관계", icon: Link2 }],
  },
  {
    title: "소유권",
    items: [
      { label: "사용자", icon: User },
      { label: "그룹", icon: Group },
      { label: "서비스 담당", icon: Tags },
    ],
  },
  {
    title: "운영",
    items: [{ path: "/incidents", label: "인시던트", icon: AlertTriangle }],
  },
];

const pageTitles = [
  { path: "/", label: "대시보드" },
  { path: "/servers", label: "서버 관리" },
  { path: "/services", label: "서비스 관리" },
  { path: "/relations", label: "서비스 관계 관리" },
  { path: "/incidents", label: "인시던트 영향" },
];

export function Layout() {
  const location = useLocation();

  const isActive = (path?: string) => {
    if (!path) {
      return false;
    }
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const currentTitle =
    pageTitles.find((item) => isActive(item.path))?.label || "대시보드";

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-[#182234] text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">ChainView</h1>
            <span className="px-2 py-1 text-xs font-semibold bg-blue-600 rounded-full">
              Admin
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-5 overflow-auto">
          <Link
            to="/"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/")
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <LayoutDashboard size={20} />
            <span>대시보드</span>
          </Link>

          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="px-1 mb-2 text-xs font-medium text-gray-400">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  const className = `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? "bg-blue-600 text-white"
                      : item.path
                      ? "text-gray-300 hover:bg-white/10 hover:text-white"
                      : "text-gray-500 cursor-default"
                  }`;

                  if (!item.path) {
                    return (
                      <div key={item.label} className={className}>
                        <Icon size={20} />
                        <span>{item.label}</span>
                      </div>
                    );
                  }

                  return (
                    <Link key={item.label} to={item.path} className={className}>
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
            <Monitor size={20} className="text-blue-300" />
            <h2 className="text-lg font-semibold">{currentTitle}</h2>
          </div>

          <div className="flex items-center gap-4">
            <a className="text-sm text-gray-300 hover:text-white" href="#">
              Swagger UI
            </a>
            <a className="text-sm text-gray-300 hover:text-white" href="#">
              OpenAPI JSON
            </a>
            <Code2 size={18} className="text-gray-400" />
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors relative">
              <Bell size={20} className="text-gray-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Users size={16} className="text-white" />
              </div>
              <div className="text-sm">
                <div className="font-medium">시스템관리자 (8913812)</div>
                <div className="text-gray-400">X-User-Id: 8913812</div>
              </div>
            </div>

            <button className="flex items-center gap-2 px-3 py-2 bg-white/10 text-gray-100 rounded-lg hover:bg-white/15 transition-colors">
              <LogOut size={18} />
              로그아웃
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
