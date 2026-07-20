import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Eye, Mail, MessageCircle, Pencil, Phone, Plus, Trash2 } from "lucide-react";

import { usePortalData } from "../../dashboardModule/PortalDataStore";
import { chainViewApi } from "../../dashboardModule/chainViewApi";
import { codeLabels } from "../../dashboardModule/mockData";

const serviceDetailTabs = [
  { key: "overview", label: "개요" },
  { key: "incidents", label: "인시던트 이력" },
  { key: "deployments", label: "배포/서버" },
  { key: "impact", label: "영향도" },
  { key: "owners", label: "담당자" },
  { key: "relations", label: "서비스 관계" },
  { key: "techstack", label: "기술스택" },
  { key: "changes", label: "변경 이력" },
];

const serviceDetailSamples = {
  "EXT-001": {
    title: "카드승인연계",
    importanceLabel: "높음",
    statusLabel: "운영중",
    ownerSummary: "김OO (주담당자)",
    overviewIncidents: [
      { status: "완료", time: "05/22 03:14", title: "INC-2026-0287 · 외부 카드사 정기 점검 미공지로 timeout", duration: "26분" },
      { status: "최고대기", time: "05/15 14:02", title: "INC-2026-0245 · 응답시간 평소보다 3배 증가 (피크 시간대)", duration: "12분" },
      { status: "조치중", time: "05/08 21:47", title: "INC-2026-0198 · 서버 장애 (ext-card-02 OOM)", duration: "8분" },
      { status: "완료", time: "04/30 09:11", title: "INC-2026-0152 · 에러율 5% 초과 (네트워크 일시 지연)", duration: "4분" },
    ],
    owners: [
      { name: "김OO", role: "주담당자", meta: "20210034 · 대외계팀 · kim@bank.com" },
      { name: "박OO", role: "부담당자", meta: "20190112 · 대외계팀 · park@bank.com" },
      { name: "이OO", role: "운영자", meta: "20150088 · 대외계개발팀 · lee@bank.com" },
    ],
    deploymentRows: [
      { name: "ext-card-01.bank.local", meta: "10.0.3.30:8443 · Production · Linux (CentOS 7.9)", path: "deploy: /app/services/ext-card", status: "운영중" },
      { name: "ext-card-02.bank.local", meta: "10.0.3.31:8443 · Production · Linux (CentOS 7.9)", path: "deploy: /app/services/ext-card", status: "운영중" },
      { name: "ext-card-03.bank.local", meta: "10.0.3.32:8443 · Production · Linux (CentOS 7.9)", path: "deploy: /app/services/ext-card", status: "운영중" },
    ],
    techRows: [
      { type: "언어", name: "Java", master: "17", applied: "17.0.8", note: "-" },
      { type: "프레임워크", name: "Spring Boot", master: "3.2.0", applied: "3.2.0", note: "-" },
      { type: "데이터베이스", name: "PostgreSQL", master: "15", applied: "15.3", note: "Master-Slave 구성" },
      { type: "캐시", name: "Redis", master: "7", applied: "7.0.11", note: "결제 세션 처리" },
    ],
    serverRows: [
      { server: "pay-api-01", host: "pay-api-01.internal", ip: "10.0.1.101", env: "Production", os: "Ubuntu 22.04 LTS", path: "/app/payment-api", port: "8080", instances: "3", status: "운영중" },
      { server: "pay-api-02", host: "pay-api-02.internal", ip: "10.0.1.102", env: "Production", os: "Ubuntu 22.04 LTS", path: "/app/payment-api", port: "8080", instances: "3", status: "운영중" },
    ],
    changeRows: [
      { type: "수정", actor: "김철수", at: "2026-05-10 15:30", field: "인스턴스 수", before: "2", after: "3" },
      { type: "등록", actor: "이영희", at: "2026-01-15 10:00", field: "서비스", before: "-", after: "신규 등록" },
    ],
    relationRows: [
      { direction: "송신", service: "EAM 통합 인증", type: "AUTH_CALL", status: "주의", required: "Y", impact: "직접", description: "공통 API Gateway 인증 실패 시 로그인/권한 검증 영향" },
      { direction: "송신", service: "SSO 통합 인증", type: "AUTH_CALL", status: "주의", required: "Y", impact: "직접", description: "SSO 토큰 검증 장애 시 대외 API 전체 인증 영향" },
      { direction: "송신", service: "PG 게이트웨이", type: "API 호출", status: "활성", required: "Y", impact: "직접", description: "결제 승인 요청" },
      { direction: "수신", service: "주문 관리 서비스", type: "API 호출", status: "정상", required: "Y", impact: "간접", description: "결제 정보 조회" },
    ],
    impactRows: [
      { level: "직접", service: "EAM 통합 인증", scenario: "API Gateway 인증 실패", radius: "공통 인증 경로", action: "인증 우회/캐시 토큰 정책 확인" },
      { level: "직접", service: "SSO 통합 인증", scenario: "토큰 검증 지연", radius: "로그인 연계 서비스", action: "SSO 헬스체크 및 세션 재시도 확인" },
      { level: "1-hop", service: "PG 게이트웨이", scenario: "승인 요청 timeout", radius: "결제 승인", action: "PG failover 및 큐 적체 확인" },
    ],
    incidentRows: [
      { title: "결제 서버 응답 지연", severity: "HIGH", status: "RESOLVED", direct: "직접", startedAt: "2026-05-10 14:30", endedAt: "2026-05-10 15:45" },
      { title: "데이터베이스 연결 오류", severity: "CRITICAL", status: "RESOLVED", direct: "직접", startedAt: "2026-04-20 09:00", endedAt: "2026-04-20 10:30" },
    ],
  },
};

function cloneServiceDetailSample(serviceCode) {
  return JSON.parse(
    JSON.stringify(serviceDetailSamples[serviceCode] || serviceDetailSamples["EXT-001"])
  );
}

export function ServiceAdminPage() {
  const { serviceCode } = useParams();
  const portalData = usePortalData();
  const sampleServices = [
    {
      serviceCode: "EXT-001",
      serviceName: "카드승인연계",
      categoryPath: ["대외계", "결제", "승인"],
      serviceType: "API",
      importance: "높음",
      status: "운영중",
      endpoint: "https://ext.bank.com/v2/card/auth",
      createdAt: "2023-04-12",
    },
    {
      serviceCode: "EXT-004",
      serviceName: "카드취소연계",
      categoryPath: ["대외계", "결제", "취소"],
      serviceType: "API",
      importance: "높음",
      status: "운영중",
      endpoint: "https://ext.bank.com/v2/card/cancel",
      createdAt: "2023-04-12",
    },
    {
      serviceCode: "DEP-001",
      serviceName: "예금이체서비스",
      categoryPath: ["기간계", "계좌", "이체"],
      serviceType: "API",
      importance: "높음",
      status: "운영중",
      endpoint: "https://core.bank.com/dep/transfer",
      createdAt: "2022-11-03",
    },
  ];
  const sampleService =
    sampleServices.find((service) => service.serviceCode === serviceCode) ??
    sampleServices[0];
  const selectedService =
    portalData.services.find((service) => service.serviceCode === serviceCode) ??
    {
      serviceId: 1001,
      categoryPath: sampleService.categoryPath,
      serviceCode: sampleService.serviceCode,
      serviceName: sampleService.serviceName,
      serviceTypeCode: sampleService.serviceType,
      importanceCode: "HIGH",
      statusCode: "NORMAL",
      description: "외부 카드사 승인 요청 중계 API",
      endpointUrl: sampleService.endpoint,
      serverId: 1,
      deployPath: "/app/services/ext-card",
      portInfo: "8443",
      deploymentStatusCode: "RUNNING",
      instanceCount: 3,
      createdBy: "20180023",
      updatedBy: "20210034",
      createdAt: "2023-04-12",
      updatedAt: "2026-05-30",
    };

  return <ServiceDetailPage service={selectedService} />;
}

function ServiceDetailPage({ service }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    deleteTechStack,
    incidents,
    owners,
    relations,
    servers,
    services,
    techStacks,
    updateTechStack,
  } = usePortalData();
  const activeTab = new URLSearchParams(location.search).get("tab") || "overview";
  const [detail, setDetail] = useState(() => cloneServiceDetailSample(service.serviceCode));
  const [changeRows, setChangeRows] = useState([]);
  const [changeSourceLabel, setChangeSourceLabel] = useState("샘플 기준");
  const deploymentServer = useMemo(
    () => servers.find((server) => Number(server.serverId) === Number(service.serverId)),
    [servers, service.serverId]
  );
  const serviceOwners = useMemo(
    () => owners.filter((owner) => Number(owner.serviceId) === Number(service.serviceId)),
    [owners, service.serviceId]
  );
  const serviceTechStacks = useMemo(
    () => techStacks.filter((techStack) => Number(techStack.serviceId) === Number(service.serviceId)),
    [service.serviceId, techStacks]
  );
  const serviceRelations = useMemo(
    () =>
      relations
        .filter(
          (relation) =>
            Number(relation.sourceServiceId) === Number(service.serviceId) ||
            Number(relation.targetServiceId) === Number(service.serviceId)
        )
        .map((relation) => {
          const isOutgoing = Number(relation.sourceServiceId) === Number(service.serviceId);
          const relatedServiceId = isOutgoing ? relation.targetServiceId : relation.sourceServiceId;
          const relatedService = services.find((item) => Number(item.serviceId) === Number(relatedServiceId));
          return {
            ...relation,
            direction: isOutgoing ? "송신" : "수신",
            relatedService,
          };
        }),
    [relations, service.serviceId, services]
  );
  const serviceIncidents = useMemo(
    () =>
      incidents
        .filter(
          (incident) =>
            Number(incident.serviceId) === Number(service.serviceId) ||
            incident.targetCode === service.serviceCode
        )
        .sort((left, right) => String(right.startedAt ?? "").localeCompare(String(left.startedAt ?? ""))),
    [incidents, service.serviceCode, service.serviceId]
  );
  const tabClassName = (tabKey) =>
    `service-detail__tab${activeTab === tabKey ? " is-active" : ""}`;

  useEffect(() => {
    setDetail(cloneServiceDetailSample(service.serviceCode));
  }, [service.serviceCode]);

  useEffect(() => {
    setChangeRows([]);
    setChangeSourceLabel("샘플 기준");
    if (import.meta.env.DEV || !service.serviceId) {
      return undefined;
    }
    let cancelled = false;
    chainViewApi.services
      .changeHistory(Number(service.serviceId))
      .then((rows) => {
        if (cancelled) return;
        setChangeRows(rows.map(normalizeServiceChangeRow).filter(Boolean));
        setChangeSourceLabel("운영 API 기준");
      })
      .catch((error) => {
        console.warn("서비스 변경 이력 API 조회 실패, 샘플 데이터를 사용합니다.", error);
        if (!cancelled) setChangeSourceLabel("샘플 기준");
      });
    return () => {
      cancelled = true;
    };
  }, [service.serviceId]);

  const setTab = (tabKey) => {
    navigate(`/admin-services/${service.serviceCode}?tab=${tabKey}`);
  };

  const handleTechEdit = (techStack) => {
    const nextVersion = window.prompt("적용 버전을 입력하세요.", techStack.versionText || "");
    if (nextVersion === null) {
      return;
    }

    updateTechStack(techStack.techStackId, { versionText: nextVersion });
  };

  const handleTechDelete = (techStack) => {
    if (!window.confirm(`${techStack.techName} 기술스택을 삭제할까요?`)) {
      return;
    }

    deleteTechStack(techStack.techStackId);
  };

  const handleServerDetail = (serverName) => {
    window.alert(`${serverName} 서버 상세 보기 기능은 다음 단계에서 연결 예정입니다.`);
  };
  const handleInfraMapOpen = () => {
    navigate("/admin-service-infra-mapping");
  };

  const handleIncidentDetail = (incident) => {
    if (incident?.incidentId) {
      navigate(`/dashboard-proto-detail?incidentId=${incident.incidentId}`);
      return;
    }
    navigate("/dashboard-proto-detail");
  };

  return (
    <div className="service-detail-page">
      <div className="service-detail__crumb crumb--standardized">
        <Link to="/admin-services">서비스</Link>
        <span className="sep">/</span>
        <span>서비스 조회</span>
      </div>

      <section className="service-detail__hero">
        <div className="service-detail__hero-icon">✣</div>
        <div className="service-detail__hero-main">
          <div className="service-detail__title-row">
            <h1>{detail.title || service.serviceName}</h1>
            <span className="service-detail__status-badge">{detail.statusLabel}</span>
          </div>
          <div className="service-detail__meta">
            <span>serviceCode <b>{service.serviceCode}</b></span>
            <span>분류 <b>{service.categoryPath?.join(" > ")}</b></span>
            <span>SERVICE_TYPE <b>{service.serviceTypeCode}</b></span>
            <span>STATUS <b>{detail.statusLabel}</b></span>
            <span>{detail.ownerSummary}</span>
          </div>
        </div>
      </section>

      <nav className="service-detail__tabs" aria-label="서비스 상세 탭">
        {serviceDetailTabs.map((tab) => (
          <button
            className={tabClassName(tab.key)}
            key={tab.key}
            onClick={() => setTab(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? <ServiceOverviewTab detail={detail} incidents={serviceIncidents} onOpenDeployments={() => setTab("deployments")} onOpenInfraMap={handleInfraMapOpen} onOpenIncidents={() => setTab("incidents")} server={deploymentServer} service={service} /> : null}
      {activeTab === "techstack" ? <ServiceTechStackTab detail={detail} onDelete={handleTechDelete} onEdit={handleTechEdit} techStacks={serviceTechStacks} service={service} /> : null}
      {activeTab === "deployments" ? <ServiceDeploymentTab detail={detail} onOpenDetail={handleServerDetail} onOpenInfraMap={handleInfraMapOpen} server={deploymentServer} service={service} /> : null}
      {activeTab === "impact" ? <ServiceImpactTab detail={detail} /> : null}
      {activeTab === "owners" ? <ServiceOwnersTab detail={detail} owners={serviceOwners} /> : null}
      {activeTab === "relations" ? <ServiceRelationTab detail={detail} relations={serviceRelations} /> : null}
      {activeTab === "changes" ? <ServiceChangeTab detail={detail} rows={changeRows} sourceLabel={changeSourceLabel} /> : null}
      {activeTab === "incidents" ? <ServiceIncidentTab detail={detail} incidents={serviceIncidents} onOpenDetail={handleIncidentDetail} service={service} /> : null}
    </div>
  );
}

function formatServiceDetailDate(value) {
  if (!value) {
    return "-";
  }
  return String(value).replace("T", " ").slice(0, 16);
}

function normalizeServiceChangeRow(row) {
  if (!row || typeof row !== "object") {
    return null;
  }
  const type =
    row.changeTypeName ||
    row.changeTypeCode ||
    row.actionType ||
    row.action ||
    row.type ||
    "수정";
  const actor =
    row.actorName ||
    row.changedByName ||
    row.changedBy ||
    row.createdBy ||
    row.actor ||
    "-";
  const at =
    row.changedAt ||
    row.createdAt ||
    row.updatedAt ||
    row.occurredAt ||
    row.at ||
    "";
  const field =
    row.fieldName ||
    row.changedField ||
    row.propertyName ||
    row.field ||
    row.targetField ||
    "-";
  return {
    key: row.changeHistoryId || row.historyId || row.id || `${actor}-${at}-${field}`,
    type,
    actor,
    at: formatServiceDetailDate(at),
    field,
    before: row.beforeValue ?? row.oldValue ?? row.previousValue ?? row.before ?? "-",
    after: row.afterValue ?? row.newValue ?? row.currentValue ?? row.after ?? "-",
  };
}

function serviceIncidentStatusLabel(code) {
  return codeLabels.incidentStatus?.[code] || code || "-";
}

function ServiceOverviewTab({ detail, incidents, onOpenDeployments, onOpenInfraMap, onOpenIncidents, server, service }) {
  const infraRelationHref = server?.infraNodeId ? `/admin-infra-relations?focusInfraNodeId=${server.infraNodeId}` : "/admin-service-infra-mapping";
  const overviewIncidents = incidents.length
    ? incidents.slice(0, 4).map((incident) => ({
        key: incident.incidentId,
        status: serviceIncidentStatusLabel(incident.incidentStatusCode),
        time: formatServiceDetailDate(incident.startedAt),
        title: `${incident.externalIncidentCode || `INC-${incident.incidentId}`} · ${incident.title}`,
        duration: incident.endedAt ? "종료" : "진행중",
      }))
    : detail.overviewIncidents.map((item, index) => ({ ...item, key: `${item.time}-${index}` }));
  return (
    <div className="service-detail__overview-grid">
      <article className="service-detail__panel">
        <h2>기본 정보 (SERVICE)</h2>
        <dl className="service-detail__definition-list">
          <dt>serviceCode</dt><dd>{service.serviceCode}</dd>
          <dt>serviceName</dt><dd>{service.serviceName}</dd>
          <dt>categoryL1/L2/L3</dt><dd>{service.categoryPath?.map((item) => <span className="tag" key={item}>{item}</span>)}</dd>
          <dt>serviceType</dt><dd>{service.serviceTypeCode}</dd>
          <dt>importance</dt><dd><span className="pill pill--crit">{detail.importanceLabel}</span></dd>
          <dt>status</dt><dd><span className="pill pill--ok">{detail.statusLabel}</span></dd>
          <dt>endpointUrl</dt><dd><code>{service.endpointUrl}</code></dd>
          <dt>description</dt><dd>{service.description || "외부 카드사 승인 요청 중계 API"}</dd>
          <dt>createdAt</dt><dd>2023-04-12 / createdBy: 20180023 홍OO</dd>
          <dt>updatedAt</dt><dd>2026-05-30 / updatedBy: 20210034 김OO</dd>
        </dl>
      </article>

      <article className="service-detail__panel">
        <div className="service-detail__panel-head">
          <h2>배포/서버/인프라</h2>
          <span>DEPLOYMENT ⇄ SERVER ⇄ INFRA</span>
        </div>
        <div className="service-detail__infra-card">
          <div>
            <strong>{server?.serverName || "배포 서버 미지정"}</strong>
            <span>{server ? `${server.hostName} · ${server.ipAddress}` : "서비스 배치 매핑에서 서버를 연결해주세요."}</span>
          </div>
          <dl>
            <dt>배포 경로</dt><dd>{service.deployPath || "-"}</dd>
            <dt>포트</dt><dd>{service.portInfo || "-"}</dd>
            <dt>인스턴스</dt><dd>{service.instanceCount ?? 0}개</dd>
            <dt>인프라 노드</dt><dd>{server?.infraNodeName || "인프라 미매핑"}</dd>
          </dl>
          <div className="service-detail__infra-actions">
            <button className="btn btn--ghost btn--sm" onClick={onOpenDeployments} type="button">서버 정보</button>
            <button className="btn btn--ghost btn--sm" onClick={onOpenInfraMap} type="button">배치 매핑</button>
            <Link className={`btn btn--primary btn--sm${server?.infraNodeId ? "" : " is-disabled"}`} to={infraRelationHref}>인프라 관계도</Link>
          </div>
        </div>
        <div className="service-detail__stack-list">
          {detail.deploymentRows.map((row) => (
            <div className="service-detail__deploy-card" key={row.name}>
              <div className="service-detail__deploy-head">
                <div className="service-detail__deploy-title"><i />{row.name}</div>
                <button className="service-detail__icon-action" onClick={onOpenDeployments} type="button">
                  <Eye size={14} />
                  <span>상세</span>
                </button>
              </div>
              <div className="service-detail__deploy-meta">{row.meta}</div>
              <div className="service-detail__deploy-foot">
                <span>{row.path}</span>
                <span className="pill pill--ok">{row.status}</span>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="service-detail__panel">
        <div className="service-detail__panel-head">
          <h2>인시던트 이력 (30일)</h2>
          <button className="service-detail__text-action" onClick={onOpenIncidents} type="button">전체 보기 →</button>
        </div>
        <div className="service-detail__compact-list">
          {overviewIncidents.map((item) => (
            <div className="service-detail__compact-row" key={item.key}>
              <span className="pill pill--ok">{item.status}</span>
              <span>{item.time}</span>
              <strong>{item.title}</strong>
              <span>{item.duration}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="service-detail__panel">
        <h2>담당자 (SERVICE_OWNER)</h2>
        <div className="service-detail__owner-list">
          {detail.owners.map((owner) => (
            <div className="service-detail__owner-row" key={owner.name + owner.role}>
              <div className="service-detail__owner-avatar">{owner.name.slice(0, 1)}</div>
              <div className="service-detail__owner-meta">
                <strong>{owner.name}</strong>
                <span>{owner.role}</span>
                <small>{owner.meta}</small>
              </div>
              <div className="service-detail__owner-actions">
                <button type="button"><MessageCircle size={14} /></button>
                <button type="button"><Phone size={14} /></button>
                <button type="button"><Mail size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

function ServiceImpactTab({ detail }) {
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>영향도</h2>
          <p>관계 등록 시 함께 관리할 직접/간접 영향 정보</p>
        </div>
      </div>
      <div className="service-detail__impact-grid">
        {detail.impactRows.map((row) => (
          <article className="service-detail__impact-card" key={row.service + row.scenario}>
            <span className={`service-detail__impact-level ${row.level === "직접" ? "is-direct" : ""}`}>{row.level}</span>
            <h3>{row.service}</h3>
            <dl>
              <dt>영향 조건</dt><dd>{row.scenario}</dd>
              <dt>영향 범위</dt><dd>{row.radius}</dd>
              <dt>확인 조치</dt><dd>{row.action}</dd>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function ServiceOwnersTab({ detail, owners }) {
  const ownerRows = owners.length
    ? owners.map((owner) => ({
        key: owner.serviceOwnerId,
        name: owner.ownerName,
        role:
          owner.responsibilityCode === "MAIN"
            ? "주담당자"
            : owner.responsibilityCode === "SUB"
              ? "부담당자"
              : "알림 담당",
        meta: `${owner.ownerTypeCode === "GROUP" ? "담당그룹" : "사용자"} · ${owner.serviceCode || ""}`,
      }))
    : detail.owners.map((owner, index) => ({ ...owner, key: `${owner.name}-${index}` }));
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>담당자 정보</h2>
          <p>주담당/부담당/운영 담당을 분리해 확인</p>
        </div>
      </div>
      <div className="service-detail__owner-list">
        {ownerRows.map((owner) => (
          <div className="service-detail__owner-row" key={owner.key}>
            <div className="service-detail__owner-avatar">{owner.name.slice(0, 1)}</div>
            <div className="service-detail__owner-meta">
              <strong>{owner.name}</strong>
              <span>{owner.role}</span>
              <small>{owner.meta}</small>
            </div>
            <div className="service-detail__owner-actions">
              <button type="button"><MessageCircle size={14} /></button>
              <button type="button"><Phone size={14} /></button>
              <button type="button"><Mail size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServiceTechStackTab({ detail, onDelete, onEdit, techStacks, service }) {
  const techRows = techStacks.length
    ? techStacks.map((techStack) => ({
        key: techStack.techStackId,
        type: techStack.techTypeName,
        name: techStack.techName,
        master: "-",
        applied: techStack.versionText,
        note: techStack.vendorName || "-",
        record: techStack,
      }))
    : detail.techRows.map((row, index) => ({
        ...row,
        key: `${row.type}-${row.name}-${index}`,
        record: {
          techStackId: 0,
          serviceId: service.serviceId,
          techTypeName: row.type,
          techName: row.name,
          versionText: row.applied,
          vendorName: row.note,
        },
      }));
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>기술스택</h2>
          <p>이 서비스에서 사용하는 기술 스택</p>
        </div>
        <button className="btn btn--ghost btn--sm" type="button"><Plus size={14} /> 기술스택 추가</button>
      </div>
      <table className="tbl service-detail__full-table">
        <thead>
          <tr>
            <th>기술 유형</th>
            <th>기술명</th>
            <th>마스터 버전</th>
            <th>적용 버전</th>
            <th>비고</th>
            <th className="col-actions">액션</th>
          </tr>
        </thead>
        <tbody>
          {techRows.map((row) => (
            <tr key={row.key}>
              <td><span className="tag">{row.type}</span></td>
              <td><strong>{row.name}</strong></td>
              <td>{row.master}</td>
              <td>{row.applied}</td>
              <td>{row.note}</td>
              <td className="col-actions">
                <div className="service-detail__text-actions">
                  <button className="service-detail__text-action-button" disabled={!row.record.techStackId} onClick={() => onEdit(row.record)} type="button"><Pencil size={14} /> 수정</button>
                  <button className="service-detail__text-action-button is-danger" disabled={!row.record.techStackId} onClick={() => onDelete(row.record)} type="button"><Trash2 size={14} /> 삭제</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ServiceDeploymentTab({ detail, onOpenDetail, onOpenInfraMap, server, service }) {
  const infraRelationHref = server?.infraNodeId ? `/admin-infra-relations?focusInfraNodeId=${server.infraNodeId}` : "/admin-service-infra-mapping";
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>서버/배포 정보</h2>
          <p>이 서비스가 배포된 서버 목록</p>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={onOpenInfraMap} type="button"><Plus size={14} /> 서버 연결</button>
      </div>
      <div className="service-detail__infra-card service-detail__infra-card--wide">
        <div>
          <strong>{server?.serverName || "배포 서버 미지정"}</strong>
          <span>{server ? `${server.hostName} · ${server.ipAddress}` : "서비스 배치 매핑에서 서버를 연결해주세요."}</span>
        </div>
        <dl>
          <dt>환경</dt><dd>{server?.envCode || "-"}</dd>
          <dt>OS</dt><dd>{server ? `${server.osTypeCode} ${server.osVersion}` : "-"}</dd>
          <dt>배포 경로</dt><dd>{service.deployPath || "-"}</dd>
          <dt>포트</dt><dd>{service.portInfo || "-"}</dd>
          <dt>인프라 노드</dt><dd>{server?.infraNodeName || "인프라 미매핑"}</dd>
        </dl>
        <div className="service-detail__infra-actions">
          <button className="btn btn--ghost btn--sm" onClick={onOpenInfraMap} type="button">배치 매핑 수정</button>
          <Link className={`btn btn--primary btn--sm${server?.infraNodeId ? "" : " is-disabled"}`} to={infraRelationHref}>인프라 관계도</Link>
        </div>
      </div>
      <table className="tbl service-detail__full-table">
        <thead>
          <tr>
            <th>서버명</th>
            <th>호스트명</th>
            <th>IP 주소</th>
            <th>환경</th>
            <th>OS</th>
            <th>배포 경로</th>
            <th>포트</th>
            <th>인스턴스</th>
            <th>상태</th>
            <th className="col-actions">액션</th>
          </tr>
        </thead>
        <tbody>
          {detail.serverRows.map((row) => (
            <tr key={row.server}>
              <td><strong>{row.server}</strong></td>
              <td>{row.host}</td>
              <td>{row.ip}</td>
              <td><span className="tag">{row.env}</span></td>
              <td>{row.os}</td>
              <td>{row.path}</td>
              <td>{row.port}</td>
              <td>{row.instances}</td>
              <td><span className="pill pill--ok">{row.status}</span></td>
              <td className="col-actions">
                <button className="service-detail__text-action-button" onClick={() => onOpenDetail(row.server)} type="button">
                  <Eye size={14} />
                  상세
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ServiceRelationTab({ detail, relations }) {
  const relationRows = relations.length
    ? relations.map((relation) => ({
        key: relation.relationId,
        direction: relation.direction,
        service: relation.relatedService?.serviceName || relation.relatedService?.serviceCode || "서비스 미지정",
        code: relation.relatedService?.serviceCode,
        type: codeLabels.relationType[relation.relationTypeCode] || relation.relationTypeCode,
        status: codeLabels.relationStatus[relation.relationStatusCode] || relation.relationStatusCode,
        required: relation.mandatoryYn,
        impact: relation.mandatoryYn === "Y" ? "직접" : "간접",
        description: relation.description,
      }))
    : detail.relationRows.map((row, index) => ({ ...row, key: `${row.direction}-${row.service}-${index}` }));
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>서비스 관계</h2>
          <p>다른 서비스와의 연관 관계</p>
        </div>
        <button className="btn btn--ghost btn--sm" type="button">＋ 관계 추가</button>
      </div>
      <table className="tbl service-detail__full-table">
        <thead>
          <tr>
            <th>방향</th>
            <th>연관 서비스</th>
            <th>관계 유형</th>
            <th>관계 상태</th>
            <th>필수 여부</th>
            <th>영향도</th>
            <th>설명</th>
            <th className="col-actions">액션</th>
          </tr>
        </thead>
        <tbody>
          {relationRows.map((row) => (
            <tr key={row.key}>
              <td><span className={`service-detail__direction-badge ${row.direction === "송신" ? "is-outbound" : "is-inbound"}`}>{row.direction === "송신" ? "-> 송신" : "<- 수신"}</span></td>
              <td><strong className="service-detail__linkish">{row.service}</strong>{row.code ? <code className="service-detail__inline-code">{row.code}</code> : null}</td>
              <td><span className="tag">{row.type}</span></td>
              <td><span className="pill pill--ok">{row.status}</span></td>
              <td>{row.required}</td>
              <td><span className={row.impact === "직접" ? "pill pill--crit" : "tag"}>{row.impact}</span></td>
              <td>{row.description}</td>
              <td className="col-actions"><div className="row-actions"><button className="ibtn" type="button">✏️</button><button className="ibtn ibtn--danger" type="button">🗑</button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ServiceChangeTab({ detail, rows, sourceLabel }) {
  const changeRows = rows.length
    ? rows
    : detail.changeRows.map((row, index) => ({
        ...row,
        key: `${row.actor}-${row.at}-${index}`,
      }));
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>변경 이력</h2>
          <p>서비스 정보 변경 기록</p>
        </div>
        <span className="service-detail__source-label">{sourceLabel}</span>
      </div>
      <table className="tbl service-detail__full-table">
        <thead>
          <tr>
            <th>변경 유형</th>
            <th>변경자</th>
            <th>변경 일시</th>
            <th>변경 항목</th>
            <th>이전 값</th>
            <th>변경 값</th>
          </tr>
        </thead>
        <tbody>
          {changeRows.map((row) => (
            <tr key={row.key}>
              <td><span className={`service-detail__change-badge ${row.type === "등록" ? "is-create" : "is-update"}`}>{row.type}</span></td>
              <td>{row.actor}</td>
              <td>{row.at}</td>
              <td><strong>{row.field}</strong></td>
              <td>{row.before}</td>
              <td>{row.after}</td>
            </tr>
          ))}
          {!changeRows.length ? <tr><td colSpan={6}><div className="empty">변경 이력이 없습니다.</div></td></tr> : null}
        </tbody>
      </table>
    </section>
  );
}

function ServiceIncidentTab({ detail, incidents, onOpenDetail, service }) {
  const incidentRows = incidents.length
    ? incidents.map((incident) => ({
        key: incident.incidentId,
        title: incident.title,
        code: incident.externalIncidentCode || `INC-${incident.incidentId}`,
        severity: incident.severityCode,
        status: serviceIncidentStatusLabel(incident.incidentStatusCode),
        direct: Number(incident.serviceId) === Number(service.serviceId) ? "직접" : "간접",
        startedAt: formatServiceDetailDate(incident.startedAt),
        endedAt: incident.endedAt ? formatServiceDetailDate(incident.endedAt) : "-",
        record: incident,
      }))
    : detail.incidentRows.map((row, index) => ({
        ...row,
        key: `${row.title}-${index}`,
        code: "-",
        record: null,
      }));
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>인시던트 이력</h2>
          <p>이 서비스와 관련된 장애 및 이슈</p>
        </div>
        <button className="btn btn--ghost btn--sm" type="button"><Plus size={14} /> 인시던트 등록</button>
      </div>
      <table className="tbl service-detail__full-table">
        <thead>
          <tr>
            <th>제목</th>
            <th>심각도</th>
            <th>상태</th>
            <th>직접 영향</th>
            <th>발생 일시</th>
            <th>종료 일시</th>
            <th className="col-actions">액션</th>
          </tr>
        </thead>
        <tbody>
          {incidentRows.map((row) => (
            <tr key={row.key}>
              <td><strong className="service-detail__linkish">{row.title}</strong><code className="service-detail__inline-code">{row.code}</code></td>
              <td><span className={`pill ${row.severity === "CRITICAL" ? "pill--crit" : "pill--warn"}`}>{row.severity}</span></td>
              <td><span className="pill pill--ok">{row.status}</span></td>
              <td><span className="tag">{row.direct}</span></td>
              <td>{row.startedAt}</td>
              <td>{row.endedAt}</td>
              <td className="col-actions">
                <button className="service-detail__text-action-button" onClick={() => onOpenDetail(row.record)} type="button">
                  <Eye size={14} />
                  상세
                </button>
              </td>
            </tr>
          ))}
          {!incidentRows.length ? <tr><td colSpan={7}><div className="empty">등록된 인시던트 이력이 없습니다.</div></td></tr> : null}
        </tbody>
      </table>
    </section>
  );
}
