import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Eye, Mail, MessageCircle, Pencil, Phone, Plus, Trash2 } from "lucide-react";

import { usePortalData } from "../../dashboardModule/PortalDataStore";
import { chainViewApi } from "../../dashboardModule/chainViewApi";
import { codeLabels } from "../../dashboardModule/mockData";

const serviceDetailTabs = [
  { key: "overview", label: "기본정보" },
  { key: "deployments", label: "서버/배포" },
  { key: "techstack", label: "기술스택" },
  { key: "relations", label: "서비스 관계" },
  { key: "owners", label: "담당자/조직" },
  { key: "checks", label: "서비스 점검" },
  { key: "incidents", label: "인시던트 이력" },
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

function buildServiceDetail(service, deploymentInfos, owners) {
  const statusLabel = codeLabels.serviceStatus?.[service.statusCode] || service.statusCode || "-";
  const importanceLabel = codeLabels.importance?.[service.importanceCode] || service.importanceCode || "-";
  const ownerRows = owners.map((owner) => ({
    name: owner.ownerName || "-",
    role:
      owner.responsibilityCode === "MAIN"
        ? "주담당자"
        : owner.responsibilityCode === "SUB"
          ? "부담당자"
          : "알림 담당",
    meta: `${owner.ownerTypeCode === "GROUP" ? "담당그룹" : "사용자"} · ${owner.serviceCode || service.serviceCode}`,
  }));
  const deploymentRows = deploymentInfos.map(({ deployment, server }) => ({
    name: server?.serverName || `서버 ${deployment.serverId ?? service.serverId}`,
    meta: `${server?.ipAddress || "-"}:${deployment.portInfo || service.portInfo || "-"} · ${server?.envCode || "-"} · ${server?.osTypeCode || "-"}`,
    path: `deploy: ${deployment.deployPath || service.deployPath || "-"}`,
    status: codeLabels.deploymentStatus?.[deployment.deploymentStatusCode] || deployment.deploymentStatusCode || service.deploymentStatusCode || "-",
  }));
  const serverRows = deploymentInfos.map(({ deployment, server }) => ({
    server: server?.serverName || `서버 ${deployment.serverId ?? service.serverId}`,
    host: server?.hostName || "-",
    ip: server?.ipAddress || "-",
    env: codeLabels.envType?.[server?.envCode] || server?.envCode || "-",
    os: `${codeLabels.osType?.[server?.osTypeCode] || server?.osTypeCode || "-"} ${server?.osVersion || ""}`.trim(),
    path: deployment.deployPath || service.deployPath || "-",
    port: deployment.portInfo || service.portInfo || "-",
    instances: deployment.instanceCount ?? service.instanceCount ?? "-",
    status: codeLabels.deploymentStatus?.[deployment.deploymentStatusCode] || deployment.deploymentStatusCode || service.deploymentStatusCode || "-",
    infraNodeName: server?.infraNodeName || "인프라 미매핑",
  }));

  return {
    title: service.serviceName,
    importanceLabel,
    statusLabel,
    ownerSummary: ownerRows[0] ? `${ownerRows[0].name} (${ownerRows[0].role})` : "담당자 미지정",
    overviewIncidents: [],
    owners: ownerRows,
    deploymentRows,
    techRows: [],
    serverRows,
    changeRows: [],
    relationRows: [],
    impactRows: [],
    incidentRows: [],
  };
}

function buildServiceDeploymentInfos(service, deployments, servers) {
  const serviceDeployments = deployments.filter(
    (deployment) => Number(deployment.serviceId) === Number(service.serviceId)
  );
  const fallbackDeployments =
    serviceDeployments.length || !service.serverId
      ? serviceDeployments
      : [{
          serviceId: service.serviceId,
          serverId: service.serverId,
          deployPath: service.deployPath,
          portInfo: service.portInfo,
          deploymentStatusCode: service.deploymentStatusCode,
          instanceCount: service.instanceCount,
        }];

  return fallbackDeployments.map((deployment) => ({
    deployment,
    server: servers.find((server) => Number(server.serverId) === Number(deployment.serverId)),
  }));
}

export function ServiceAdminPage() {
  const { serviceCode } = useParams();
  const portalData = usePortalData();
  const selectedService =
    portalData.services.find((service) => service.serviceCode === serviceCode);

  if (portalData.remoteApi.initialLoading) {
    return (
      <div className="service-detail-page">
        <div className="service-detail-data-loader inline-data-loader" role="status" aria-live="polite">
          <span className="portal-initial-loader__ring" aria-hidden="true" />
          <strong>서비스 상세 정보를 불러오는 중입니다.</strong>
        </div>
      </div>
    );
  }

  if (!selectedService) {
    return <div className="service-detail-page"><div className="empty">조회된 서비스가 없습니다.</div></div>;
  }

  return <ServiceDetailPage service={selectedService} />;
}

function ServiceDetailPage({ service }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    createIncident,
    createOwner,
    deleteOwner,
    deleteTechStack,
    deployments,
    incidents,
    owners,
    relations,
    updateOwner,
    updateRelation,
    removeRelation,
    servers,
    services,
    techStacks,
    updateTechStack,
  } = usePortalData();
  const activeTab = new URLSearchParams(location.search).get("tab") || "overview";
  const [changeRows, setChangeRows] = useState([]);
  const [changeSourceLabel, setChangeSourceLabel] = useState("샘플 기준");
  const [checkRows, setCheckRows] = useState([]);
  const [checkSourceLabel, setCheckSourceLabel] = useState("운영 API 기준");
  const [impactRows, setImpactRows] = useState([]);
  const [impactSourceLabel, setImpactSourceLabel] = useState("샘플 기준");
  const deploymentInfos = useMemo(
    () => buildServiceDeploymentInfos(service, deployments, servers),
    [deployments, servers, service]
  );
  const deploymentServer = useMemo(
    () => deploymentInfos[0]?.server,
    [deploymentInfos]
  );
  const serviceOwners = useMemo(
    () =>
      owners.filter(
        (owner) =>
          Number(owner.serviceId) === Number(service.serviceId) ||
          String(owner.serviceCode || "") === String(service.serviceCode)
      ),
    [owners, service.serviceCode, service.serviceId]
  );
  const detail = useMemo(
    () => buildServiceDetail(service, deploymentInfos, serviceOwners),
    [deploymentInfos, service, serviceOwners]
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

  useEffect(() => {
    setImpactRows([]);
    setImpactSourceLabel("샘플 기준");
    if (import.meta.env.DEV || !service.serviceId) {
      return undefined;
    }
    let cancelled = false;
    chainViewApi.services
      .impactPreview(Number(service.serviceId), 2)
      .then((payload) => {
        if (cancelled) return;
        setImpactRows(normalizeServiceImpactRows(payload, services));
        setImpactSourceLabel("운영 API 기준");
      })
      .catch((error) => {
        console.warn("서비스 영향도 API 조회 실패, 샘플 데이터를 사용합니다.", error);
        if (!cancelled) setImpactSourceLabel("샘플 기준");
      });
    return () => {
      cancelled = true;
    };
  }, [service.serviceId, services]);

  useEffect(() => {
    let cancelled = false;
    setCheckRows([]);
    chainViewApi.healthCheckJobs
      .list({ serviceId: service.serviceId })
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        setCheckRows(list.filter((row) => Number(row.serviceId) === Number(service.serviceId) || String(row.serviceCode || "") === service.serviceCode));
        setCheckSourceLabel("운영 API 기준");
      })
      .catch((error) => {
        console.warn("서비스 점검 목록 조회 실패", error);
        if (!cancelled) {
          setCheckRows([]);
          setCheckSourceLabel("조회 실패");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [service.serviceCode, service.serviceId]);

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
      navigate(`/?incidentId=${incident.incidentId}`);
      return;
    }
    navigate("/");
  };

  const handleCreateIncident = () => {
    const title = window.prompt("인시던트 제목을 입력하세요.", `${service.serviceName} 장애 발생`);
    if (!title) return;
    const createdIncident = createIncident({
      serviceId: service.serviceId,
      severityCode: "CRITICAL",
      targetCode: service.serviceCode,
      targetLabel: service.serviceName,
      title,
      description: "서비스 상세 화면에서 등록한 인시던트입니다.",
      manualRegisteredYn: "Y",
      registeredBy: "admin",
    });
    navigate(`/?incidentId=${createdIncident.incidentId}`);
  };

  const handleCreateCheck = async () => {
    const jobName = window.prompt("점검명을 입력하세요.", `${service.serviceName} 헬스체크`);
    if (!jobName) return;
    try {
      await chainViewApi.healthCheckJobs.create({
        serviceId: service.serviceId,
        jobName,
        checkTypeCode: service.endpointUrl ? "HTTP" : "PING",
        targetUrl: service.endpointUrl,
        cronExpression: "0 */3 * * * *",
        activeYn: "Y",
      });
      const rows = await chainViewApi.healthCheckJobs.list({ serviceId: service.serviceId });
      setCheckRows((Array.isArray(rows) ? rows : []).filter((row) => Number(row.serviceId) === Number(service.serviceId) || String(row.serviceCode || "") === service.serviceCode));
      setCheckSourceLabel("운영 API 기준");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "서비스 점검 등록에 실패했습니다.");
    }
  };

  const handleEditOwner = (owner) => {
    const nextResponsibility = window.prompt("책임 유형을 입력하세요. (MAIN/SUB/ALERT)", owner.responsibilityCode || "MAIN");
    if (!nextResponsibility) return;
    updateOwner(owner.serviceOwnerId, {
      ...owner,
      groupName: owner.ownerTypeCode === "GROUP" ? owner.ownerName : "",
      userName: owner.ownerTypeCode === "USER" ? owner.ownerName : "",
      responsibilityCode: nextResponsibility.trim().toUpperCase(),
    });
  };

  const handleCreateOwner = () => {
    const ownerName = window.prompt("담당자 또는 담당그룹명을 입력하세요.");
    if (!ownerName) return;
    const ownerTypeCode = window.confirm("개인 담당자로 등록할까요? 취소를 누르면 그룹으로 등록됩니다.") ? "USER" : "GROUP";
    createOwner({
      serviceId: service.serviceId,
      serviceCode: service.serviceCode,
      ownerTypeCode,
      userName: ownerTypeCode === "USER" ? ownerName : "",
      groupName: ownerTypeCode === "GROUP" ? ownerName : "",
      responsibilityCode: "MAIN",
    });
  };

  const handleDeleteOwner = (owner) => {
    if (window.confirm(`${owner.ownerName} 담당 정보를 삭제할까요?`)) {
      deleteOwner(owner.serviceOwnerId);
    }
  };

  const handleEditRelation = (relation) => {
    const nextDescription = window.prompt("관계 설명을 입력하세요.", relation.description || "");
    if (nextDescription === null) return;
    updateRelation(relation.relationId, { description: nextDescription });
  };

  const handleDeleteRelation = (relation) => {
    if (window.confirm("서비스 관계를 삭제할까요?")) {
      removeRelation(relation.relationId);
    }
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
            <span>서비스 코드 <b>{service.serviceCode}</b></span>
            <span>분류 <b>{service.categoryPath?.join(" > ")}</b></span>
            <span>서비스 유형 <b>{labelFromCode("serviceType", service.serviceTypeCode)}</b></span>
            <span>상태 <b>{detail.statusLabel}</b></span>
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

      {activeTab === "overview" ? <ServiceOverviewTab detail={detail} service={service} /> : null}
      {activeTab === "techstack" ? <ServiceTechStackTab detail={detail} onDelete={handleTechDelete} onEdit={handleTechEdit} techStacks={serviceTechStacks} service={service} /> : null}
      {activeTab === "deployments" ? <ServiceDeploymentTab detail={detail} onOpenDetail={handleServerDetail} onOpenInfraMap={handleInfraMapOpen} server={deploymentServer} service={service} /> : null}
      {activeTab === "owners" ? <ServiceOwnersTab detail={detail} onCreate={handleCreateOwner} onDelete={handleDeleteOwner} onEdit={handleEditOwner} owners={serviceOwners} /> : null}
      {activeTab === "relations" ? <ServiceRelationTab detail={detail} onDelete={handleDeleteRelation} onEdit={handleEditRelation} onCreate={() => navigate("/admin-relations")} relations={serviceRelations} /> : null}
      {activeTab === "checks" ? <ServiceCheckTab onCreate={handleCreateCheck} rows={checkRows} service={service} sourceLabel={checkSourceLabel} /> : null}
      {activeTab === "changes" ? <ServiceChangeTab detail={detail} rows={changeRows} sourceLabel={changeSourceLabel} /> : null}
      {activeTab === "incidents" ? <ServiceIncidentTab detail={detail} incidents={serviceIncidents} onCreate={handleCreateIncident} onOpenDetail={handleIncidentDetail} service={service} /> : null}
    </div>
  );
}

function formatServiceDetailDate(value) {
  if (!value) {
    return "-";
  }
  return String(value).replace("T", " ").slice(0, 16);
}

function labelFromCode(group, code) {
  return codeLabels[group]?.[code] || code || "-";
}

function ownerResponsibilityLabel(code) {
  return codeLabels.responsibilityType?.[code] || code || "-";
}

function ownerTypeLabel(code) {
  return codeLabels.ownerType?.[code] || code || "-";
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

function readServiceImpactCandidates(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!payload || typeof payload !== "object") {
    return [];
  }
  return (
    payload.impacts ||
    payload.impactServices ||
    payload.impactedServices ||
    payload.nodes ||
    payload.services ||
    payload.items ||
    payload.data ||
    []
  );
}

function normalizeServiceImpactRows(payload, services) {
  const candidates = readServiceImpactCandidates(payload);
  if (!Array.isArray(candidates)) {
    return [];
  }
  return candidates
    .map((row, index) => {
      if (!row || typeof row !== "object") {
        return null;
      }
      const serviceId =
        Number(row.serviceId ?? row.impactedServiceId ?? row.targetServiceId ?? row.nodeId) || 0;
      const relatedService = services.find((item) => Number(item.serviceId) === serviceId);
      const serviceName =
        row.serviceName ||
        row.impactedServiceName ||
        row.targetServiceName ||
        row.label ||
        row.name ||
        relatedService?.serviceName ||
        row.serviceCode ||
        relatedService?.serviceCode ||
        "영향 서비스";
      const depth = Number(row.depth ?? row.level ?? row.hop ?? row.distance);
      const level =
        row.impactLevelName ||
        row.impactLevel ||
        row.levelName ||
        (depth <= 1 ? "직접" : depth ? `${depth}-hop` : "간접");
      return {
        key: row.impactId || row.id || row.relationId || `${serviceName}-${index}`,
        level,
        service: serviceName,
        scenario:
          row.scenario ||
          row.impactReason ||
          row.reason ||
          row.relationDescription ||
          row.description ||
          "서비스 관계 기반 영향 가능",
        radius:
          row.radius ||
          row.impactScope ||
          row.scope ||
          row.categoryPath ||
          relatedService?.categoryPath?.join(" > ") ||
          "-",
        action:
          row.action ||
          row.checkAction ||
          row.recommendation ||
          row.ownerName ||
          "담당자 및 연결 서비스 상태 확인",
      };
    })
    .filter(Boolean);
}

function serviceIncidentStatusLabel(code) {
  return codeLabels.incidentStatus?.[code] || code || "-";
}

function ServiceOverviewTab({ detail, service }) {
  return (
    <div className="service-detail__overview-grid" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <article className="service-detail__panel">
        <h2>기본 정보</h2>
        <dl className="service-detail__definition-list">
          <dt>서비스 코드</dt><dd>{service.serviceCode}</dd>
          <dt>서비스명</dt><dd>{service.serviceName}</dd>
          <dt>대분류/중분류/소분류</dt><dd>{service.categoryPath?.map((item) => <span className="tag" key={item}>{item}</span>)}</dd>
          <dt>서비스 유형</dt><dd>{labelFromCode("serviceType", service.serviceTypeCode)}</dd>
          <dt>중요도</dt><dd><span className="pill pill--crit">{detail.importanceLabel}</span></dd>
          <dt>상태</dt><dd><span className="pill pill--ok">{detail.statusLabel}</span></dd>
          <dt>엔드포인트 URL</dt><dd><code>{service.endpointUrl || "-"}</code></dd>
          <dt>설명</dt><dd>{service.description || "-"}</dd>
          <dt>등록일</dt><dd>{formatServiceDetailDate(service.createdAt)}</dd>
          <dt>수정일</dt><dd>{formatServiceDetailDate(service.updatedAt)}</dd>
        </dl>
      </article>
    </div>
  );
}

function ServiceImpactTab({ detail, rows, service, sourceLabel }) {
  const impactRows = rows.length
    ? rows
    : detail.impactRows.map((row, index) => ({
        ...row,
        key: `${row.service}-${index}`,
      }));
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>영향도</h2>
          <p>관계 등록 시 함께 관리할 직접/간접 영향 정보</p>
        </div>
        <div className="service-detail__section-actions">
          <span className="service-detail__source-label">{sourceLabel}</span>
        </div>
      </div>
      <div className="service-detail__impact-grid">
        {impactRows.map((row) => (
          <article className="service-detail__impact-card" key={row.key}>
            <span className={`service-detail__impact-level ${row.level === "직접" ? "is-direct" : ""}`}>{row.level}</span>
            <h3>{row.service}</h3>
            <dl>
              <dt>영향 조건</dt><dd>{row.scenario}</dd>
              <dt>영향 범위</dt><dd>{row.radius}</dd>
              <dt>확인 조치</dt><dd>{row.action}</dd>
            </dl>
          </article>
        ))}
        {!impactRows.length ? <div className="empty">등록된 영향도 정보가 없습니다.</div> : null}
      </div>
    </section>
  );
}

function ServiceOwnersTab({ detail, onCreate, onDelete, onEdit, owners }) {
  const ownerRows = owners.length
    ? owners.map((owner) => ({
        key: owner.serviceOwnerId,
        type: ownerTypeLabel(owner.ownerTypeCode),
        name: owner.ownerName || "-",
        department: owner.departmentName || owner.groupName || "-",
        role: owner.roleName || "-",
        phone: owner.phoneNo || owner.mobileNo || "-",
        email: owner.email || "-",
        responsibility: ownerResponsibilityLabel(owner.responsibilityCode),
        record: owner,
      }))
    : detail.owners.map((owner, index) => ({
        key: `${owner.name}-${index}`,
        type: owner.meta?.startsWith("담당그룹") ? "그룹" : "사용자",
        name: owner.name,
        department: "-",
        role: owner.role,
        phone: "-",
        email: "-",
        responsibility: owner.role,
        record: null,
      }));
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>담당자/조직</h2>
          <p>서비스 담당자 및 담당 그룹</p>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={onCreate} type="button"><Plus size={14} /> 담당자 추가</button>
      </div>
      <table className="tbl service-detail__full-table">
        <thead>
          <tr>
            <th>담당 유형</th>
            <th>담당자/조직</th>
            <th>부서</th>
            <th>역할</th>
            <th>전화</th>
            <th>메일</th>
            <th>책임 유형</th>
            <th className="col-actions">액션</th>
          </tr>
        </thead>
        <tbody>
          {ownerRows.map((owner) => (
            <tr key={owner.key}>
              <td><span className="tag">{owner.type}</span></td>
              <td><strong>{owner.name}</strong></td>
              <td>{owner.department}</td>
              <td>{owner.role}</td>
              <td>{owner.phone}</td>
              <td>{owner.email}</td>
              <td><span className="pill pill--ok">{owner.responsibility}</span></td>
              <td className="col-actions">
                <div className="service-detail__text-actions">
                  <button className="service-detail__text-action-button" disabled={!owner.record} onClick={() => onEdit(owner.record)} type="button"><Pencil size={14} /> 수정</button>
                  <button className="service-detail__text-action-button is-danger" disabled={!owner.record} onClick={() => onDelete(owner.record)} type="button"><Trash2 size={14} /> 삭제</button>
                </div>
              </td>
            </tr>
          ))}
          {!ownerRows.length ? <tr><td colSpan={8}><div className="empty">등록된 담당자 정보가 없습니다.</div></td></tr> : null}
        </tbody>
      </table>
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
          {!techRows.length ? <tr><td colSpan={6}><div className="empty">조회 가능한 데이터가 없습니다.</div></td></tr> : null}
        </tbody>
      </table>
    </section>
  );
}

function ServiceDeploymentTab({ detail, onOpenDetail, onOpenInfraMap, server, service }) {
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>서버/배포 정보</h2>
          <p>이 서비스가 배포된 서버 목록</p>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={onOpenInfraMap} type="button"><Plus size={14} /> 서버 연결</button>
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
          {!detail.serverRows.length ? <tr><td colSpan={10}><div className="empty">조회 가능한 데이터가 없습니다.</div></td></tr> : null}
        </tbody>
      </table>
    </section>
  );
}

function ServiceRelationTab({ detail, onCreate, onDelete, onEdit, relations }) {
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
        record: relation,
      }))
    : detail.relationRows.map((row, index) => ({ ...row, key: `${row.direction}-${row.service}-${index}`, record: null }));
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>서비스 관계</h2>
          <p>다른 서비스와의 연관 관계</p>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={onCreate} type="button">＋ 관계 추가</button>
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
              <td className="col-actions">
                <div className="row-actions">
                  <button className="ibtn" disabled={!row.record} onClick={() => onEdit(row.record)} type="button">✏️</button>
                  <button className="ibtn ibtn--danger" disabled={!row.record} onClick={() => onDelete(row.record)} type="button">🗑</button>
                </div>
              </td>
            </tr>
          ))}
          {!relationRows.length ? <tr><td colSpan={8}><div className="empty">조회 가능한 데이터가 없습니다.</div></td></tr> : null}
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
          {!changeRows.length ? <tr><td colSpan={6}><div className="empty">조회 가능한 데이터가 없습니다.</div></td></tr> : null}
        </tbody>
      </table>
    </section>
  );
}

function ServiceCheckTab({ onCreate, rows, service, sourceLabel }) {
  const checkRows = rows.map((row, index) => ({
    key: row.healthCheckJobId || row.jobId || row.id || index,
    code: row.jobCode || row.healthCheckCode || row.code || "-",
    name: row.jobName || row.checkName || row.name || `${service.serviceName} 점검`,
    target: row.targetUrl || row.url || row.targetName || service.endpointUrl || service.serviceName,
    type: row.checkTypeName || row.checkTypeCode || row.type || "-",
    cron: row.cronExpression || row.cron || "-",
    active: row.activeYn === "N" || row.enabled === false ? "중지" : "실행중",
    lastCheckedAt: formatServiceDetailDate(row.lastCheckedAt || row.checkedAt || row.updatedAt),
    lastResult: row.lastResultCode || row.resultStatus || row.lastStatus || "-",
  }));
  return (
    <section className="service-detail__panel">
      <div className="service-detail__section-head">
        <div>
          <h2>서비스 점검</h2>
          <p>이 서비스에 연결된 HTTP 점검 및 서버 PING 점검</p>
        </div>
        <div className="service-detail__section-actions">
          <span className="service-detail__source-label">{sourceLabel}</span>
          <button className="btn btn--ghost btn--sm" onClick={onCreate} type="button"><Plus size={14} /> 점검 등록</button>
        </div>
      </div>
      <table className="tbl service-detail__full-table">
        <thead>
          <tr>
            <th>코드</th>
            <th>점검명</th>
            <th>대상</th>
            <th>유형</th>
            <th>Cron</th>
            <th>실행</th>
            <th>최근 점검</th>
            <th>결과</th>
          </tr>
        </thead>
        <tbody>
          {checkRows.map((row) => (
            <tr key={row.key}>
              <td>{row.code}</td>
              <td><strong>{row.name}</strong></td>
              <td>{row.target}</td>
              <td>{row.type}</td>
              <td>{row.cron}</td>
              <td>{row.active}</td>
              <td>{row.lastCheckedAt}</td>
              <td>{row.lastResult}</td>
            </tr>
          ))}
          {!checkRows.length ? <tr><td colSpan={8}><div className="empty">등록된 서비스 점검이 없습니다. 점검 등록 버튼으로 일일 점검 항목을 추가할 수 있습니다.</div></td></tr> : null}
        </tbody>
      </table>
    </section>
  );
}

function ServiceIncidentTab({ detail, incidents, onCreate, onOpenDetail, service }) {
  const incidentRows = incidents.length
    ? incidents.map((incident) => ({
        key: incident.incidentId,
        title: incident.title,
        code: incident.externalIncidentCode || `INC-${incident.incidentId}`,
        severity: labelFromCode("severity", incident.severityCode),
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
        <button className="btn btn--ghost btn--sm" onClick={onCreate} type="button"><Plus size={14} /> 인시던트 등록</button>
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
              <td><strong className="service-detail__linkish">{row.title}</strong></td>
              <td><span className={`pill ${row.severity === "심각" ? "pill--crit" : "pill--warn"}`}>{row.severity}</span></td>
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
          {!incidentRows.length ? <tr><td colSpan={7}><div className="empty">조회 가능한 데이터가 없습니다.</div></td></tr> : null}
        </tbody>
      </table>
    </section>
  );
}
