import { Server, Settings, Network, AlertTriangle, UserX } from "lucide-react";

export function Dashboard() {
  const kpiCards = [
    {
      title: "서버 수",
      value: "248",
      icon: Server,
      color: "bg-blue-500",
      trend: "+12 이번 달",
    },
    {
      title: "서비스 수",
      value: "156",
      icon: Settings,
      color: "bg-green-500",
      trend: "+8 이번 달",
    },
    {
      title: "활성 연계",
      value: "1,247",
      icon: Network,
      color: "bg-purple-500",
      trend: "+43 이번 주",
    },
    {
      title: "진행 장애",
      value: "3",
      icon: AlertTriangle,
      color: "bg-red-500",
      trend: "긴급 1건",
    },
    {
      title: "담당 미지정",
      value: "17",
      icon: UserX,
      color: "bg-orange-500",
      trend: "조치 필요",
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: "서버 추가",
      description: "PRD-WEB-015 서버가 등록되었습니다",
      time: "5분 전",
      user: "김철수",
    },
    {
      id: 2,
      type: "장애 발생",
      description: "결제 서비스 응답 지연 발생",
      time: "23분 전",
      user: "시스템",
    },
    {
      id: 3,
      type: "서비스 수정",
      description: "회원 인증 서비스 담당자 변경",
      time: "1시간 전",
      user: "박영희",
    },
    {
      id: 4,
      type: "연계 추가",
      description: "주문 → 재고 서비스 연계 등록",
      time: "2시간 전",
      user: "이민수",
    },
    {
      id: 5,
      type: "서버 제거",
      description: "DEV-DB-003 서버가 삭제되었습니다",
      time: "3시간 전",
      user: "최지훈",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className="text-3xl font-semibold text-gray-900">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500">{card.trend}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 최근 활동 및 통계 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 최근 활동 */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            최근 활동
          </h3>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {activity.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      · {activity.time}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    작업자: {activity.user}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 상태 요약 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            상태 요약
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">서버 가동률</span>
                <span className="text-sm font-semibold text-gray-900">
                  98.7%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: "98.7%" }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">서비스 정상</span>
                <span className="text-sm font-semibold text-gray-900">
                  153/156
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: "98%" }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">연계 정상</span>
                <span className="text-sm font-semibold text-gray-900">
                  1,244/1,247
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: "99.7%" }}
                ></div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                긴급 알림
              </h4>
              <div className="space-y-2">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-900">
                    결제 서비스 장애
                  </p>
                  <p className="text-xs text-red-700 mt-1">23분 전 발생</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm font-medium text-orange-900">
                    담당자 미지정 17건
                  </p>
                  <p className="text-xs text-orange-700 mt-1">조치 필요</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
