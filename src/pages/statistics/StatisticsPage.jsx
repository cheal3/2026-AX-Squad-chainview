import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";

import { AppShell } from "../../components/AppShell.jsx";
import { usePortalData } from "../../dashboardModule/PortalDataStore";
import { codeLabels } from "../../dashboardModule/mockData";
import { matchesSearchText, searchableText } from "../../utils/search";

function compactText(value) {
  return String(value ?? "").trim();
}

function serviceLabel(service) {
  return service ? `${service.serviceCode} ${service.serviceName}` : "서비스 미지정";
}
export function StatisticsPage({ activeMenu = "analysis-statistics", sectionLabel = "분석" }) {
  const portalData = usePortalData();
  const [activeStatsTab, setActiveStatsTab] = useState("service-assets");
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceStatusFilter, setServiceStatusFilter] = useState("all");
  const [techSearch, setTechSearch] = useState("");
  const [techTypeFilter, setTechTypeFilter] = useState("all");
  const [incidentSearch, setIncidentSearch] = useState("");
  const [incidentStatusFilter, setIncidentStatusFilter] = useState("all");
  const [dependencySearch, setDependencySearch] = useState("");
  const [dependencySort, setDependencySort] = useState("incoming");
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
  const importanceStats = topEntries(
    countBy(portalData.services, (service) => codeLabels.importance[service.importanceCode] || service.importanceCode || "미지정"),
    6
  );
  const statusStats = topEntries(
    countBy(portalData.services, (service) => codeLabels.serviceStatus[service.statusCode] || service.statusCode || "미지정"),
    6
  );
  const serviceStatusOptions = useMemo(
    () => Array.from(new Set(portalData.services.map((service) => service.statusCode).filter(Boolean))),
    [portalData.services]
  );
  const serviceDetailRows = useMemo(
    () => buildServiceDetailRows(portalData.services, portalData.deployments, portalData.techStacks, portalData.owners),
    [portalData.deployments, portalData.owners, portalData.services, portalData.techStacks]
  );
  const filteredServiceDetailRows = useMemo(
    () => serviceDetailRows.filter((row) => {
      const matchesStatus = serviceStatusFilter === "all" || row.statusCode === serviceStatusFilter;
      const matchesKeyword = matchesSearchText(
        searchableText(row.name, row.code, row.category, row.typeLabel, row.importanceLabel, row.statusLabel, row.ownerLabel),
        serviceSearch
      );
      return matchesStatus && matchesKeyword;
    }),
    [serviceDetailRows, serviceSearch, serviceStatusFilter]
  );
  const techStackRows = useMemo(
    () => buildTechStackRows(portalData.techStacks, serviceById),
    [portalData.techStacks, serviceById]
  );
  const techStackExportRows = useMemo(
    () => buildTechStackExportRows(portalData.techStacks, serviceById),
    [portalData.techStacks, serviceById]
  );
  const techTypeOptions = useMemo(
    () => Array.from(new Set(techStackRows.map((row) => row.typeLabel))).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [techStackRows]
  );
  const filteredTechStackRows = useMemo(
    () => techStackRows.filter((row) => {
      const matchesType = techTypeFilter === "all" || row.typeLabel === techTypeFilter;
      const matchesKeyword = matchesSearchText(
        searchableText(row.name, row.typeLabel, row.category, row.version, row.vendor, row.description, row.serviceNames),
        techSearch
      );
      return matchesType && matchesKeyword;
    }),
    [techSearch, techStackRows, techTypeFilter]
  );
  const filteredTechStackExportRows = useMemo(
    () => techStackExportRows.filter((row) => {
      const matchesType = techTypeFilter === "all" || row.typeLabel === techTypeFilter;
      const matchesKeyword = matchesSearchText(
        searchableText(row.serviceId, row.serviceName, row.category, row.typeLabel, row.techName, row.version, row.vendor),
        techSearch
      );
      return matchesType && matchesKeyword;
    }),
    [techSearch, techStackExportRows, techTypeFilter]
  );
  const techTypeStats = topEntries(countBy(techStackRows, (row) => row.typeLabel), 5);
  const topTechStats = techStackRows
    .slice()
    .sort((a, b) => b.serviceCount - a.serviceCount || a.name.localeCompare(b.name))
    .slice(0, 10)
    .map((row) => ({ label: row.name, value: row.serviceCount }));
  const javaVersionStats = buildSingleTechVersionStats(techStackRows, "Java");
  const versionRiskRows = buildVersionRiskRows(techStackRows);
  const deploymentStats = topEntries(
    countBy(portalData.deployments, (deployment) =>
      deployment.serverName ||
      serverById.get(Number(deployment.serverId))?.serverName ||
      deployment.hostName ||
      `서버 ${deployment.serverId ?? "-"}`
    ),
    6
  );
  const serverRoleStats = topEntries(
    countBy(portalData.servers, (server) => codeLabels.serverRole?.[server.serverRoleCode] || server.serverRoleName || server.serverRoleCode || "기타"),
    6
  );
  const servicesWithoutOwner = portalData.services.filter((service) => !hasOwner(service));
  const missingImpactRelations = portalData.relations.filter((relation) => !compactText(relation.description));
  const openIncidents = portalData.incidents.filter((incident) => incident.incidentStatusCode !== "RESOLVED");
  const normalServices = portalData.services.filter((service) =>
    ["NORMAL", "ACTIVE", "RUNNING"].includes(String(service.statusCode || "").toUpperCase())
  );
  const activeRelations = portalData.relations.filter((relation) => relation.relationStatusCode === "ACTIVE").length;
  const mandatoryRelations = portalData.relations.filter((relation) => String(relation.mandatoryYn).toUpperCase() === "Y").length;
  const incidentMonthlyStats = buildMonthlyIncidentTrend(portalData.incidents);
  const incidentSeverityStats = topEntries(
    countBy(portalData.incidents, (incident) => codeLabels.severity[incident.severityCode] || incident.severityCode || "미지정"),
    5
  );
  const serviceIncidentTopStats = buildServiceIncidentTopRows(portalData.incidents, serviceById);
  const healthCheckTrendRows = buildHealthCheckTrendRows(portalData.healthChecks);
  const incidentDetailRows = useMemo(
    () => buildIncidentDetailRows(portalData.incidents, portalData.incidentImpacts, serviceById, serverById),
    [portalData.incidentImpacts, portalData.incidents, serviceById, serverById]
  );
  const incidentStatusOptions = useMemo(
    () => Array.from(new Set(incidentDetailRows.map((row) => row.statusCode).filter(Boolean))),
    [incidentDetailRows]
  );
  const filteredIncidentDetailRows = useMemo(
    () => incidentDetailRows.filter((row) => {
      const matchesStatus = incidentStatusFilter === "all" || row.statusCode === incidentStatusFilter;
      const matchesKeyword = matchesSearchText(
        searchableText(row.id, row.title, row.typeLabel, row.severityLabel, row.statusLabel, row.target),
        incidentSearch
      );
      return matchesStatus && matchesKeyword;
    }),
    [incidentDetailRows, incidentSearch, incidentStatusFilter]
  );
  const incomingRelationStats = buildDirectionalRelationStats(portalData.relations, serviceById, "incoming", 10);
  const outgoingRelationStats = buildDirectionalRelationStats(portalData.relations, serviceById, "outgoing", 10);
  const serverServiceStats = topEntries(
    countBy(portalData.deployments, (deployment) =>
      deployment.serverName ||
      serverById.get(Number(deployment.serverId))?.serverName ||
      deployment.hostName ||
      `서버 ${deployment.serverId ?? "-"}`
    ),
    10
  );
  const groupServiceStats = topEntries(
    countBy(portalData.owners, (owner) => owner.groupName || (owner.ownerTypeCode === "GROUP" ? owner.ownerName : "사용자 담당")),
    10
  );
  const dependencyDetailRows = useMemo(
    () => buildDependencyDetailRows(portalData.services, portalData.relations, portalData.owners),
    [portalData.owners, portalData.relations, portalData.services]
  );
  const filteredDependencyDetailRows = useMemo(() => {
    const rows = dependencyDetailRows.filter((row) =>
      matchesSearchText(searchableText(row.name, row.code, row.category, row.ownerGroups), dependencySearch)
    );
    return rows.slice().sort((a, b) => {
      if (dependencySort === "outgoing") return b.outgoing - a.outgoing || a.name.localeCompare(b.name, "ko");
      if (dependencySort === "required") return b.requiredIncoming - a.requiredIncoming || a.name.localeCompare(b.name, "ko");
      return b.incoming - a.incoming || a.name.localeCompare(b.name, "ko");
    });
  }, [dependencyDetailRows, dependencySearch, dependencySort]);
  const healthSuccessRate = healthCheckTrendRows.length
    ? Math.round((healthCheckTrendRows.reduce((sum, row) => sum + row.success, 0) /
      Math.max(1, healthCheckTrendRows.reduce((sum, row) => sum + row.success + row.failure, 0))) * 1000) / 10
    : 100;
  const serviceWithRelations = new Set();
  portalData.relations.forEach((relation) => {
    if (relation.sourceServiceId) serviceWithRelations.add(relation.sourceServiceId);
    if (relation.targetServiceId) serviceWithRelations.add(relation.targetServiceId);
  });
  const isolatedServices = portalData.services.filter((service) => !serviceWithRelations.has(service.serviceId));
  const statsKpis = {
    "service-assets": [
      { label: "전체 서비스", value: portalData.services.length, hint: "서비스 카탈로그" },
      { label: "정상 운영 서비스", value: normalServices.length, hint: "상태 정상 기준", tone: "ok" },
      { label: "전체 서버", value: portalData.servers.length, hint: "등록 인프라 노드" },
      { label: "활성 관계", value: activeRelations, hint: "서비스 의존 관계" },
      { label: "담당자 미등록", value: servicesWithoutOwner.length, hint: "담당자 연결 필요", tone: servicesWithoutOwner.length ? "warn" : "ok" },
      { label: "영향도 설명 누락", value: missingImpactRelations.length, hint: "토폴로지 노출 품질", tone: missingImpactRelations.length ? "warn" : "ok" },
    ],
    "tech-version": [
      { label: "전체 서비스", value: techStackRows.length, hint: "기술스택 종류 수" },
      { label: "정상 운영 서비스", value: portalData.services.length - new Set(portalData.techStacks.map((row) => Number(row.serviceId))).size, hint: "기술스택 미등록 서비스", tone: "ok" },
    ],
    operation: [
      { label: "전체 인시던트", value: portalData.incidents.length, hint: "최근 12개월", tone: "danger" },
      { label: "미종료 장애", value: openIncidents.length, hint: "현재 진행 중", tone: openIncidents.length ? "warn" : "ok" },
      { label: "서비스 장애", value: portalData.incidents.filter((incident) => incident.incidentTypeCode === "SERVICE").length, hint: "최근 30일" },
      { label: "헬스체크 성공률", value: `${healthSuccessRate}%`, hint: "최근 24시간", tone: "ok" },
      { label: "평균 복구 시간", value: buildMeanRecoveryTime(portalData.incidents), hint: "데이터 부족 (MTTR)" },
    ],
    dependency: [
      { label: "전체 의존 관계", value: portalData.relations.length, hint: "서비스 관계" },
      { label: "필수 의존 관계", value: mandatoryRelations, hint: "mandatory=Y" },
      { label: "고립 서비스", value: isolatedServices.length, hint: "관계 없음", tone: isolatedServices.length ? "warn" : "ok" },
    ],
  };
  const graphTabs = [
    { key: "service-assets", label: "서비스·자산 현황" },
    { key: "tech-version", label: "기술스택·버전 현황" },
    { key: "operation", label: "운영 관리 현황" },
    { key: "dependency", label: "의존성·집중도 분석" },
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
          {(statsKpis[activeStatsTab] || statsKpis["service-assets"]).map((kpi) => (
            <StatKpi key={kpi.label} {...kpi} />
          ))}
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

          {activeStatsTab === "service-assets" ? (
            <div className="statistics-tab-body">
              <div className="statistics-chart-grid statistics-chart-grid--service-assets">
                <ChartCard title="서비스 상태 분포">
                  <DonutChart rows={statusStats} />
                </ChartCard>
                <ChartCard title="서비스 중요도 분포">
                  <HorizontalBarChart rows={importanceStats} />
                </ChartCard>
                <ChartCard title="서비스 분류 분포">
                  <HorizontalBarChart rows={categoryStats} />
                </ChartCard>
                <ChartCard title="주요 스택 버전 구성">
                  <VersionRiskPanel rows={versionRiskRows} />
                </ChartCard>
                <ChartCard title="인프라 노드 분포">
                  <HorizontalBarChart rows={serverRoleStats} />
                </ChartCard>
              </div>
              <StatsDataPanel
                title="서비스 목록 상세"
                count={filteredServiceDetailRows.length}
                tools={(
                  <>
                    <label className="statistics-search-field">
                      <Search size={15} aria-hidden="true" />
                      <input value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder="서비스명 / 카테고리 검색..." type="text" />
                    </label>
                    <select value={serviceStatusFilter} onChange={(event) => setServiceStatusFilter(event.target.value)}>
                      <option value="all">전체 상태</option>
                      {serviceStatusOptions.map((status) => <option key={status} value={status}>{codeLabels.serviceStatus[status] || status}</option>)}
                    </select>
                    <button className="btn" type="button" onClick={() => downloadRowsCsv("서비스-목록-상세.csv", serviceDetailExportColumns, filteredServiceDetailRows)}>
                      <Download size={15} aria-hidden="true" /> 엑셀 다운로드
                    </button>
                  </>
                )}
              >
                <table className="tbl statistics-data-table statistics-service-table">
                  <thead><tr><th>서비스명</th><th>카테고리</th><th>유형</th><th>중요도</th><th>상태</th><th>서버 수</th><th>기술스택 수</th><th>담당자</th></tr></thead>
                  <tbody>
                    {filteredServiceDetailRows.length ? filteredServiceDetailRows.map((row) => (
                      <tr key={row.key}>
                        <td><b>{row.name}</b></td>
                        <td>{row.category}</td>
                        <td>{row.typeLabel}</td>
                        <td>{row.importanceLabel}</td>
                        <td>{row.statusLabel}</td>
                        <td>{row.serverCount}</td>
                        <td>{row.techCount}</td>
                        <td>{row.ownerLabel}</td>
                      </tr>
                    )) : <EmptyTableRow colSpan={8} />}
                  </tbody>
                </table>
              </StatsDataPanel>
            </div>
          ) : null}

          {activeStatsTab === "operation" ? (
            <div className="statistics-tab-body">
              <div className="statistics-chart-grid statistics-chart-grid--operation">
                <ChartCard title="월별 인시던트 추이 (최근 12개월)">
                  <MonthlyBarChart rows={incidentMonthlyStats} />
                </ChartCard>
                <ChartCard title="심각도별 장애 분포">
                  <DonutChart rows={incidentSeverityStats} />
                </ChartCard>
                <ChartCard title="헬스체크 성공/실패 추이 (최근 7일)">
                  <HealthCheckTrendChart rows={healthCheckTrendRows} />
                </ChartCard>
                <ChartCard title="장애 다발 서비스 TOP 10">
                  <HorizontalBarChart rows={serviceIncidentTopStats} />
                </ChartCard>
              </div>
              <StatsDataPanel
                title="장애 이력"
                count={filteredIncidentDetailRows.length}
                tools={(
                  <>
                    <label className="statistics-search-field">
                      <Search size={15} aria-hidden="true" />
                      <input value={incidentSearch} onChange={(event) => setIncidentSearch(event.target.value)} placeholder="제목 / 대상 검색..." type="text" />
                    </label>
                    <select value={incidentStatusFilter} onChange={(event) => setIncidentStatusFilter(event.target.value)}>
                      <option value="all">전체 상태</option>
                      {incidentStatusOptions.map((status) => <option key={status} value={status}>{codeLabels.incidentStatus[status] || status}</option>)}
                    </select>
                    <button className="btn" type="button" onClick={() => downloadRowsCsv("장애-이력.csv", incidentExportColumns, filteredIncidentDetailRows)}>
                      <Download size={15} aria-hidden="true" /> 엑셀 다운로드
                    </button>
                  </>
                )}
              >
                <table className="tbl statistics-data-table statistics-incident-table">
                  <thead><tr><th>ID</th><th>제목</th><th>유형</th><th>심각도</th><th>상태</th><th>대상</th><th>발생 일시</th><th>조치 일시</th><th>지속(분)</th><th>영향수</th></tr></thead>
                  <tbody>
                    {filteredIncidentDetailRows.length ? filteredIncidentDetailRows.map((row) => (
                      <tr key={row.key}>
                        <td>{row.id}</td>
                        <td><b>{row.title}</b></td>
                        <td>{row.typeLabel}</td>
                        <td>{row.severityLabel}</td>
                        <td>{row.statusLabel}</td>
                        <td>{row.target}</td>
                        <td>{row.startedAt}</td>
                        <td>{row.endedAt}</td>
                        <td>{row.durationMinutes}</td>
                        <td>{row.impactCount}</td>
                      </tr>
                    )) : <EmptyTableRow colSpan={10} />}
                  </tbody>
                </table>
              </StatsDataPanel>
            </div>
          ) : null}

          {activeStatsTab === "dependency" ? (
            <div className="statistics-tab-body">
              <div className="statistics-chart-grid statistics-chart-grid--dependency">
                <ChartCard title="인입 의존 집중 TOP 10">
                  <HorizontalBarChart rows={incomingRelationStats} />
                </ChartCard>
                <ChartCard title="인출 의존 집중 TOP 10">
                  <HorizontalBarChart rows={outgoingRelationStats} />
                </ChartCard>
                <ChartCard title="서버별 배포 서비스 수 TOP 10">
                  <HorizontalBarChart rows={serverServiceStats} />
                </ChartCard>
                <ChartCard title="그룹별 담당 서비스 수 TOP 10">
                  <HorizontalBarChart rows={groupServiceStats} />
                </ChartCard>
              </div>
              <StatsDataPanel
                title="서비스별 의존성 상세"
                count={filteredDependencyDetailRows.length}
                tools={(
                  <>
                    <label className="statistics-search-field">
                      <Search size={15} aria-hidden="true" />
                      <input value={dependencySearch} onChange={(event) => setDependencySearch(event.target.value)} placeholder="서비스명 / 카테고리 검색..." type="text" />
                    </label>
                    <select value={dependencySort} onChange={(event) => setDependencySort(event.target.value)}>
                      <option value="incoming">인입 의존 많은 순</option>
                      <option value="outgoing">인출 의존 많은 순</option>
                      <option value="required">필수 인입 많은 순</option>
                    </select>
                    <button className="btn" type="button" onClick={() => downloadRowsCsv("서비스별-의존성-상세.csv", dependencyExportColumns, filteredDependencyDetailRows)}>
                      <Download size={15} aria-hidden="true" /> 엑셀 다운로드
                    </button>
                  </>
                )}
              >
                <table className="tbl statistics-data-table statistics-dependency-table">
                  <thead><tr><th>서비스명</th><th>카테고리</th><th>인입 의존</th><th>필수 인입</th><th>인출 의존</th><th>담당 그룹</th></tr></thead>
                  <tbody>
                    {filteredDependencyDetailRows.length ? filteredDependencyDetailRows.map((row) => (
                      <tr key={row.key}>
                        <td><b>{row.name}</b></td>
                        <td>{row.category}</td>
                        <td><StatProgress value={row.incoming} max={row.maxDependency} /></td>
                        <td>{row.requiredIncoming}</td>
                        <td>{row.outgoing}</td>
                        <td>{row.ownerGroups}</td>
                      </tr>
                    )) : <EmptyTableRow colSpan={6} />}
                  </tbody>
                </table>
              </StatsDataPanel>
            </div>
          ) : null}

          {activeStatsTab === "tech-version" ? (
            <div className="statistics-tech-tab">
              <div className="statistics-chart-grid statistics-chart-grid--tech">
                <ChartCard title="기술스택 유형 분포">
                  <DonutChart rows={techTypeStats} />
                </ChartCard>
                <ChartCard title="많이 사용되는 기술 TOP 10">
                  <HorizontalBarChart rows={topTechStats} />
                </ChartCard>
                <ChartCard title="Java 버전 분포">
                  <DonutChart rows={javaVersionStats} />
                </ChartCard>
                <ChartCard title="주요 스택 버전 구성">
                  <VersionRiskPanel rows={versionRiskRows} />
                </ChartCard>
              </div>

              <div className="statistics-panel statistics-tech-list">
                <div className="statistics-tech-list__head">
                  <div>
                    <h2>등록된 기술스택 목록</h2>
                    <span>총 {filteredTechStackRows.length}건 · 다운로드 {filteredTechStackExportRows.length}행</span>
                  </div>
                  <div className="statistics-tech-list__tools">
                    <label className="statistics-search-field">
                      <Search size={15} aria-hidden="true" />
                      <input
                        type="text"
                        value={techSearch}
                        onChange={(event) => setTechSearch(event.target.value)}
                        placeholder="기술명, 유형, 설명 검색..."
                      />
                    </label>
                    <select value={techTypeFilter} onChange={(event) => setTechTypeFilter(event.target.value)}>
                      <option value="all">전체 유형</option>
                      {techTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <button className="btn" type="button" onClick={() => downloadTechStackCsv(filteredTechStackExportRows)}>
                      <Download size={15} aria-hidden="true" /> 엑셀 다운로드
                    </button>
                  </div>
                </div>
                <div className="statistics-table-wrap">
                  <table className="tbl statistics-tech-table">
                    <thead>
                      <tr>
                        <th>기술명</th>
                        <th>유형</th>
                        <th>카테고리</th>
                        <th>버전</th>
                        <th>벤더</th>
                        <th>설명</th>
                        <th>등록일</th>
                        <th>사용 서비스 수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTechStackRows.length ? filteredTechStackRows.map((row) => (
                        <tr key={row.key}>
                          <td><b>{row.name}</b></td>
                          <td>{row.typeLabel}</td>
                          <td>{row.category}</td>
                          <td>{row.version}</td>
                          <td>{row.vendor}</td>
                          <td>{row.description}</td>
                          <td>{row.registeredAt}</td>
                          <td>{row.serviceCount}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={8}>
                            <div className="statistics-empty">조회 가능한 데이터가 없습니다.</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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

function MiniDonutChart({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const radius = 31;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="mini-donut-chart">
      <div className="mini-donut-chart__body">
        <svg className="mini-donut-chart__svg" viewBox="0 0 92 92" role="img" aria-label="버전 분포">
          <circle className="mini-donut-chart__base" cx="46" cy="46" r={radius} />
          {rows.map((row, index) => {
            const length = total ? (row.value / total) * circumference : 0;
            const segment = (
              <circle
                className="mini-donut-chart__segment"
                cx="46"
                cy="46"
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
        <strong>{total}</strong>
      </div>
      <div className="mini-donut-chart__legend">
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

function VersionRiskPanel({ rows }) {
  return (
    <div className="version-risk">
      <div className="version-risk__legend">
        <span><i className="is-eol" /> EOL/구버전</span>
        <span><i className="is-warn" /> 지원 예정 종료</span>
        <span><i className="is-ok" /> 최신 지원</span>
      </div>
      {rows.length ? rows.map((row) => {
        const total = Math.max(row.eol + row.warning + row.current, 1);
        return (
          <div className="version-risk__row" key={row.label}>
            <b>{row.label}</b>
            <div className="version-risk__bar">
              <span className="is-eol" style={{ width: `${(row.eol / total) * 100}%` }}>{row.eol ? `${row.eol}` : ""}</span>
              <span className="is-warn" style={{ width: `${(row.warning / total) * 100}%` }}>{row.warning ? `${row.warning}` : ""}</span>
              <span className="is-ok" style={{ width: `${(row.current / total) * 100}%` }}>{row.current ? `${row.current}` : ""}</span>
            </div>
            <small>{row.total}</small>
          </div>
        );
      }) : <div className="statistics-empty">표시할 버전 데이터가 없습니다.</div>}
    </div>
  );
}

function HealthCheckTrendChart({ rows }) {
  const max = Math.max(...rows.flatMap((row) => [row.success, row.failure]), 1);
  return (
    <div className="health-trend">
      <div className="health-trend__legend"><span><i className="is-ok" />성공</span><span><i className="is-danger" />실패</span></div>
      <svg viewBox="0 0 520 170" role="img" aria-label="헬스체크 성공 실패 추이">
        {[0, 1, 2, 3].map((tick) => {
          const y = 130 - tick * 36;
          return <line className="chart-grid-line" key={tick} x1="24" x2="500" y1={y} y2={y} />;
        })}
        <polyline className="health-trend__line is-ok" points={buildTrendPoints(rows, "success", max)} />
        <polyline className="health-trend__line is-danger" points={buildTrendPoints(rows, "failure", max)} />
        {rows.map((row, index) => {
          const x = rows.length > 1 ? 24 + index * (476 / (rows.length - 1)) : 262;
          return <text className="chart-axis-text" key={row.label} x={x} y="158" textAnchor="middle">{row.label}</text>;
        })}
      </svg>
    </div>
  );
}

function buildTrendPoints(rows, key, max) {
  if (!rows.length) return "";
  return rows.map((row, index) => {
    const x = rows.length > 1 ? 24 + index * (476 / (rows.length - 1)) : 262;
    const y = 130 - (Number(row[key]) / max) * 108;
    return `${x},${y}`;
  }).join(" ");
}

function StatsDataPanel({ children, count, title, tools }) {
  return (
    <div className="statistics-panel statistics-data-panel">
      <div className="statistics-tech-list__head">
        <div>
          <h2>{title}</h2>
          <span>총 {count}건</span>
        </div>
        <div className="statistics-tech-list__tools">{tools}</div>
      </div>
      <div className="statistics-table-wrap">{children}</div>
    </div>
  );
}

function EmptyTableRow({ colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="statistics-empty">조회 가능한 데이터가 없습니다.</div>
      </td>
    </tr>
  );
}

function StatProgress({ max, value }) {
  return (
    <span className="stat-progress">
      <i style={{ width: `${Math.max(value ? 8 : 0, (value / Math.max(max, 1)) * 100)}%` }} />
      <b>{value}</b>
    </span>
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

function buildServiceDetailRows(services = [], deployments = [], techStacks = [], owners = []) {
  const deploymentsByService = new Map();
  deployments.forEach((deployment) => {
    const serviceId = Number(deployment.serviceId);
    if (!serviceId) return;
    if (!deploymentsByService.has(serviceId)) deploymentsByService.set(serviceId, new Set());
    deploymentsByService.get(serviceId).add(Number(deployment.serverId) || deployment.serverName || deployment.hostName || deployment.deployPath);
  });
  const techCountByService = new Map();
  techStacks.forEach((techStack) => {
    const serviceId = Number(techStack.serviceId);
    if (!serviceId) return;
    techCountByService.set(serviceId, (techCountByService.get(serviceId) || 0) + 1);
  });
  const ownersByService = new Map();
  owners.forEach((owner) => {
    const serviceId = Number(owner.serviceId);
    if (!serviceId) return;
    if (!ownersByService.has(serviceId)) ownersByService.set(serviceId, new Set());
    ownersByService.get(serviceId).add(owner.ownerName || owner.groupName || owner.userName);
  });

  return services.map((service) => ({
    key: service.serviceId,
    category: service.categoryPath?.filter(Boolean).join(" > ") || "미분류",
    code: service.serviceCode,
    importanceLabel: codeLabels.importance[service.importanceCode] || service.importanceCode || "-",
    name: service.serviceName || service.serviceCode || "-",
    ownerLabel: Array.from(ownersByService.get(service.serviceId) || []).filter(Boolean).slice(0, 2).join(", ") || "-",
    serverCount: deploymentsByService.get(service.serviceId)?.size || (service.serverId ? 1 : 0),
    statusCode: service.statusCode,
    statusLabel: codeLabels.serviceStatus[service.statusCode] || service.statusCode || "-",
    techCount: techCountByService.get(service.serviceId) || 0,
    typeLabel: codeLabels.serviceType[service.serviceTypeCode] || service.serviceTypeCode || "-",
  })).sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true }));
}

function buildIncidentDetailRows(incidents = [], impacts = [], serviceById = new Map(), serverById = new Map()) {
  const impactCountByIncident = new Map();
  impacts.forEach((impact) => {
    const incidentId = Number(impact.incidentId);
    if (!incidentId) return;
    impactCountByIncident.set(incidentId, (impactCountByIncident.get(incidentId) || 0) + 1);
  });

  return incidents.map((incident) => {
    const service = serviceById.get(Number(incident.serviceId));
    const server = serverById.get(Number(incident.serverId));
    return {
      key: incident.incidentId,
      durationMinutes: formatDurationMinutes(incident.startedAt, incident.endedAt),
      endedAt: formatDateTimeText(incident.endedAt),
      id: incident.externalIncidentCode || incident.incidentId,
      impactCount: impactCountByIncident.get(incident.incidentId) || 0,
      severityLabel: codeLabels.severity[incident.severityCode] || incident.severityCode || "-",
      startedAt: formatDateTimeText(incident.startedAt),
      statusCode: incident.incidentStatusCode,
      statusLabel: codeLabels.incidentStatus[incident.incidentStatusCode] || incident.incidentStatusCode || "-",
      target: incident.targetLabel || service?.serviceName || server?.serverName || incident.targetCode || "-",
      title: incident.title || "-",
      typeLabel: codeLabels.incidentType[incident.incidentTypeCode] || incident.incidentTypeCode || "-",
    };
  }).sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}

function buildDependencyDetailRows(services = [], relations = [], owners = []) {
  const counts = new Map();
  const ensure = (serviceId) => {
    const current = counts.get(serviceId) || { incoming: 0, outgoing: 0, requiredIncoming: 0 };
    counts.set(serviceId, current);
    return current;
  };
  relations.forEach((relation) => {
    ensure(relation.sourceServiceId).outgoing += 1;
    const target = ensure(relation.targetServiceId);
    target.incoming += 1;
    if (String(relation.mandatoryYn).toUpperCase() === "Y") target.requiredIncoming += 1;
  });
  const groupsByService = new Map();
  owners.forEach((owner) => {
    const serviceId = Number(owner.serviceId);
    if (!serviceId) return;
    if (!groupsByService.has(serviceId)) groupsByService.set(serviceId, new Set());
    if (owner.ownerTypeCode === "GROUP") groupsByService.get(serviceId).add(owner.ownerName || owner.groupName);
  });
  const maxDependency = Math.max(...services.map((service) => counts.get(service.serviceId)?.incoming || 0), 1);

  return services.map((service) => {
    const count = counts.get(service.serviceId) || { incoming: 0, outgoing: 0, requiredIncoming: 0 };
    return {
      key: service.serviceId,
      category: service.categoryPath?.filter(Boolean).join(" > ") || "미분류",
      code: service.serviceCode,
      incoming: count.incoming,
      maxDependency,
      name: service.serviceName || service.serviceCode || "-",
      outgoing: count.outgoing,
      ownerGroups: Array.from(groupsByService.get(service.serviceId) || []).filter(Boolean).slice(0, 3).join(", ") || "-",
      requiredIncoming: count.requiredIncoming,
    };
  });
}

function buildDirectionalRelationStats(relations = [], serviceById = new Map(), direction = "incoming", limit = 10) {
  const counts = new Map();
  relations.forEach((relation) => {
    const serviceId = direction === "incoming" ? relation.targetServiceId : relation.sourceServiceId;
    if (!serviceId) return;
    counts.set(serviceId, (counts.get(serviceId) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([serviceId, value]) => ({ label: serviceById.get(Number(serviceId))?.serviceName || `서비스 ${serviceId}`, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "ko"))
    .slice(0, limit);
}

function buildServiceIncidentTopRows(incidents = [], serviceById = new Map()) {
  const rows = topEntries(
    countBy(incidents, (incident) => {
      const service = serviceById.get(Number(incident.serviceId));
      return service?.serviceName || incident.targetLabel || incident.targetCode || "대상 미지정";
    }),
    10
  );
  return rows.filter((row) => row.label !== "대상 미지정" || row.value > 0);
}

function buildHealthCheckTrendRows(results = []) {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + index);
    const key = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
    return { key, label: key, success: 0, failure: 0 };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));
  results.forEach((result) => {
    const date = new Date(result.checkedAt || result.executedAt || result.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const key = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
    const row = byKey.get(key);
    if (!row) return;
    const statusText = String(result.successYn ?? result.resultStatusCode ?? result.status ?? "").toUpperCase();
    if (statusText === "N" || statusText === "FALSE" || statusText.includes("FAIL")) row.failure += 1;
    else row.success += 1;
  });
  return days;
}

function buildTechStackRows(techStacks = [], serviceById = new Map()) {
  const grouped = new Map();

  techStacks.forEach((techStack, index) => {
    const name = compactText(techStack.techName) || "기술명 미등록";
    const typeLabel =
      compactText(techStack.techTypeName) ||
      codeLabels.techType?.[techStack.techTypeCode] ||
      compactText(techStack.techTypeCode) ||
      "기타";
    const version = compactText(techStack.versionText) || "-";
    const vendor = compactText(techStack.vendorName) || inferTechVendor(name);
    const key = [name, typeLabel, version, vendor].join("|");
    const service = serviceById.get(Number(techStack.serviceId));

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        categorySet: new Set(),
        description: compactText(techStack.description) || buildTechDescription(name, version),
        name,
        recordCount: 0,
        registeredAt: formatDateText(techStack.createdAt || techStack.updatedAt || techStack.registeredAt),
        serviceIds: new Set(),
        serviceNames: new Set(),
        sortIndex: index,
        typeLabel,
        vendor,
        version,
      });
    }

    const row = grouped.get(key);
    row.recordCount += 1;
    if (!row.registeredAt || row.registeredAt === "-") {
      row.registeredAt = formatDateText(techStack.createdAt || techStack.updatedAt || techStack.registeredAt);
    }
    if (service?.serviceId) {
      row.serviceIds.add(Number(service.serviceId));
      row.serviceNames.add(service.serviceName || service.serviceCode);
      const serviceCategory = compactText(service.categoryPath?.[1] || service.categoryPath?.[0]);
      if (serviceCategory) row.categorySet.add(serviceCategory);
    }
    row.categorySet.add(normalizeTechCategory(techStack.techTypeCode, typeLabel));
  });

  return [...grouped.values()]
    .map((row) => ({
      ...row,
      category: Array.from(row.categorySet).filter(Boolean).slice(0, 2).join(", ") || "기타",
      serviceCount: row.serviceIds.size || row.recordCount,
      serviceNames: Array.from(row.serviceNames).join(", "),
    }))
    .sort((a, b) => b.serviceCount - a.serviceCount || a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

function buildTechStackExportRows(techStacks = [], serviceById = new Map()) {
  return techStacks
    .map((techStack, index) => {
      const service = serviceById.get(Number(techStack.serviceId));
      const typeLabel =
        compactText(techStack.techTypeName) ||
        codeLabels.techType?.[techStack.techTypeCode] ||
        compactText(techStack.techTypeCode) ||
        "기타";
      return {
        key: `${techStack.techStackId ?? index}-${techStack.serviceId ?? "service"}`,
        category: service?.categoryPath?.join(" > ") || "-",
        serviceId: Number(techStack.serviceId) || service?.serviceId || "",
        serviceName: service?.serviceName || service?.serviceCode || "서비스 미지정",
        techName: compactText(techStack.techName) || "기술명 미등록",
        typeLabel,
        vendor: compactText(techStack.vendorName) || inferTechVendor(techStack.techName),
        version: compactText(techStack.versionText) || "-",
      };
    })
    .sort((a, b) =>
      String(a.serviceName).localeCompare(String(b.serviceName), "ko", { numeric: true }) ||
      String(a.techName).localeCompare(String(b.techName), "ko", { numeric: true }) ||
      String(a.version).localeCompare(String(b.version), "ko", { numeric: true })
    );
}

function buildTechVersionStats(rows = []) {
  const preferredNames = ["Java", "Spring Boot", "MySQL"];
  const grouped = new Map();

  rows.forEach((row) => {
    const key = row.name;
    if (!grouped.has(key)) {
      grouped.set(key, new Map());
    }
    const version = row.version && row.version !== "-" ? row.version : "미지정";
    grouped.get(key).set(version, (grouped.get(key).get(version) || 0) + Math.max(row.serviceCount, row.recordCount, 1));
  });

  const preferred = preferredNames.filter((name) => grouped.has(name));
  const fallback = [...grouped.entries()]
    .filter(([name, versionMap]) => !preferred.includes(name) && versionMap.size > 1)
    .sort(([, a], [, b]) => sumMapValues(b) - sumMapValues(a))
    .map(([name]) => name);
  const names = [...preferred, ...fallback].slice(0, 3);

  return names.map((name) => ({
    name,
    rows: topEntries(grouped.get(name), 4),
  }));
}

function buildSingleTechVersionStats(rows = [], techName) {
  const versionMap = new Map();
  rows
    .filter((row) => row.name.toLowerCase().includes(String(techName).toLowerCase()))
    .forEach((row) => {
      const version = row.version && row.version !== "-" ? row.version : "미지정";
      versionMap.set(version, (versionMap.get(version) || 0) + Math.max(row.serviceCount, row.recordCount, 1));
    });
  return topEntries(versionMap, 6);
}

function buildVersionRiskRows(rows = []) {
  const targets = ["Java", "Spring Boot", "MySQL", "Oracle DB"];
  return targets.map((target) => {
    const matched = rows.filter((row) => {
      const name = row.name.toLowerCase();
      if (target === "Oracle DB") return name.includes("oracle");
      return name.includes(target.toLowerCase());
    });
    const risk = { label: target, eol: 0, warning: 0, current: 0, total: 0 };
    matched.forEach((row) => {
      const count = Math.max(row.serviceCount, row.recordCount, 1);
      const bucket = classifyVersionRisk(row.name, row.version);
      risk[bucket] += count;
      risk.total += count;
    });
    return risk;
  }).filter((row) => row.total > 0);
}

function classifyVersionRisk(name, version) {
  const major = Number(String(version || "").match(/\d+/)?.[0]);
  const normalizedName = String(name || "").toLowerCase();
  if (!Number.isFinite(major)) return "warning";
  if (normalizedName.includes("java")) {
    if (major <= 8) return "eol";
    if (major <= 17) return "warning";
    return "current";
  }
  if (normalizedName.includes("spring")) {
    if (major <= 2) return "eol";
    return "current";
  }
  if (normalizedName.includes("mysql")) {
    if (major <= 5) return "eol";
    return "current";
  }
  if (normalizedName.includes("oracle")) {
    if (major <= 11) return "eol";
    if (major <= 12) return "warning";
    return "current";
  }
  if (major <= 1) return "eol";
  return "current";
}

function sumMapValues(map) {
  return [...map.values()].reduce((sum, value) => sum + value, 0);
}

function normalizeTechCategory(typeCode, typeLabel) {
  const code = String(typeCode || "").toUpperCase();
  const label = compactText(typeLabel);
  if (code.includes("LANG") || label.includes("언어") || label.includes("런타임")) return "언어";
  if (code.includes("DATABASE") || label.includes("데이터베이스") || label === "DB") return "DB";
  if (code.includes("FRAMEWORK") || label.includes("프레임워크")) return "프레임워크";
  if (label.includes("미들웨어") || label.includes("WAS")) return "미들웨어";
  if (label.includes("DevOps") || label.includes("도구")) return "도구";
  if (label.includes("솔루션")) return "솔루션";
  return label || "기타";
}

function inferTechVendor(name) {
  const normalized = String(name || "").toLowerCase();
  if (normalized.includes("java") || normalized.includes("mysql") || normalized.includes("oracle")) return "Oracle";
  if (normalized.includes("spring")) return "VMware";
  if (normalized.includes("postgres")) return "PostgreSQL";
  if (normalized.includes("jeus") || normalized.includes("tmax") || normalized.includes("webtob")) return "TmaxSoft";
  if (normalized.includes("docker")) return "Docker";
  return "-";
}

function buildTechDescription(name, version) {
  return `${name}${version && version !== "-" ? ` ${version}` : ""} 적용 기술`;
}

function formatDateText(value) {
  const text = compactText(value);
  return text ? text.slice(0, 10) : "-";
}

function formatDateTimeText(value) {
  const text = compactText(value);
  return text ? text.slice(0, 16) : "-";
}

function formatDurationMinutes(startedAt, endedAt) {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function buildMeanRecoveryTime(incidents = []) {
  const durations = incidents
    .map((incident) => formatDurationMinutes(incident.startedAt, incident.endedAt))
    .filter((duration) => Number.isFinite(duration));
  if (!durations.length) return "N/A";
  return `${Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)}분`;
}

function downloadTechStackCsv(rows) {
  const headers = ["서비스ID", "서비스명", "카테고리", "기술유형", "기술명", "버전", "벤더"];
  const body = rows.map((row) => [
    row.serviceId,
    row.serviceName,
    row.category,
    row.typeLabel,
    row.techName,
    row.version,
    row.vendor,
  ]);
  const csv = [headers, ...body].map((cells) => cells.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "기술스택-버전-현황.csv";
  link.click();
  URL.revokeObjectURL(url);
}

const serviceDetailExportColumns = [
  ["서비스명", "name"],
  ["카테고리", "category"],
  ["유형", "typeLabel"],
  ["중요도", "importanceLabel"],
  ["상태", "statusLabel"],
  ["서버 수", "serverCount"],
  ["기술스택 수", "techCount"],
  ["담당자", "ownerLabel"],
];

const incidentExportColumns = [
  ["ID", "id"],
  ["제목", "title"],
  ["유형", "typeLabel"],
  ["심각도", "severityLabel"],
  ["상태", "statusLabel"],
  ["대상", "target"],
  ["발생 일시", "startedAt"],
  ["조치 일시", "endedAt"],
  ["지속(분)", "durationMinutes"],
  ["영향수", "impactCount"],
];

const dependencyExportColumns = [
  ["서비스명", "name"],
  ["카테고리", "category"],
  ["인입 의존", "incoming"],
  ["필수 인입", "requiredIncoming"],
  ["인출 의존", "outgoing"],
  ["담당 그룹", "ownerGroups"],
];

function downloadRowsCsv(fileName, columns, rows) {
  const headers = columns.map(([label]) => label);
  const body = rows.map((row) => columns.map(([, key]) => row[key]));
  const csv = [headers, ...body].map((cells) => cells.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
