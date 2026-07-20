import { useMemo, useState } from "react";

import { AppShell } from "../../components/AppShell.jsx";
import { usePortalData } from "../../dashboardModule/PortalDataStore";
import { codeLabels } from "../../dashboardModule/mockData";

function compactText(value) {
  return String(value ?? "").trim();
}

function serviceLabel(service) {
  return service ? `${service.serviceCode} ${service.serviceName}` : "서비스 미지정";
}
export function StatisticsPage({ activeMenu = "analysis-statistics", sectionLabel = "분석" }) {
  const portalData = usePortalData();
  const [activeStatsTab, setActiveStatsTab] = useState("service");
  const serviceById = useMemo(
    () => new Map(portalData.services.map((service) => [service.serviceId, service])),
    [portalData.services]
  );
  const serverById = useMemo(
    () => new Map(portalData.servers.map((server) => [server.serverId, server])),
    [portalData.servers]
  );
  const ownerServiceKeys = useMemo(() => {
    const keys = new Set();
    portalData.owners.forEach((owner) => {
      if (owner.serviceId) keys.add(`id:${owner.serviceId}`);
      if (owner.serviceCode) keys.add(`code:${owner.serviceCode}`);
    });
    return keys;
  }, [portalData.owners]);
  const hasOwner = (service) =>
    ownerServiceKeys.has(`id:${service.serviceId}`) || ownerServiceKeys.has(`code:${service.serviceCode}`);
  const categoryStats = topEntries(
    countBy(portalData.services, (service) => service.categoryPath?.[0] || "미분류"),
    6
  );
  const typeStats = topEntries(
    countBy(portalData.services, (service) => codeLabels.serviceType[service.serviceTypeCode] || service.serviceTypeCode || "미지정"),
    6
  );
  const importanceStats = topEntries(
    countBy(portalData.services, (service) => codeLabels.importance[service.importanceCode] || service.importanceCode || "미지정"),
    6
  );
  const statusStats = topEntries(
    countBy(portalData.services, (service) => codeLabels.serviceStatus[service.statusCode] || service.statusCode || "미지정"),
    6
  );
  const deploymentStats = topEntries(
    countBy(portalData.deployments, (deployment) =>
      deployment.serverName ||
      serverById.get(Number(deployment.serverId))?.serverName ||
      deployment.hostName ||
      `서버 ${deployment.serverId ?? "-"}`
    ),
    6
  );
  const ownerTypeStats = topEntries(
    countBy(portalData.owners, (owner) => codeLabels.ownerType[owner.ownerTypeCode] || owner.ownerTypeCode || "미지정"),
    4
  );
  const servicesWithoutOwner = portalData.services.filter((service) => !hasOwner(service));
  const missingEndpointServices = portalData.services.filter((service) => !compactText(service.endpointUrl));
  const shallowCategoryServices = portalData.services.filter((service) => (service.categoryPath ?? []).length < 2);
  const missingImpactRelations = portalData.relations.filter((relation) => !compactText(relation.description));
  const openIncidents = portalData.incidents.filter((incident) => incident.incidentStatusCode !== "RESOLVED");
  const normalServices = portalData.services.filter((service) =>
    ["NORMAL", "ACTIVE", "RUNNING"].includes(String(service.statusCode || "").toUpperCase())
  );
  const activeRelations = portalData.relations.filter((relation) => relation.relationStatusCode === "ACTIVE").length;
  const mandatoryRelations = portalData.relations.filter((relation) => String(relation.mandatoryYn).toUpperCase() === "Y").length;
  const incidentMonthlyStats = buildMonthlyIncidentTrend(portalData.incidents);
  const criticalWithoutOwner = servicesWithoutOwner.filter((service) =>
    ["CRITICAL", "HIGH", "IMPORTANT"].includes(String(service.importanceCode || "").toUpperCase())
  );
  const relationDegree = new Map();
  portalData.relations.forEach((relation) => {
    [relation.sourceServiceId, relation.targetServiceId].forEach((serviceId) => {
      if (!serviceId) return;
      relationDegree.set(serviceId, (relationDegree.get(serviceId) || 0) + 1);
    });
  });
  const relationHotspots = [...relationDegree.entries()]
    .map(([serviceId, count]) => ({
      label: serviceLabel(serviceById.get(serviceId)),
      value: count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const actionItems = [
    ...criticalWithoutOwner.slice(0, 4).map((service) => ({
      tone: "danger",
      title: "중요 서비스 담당자 미등록",
      meta: `${service.serviceCode} ${service.serviceName}`,
    })),
    ...missingImpactRelations.slice(0, 4).map((relation) => ({
      tone: "warn",
      title: "서비스 영향도 설명 누락",
      meta: `${serviceLabel(serviceById.get(relation.sourceServiceId))} → ${serviceLabel(serviceById.get(relation.targetServiceId))}`,
    })),
    ...missingEndpointServices.slice(0, 3).map((service) => ({
      tone: "info",
      title: "엔드포인트 URL 미등록",
      meta: `${service.serviceCode} ${service.serviceName}`,
    })),
  ].slice(0, 8);
  const graphTabs = [
    { key: "service", label: "서비스" },
    { key: "incident", label: "인시던트" },
    { key: "relation", label: "관계·인프라" },
    { key: "quality", label: "품질 점검" },
  ];

  return (
    <AppShell activeMenu={activeMenu}>
      <main className="main statistics-page">
        <div className="statistics-head">
          <div>
            <div className="crumb crumb--standardized">
              <span>{sectionLabel}</span><span className="sep">/</span><span>운영 통계</span>
            </div>
            <h1><span aria-hidden="true">📈</span> 운영 통계</h1>
          </div>
          <div className="statistics-head__meta">
            <span>서비스 {portalData.services.length}건</span>
            <span>관계 {portalData.relations.length}건</span>
            <span>배포 {portalData.deployments.length}건</span>
          </div>
        </div>

        <section className="statistics-kpis" aria-label="주요 지표">
          <StatKpi label="전체 서비스" value={portalData.services.length} hint="서비스 카탈로그" />
          <StatKpi label="정상 운영 서비스" value={normalServices.length} hint="상태 정상 기준" tone="ok" />
          <StatKpi label="전체 서버" value={portalData.servers.length} hint="등록 인프라 노드" />
          <StatKpi label="활성 관계" value={activeRelations} hint="서비스 의존 관계" />
          <StatKpi label="담당자 미등록" value={servicesWithoutOwner.length} hint="담당자 연결 필요" tone={servicesWithoutOwner.length ? "warn" : "ok"} />
          <StatKpi label="영향도 설명 누락" value={missingImpactRelations.length} hint="토폴로지 노출 품질" tone={missingImpactRelations.length ? "warn" : "ok"} />
        </section>

        <section className="statistics-graph-section" aria-label="통계 그래프">
          <div className="statistics-tabs" role="tablist" aria-label="통계 그래프 탭">
            {graphTabs.map((tab) => (
              <button
                aria-selected={activeStatsTab === tab.key}
                className={activeStatsTab === tab.key ? "is-active" : ""}
                key={tab.key}
                onClick={() => setActiveStatsTab(tab.key)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeStatsTab === "service" ? (
            <div className="statistics-chart-grid statistics-chart-grid--service">
              <ChartCard title="중요도별 서비스 분포">
                <DonutChart rows={importanceStats} />
              </ChartCard>
              <ChartCard title="대분류별 서비스 수">
                <HorizontalBarChart rows={categoryStats} />
              </ChartCard>
              <ChartCard title="서비스 유형">
                <HorizontalBarChart rows={typeStats} />
              </ChartCard>
              <ChartCard title="서비스 상태">
                <HorizontalBarChart rows={statusStats} />
              </ChartCard>
            </div>
          ) : null}

          {activeStatsTab === "incident" ? (
            <div className="statistics-chart-grid statistics-chart-grid--single">
              <ChartCard title="월별 인시던트 발생 추이 (최근 12개월)">
                <MonthlyBarChart rows={incidentMonthlyStats} />
              </ChartCard>
            </div>
          ) : null}

          {activeStatsTab === "relation" ? (
            <div className="statistics-chart-grid">
              <ChartCard title="관계 연결 서비스 TOP 5">
                <HorizontalBarChart rows={relationHotspots} />
              </ChartCard>
              <ChartCard title="서버별 배포 수">
                <HorizontalBarChart rows={deploymentStats} />
              </ChartCard>
              <ChartCard title="담당 유형">
                <HorizontalBarChart rows={ownerTypeStats} />
              </ChartCard>
              <div className="statistics-panel">
                <h2>관계/담당자 요약</h2>
                <div className="statistics-metrics">
                  <span><b>{portalData.owners.length}</b> 담당자 매핑</span>
                  <span><b>{activeRelations}</b> 활성 관계</span>
                  <span><b>{mandatoryRelations}</b> 필수 관계</span>
                </div>
              </div>
            </div>
          ) : null}

          {activeStatsTab === "quality" ? (
            <div className="statistics-chart-grid statistics-chart-grid--quality">
              <div className="statistics-panel statistics-panel--wide">
                <h2>조치 필요 항목</h2>
                {actionItems.length ? (
                  <div className="statistics-action-list">
                    {actionItems.map((item, index) => (
                      <div className={`statistics-action is-${item.tone}`} key={`${item.title}-${index}`}>
                        <strong>{item.title}</strong>
                        <span>{item.meta}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="statistics-empty">현재 우선 조치가 필요한 항목이 없습니다.</div>
                )}
              </div>
              <div className="statistics-panel">
                <h2>데이터 품질</h2>
                <div className="statistics-checks">
                  <span><b>{shallowCategoryServices.length}</b> 중/소분류 미지정 서비스</span>
                  <span><b>{missingEndpointServices.length}</b> 엔드포인트 미등록 서비스</span>
                  <span><b>{servicesWithoutOwner.length}</b> 담당자 미등록 서비스</span>
                  <span><b>{missingImpactRelations.length}</b> 영향도 설명 누락 관계</span>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </AppShell>
  );
}

function StatKpi({ label, value, hint, tone = "default" }) {
  return (
    <div className={`stat-kpi is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

const chartColors = ["#2563eb", "#1f2a44", "#60a5fa", "#ef4444", "#1d4ed8", "#93c5fd", "#64748b"];

function ChartCard({ children, className = "", title }) {
  return (
    <div className={`statistics-panel statistics-chart-card ${className}`}>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function MonthlyBarChart({ rows }) {
  const width = 760;
  const height = 300;
  const padding = { top: 18, right: 12, bottom: 38, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const max = Math.max(...rows.map((row) => row.value), 1);
  const yTicks = Array.from({ length: 6 }, (_, index) => Math.round((max / 5) * index));
  const slot = plotWidth / rows.length;
  const barWidth = Math.min(46, slot * 0.62);

  return (
    <svg className="monthly-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="월별 인시던트 발생 추이">
      {yTicks.map((tick) => {
        const y = padding.top + plotHeight - (tick / max) * plotHeight;
        return (
          <g key={tick}>
            <line className="chart-grid-line" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
            <text className="chart-axis-text" x={padding.left - 12} y={y + 4} textAnchor="end">{tick}</text>
          </g>
        );
      })}
      <line className="chart-axis-line" x1={padding.left} x2={padding.left} y1={padding.top} y2={padding.top + plotHeight} />
      <line className="chart-axis-line" x1={padding.left} x2={width - padding.right} y1={padding.top + plotHeight} y2={padding.top + plotHeight} />
      {rows.map((row, index) => {
        const x = padding.left + index * slot + (slot - barWidth) / 2;
        const barHeight = (row.value / max) * plotHeight;
        const y = padding.top + plotHeight - barHeight;
        return (
          <g key={row.label}>
            <rect className="monthly-chart__bar" x={x} y={y} width={barWidth} height={Math.max(barHeight, row.value ? 2 : 0)} rx="2" />
            <text className="chart-axis-text" x={x + barWidth / 2} y={height - 12} textAnchor="middle">{row.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut-chart">
      <div className="donut-chart__body">
        <svg className="donut-chart__svg" viewBox="0 0 124 124" role="img" aria-label="도넛 차트">
          <circle className="donut-chart__base" cx="62" cy="62" r={radius} />
          {rows.map((row, index) => {
            const length = total ? (row.value / total) * circumference : 0;
            const segment = (
              <circle
                className="donut-chart__segment"
                cx="62"
                cy="62"
                key={row.label}
                r={radius}
                stroke={chartColors[index % chartColors.length]}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return segment;
          })}
        </svg>
        <div className="donut-chart__center">
          <strong>{total}</strong>
          <span>전체</span>
        </div>
      </div>
      <div className="chart-legend">
        {rows.map((row, index) => (
          <span key={row.label}>
            <i style={{ background: chartColors[index % chartColors.length] }} />
            {row.label}
            <b>{row.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function HorizontalBarChart({ rows }) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="horizontal-chart">
      {rows.length ? rows.map((row, index) => (
        <div className="horizontal-chart__row" key={row.label}>
          <span>{row.label}</span>
          <div className="horizontal-chart__track">
            <i style={{ background: chartColors[index % chartColors.length], width: `${Math.max(5, (row.value / max) * 100)}%` }} />
          </div>
          <b>{row.value}</b>
        </div>
      )) : <div className="statistics-empty">표시할 데이터가 없습니다.</div>}
    </div>
  );
}

function MiniLineChart({ rows, title }) {
  const width = 360;
  const height = 150;
  const max = Math.max(...rows.map((row) => row.value), 1);
  const step = rows.length > 1 ? width / (rows.length - 1) : width;
  const points = rows.map((row, index) => {
    const x = rows.length > 1 ? index * step : width / 2;
    const y = height - (row.value / max) * 110 - 22;
    return { ...row, x, y };
  });
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = `${path} L${points.at(-1)?.x ?? width},${height - 8} L${points[0]?.x ?? 0},${height - 8} Z`;

  return (
    <div className="line-chart">
      <h2>{title}</h2>
      <svg className="line-chart__svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <path className="line-chart__area" d={area} />
        <path className="line-chart__line" d={path} />
        {points.map((point) => (
          <g key={point.label}>
            <circle className="line-chart__dot" cx={point.x} cy={point.y} r="4" />
            <text className="line-chart__value" x={point.x} y={Math.max(12, point.y - 10)}>{point.value}</text>
            <text className="line-chart__label" x={point.x} y={height - 1}>{point.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function StatBarGroup({ title, rows }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="stat-bars">
      <h3>{title}</h3>
      {rows.length ? rows.map((row) => (
        <div className="stat-bar" key={row.label}>
          <div className="stat-bar__label"><span>{row.label}</span><b>{row.value}</b></div>
          <div className="stat-bar__track"><i style={{ width: `${Math.max(8, (row.value / max) * 100)}%` }} /></div>
        </div>
      )) : <div className="statistics-empty">표시할 데이터가 없습니다.</div>}
    </div>
  );
}

function buildMonthlyIncidentTrend(incidents) {
  const map = new Map();
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: key.slice(2),
      value: 0,
    };
  });
  months.forEach((month) => map.set(month.key, month));
  incidents.forEach((incident) => {
    const rawDate = incident.startedAt || incident.occurredAt || incident.createdAt || incident.detectedAt;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const month = map.get(key);
    if (month) {
      month.value += 1;
    }
  });
  return months;
}

function countBy(items, getKey) {
  const map = new Map();
  items.forEach((item) => {
    const key = compactText(getKey(item)) || "미지정";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

function topEntries(map, limit) {
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
}
