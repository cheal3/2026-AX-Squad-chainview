import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { History, List, Pencil, Play, Plus, Power, RotateCcw, Search, Trash2, X } from "lucide-react";

import { AppShell } from "../../components/AppShell.jsx";
import { ModalBackdrop } from "../../components/ModalBackdrop.jsx";
import { PAGE_SIZE, Pagination } from "../../components/Pagination.jsx";
import { chainViewApi } from "../../dashboardModule/chainViewApi";
import { usePortalData } from "../../dashboardModule/PortalDataStore";
import { matchesSearchText, searchableText } from "../../utils/search";

const operationMenuMeta = {
  "service-checks": { section: "운영", label: "서비스 점검" },
  "notification-history": { section: "운영", label: "알림 전송 이력" },
  "notification-templates": { section: "운영", label: "알림 템플릿 관리" },
};

const OPERATION_PAGE_SIZE = PAGE_SIZE;

function getOperationMenuMeta(activeMenu) {
  return operationMenuMeta[activeMenu] ?? { section: "운영", label: "운영" };
}

const serviceCheckRowsSeed = [
  { code: "HC-SVC-MOBILE-APP", name: "대표 모바일 앱 헬스체크", target: "대표 모바일 앱", type: "HTTP GET", cron: "0 */5 * * * *", status: "중지", lastCheckedAt: "2026-07-03 18:59:36", result: "성공" },
  { code: "HC-SVC-HOMEPAGE", name: "대표 홈페이지 헬스체크", target: "대표 홈페이지", type: "HTTP GET", cron: "0 */5 * * * *", status: "중지", lastCheckedAt: "-", result: "-" },
  { code: "HC-SVC-DIRECT-SALES", name: "다이렉트 가입 헬스체크", target: "다이렉트 가입 홈페이지", type: "HTTP GET", cron: "0 */5 * * * *", status: "중지", lastCheckedAt: "2026-07-04 18:59:36", result: "성공" },
  { code: "HC-SVC-SSO", name: "SSO/EAM 헬스체크", target: "SSO/EAM 통합 인증", type: "HTTP GET", cron: "0 */3 * * * *", status: "중지", lastCheckedAt: "2026-07-03 18:59:36", result: "성공" },
  { code: "HC-SVC-OAUTH", name: "OAuth 인증 API 헬스체크", target: "OAuth 인증 API", type: "HTTP GET", cron: "0 */5 * * * *", status: "중지", lastCheckedAt: "-", result: "-" },
  { code: "HC-SVC-API-GW", name: "공통 API Gateway 헬스체크", target: "공통 API Gateway", type: "HTTP GET", cron: "0 */2 * * * *", status: "중지", lastCheckedAt: "2026-07-04 18:59:36", result: "성공" },
  { code: "HC-SVC-MCI", name: "MCI Gateway 헬스체크", target: "채널통합 MCI 게이트웨이", type: "HTTP GET", cron: "0 */5 * * * *", status: "중지", lastCheckedAt: "2026-07-03 18:59:36", result: "성공" },
];

const healthCheckTypeOptions = [
  { code: "HTTP_GET", label: "HTTP GET" },
  { code: "HTTP_POST", label: "HTTP POST" },
  { code: "PING", label: "PING" },
  { code: "TCP_CHECK", label: "TCP CHECK" },
  { code: "PROCESS", label: "PROCESS" },
];

const healthCheckHttpMethods = ["GET", "POST"];
const notificationResponsibilityOptions = [
  { code: "MAIN", label: "주담당" },
  { code: "SUB", label: "부담당" },
  { code: "ALERT", label: "알림담당" },
];

function normalizeServiceCheckRow(row, index = 0) {
  const targetType = String(row?.targetTypeCode ?? row?.targetType ?? "SERVICE").toUpperCase();
  const target =
    targetType === "SERVER"
      ? String(row?.serverName ?? row?.hostName ?? row?.target ?? "")
      : String(row?.serviceName ?? row?.serviceCode ?? row?.target ?? "");
  const checkTypeCode = optionCode(healthCheckTypeOptions, row?.checkTypeCode ?? row?.type, "HTTP_GET");
  const lastSuccess = row?.lastSuccessYn ?? row?.successYn ?? row?.result;
  const result =
    lastSuccess === "Y" || lastSuccess === true || lastSuccess === "성공"
      ? "성공"
      : lastSuccess === "N" || lastSuccess === false || lastSuccess === "실패"
        ? "실패"
        : "-";

  return {
    jobId: Number(row?.jobId ?? row?.healthCheckJobId) || undefined,
    code: String(row?.jobCode ?? row?.code ?? ""),
    name: String(row?.jobName ?? row?.name ?? ""),
    target,
    targetType,
    serviceId: Number(row?.serviceId) || undefined,
    serverId: Number(row?.serverId) || undefined,
    type: optionLabel(healthCheckTypeOptions, checkTypeCode, "HTTP GET"),
    checkTypeCode,
    cron: String(row?.cronExpression ?? row?.cron ?? "0 */5 * * * *"),
    status: String(row?.jobStatusName ?? row?.status ?? (row?.jobStatusCode === "RUNNING" ? "실행" : "중지")),
    statusCode: String(row?.jobStatusCode ?? row?.statusCode ?? "STOPPED"),
    activeYn: String(row?.enabledYn ?? row?.activeYn ?? "Y").toUpperCase() === "N" ? "N" : "Y",
    runYn: String(row?.jobStatusCode ?? row?.runYn ?? "").toUpperCase() === "RUNNING" ? "Y" : "N",
    httpMethod: String(row?.httpMethod ?? "GET").toUpperCase(),
    url: String(row?.checkUrl ?? row?.url ?? ""),
    expectedStatusCode: row?.expectedStatusCode ?? "",
    successMatchText: String(row?.successMatchText ?? row?.responseContains ?? ""),
    queryParamsJson: row?.queryParamsJson ?? row?.paramsJson ?? "",
    headersJson: row?.headersJson ?? "",
    bodyJson: row?.bodyJson ?? "",
    timeoutMs: Number(row?.timeoutMs ?? row?.timeoutMillis) || 5000,
    failureThreshold: Number(row?.failureThreshold) || 1,
    notifyOnFailureYn: String(row?.notifyOnFailureYn ?? "Y").toUpperCase() === "N" ? "N" : "Y",
    notificationOwner: String(row?.notificationOwner ?? row?.notifyResponsibilityCodes ?? row?.notifyTarget ?? ""),
    lastCheckedAt: formatOperationDate(row?.lastCheckedAt) || row?.lastCheckedAt || "-",
    result,
    rowKey: String(row?.jobId ?? row?.jobCode ?? row?.code ?? index),
    raw: row,
  };
}

function parseKeyValueJson(value) {
  if (!value) return [{ key: "", value: "" }];
  if (Array.isArray(value)) {
    const rows = value.map((item) => ({ key: String(item?.key ?? ""), value: String(item?.value ?? "") }));
    return rows.length ? rows : [{ key: "", value: "" }];
  }
  if (typeof value === "object") {
    const rows = Object.entries(value).map(([key, itemValue]) => ({ key, value: String(itemValue ?? "") }));
    return rows.length ? rows : [{ key: "", value: "" }];
  }
  try {
    const parsed = JSON.parse(String(value));
    return parseKeyValueJson(parsed);
  } catch {
    return [{ key: "", value: "" }];
  }
}

function serializeKeyValueRows(rows) {
  const entries = rows
    .map((row) => [String(row.key ?? "").trim(), String(row.value ?? "").trim()])
    .filter(([key]) => key);
  if (!entries.length) return null;
  return JSON.stringify(Object.fromEntries(entries));
}

function normalizeHealthCheckResult(row, index = 0) {
  const success = row?.successYn ?? row?.success ?? row?.result;
  const result =
    success === "Y" || success === true || success === "성공"
      ? "성공"
      : success === "N" || success === false || success === "실패"
        ? "실패"
        : "-";
  return [
    formatOperationDate(row?.checkedAt ?? row?.executedAt ?? row?.createdAt) || "-",
    result,
    row?.latencyMs != null ? `${row.latencyMs}ms` : row?.latency != null ? `${row.latency}ms` : "-",
    row?.httpStatusCode ?? row?.httpStatus ?? "-",
    row?.failureReason ?? row?.errorMessage ?? "-",
    row?.responseSummary ?? row?.responseBody ?? "-",
    row?.notificationSentYn === "Y" ? "발송완료" : row?.notificationSentYn === "N" ? "미발송" : "건너뜀",
    row?.remarks ?? row?.memo ?? "-",
    String(row?.resultId ?? row?.healthCheckResultId ?? index),
  ];
}

function formatOperationDate(value) {
  if (!value) return "";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)) {
    return text.slice(0, 19);
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text;
  }
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const notificationTemplateRows = [
  { code: "INCIDENT_CRITICAL_V1", name: "인시던트 긴급 알림톡", channel: "알림톡", purpose: "인시던트", provider: "더미(개발)", variables: "3 / 4 (필수/전체)", active: "Y", title: "[장애] {{serviceName}} 긴급 장애 발생" },
  { code: "SERVICE_DOWN_V1", name: "서비스 장애 알림톡", channel: "알림톡", purpose: "서비스 장애", provider: "더미(개발)", variables: "2 / 2 (필수/전체)", active: "Y", title: "[오류] {{serviceName}} 장애 알림" },
  { code: "SERVICE_DOWN_SMS_V1", name: "서비스 장애 SMS", channel: "SMS", purpose: "서비스 장애", provider: "더미(개발)", variables: "2 / 2 (필수/전체)", active: "Y", title: "[장애] {{serviceName}}" },
];

const templateChannelOptions = [
  { code: "ALIMTALK", label: "알림톡" },
  { code: "SMS", label: "SMS" },
  { code: "EMAIL", label: "이메일" },
];
const templatePurposeOptions = [
  { code: "INCIDENT", label: "인시던트" },
  { code: "SERVICE_DOWN", label: "서비스 장애" },
];
const templateProviderOptions = [
  { code: "DUMMY", label: "더미(개발)" },
  { code: "PRODUCTION", label: "운영 Provider" },
];

function optionCode(options, value, fallback = "") {
  const text = String(value ?? "").trim();
  return options.find((option) => option.code === text || option.label === text)?.code ?? fallback;
}

function optionLabel(options, value, fallback = "-") {
  const text = String(value ?? "").trim();
  return options.find((option) => option.code === text || option.label === text)?.label ?? (text || fallback);
}

function normalizeTemplateRow(row, index = 0) {
  const variableRows = Array.isArray(row?.variables)
    ? row.variables
    : Array.isArray(row?.templateVariables)
      ? row.templateVariables
      : Array.isArray(row?.variableDefinitions)
        ? row.variableDefinitions
        : [];
  const requiredCount = variableRows.filter((variable) =>
    Boolean(variable?.required ?? variable?.requiredYn === "Y")
  ).length;
  const variableCountText =
    typeof row?.variables === "string"
      ? row.variables
      : `${requiredCount || variableRows.length} / ${variableRows.length} (필수/전체)`;

  return {
    templateId: Number(row?.templateId ?? row?.notificationTemplateId) || undefined,
    code: String(row?.templateCode ?? row?.code ?? ""),
    name: String(row?.templateName ?? row?.name ?? ""),
    channel: optionCode(templateChannelOptions, row?.channelCode ?? row?.channel),
    purpose: optionCode(templatePurposeOptions, row?.purposeCode ?? row?.purpose ?? row?.templatePurposeCode),
    provider: optionCode(templateProviderOptions, row?.providerCode ?? row?.provider ?? row?.providerName, "DUMMY"),
    variables: variableCountText,
    variableRows,
    active: String(row?.activeYn ?? row?.useYn ?? row?.active ?? "Y").toUpperCase() === "N" ? "N" : "Y",
    title: String(row?.titleTemplate ?? row?.titlePattern ?? row?.messageTitle ?? row?.title ?? ""),
    body: String(row?.bodyTemplate ?? row?.bodyPattern ?? row?.messageBody ?? row?.body ?? ""),
    description: String(row?.description ?? row?.remarks ?? ""),
    createdAt: row?.createdAt ?? row?.createdDate ?? row?.regDt ?? "",
    rowKey: String(row?.templateId ?? row?.notificationTemplateId ?? row?.templateCode ?? row?.code ?? index),
  };
}

function buildTemplatePayload(form, variables, bodyPattern, titlePattern) {
  const normalizedVariables = variables
    .filter((variable) => String(variable.key ?? "").trim() || String(variable.label ?? "").trim())
    .map((variable, index) => ({
      variableKey: String(variable.key).trim(),
      key: String(variable.key).trim(),
      variableLabel: String(variable.label ?? "").trim(),
      variableName: String(variable.label ?? "").trim(),
      label: String(variable.label ?? "").trim(),
      requiredYn: variable.required ? "Y" : "N",
      required: Boolean(variable.required),
      exampleValue: String(variable.example ?? "").trim(),
      example: String(variable.example ?? "").trim(),
      sortOrder: index + 1,
    }));

  return {
    templateCode: form.code.trim().toUpperCase(),
    templateName: form.name.trim(),
    channelCode: form.channel,
    purposeCode: form.purpose,
    templatePurposeCode: form.purpose,
    usageTypeCode: form.purpose,
    providerCode: form.provider,
    activeYn: form.active,
    useYn: form.active,
    titleTemplate: titlePattern.trim(),
    titlePattern: titlePattern.trim(),
    messageTitle: titlePattern.trim(),
    bodyTemplate: bodyPattern.trim(),
    bodyPattern: bodyPattern.trim(),
    messageBody: bodyPattern.trim(),
    description: form.description.trim(),
    variables: normalizedVariables,
    variableDefinitions: normalizedVariables,
  };
}

function collectMissingTemplateFields(payload) {
  const baseFields = [
    ["templateCode", "템플릿 코드"],
    ["templateName", "템플릿명"],
    ["channelCode", "채널"],
    ["usageTypeCode", "용도"],
    ["providerCode", "Provider"],
    ["bodyTemplate", "본문 패턴"],
  ]
    .filter(([key]) => !String(payload[key] ?? "").trim())
    .map(([, label]) => label);
  const variableFields = (payload.variables ?? [])
    .map((variable, index) => {
      if (!String(variable.variableKey ?? "").trim()) {
        return `${index + 1}번째 변수의 변수명`;
      }
      if (!String(variable.variableLabel ?? "").trim()) {
        return `${index + 1}번째 변수의 표시 이름`;
      }
      return "";
    })
    .filter(Boolean);

  return [...baseFields, ...variableFields];
}

function collectInvalidTemplateFields(payload) {
  return (payload.variables ?? [])
    .map((variable, index) => {
      const key = String(variable.variableKey ?? "").trim();
      if (key && !/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) {
        return `${index + 1}번째 변수명은 영문으로 시작하고 영문/숫자/_만 사용할 수 있습니다.`;
      }
      return "";
    })
    .filter(Boolean);
}

function formatTemplateSaveError(error, payload) {
  const lines = ["알림 템플릿을 저장할 수 없습니다."];
  const fieldsToCheck = [
    ...collectMissingTemplateFields(payload),
    ...collectInvalidTemplateFields(payload),
  ];
  if (fieldsToCheck.length) {
    lines.push(`확인할 항목:\n${fieldsToCheck.map((field) => `- ${field}`).join("\n")}`);
  }

  const bodyText = error?.body;
  if (bodyText) {
    try {
      const parsed = JSON.parse(bodyText);
      const detailRows = [
        parsed.message,
        parsed.error,
        parsed.detail,
        ...(Array.isArray(parsed.errors)
          ? parsed.errors.map((item) =>
              typeof item === "string"
                ? item
                : `${item.field ?? item.name ?? item.code ?? "field"}: ${item.message ?? item.defaultMessage ?? item.reason ?? JSON.stringify(item)}`
            )
          : []),
        ...(Array.isArray(parsed.fieldErrors)
          ? parsed.fieldErrors.map((item) =>
              `${item.field ?? item.name ?? "field"}: ${item.message ?? item.defaultMessage ?? item.reason ?? JSON.stringify(item)}`
            )
          : []),
        ...(Array.isArray(parsed.violations)
          ? parsed.violations.map((item) =>
              `${item.field ?? item.propertyPath ?? "field"}: ${item.message ?? JSON.stringify(item)}`
            )
          : []),
      ].filter(Boolean);
      if (detailRows.length) {
        const friendlyDetails = Array.from(new Set(detailRows))
          .map(toFriendlyTemplateValidationMessage)
          .filter(Boolean);
        if (friendlyDetails.length) {
          lines.push(`서버 확인 결과:\n${friendlyDetails.map((detail) => `- ${detail}`).join("\n")}`);
        }
      }
    } catch {
      lines.push(`서버에서 요청값을 확인해달라고 응답했습니다.`);
    }
  }

  return Array.from(new Set(lines)).join("\n\n");
}

function toFriendlyTemplateValidationMessage(message) {
  const text = String(message ?? "");
  if (!text || text === "요청 값이 올바르지 않습니다.") {
    return "";
  }
  const fieldLabelMap = [
    [/variables\[(\d+)\]\.variableLabel/, (_, index) => `${Number(index) + 1}번째 변수의 표시 이름을 입력해주세요.`],
    [/variables\[(\d+)\]\.variableKey/, (_, index) => `${Number(index) + 1}번째 변수의 변수명을 입력해주세요.`],
    [/usageTypeCode/, () => "용도를 선택해주세요."],
    [/channelCode/, () => "채널을 선택해주세요."],
    [/templateCode/, () => "템플릿 코드를 입력해주세요."],
    [/templateName/, () => "템플릿명을 입력해주세요."],
    [/bodyTemplate|bodyPattern|messageBody/, () => "본문 패턴을 입력해주세요."],
    [/titleTemplate|titlePattern|messageTitle/, () => "제목 패턴을 입력해주세요."],
  ];
  for (const [pattern, formatter] of fieldLabelMap) {
    const match = text.match(pattern);
    if (match) {
      return formatter(...match);
    }
  }
  return text
    .replace(/공백일 수 없습니다/g, "입력해주세요")
    .replace(/must not be blank/gi, "입력해주세요")
    .replace(/요청 값이 올바르지 않습니다\./g, "")
    .trim();
}

function firstTextValue(...values) {
  const matched = values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
  return matched === undefined ? "" : String(matched);
}

function notificationChannelLabel(value) {
  const text = String(value ?? "").trim().toUpperCase();
  if (text === "EMAIL") return "이메일";
  if (text === "ALIMTALK" || text === "KAKAO" || text === "KAKAOTALK") return "알림톡";
  return firstTextValue(value, "-");
}

function notificationStatusLabel(value) {
  const text = String(value ?? "").trim().toUpperCase();
  if (["SUCCESS", "SENT", "DONE", "Y"].includes(text)) return "성공";
  if (["FAILED", "FAIL", "ERROR", "N"].includes(text)) return "실패";
  if (["WAITING", "PENDING", "READY"].includes(text)) return "대기";
  return firstTextValue(value, "-");
}

function notificationTargetTypeLabel(value) {
  const text = String(value ?? "").trim().toUpperCase();
  if (text === "USER") return "사용자";
  if (text === "GROUP") return "그룹";
  return firstTextValue(value, "-");
}

function normalizeNotificationHistoryRow(row, index = 0, incidents = []) {
  const incidentId = Number(row?.incidentId) || undefined;
  const incident = incidents.find((item) => Number(item.incidentId) === incidentId);
  const templateCode = firstTextValue(
    row?.templateCode,
    row?.notificationTemplateCode,
    row?.template?.templateCode,
    row?.template?.code
  );

  return {
    incidentCode: firstTextValue(row?.incidentCode, row?.externalIncidentCode, incident?.externalIncidentCode),
    incidentId,
    incidentTitle: firstTextValue(row?.incidentTitle, row?.incidentName, row?.incident?.title, incident?.title, "-"),
    progress: firstTextValue(row?.progress, row?.incidentStatusName, incident?.incidentStatusCode, "-"),
    severity: firstTextValue(row?.severityName, row?.severityCode, incident?.severityCode, "-"),
    channel: notificationChannelLabel(row?.channelName ?? row?.channelCode ?? row?.notificationTypeCode ?? row?.channel),
    sendStatus: notificationStatusLabel(row?.sendStatusName ?? row?.sendStatusCode ?? row?.statusCode ?? row?.status),
    targetType: notificationTargetTypeLabel(row?.targetTypeName ?? row?.targetTypeCode ?? row?.recipientTypeCode ?? row?.targetType),
    recipient: firstTextValue(row?.recipientName, row?.receiverName, row?.targetName, row?.recipient, row?.receiver, "-"),
    contact: firstTextValue(row?.contact, row?.contactValue, row?.recipientContact, row?.phoneNumber, row?.email, "-"),
    title: firstTextValue(row?.notificationTitle, row?.messageTitle, row?.title, row?.subject, "-"),
    template: templateCode || "-",
    sentAt: formatOperationDate(row?.sentAt ?? row?.sendAt ?? row?.createdAt ?? row?.registeredAt) || "-",
    rowKey: firstTextValue(row?.historyId, row?.notificationHistoryId, row?.notificationId, `${index}`),
  };
}

function OperationPageShell({ activeMenu, action, children, description, icon, title }) {
  const meta = getOperationMenuMeta(activeMenu);
  return (
    <AppShell activeMenu={activeMenu}>
      <main className="main operation-page">
        <div className="page-header-stack operation-page__header">
          <div className="crumb crumb--standardized">
            <span>{meta.section}</span><span className="sep">/</span><span>{meta.label}</span>
          </div>
          <div className="page-head page-head--standardized">
            <div>
              <h1 className="page-head__title"><span className="page-head__icon" aria-hidden="true">{icon}</span><span>{title}</span></h1>
              <p className="page-head__desc">{description}</p>
            </div>
            {action ? <div className="page-head__right">{action}</div> : null}
          </div>
        </div>
        {children}
      </main>
    </AppShell>
  );
}

function OperationPager({ page, pageSize, setPage, total }) {
  return <Pagination page={page} pageSize={pageSize} setPage={setPage} total={total} />;
}

function OperationFormRow({ children, label, required = false }) {
  return <label className="form-row"><span>{label}{required ? <span className="req">*</span> : null}</span>{children}</label>;
}

function OperationIconButton({ children, danger = false, label, onClick, primary = false }) {
  return (
    <button
      aria-label={label}
      className={`ibtn operation-icon-btn${primary ? " is-primary" : ""}${danger ? " ibtn--danger" : ""}`}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function labelServiceTarget(service) {
  return service ? `${service.serviceName} (${service.serviceCode})` : "";
}

function labelServerTarget(server) {
  const host = server?.hostName ? ` · ${server.hostName}` : "";
  return server ? `${server.serverName}${host}` : "";
}

function serviceTargetMeta(service, servers) {
  if (!service) {
    return "";
  }
  const linkedServers = servers.filter((server) =>
    Number(server.serverId) === Number(service.serverId) ||
    (Array.isArray(server.serviceIds) && server.serviceIds.map(Number).includes(Number(service.serviceId))) ||
    (Array.isArray(server.serviceCodes) && server.serviceCodes.includes(service.serviceCode))
  );
  const hosts = linkedServers
    .map((server) => server.hostName || server.serverName)
    .filter(Boolean)
    .slice(0, 5);
  const category = Array.isArray(service.categoryPath) ? service.categoryPath.filter(Boolean).join("/") : "";
  return [
    hosts.length ? `배포 호스트: ${hosts.join(", ")}` : "",
    category ? `분류: ${category}` : "",
    service.endpointUrl ? `엔드포인트: ${service.endpointUrl}` : "",
  ].filter(Boolean).join(" · ");
}

function serverTargetMeta(server) {
  if (!server) {
    return "";
  }
  return [
    server.hostName ? `호스트: ${server.hostName}` : "",
    server.ipAddress ? `IP: ${server.ipAddress}` : "",
    server.serverRoleName || server.serverRoleCode ? `역할: ${server.serverRoleName || server.serverRoleCode}` : "",
    server.envCode ? `환경: ${server.envCode}` : "",
  ].filter(Boolean).join(" · ");
}

export function ServiceCheckPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [rowsState, setRowsState] = useState(() => serviceCheckRowsSeed.map(normalizeServiceCheckRow));
  const [targetFilter, setTargetFilter] = useState("all");
  const [runFilter, setRunFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const pageSize = OPERATION_PAGE_SIZE;
  const loadRows = async () => {
    setLoading(true);
    try {
      const nextRows = await chainViewApi.healthCheckJobs.list();
      setRowsState((nextRows || []).map(normalizeServiceCheckRow));
      setMessage("");
    } catch (error) {
      console.warn("서비스 점검 목록 조회 실패", error);
      setMessage("");
      setRowsState([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadRows();
  }, []);

  const rows = rowsState.filter((row) =>
    matchesSearchText(searchableText(row.code, row.name, row.target, row.url), search) &&
    (targetFilter === "all" || row.targetType === targetFilter) &&
    (runFilter === "all" || row.runYn === runFilter) &&
    (activeFilter === "all" || row.activeYn === activeFilter)
  );
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const saveRow = async (payload, row) => {
    if (row?.jobId) {
      await chainViewApi.healthCheckJobs.update(row.jobId, payload);
    } else {
      await chainViewApi.healthCheckJobs.create(payload);
    }
    await loadRows();
    setModal(null);
  };
  const openEditRow = async (row) => {
    if (!row?.jobId) {
      setModal({ type: "form", row });
      return;
    }
    setLoading(true);
    try {
      const detail = await chainViewApi.healthCheckJobs.detail(row.jobId);
      setModal({ type: "form", row: normalizeServiceCheckRow({ ...row.raw, ...detail }) });
      setMessage("");
    } catch (error) {
      console.warn("점검 상세 조회 실패", error);
      setModal({ type: "form", row });
      setMessage("");
    } finally {
      setLoading(false);
    }
  };
  const deleteRow = async (row) => {
    if (!row?.jobId) return;
    if (!window.confirm(`${row.name} 점검을 삭제할까요?`)) return;
    await chainViewApi.healthCheckJobs.delete(row.jobId);
    await loadRows();
  };
  const startRow = async (row) => {
    if (!row?.jobId) return;
    await chainViewApi.healthCheckJobs.start(row.jobId);
    await loadRows();
  };

  return (
    <OperationPageShell
      activeMenu="service-checks"
      description="서비스 HTTP·서버·호스트 통신 점검 항목을 등록·관리합니다."
      icon="🧪"
      title="서비스 점검"
      action={<button className="btn btn--primary op-btn-dark" onClick={() => setModal({ type: "form" })} type="button"><Plus size={14} /> 점검 등록</button>}
    >
      <div className="toolbar operation-toolbar">
        <label className="search"><Search size={15} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="코드, 이름, 서비스/서버 검색..." type="text" /></label>
        <select value={targetFilter} onChange={(event) => { setTargetFilter(event.target.value); setPage(1); }} aria-label="대상"><option value="all">대상 전체</option><option value="SERVICE">서비스</option><option value="SERVER">서버</option></select>
        <select value={runFilter} onChange={(event) => { setRunFilter(event.target.value); setPage(1); }} aria-label="실행"><option value="all">실행 전체</option><option value="Y">실행</option><option value="N">중지</option></select>
        <select value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1); }} aria-label="활성"><option value="all">활성 전체</option><option value="Y">Y</option><option value="N">N</option></select>
        <button className="btn" onClick={() => { setSearch(""); setTargetFilter("all"); setRunFilter("all"); setActiveFilter("all"); setPage(1); }} type="button"><RotateCcw size={14} /> 초기화</button>
      </div>
      <div className="card operation-card">
        {loading ? <div className="op-loading-line">서비스 점검 목록을 불러오는 중...</div> : null}
        <table className="tbl operation-table operation-table--checks">
          <thead><tr><th>점검명</th><th>코드</th><th>대상</th><th>실행 방식</th><th>상태</th><th>최근 점검일</th><th className="col-actions">관리</th></tr></thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.rowKey}>
                <td title={row.name}><b>{row.name}</b></td>
                <td><code>{row.code}</code></td>
                <td title={row.target}>{row.target}</td>
                <td title={`${row.type} · ${row.cron}`}><span className="operation-inline-cell"><b>{row.type}</b><code>{row.cron}</code></span></td>
                <td><span className="pill pill--idle">{row.status}</span></td>
                <td title={row.lastCheckedAt}>{row.lastCheckedAt}</td>
                <td>
                  <div className="row-actions op-row-actions">
                    <OperationIconButton label="점검 시작" onClick={() => startRow(row)} primary><Play size={16} /></OperationIconButton>
                    <OperationIconButton label="점검 이력" onClick={() => setModal({ type: "history", row })}><History size={16} /></OperationIconButton>
                    <OperationIconButton label="점검 수정" onClick={() => openEditRow(row)}><Pencil size={16} /></OperationIconButton>
                    <OperationIconButton danger label="점검 삭제" onClick={() => deleteRow(row)}><Trash2 size={16} /></OperationIconButton>
                  </div>
                </td>
              </tr>
            ))}
            {!pagedRows.length ? <tr><td colSpan={7}>조회 가능한 데이터가 없습니다.</td></tr> : null}
          </tbody>
        </table>
        <OperationPager page={page} pageSize={pageSize} setPage={setPage} total={rows.length} />
      </div>
      {modal?.type === "form" ? <ServiceCheckModal row={modal.row} onClose={() => setModal(null)} onSave={saveRow} /> : null}
      {modal?.type === "history" ? <ServiceCheckHistoryModal row={modal.row} onClose={() => setModal(null)} /> : null}
    </OperationPageShell>
  );
}

function ServiceCheckModal({ onClose, onSave, row }) {
  const portalData = usePortalData();
  const sortedServices = useMemo(
    () => [...portalData.services].sort((left, right) =>
      String(left.serviceName || "").localeCompare(String(right.serviceName || ""), "ko")
    ),
    [portalData.services]
  );
  const sortedServers = useMemo(
    () => [...portalData.servers].sort((left, right) =>
      String(left.serverName || left.hostName || "").localeCompare(String(right.serverName || right.hostName || ""), "ko")
    ),
    [portalData.servers]
  );
  const matchedService = sortedServices.find((service) =>
    row?.target === service.serviceName || row?.target === service.serviceCode
  );
  const matchedServer = sortedServers.find((server) =>
    row?.target === server.serverName || row?.target === server.hostName
  );
  const [form, setForm] = useState(() => ({
    code: row?.code ?? "",
    name: row?.name ?? "",
    targetType: row?.targetType ?? (matchedServer ? "SERVER" : "SERVICE"),
    targetId: row?.targetType === "SERVER"
      ? String(row?.serverId ?? matchedServer?.serverId ?? "")
      : String(row?.serviceId ?? matchedService?.serviceId ?? ""),
    checkTypeCode: row?.targetType === "SERVER" ? "PING" : row?.checkTypeCode ?? optionCode(healthCheckTypeOptions, row?.type, "HTTP_GET"),
    httpMethod: row?.checkTypeCode === "HTTP_POST" || String(row?.httpMethod ?? "").toUpperCase() === "POST" ? "POST" : "GET",
    url: row?.url ?? "",
    expectedStatusCode: row?.expectedStatusCode ?? "",
    successMatchText: row?.successMatchText ?? "",
    queryParams: parseKeyValueJson(row?.queryParamsJson),
    headers: parseKeyValueJson(row?.headersJson),
    bodyJson: row?.bodyJson ? String(row.bodyJson) : "",
    timeoutMs: row?.timeoutMs ?? 5000,
    cron: row?.cron ?? "0 */5 * * * *",
    failureThreshold: row?.failureThreshold ?? 1,
    notificationOwner: row?.notificationOwner ?? "MAIN,SUB,ALERT",
    activeYn: row?.activeYn ?? "Y",
    runYn: row?.runYn ?? "N",
    notifyOnFailureYn: row?.notifyOnFailureYn ?? "Y",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [requestTab, setRequestTab] = useState("params");
  const targetType = form.targetType;
  const targetId = form.targetId;
  const targetOptions = targetType === "SERVER" ? sortedServers : sortedServices;
  const selectedTarget =
    targetType === "SERVER"
      ? sortedServers.find((server) => String(server.serverId) === targetId)
      : sortedServices.find((service) => String(service.serviceId) === targetId);
  const selectedServerAddress = targetType === "SERVER"
    ? String(selectedTarget?.ipAddress ?? "")
    : "";
  const selectedTargetMeta =
    targetType === "SERVER"
      ? serverTargetMeta(selectedTarget)
      : serviceTargetMeta(selectedTarget, sortedServers);
  const switchTargetType = (nextType) => {
    setForm((current) => ({
      ...current,
      targetType: nextType,
      targetId: "",
      checkTypeCode: nextType === "SERVER" ? "PING" : "HTTP_GET",
      url: nextType === "SERVER" ? "" : current.url,
    }));
  };
  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const toggleNotificationOwner = (code, checked) => {
    setForm((current) => {
      const selected = new Set(String(current.notificationOwner || "").split(",").map((item) => item.trim()).filter(Boolean));
      if (checked) selected.add(code);
      else selected.delete(code);
      return { ...current, notificationOwner: Array.from(selected).join(",") };
    });
  };
  const updateKeyValueRow = (field, index, key, value) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  };
  const addKeyValueRow = (field) => {
    setForm((current) => ({ ...current, [field]: [...current[field], { key: "", value: "" }] }));
  };
  const removeKeyValueRow = (field, index) => {
    setForm((current) => {
      const nextRows = current[field].filter((_, itemIndex) => itemIndex !== index);
      return { ...current, [field]: nextRows.length ? nextRows : [{ key: "", value: "" }] };
    });
  };
  const buildPayload = () => {
    const resolvedCheckTypeCode = form.targetType === "SERVER"
      ? "PING"
      : form.httpMethod === "POST" ? "HTTP_POST" : "HTTP_GET";
    const payload = {
      jobCode: form.code.trim().toUpperCase(),
      jobName: form.name.trim(),
      targetTypeCode: form.targetType,
      checkTypeCode: resolvedCheckTypeCode,
      cronExpression: form.cron.trim(),
      enabledYn: form.activeYn,
      httpMethod: form.targetType === "SERVER" ? null : form.httpMethod,
      checkUrl: form.targetType === "SERVER" ? selectedServerAddress || null : form.url.trim() || null,
      queryParamsJson: form.targetType === "SERVER" ? null : serializeKeyValueRows(form.queryParams),
      headersJson: form.targetType === "SERVER" ? null : serializeKeyValueRows(form.headers),
      bodyJson: form.targetType === "SERVER" ? null : form.bodyJson.trim() || null,
      expectedStatusCode: form.targetType === "SERVER" ? null : form.expectedStatusCode ? Number(form.expectedStatusCode) : null,
      timeoutMs: Number(form.timeoutMs) || 5000,
      successMatchText: form.targetType === "SERVER" ? null : form.successMatchText.trim() || null,
      failureThreshold: Number(form.failureThreshold) || 1,
      notifyOnFailureYn: form.notifyOnFailureYn,
      templateCode: null,
      notifyResponsibilityCodes: form.notificationOwner.trim() || null,
      description: null,
    };
    if (form.targetType === "SERVER") {
      payload.serverId = Number(form.targetId) || null;
      payload.serviceId = null;
    } else {
      payload.serviceId = Number(form.targetId) || null;
      payload.serverId = null;
    }
    return payload;
  };
  const save = async () => {
    const payload = buildPayload();
    const missing = [
      ["jobCode", "점검 코드"],
      ["jobName", "점검명"],
      ["cronExpression", "Cron"],
    ].filter(([key]) => !String(payload[key] ?? "").trim()).map(([, label]) => label);
    if (form.targetType !== "SERVER" && !String(payload.checkUrl ?? "").trim()) missing.push("URL");
    if (!form.targetId) missing.push("점검 대상");
    if (form.targetType === "SERVER" && !String(payload.checkUrl ?? "").trim()) missing.push("서버 IP");
    if (missing.length) {
      setError(`${missing.join(", ")} 항목을 입력해 주세요.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(payload, row);
    } catch (saveError) {
      setError(saveError?.message || "서비스 점검을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal operation-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head"><h3>{row ? "점검 수정" : "점검 등록"}</h3><button className="close" onClick={onClose} type="button"><X size={18} /></button></div>
        <div className="modal__body">
          <h4 className="form-section__title">기본 정보</h4>
          <div className="operation-form-grid">
            <OperationFormRow label="점검 코드" required><input disabled={Boolean(row?.jobId)} value={form.code} onChange={(event) => updateForm("code", event.target.value.toUpperCase())} placeholder="예: SSO-HEALTH-01" type="text" /></OperationFormRow>
            <OperationFormRow label="점검명" required><input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="점검명을 입력하세요" type="text" /></OperationFormRow>
            <div className="form-row operation-target-field">
              <span>점검 대상<span className="req">*</span></span>
              <div className="operation-target-control-row">
                <div className="radio-row operation-target-radios" aria-label="점검 대상 유형">
                  <label>
                    <input checked={targetType === "SERVICE"} onChange={() => switchTargetType("SERVICE")} name="targetType" type="radio" />
                    서비스
                  </label>
                  <label>
                    <input checked={targetType === "SERVER"} onChange={() => switchTargetType("SERVER")} name="targetType" type="radio" />
                    서버
                  </label>
                </div>
                <select value={targetId} onChange={(event) => updateForm("targetId", event.target.value)}>
                  <option value="">{targetType === "SERVER" ? "서버 선택" : "서비스 선택"}</option>
                  {targetOptions.map((target) => (
                    <option key={targetType === "SERVER" ? target.serverId : target.serviceId} value={targetType === "SERVER" ? target.serverId : target.serviceId}>
                      {targetType === "SERVER" ? labelServerTarget(target) : labelServiceTarget(target)}
                    </option>
                  ))}
                </select>
              </div>
              {selectedTargetMeta ? <small className="operation-target-meta">{selectedTargetMeta}</small> : null}
            </div>
            {targetType === "SERVER" ? (
              <div className="operation-host-check-section">
                <h4 className="form-section__title">호스트 통신 확인</h4>
                <p>선택한 서버 IP로 네트워크 reachability를 확인합니다. ICMP echo 우선, OS/방화벽 정책에 따라 동작 방식이 달라질 수 있습니다.</p>
                <div className="operation-host-check-box">
                  {selectedServerAddress ? `${selectedServerAddress} 가 점검 대상으로 사용됩니다.` : "서버를 선택하면 등록 IP가 점검 대상으로 사용됩니다."}
                </div>
              </div>
            ) : (
              <div className="operation-request-section">
                <h4 className="form-section__title">HTTP 요청</h4>
                <div className="operation-request-url">
                  <select value={form.httpMethod} onChange={(event) => updateForm("httpMethod", event.target.value)} aria-label="HTTP Method">
                    {healthCheckHttpMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                  <input value={form.url} onChange={(event) => updateForm("url", event.target.value)} placeholder="https://host/path 또는 http://..." type="text" />
                </div>
                <div className="operation-request-grid">
                  <OperationFormRow label="Expected Status"><input value={form.expectedStatusCode} onChange={(event) => updateForm("expectedStatusCode", event.target.value)} placeholder="비우면 통신 OK, 4xx/5xx 아니면 성공" type="number" /></OperationFormRow>
                  <OperationFormRow label="Response Contains"><input value={form.successMatchText} onChange={(event) => updateForm("successMatchText", event.target.value)} placeholder={'비우면 본문 검사 안 함, 예: "status":"UP"'} type="text" /></OperationFormRow>
                </div>
                <small className="operation-target-meta">입력 시 해당 HTTP 상태 코드와 응답 본문 조건이 일치해야 성공으로 판단합니다.</small>
                <div className="operation-request-tabs" role="tablist" aria-label="HTTP 요청 상세">
                  {[
                    ["params", "Params"],
                    ["headers", "Headers"],
                    ["body", "Body"],
                  ].map(([key, label]) => (
                    <button key={key} className={requestTab === key ? "is-active" : ""} onClick={() => setRequestTab(key)} type="button" role="tab" aria-selected={requestTab === key}>{label}</button>
                  ))}
                </div>
                {requestTab === "body" ? (
                  <textarea className="operation-request-body" value={form.bodyJson} onChange={(event) => updateForm("bodyJson", event.target.value)} placeholder='JSON 본문을 입력하세요. 예: {"status":"UP"}' rows={5} />
                ) : (
                  <div className="operation-kv-editor">
                    <div className="operation-kv-editor__head">
                      <button className="btn" onClick={() => addKeyValueRow(requestTab === "params" ? "queryParams" : "headers")} type="button">+ 행 추가</button>
                      <span>JSON 편집</span>
                    </div>
                    {(requestTab === "params" ? form.queryParams : form.headers).map((item, index) => {
                      const field = requestTab === "params" ? "queryParams" : "headers";
                      return (
                        <div className="operation-kv-row" key={`${field}-${index}`}>
                          <input value={item.key} onChange={(event) => updateKeyValueRow(field, index, "key", event.target.value)} placeholder="key" type="text" />
                          <input value={item.value} onChange={(event) => updateKeyValueRow(field, index, "value", event.target.value)} placeholder="value" type="text" />
                          <button className="btn" onClick={() => removeKeyValueRow(field, index)} type="button">×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <OperationFormRow label="Timeout (ms)"><input value={form.timeoutMs} onChange={(event) => updateForm("timeoutMs", event.target.value)} type="number" /></OperationFormRow>
            <OperationFormRow label="Cron" required><input value={form.cron} onChange={(event) => updateForm("cron", event.target.value)} type="text" /></OperationFormRow>
            <OperationFormRow label="실패 임계값"><input value={form.failureThreshold} onChange={(event) => updateForm("failureThreshold", event.target.value)} type="number" /></OperationFormRow>
            <div className="form-row operation-checkbox-field">
              <span>알림 담당</span>
              <div className="operation-checkbox-row">
                {notificationResponsibilityOptions.map((option) => (
                  <label key={option.code}>
                    <input
                      checked={String(form.notificationOwner || "").split(",").map((item) => item.trim()).includes(option.code)}
                      onChange={(event) => toggleNotificationOwner(option.code, event.target.checked)}
                      type="checkbox"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="operation-radio-settings">
              <div className="operation-radio-setting">
                <span>활성 여부</span>
                <div className="radio-row"><label><input checked={form.activeYn === "Y"} onChange={() => updateForm("activeYn", "Y")} name="activeYn" type="radio" /> 활성</label><label><input checked={form.activeYn === "N"} onChange={() => updateForm("activeYn", "N")} name="activeYn" type="radio" /> 비활성</label></div>
              </div>
              <div className="operation-radio-setting">
                <span>실행 상태</span>
                <div className="radio-row"><label><input checked={form.runYn === "Y"} onChange={() => updateForm("runYn", "Y")} name="runYn" type="radio" /> Y</label><label><input checked={form.runYn === "N"} onChange={() => updateForm("runYn", "N")} name="runYn" type="radio" /> N</label></div>
              </div>
            </div>
          </div>
          {error ? <div className="op-inline-alert op-inline-alert--danger">{error}</div> : null}
        </div>
        <div className="modal__foot"><button className="btn" onClick={onClose} type="button">취소</button><button className="btn btn--primary op-btn-dark" disabled={saving} onClick={save} type="button">{saving ? "저장 중..." : "저장"}</button></div>
      </div>
    </ModalBackdrop>
  );
}

function ServiceCheckHistoryModal({ onClose, row }) {
  const fallbackHistory = [
    ["2026-07-03 18:59:36", "성공", "142ms", "200", "-", "{\"status\":\"UP\"}", "건너뜀", "-"],
    ["2026-07-03 17:59:36", "성공", "136ms", "200", "-", "{\"status\":\"UP\"}", "건너뜀", "-"],
    ["2026-07-03 16:59:36", "성공", "146ms", "200", "-", "{\"status\":\"UP\"}", "건너뜀", "-"],
    ["2026-07-03 15:59:36", "실패", "-", "-", "Connection timeout after 5000ms", "-", "발송완료", "-"],
    ["2026-07-03 14:59:36", "성공", "162ms", "200", "-", "{\"status\":\"UP\"}", "건너뜀", "-"],
  ];
  const [history, setHistory] = useState(fallbackHistory);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const loadHistory = async () => {
    if (!row?.jobId) return;
    setLoading(true);
    try {
      const results = await chainViewApi.healthCheckJobs.results(row.jobId);
      const normalized = (results || []).map(normalizeHealthCheckResult);
      setHistory(normalized.length ? normalized : []);
      setMessage("");
    } catch (error) {
      console.warn("점검 이력 조회 실패", error);
      setMessage("");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.jobId]);
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal modal--lg operation-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head"><h3>점검 이력 - {row?.name}</h3><button className="close" onClick={onClose} type="button"><X size={18} /></button></div>
        <div className="modal__body">
          <p className="op-modal-desc">선택한 서비스 점검의 최근 실행 결과입니다.</p>
          {loading ? <div className="op-loading-line">점검 이력을 불러오는 중...</div> : null}
          <table className="tbl operation-table operation-table--history"><thead><tr><th>시간</th><th>결과</th><th>Latency</th><th>HTTP</th><th>실패 사유</th><th>응답 요약</th><th>알림</th><th>비고</th></tr></thead><tbody>{history.length ? history.map((item) => <tr key={item.join("-")}><td>{item[0]}</td><td><span className={`pill ${item[1] === "성공" ? "pill--ok" : "pill--crit"}`}>{item[1]}</span></td><td>{item[2]}</td><td>{item[3]}</td><td>{item[4]}</td><td><code>{item[5]}</code></td><td>{item[6]}</td><td>{item[7]}</td></tr>) : <tr><td colSpan={8}>조회 가능한 데이터가 없습니다.</td></tr>}</tbody></table>
        </div>
        <div className="modal__foot"><button className="btn" onClick={loadHistory} type="button">새로고침</button><button className="btn" onClick={onClose} type="button">닫기</button></div>
      </div>
    </ModalBackdrop>
  );
}

export function NotificationHistoryPage() {
  const navigate = useNavigate();
  const portalData = usePortalData();
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const pageSize = OPERATION_PAGE_SIZE;
  const linkedIncidents = [...portalData.incidents].sort((left, right) =>
    String(right.startedAt || "").localeCompare(String(left.startedAt || ""))
  );
  const loadNotificationHistories = async () => {
    setLoading(true);
    try {
      const response = await chainViewApi.notificationHistories.list();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.content)
          ? response.content
          : Array.isArray(response?.items)
            ? response.items
            : [];
      setHistoryRows(list.map((row, index) => normalizeNotificationHistoryRow(row, index, linkedIncidents)));
    } catch (error) {
      console.warn("알림 전송 이력 조회 실패", error);
      setHistoryRows([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void loadNotificationHistories();
  }, []);
  const baseRows = historyRows;
  const recipientOptions = [...new Set(baseRows.map((row) => row.recipient).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
  const resetFilters = () => {
    setSearch("");
    setChannelFilter("all");
    setTargetTypeFilter("all");
    setRecipientFilter("all");
    setPage(1);
  };
  const rows = baseRows.filter((row) => {
    const matchesChannel = channelFilter === "all" || row.channel === channelFilter;
    const matchesTargetType = targetTypeFilter === "all" || row.targetType === targetTypeFilter;
    const matchesRecipient = recipientFilter === "all" || row.recipient === recipientFilter;
    const matchesKeyword = matchesSearchText(
      searchableText(
        row.incidentCode,
        row.incidentTitle,
        row.channel,
        row.targetType,
        row.recipient,
        row.contact,
        row.title,
        row.template,
        row.sentAt
      ),
      search
    );
    return matchesChannel && matchesTargetType && matchesRecipient && matchesKeyword;
  });
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <OperationPageShell
      activeMenu="notification-history"
      description="장애(인시던트) 발생 시 발송된 알림 전송 기록을 조회합니다."
      icon="🔔"
      title="알림 전송 이력"
      action={<button className="btn" onClick={() => navigate("/admin-incidents")} type="button"><List size={14} /> 인시던트 목록</button>}
    >
      <div className="toolbar operation-toolbar operation-toolbar--wide">
        <label className="search"><Search size={15} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="장애 제목, 알림 제목, 수신자명, 사번, 그룹명 코드 검색" type="text" /></label>
        <select value={channelFilter} onChange={(event) => { setChannelFilter(event.target.value); setPage(1); }}><option value="all">알림 유형 전체</option><option>이메일</option><option>SMS</option><option>알림톡</option></select>
        <select value={targetTypeFilter} onChange={(event) => { setTargetTypeFilter(event.target.value); setPage(1); }}><option value="all">대상 유형 전체</option><option>사용자</option><option>그룹</option></select>
        <select value={recipientFilter} onChange={(event) => { setRecipientFilter(event.target.value); setPage(1); }}><option value="all">발송 대상 전체</option>{recipientOptions.map((recipient) => <option key={recipient} value={recipient}>{recipient}</option>)}</select>
        <span className="op-date-range">2025-06-13 ~ 2025-06-20</span>
        <button className="btn" onClick={resetFilters} type="button"><RotateCcw size={14} /> 초기화</button>
        <button className="btn btn--primary op-btn-dark" type="button"><Search size={14} /> 조회</button>
      </div>
      <div className="card operation-card">
        <table className="tbl operation-table operation-table--notifications">
          <thead><tr><th>인시던트</th><th>알림 유형</th><th>대상 유형</th><th>발송 대상</th><th>연락처</th><th>알림 제목 ·템플릿</th><th>발송 시간</th></tr></thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={`${row.incidentCode}-${row.recipient}-${row.sentAt}`}>
                <td title={`${row.incidentCode} ${row.incidentTitle}`}>
                  <button className="op-text-link" onClick={() => navigate(row.incidentId ? `/dashboard?incidentId=${row.incidentId}` : "/admin-incidents")} type="button">
                    <span>{row.incidentTitle}</span>
                  </button>
                </td>
                <td><span className="op-channel-status"><span>{row.channel}</span><span className={`pill ${row.sendStatus === "성공" ? "pill--ok" : "pill--idle"}`}>{row.sendStatus}</span></span></td>
                <td>{row.targetType}</td>
                <td title={row.recipient}>{row.recipient}</td>
                <td title={row.contact}>{row.contact}</td>
                <td title={`${row.title} / ${row.template}`}><button className="op-text-link" onClick={() => setDetail(row)} type="button"><span>{row.title}</span><small>{row.template}</small></button></td>
                <td title={row.sentAt}>{row.sentAt}</td>
              </tr>
            ))}
            {loading ? <tr><td colSpan={7}><div className="inline-data-loader" role="status" aria-live="polite"><span className="portal-initial-loader__ring" aria-hidden="true" /><strong>알림 전송 이력을 불러오는 중입니다.</strong></div></td></tr> : null}
            {!loading && !pagedRows.length ? <tr><td colSpan={7}><div className="empty">조회 가능한 데이터가 없습니다.</div></td></tr> : null}
          </tbody>
        </table>
        <OperationPager loading={loading} page={page} pageSize={pageSize} setPage={setPage} total={rows.length} />
      </div>
      {detail ? <NotificationDetailModal detail={detail} onClose={() => setDetail(null)} /> : null}
    </OperationPageShell>
  );
}

function NotificationDetailModal({ detail, onClose }) {
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal operation-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head"><h3>알림 내용</h3><button className="close" onClick={onClose} type="button"><X size={18} /></button></div>
        <div className="modal__body">
          <div className="operation-detail-grid"><span>인시던트</span><b>{detail.incidentCode}</b><span>알림 유형</span><b>{detail.channel} · {detail.sendStatus}</b><span>대상 유형</span><b>{detail.targetType}</b><span>수신자</span><b>{detail.recipient}</b><span>연락처</span><b>{detail.contact}</b><span>발송 시간</span><b>{detail.sentAt}</b></div>
          <div className="operation-message-preview"><h4>{detail.title}</h4><p>{detail.incidentTitle} 관련 영향 서비스 점검이 필요합니다. 담당자는 서비스 상태와 최근 점검 이력을 확인한 뒤 조치 결과를 등록해주세요.</p><code>template: {detail.template}</code></div>
        </div>
        <div className="modal__foot"><button className="btn" onClick={onClose} type="button">닫기</button></div>
      </div>
    </ModalBackdrop>
  );
}

export function NotificationTemplatePage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const pageSize = OPERATION_PAGE_SIZE;
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const remoteRows = await chainViewApi.notificationTemplates.list();
      const list = Array.isArray(remoteRows)
        ? remoteRows
        : Array.isArray(remoteRows?.content)
          ? remoteRows.content
          : Array.isArray(remoteRows?.items)
            ? remoteRows.items
            : [];
      setTemplates(list.map(normalizeTemplateRow));
    } catch (error) {
      console.warn("알림 템플릿 목록 조회 실패", error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void loadTemplates();
  }, []);
  const rows = templates.filter((row) =>
    matchesSearchText(
      searchableText(
        row.code,
        row.name,
        row.channel,
        row.purpose,
        row.provider,
        row.variables,
        row.active,
        row.title
      ),
      search
    )
  );
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const handleSaveTemplate = async ({ form, variables, bodyPattern, titlePattern, row }) => {
    const payload = buildTemplatePayload(form, variables, bodyPattern, titlePattern);
    const localValidationErrors = [
      ...collectMissingTemplateFields(payload),
      ...collectInvalidTemplateFields(payload),
    ];
    if (localValidationErrors.length) {
      window.alert(`알림 템플릿을 저장할 수 없습니다.\n\n확인할 항목:\n${localValidationErrors.map((field) => `- ${field}`).join("\n")}`);
      return false;
    }

    try {
      if (row?.templateId) {
        await chainViewApi.notificationTemplates.update(row.templateId, payload);
      } else {
        await chainViewApi.notificationTemplates.create(payload);
      }
      await loadTemplates();
      setPage(1);
      return true;
    } catch (error) {
      console.error("알림 템플릿 저장 실패", error);
      window.alert(formatTemplateSaveError(error, payload));
      return false;
    }
  };
  const handleToggleTemplate = async (row) => {
    if (!row?.templateId) {
      window.alert("서버에 등록된 템플릿만 상태 변경할 수 있습니다.");
      return;
    }
    try {
      if (row.active === "Y") {
        await chainViewApi.notificationTemplates.deactivate(row.templateId);
      } else {
        await chainViewApi.notificationTemplates.activate(row.templateId);
      }
      await loadTemplates();
    } catch (error) {
      console.error("알림 템플릿 상태 변경 실패", error);
      window.alert(error?.message || "알림 템플릿 상태 변경에 실패했습니다.");
    }
  };

  return (
    <OperationPageShell
      activeMenu="notification-templates"
      description="알림톡·SMS·이메일 등 채널별 공통 문구 템플릿과 동적 인자를 등록·관리합니다."
      icon="📄"
      title="알림 템플릿 관리"
      action={<button className="btn btn--primary op-btn-dark" onClick={() => setModal({})} type="button"><Plus size={14} /> 템플릿 등록</button>}
    >
      <div className="toolbar operation-toolbar">
        <label className="search"><Search size={15} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="템플릿 코드, 이름, 설명 검색..." type="text" /></label>
        <button className="btn" onClick={loadTemplates} type="button"><RotateCcw size={14} /> 새로고침</button>
      </div>
      <div className="operation-summary"><b>총 {rows.length}개 템플릿</b>{loading ? <span>조회 중</span> : null}</div>
      <div className="card operation-card">
        {loading && !rows.length ? (
          <div className="inline-data-loader" role="status" aria-live="polite">
            <span className="portal-initial-loader__ring" aria-hidden="true" />
            <span>알림 템플릿을 불러오는 중입니다.</span>
          </div>
        ) : (
          <>
            <table className="tbl operation-table operation-table--templates">
              <thead><tr><th>템플릿</th><th>채널</th><th>용도</th><th>변수</th><th>상태</th><th className="col-actions">관리</th></tr></thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row.code}>
                    <td title={`${row.name} · ${row.code}`}><button className="op-text-link" onClick={() => setModal(row)} type="button"><span>{row.name}</span><small>{row.code}</small></button></td>
                    <td>{optionLabel(templateChannelOptions, row.channel)}</td>
                    <td>{optionLabel(templatePurposeOptions, row.purpose)}</td>
                    <td>{row.variables}</td>
                    <td><span className="pill pill--ok">{row.active === "Y" ? "활성" : "비활성"}</span></td>
                    <td><div className="row-actions op-row-actions"><OperationIconButton label="템플릿 수정" onClick={() => setModal(row)}><Pencil size={16} /></OperationIconButton><OperationIconButton danger label={row.active === "Y" ? "템플릿 비활성" : "템플릿 활성"} onClick={() => handleToggleTemplate(row)}><Power size={16} /></OperationIconButton></div></td>
                  </tr>
                ))}
                {!pagedRows.length ? <tr><td colSpan={6}><div className="empty">조회 가능한 데이터가 없습니다.</div></td></tr> : null}
              </tbody>
            </table>
            <OperationPager page={page} pageSize={pageSize} setPage={setPage} total={rows.length} />
          </>
        )}
      </div>
      {modal ? <TemplateModal row={modal.code ? modal : null} onClose={() => setModal(null)} onSave={handleSaveTemplate} /> : null}
    </OperationPageShell>
  );
}

function TemplateModal({ onClose, onSave, row }) {
  const [form, setForm] = useState({
    active: row?.active ?? "Y",
    channel: row?.channel ?? "",
    code: row?.code ?? "",
    description: row?.description ?? "",
    name: row?.name ?? "",
    provider: row?.provider ?? "DUMMY",
    purpose: row?.purpose ?? "",
  });
  const [titlePattern, setTitlePattern] = useState(row?.title ?? "[장애] {{serviceName}}");
  const [bodyPattern, setBodyPattern] = useState(
    row?.body || "{{serviceName}}에서 {{severityName}} 등급의 장애가 발생했습니다.\n영향 범위: {{impactSummary}}"
  );
  const [variables, setVariables] = useState(() =>
    row?.variableRows?.length
      ? row.variableRows.map((variable) => ({
          key: variable.variableKey ?? variable.key ?? "",
          label: variable.variableName ?? variable.label ?? variable.name ?? "",
          required: Boolean(variable.required ?? variable.requiredYn === "Y"),
          example: variable.exampleValue ?? variable.example ?? "",
        }))
      : [
          { key: "serviceName", label: "서비스명", required: true, example: "결제 서비스" },
          { key: "severityName", label: "심각도", required: true, example: "치명" },
          { key: "impactSummary", label: "영향 요약", required: false, example: "로그인 및 결제 지연" },
        ]
  );
  const [saving, setSaving] = useState(false);
  const recommendedVariables = [
    ["hostName", "호스트명"],
    ["incidentTitle", "인시던트 제목"],
    ["mgmtDept", "관리 부서"],
    ["serverName", "서버명"],
    ["serviceCode", "서비스 코드"],
  ];
  const updateVariable = (index, field, value) => {
    setVariables((current) =>
      current.map((variable, variableIndex) =>
        variableIndex === index ? { ...variable, [field]: value } : variable
      )
    );
  };
  const addVariable = (key = "", label = "") => {
    if (key && variables.some((variable) => variable.key === key)) {
      setBodyPattern((current) => `${current}${current ? " " : ""}{{${key}}}`);
      return;
    }
    setVariables((current) => [
      ...current,
      { key, label, required: false, example: "" },
    ]);
    if (key) {
      setBodyPattern((current) => `${current}${current ? " " : ""}{{${key}}}`);
    }
  };
  const renderPreview = (pattern) =>
    variables.reduce(
      (result, variable) =>
        variable.key
          ? result.replaceAll(`{{${variable.key}}}`, variable.example || `[${variable.label || variable.key}]`)
          : result,
      pattern
    );
  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };
  const handleSubmit = async () => {
    setSaving(true);
    try {
      const saved = await onSave({ bodyPattern, form, row, titlePattern, variables });
      if (saved) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal modal--lg operation-modal operation-modal--template" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head"><h3>{row ? "알림 템플릿 수정" : "알림 템플릿 등록"}</h3><button className="close" onClick={onClose} type="button"><X size={18} /></button></div>
        <div className="modal__body operation-template-body">
          <section>
            <h4 className="form-section__title">기본 정보</h4>
            <div className="operation-form-grid">
              <OperationFormRow label="템플릿 코드" required><input disabled={Boolean(row)} value={form.code} onChange={(event) => updateForm("code", event.target.value.toUpperCase())} placeholder="영문, 숫자, _ 입력" type="text" /></OperationFormRow>
              <OperationFormRow label="템플릿명" required><input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="템플릿명을 입력하세요" type="text" /></OperationFormRow>
              <OperationFormRow label="Provider" required><select value={form.provider} onChange={(event) => updateForm("provider", event.target.value)}>{templateProviderOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></OperationFormRow>
              <OperationFormRow label="채널" required><select value={form.channel} onChange={(event) => updateForm("channel", event.target.value)}><option value="">선택하세요</option>{templateChannelOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></OperationFormRow>
              <OperationFormRow label="용도" required><select value={form.purpose} onChange={(event) => updateForm("purpose", event.target.value)}><option value="">선택하세요</option>{templatePurposeOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></OperationFormRow>
              <OperationFormRow label="활성" required><select value={form.active} onChange={(event) => updateForm("active", event.target.value)}><option>Y</option><option>N</option></select></OperationFormRow>
            </div>
            <div className="operation-pattern-guide">
              제목과 본문에 <code>{"{{변수명}}"}</code>을 입력하면 발송 시 실제 값으로 치환됩니다.
            </div>
            <OperationFormRow label="제목 패턴"><input value={titlePattern} onChange={(event) => setTitlePattern(event.target.value)} type="text" /></OperationFormRow>
            <OperationFormRow label="본문 패턴" required><textarea value={bodyPattern} onChange={(event) => setBodyPattern(event.target.value)} placeholder="예: {{serviceName}} 장애가 발생했습니다." rows={6} /></OperationFormRow>
            <OperationFormRow label="설명"><textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="검색·관리를 위한 설명을 입력하세요. (선택)" rows={4} /></OperationFormRow>
          </section>
          <section className="operation-variable-panel">
            <div className="operation-variable-head"><div><h4>템플릿 변수</h4><p>변수명과 미리보기용 예시값을 등록하세요.</p></div><button className="btn btn--sm" onClick={() => addVariable()} type="button"><Plus size={14} /> 직접 추가</button></div>
            <div className="operation-variable-suggestions">
              <span>본문에 빠른 삽입</span>
              {recommendedVariables.map(([key, label]) => (
                <button key={key} onClick={() => addVariable(key, label)} title={`${label} 변수를 본문 끝에 삽입`} type="button">+ {key}</button>
              ))}
            </div>
            <div className="operation-variable-labels"><span>변수명</span><span>표시 이름</span><span>필수</span><span>예시값</span><span /></div>
            <div className="operation-variable-list">
              {variables.map((variable, index) => (
                <div className="operation-variable-row" key={`${variable.key}-${index}`}>
                  <input aria-label="변수명" value={variable.key} onChange={(event) => updateVariable(index, "key", event.target.value)} placeholder="serviceName" />
                  <input aria-label="표시 이름" value={variable.label} onChange={(event) => updateVariable(index, "label", event.target.value)} placeholder="서비스명" />
                  <label><input checked={variable.required} onChange={(event) => updateVariable(index, "required", event.target.checked)} type="checkbox" /> 필수</label>
                  <input aria-label="예시값" value={variable.example} onChange={(event) => updateVariable(index, "example", event.target.value)} placeholder="결제 서비스" />
                  <button aria-label={`${variable.key || "변수"} 삭제`} className="ibtn" onClick={() => setVariables((current) => current.filter((_, variableIndex) => variableIndex !== index))} title="변수 삭제" type="button"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            <div className="operation-template-preview">
              <div><h4>발송 미리보기</h4><span>예시값 기준</span></div>
              <strong>{renderPreview(titlePattern)}</strong>
              <p>{renderPreview(bodyPattern)}</p>
            </div>
          </section>
        </div>
        <div className="modal__foot"><button className="btn" onClick={onClose} type="button">취소</button><button className="btn btn--primary op-btn-dark" disabled={saving} onClick={handleSubmit} type="button">{saving ? "저장 중" : row ? "저장" : "등록"}</button></div>
      </div>
    </ModalBackdrop>
  );
}
