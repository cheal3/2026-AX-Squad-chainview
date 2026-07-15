const REMOTE_ORIGIN = "https://chainview.kro.kr";
const DEFAULT_EMPLOYEE_NO = "8913812";
const DEFAULT_DEV_LOGIN_PATH = "/admin/dashboard";

export const chainViewRemoteOrigin =
  import.meta.env.VITE_CHAINVIEW_REMOTE_ORIGIN ?? REMOTE_ORIGIN;

export const chainViewApiBaseUrl =
  import.meta.env.VITE_CHAINVIEW_API_BASE_URL ||
  (import.meta.env.DEV ? "/chainview-api" : chainViewRemoteOrigin);

const chainViewEmployeeNo =
  import.meta.env.VITE_CHAINVIEW_EMPLOYEE_NO ?? DEFAULT_EMPLOYEE_NO;
const chainViewPassword =
  import.meta.env.VITE_CHAINVIEW_PASSWORD ?? "";
const chainViewDevLoginPath =
  import.meta.env.VITE_CHAINVIEW_DEV_LOGIN_PATH ?? DEFAULT_DEV_LOGIN_PATH;

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean | null | undefined>;
type QueryParams = Record<string, QueryValue>;
type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string | null;
  timestamp?: string;
};

type RequestOptions = {
  body?: unknown;
  query?: QueryParams;
  retryAuth?: boolean;
};

export class ChainViewApiError extends Error {
  status: number;
  body: string;
  authRequired: boolean;

  constructor({
    authRequired = false,
    body = "",
    message,
    status,
  }: {
    authRequired?: boolean;
    body?: string;
    message: string;
    status: number;
  }) {
    super(message);
    this.name = "ChainViewApiError";
    this.status = status;
    this.body = body;
    this.authRequired = authRequired;
  }
}

let csrfToken: string | null = null;
let sessionPromise: Promise<void> | null = null;
let hasAuthenticatedSession = false;

export const chainViewApi = {
  auth: {
    establishSession,
    ensureSession,
  },
  techStacks: {
    list: (request?: QueryParams) => requestJson<unknown[]>("/api/tech-stacks", "GET", { query: request }),
    detail: (techStackId: number) => requestJson<unknown>(`/api/tech-stacks/${techStackId}`, "GET"),
    create: (body: unknown) => requestJson<unknown>("/api/tech-stacks", "POST", { body }),
    update: (techStackId: number, body: unknown) =>
      requestJson<unknown>(`/api/tech-stacks/${techStackId}`, "PUT", { body }),
    delete: (techStackId: number) => requestJson<void>(`/api/tech-stacks/${techStackId}`, "DELETE"),
  },
  services: {
    list: (request?: QueryParams) => requestJson<unknown[]>("/api/services", "GET", { query: request }),
    detail: (serviceId: number) => requestJson<unknown>(`/api/services/${serviceId}`, "GET"),
    create: (body: unknown) => requestJson<unknown>("/api/services", "POST", { body }),
    update: (serviceId: number, body: unknown) =>
      requestJson<unknown>(`/api/services/${serviceId}`, "PUT", { body }),
    delete: (serviceId: number) => requestJson<void>(`/api/services/${serviceId}`, "DELETE"),
    techStacks: (serviceId: number) =>
      requestJson<unknown[]>(`/api/services/${serviceId}/tech-stacks`, "GET"),
    outgoingRelations: (serviceId: number) =>
      requestJson<unknown[]>(`/api/services/${serviceId}/relations/outgoing`, "GET"),
    incomingRelations: (serviceId: number) =>
      requestJson<unknown[]>(`/api/services/${serviceId}/relations/incoming`, "GET"),
    incidents: (serviceId: number) =>
      requestJson<unknown[]>(`/api/services/${serviceId}/incidents`, "GET"),
    impactPreview: (serviceId: number, depth?: number) =>
      requestJson<unknown>(`/api/services/${serviceId}/impact-preview`, "GET", {
        query: { depth },
      }),
    changeHistory: (serviceId: number) =>
      requestJson<unknown[]>(`/api/services/${serviceId}/change-history`, "GET"),
  },
  serviceTechStacks: {
    list: (serviceId?: number) =>
      requestJson<unknown[]>("/api/service-tech-stacks", "GET", { query: { serviceId } }),
    create: (body: unknown) => requestJson<unknown>("/api/service-tech-stacks", "POST", { body }),
    update: (serviceTechStackId: number, body: unknown) =>
      requestJson<unknown>(`/api/service-tech-stacks/${serviceTechStackId}`, "PUT", { body }),
    delete: (serviceTechStackId: number) =>
      requestJson<void>(`/api/service-tech-stacks/${serviceTechStackId}`, "DELETE"),
  },
  serviceRelations: {
    list: (request?: QueryParams) => requestJson<unknown[]>("/api/service-relations", "GET", { query: request }),
    create: (body: unknown) => requestJson<unknown>("/api/service-relations", "POST", { body }),
    detail: (relationId: number) => requestJson<unknown>(`/api/service-relations/${relationId}`, "GET"),
    update: (relationId: number, body: unknown) =>
      requestJson<unknown>(`/api/service-relations/${relationId}`, "PUT", { body }),
    delete: (relationId: number) => requestJson<void>(`/api/service-relations/${relationId}`, "DELETE"),
    graph: () => requestJson<unknown>("/api/service-relations/graph", "GET"),
  },
  serviceCategories: {
    list: () => requestJson<unknown[]>("/api/service-categories", "GET"),
    create: (body: unknown) => requestJson<unknown>("/api/service-categories", "POST", { body }),
    detail: (categoryId: number) => requestJson<unknown>(`/api/service-categories/${categoryId}`, "GET"),
    update: (categoryId: number, body: unknown) =>
      requestJson<unknown>(`/api/service-categories/${categoryId}`, "PUT", { body }),
    delete: (categoryId: number) => requestJson<void>(`/api/service-categories/${categoryId}`, "DELETE"),
    tree: () => requestJson<unknown[]>("/api/service-categories/tree", "GET"),
  },
  servers: {
    list: (request?: QueryParams) => requestJson<unknown[]>("/api/servers", "GET", { query: request }),
    create: (body: unknown) => requestJson<unknown>("/api/servers", "POST", { body }),
    detail: (serverId: number) => requestJson<unknown>(`/api/servers/${serverId}`, "GET"),
    update: (serverId: number, body: unknown) =>
      requestJson<unknown>(`/api/servers/${serverId}`, "PUT", { body }),
    delete: (serverId: number) => requestJson<void>(`/api/servers/${serverId}`, "DELETE"),
    incidents: (serverId: number) => requestJson<unknown[]>(`/api/servers/${serverId}/incidents`, "GET"),
  },
  ownership: {
    users: {
      list: (query?: { keyword?: string; activeOnly?: boolean }) =>
        requestJson<unknown[]>("/api/ownership/users", "GET", { query }),
      create: (body: unknown) => requestJson<unknown>("/api/ownership/users", "POST", { body }),
      detail: (userId: number) => requestJson<unknown>(`/api/ownership/users/${userId}`, "GET"),
      update: (userId: number, body: unknown) =>
        requestJson<unknown>(`/api/ownership/users/${userId}`, "PUT", { body }),
      delete: (userId: number) => requestJson<void>(`/api/ownership/users/${userId}`, "DELETE"),
    },
    groups: {
      list: () => requestJson<unknown[]>("/api/ownership/groups", "GET"),
      create: (body: unknown) => requestJson<unknown>("/api/ownership/groups", "POST", { body }),
      update: (groupId: number, body: unknown) =>
        requestJson<unknown>(`/api/ownership/groups/${groupId}`, "PUT", { body }),
      delete: (groupId: number) => requestJson<void>(`/api/ownership/groups/${groupId}`, "DELETE"),
      members: (groupId: number) =>
        requestJson<unknown[]>(`/api/ownership/groups/${groupId}/members`, "GET"),
      addMember: (groupId: number, body: unknown) =>
        requestJson<unknown>(`/api/ownership/groups/${groupId}/members`, "POST", { body }),
      removeMember: (groupId: number, groupMemberId: number) =>
        requestJson<void>(
          `/api/ownership/groups/${groupId}/members/${groupMemberId}`,
          "DELETE"
        ),
    },
    serviceOwners: {
      list: () => requestJson<unknown[]>("/api/ownership/service-owners", "GET"),
      add: (body: unknown) => requestJson<unknown>("/api/ownership/service-owners", "POST", { body }),
      update: (serviceOwnerId: number, body: unknown) =>
        requestJson<unknown>(`/api/ownership/service-owners/${serviceOwnerId}`, "PUT", { body }),
      delete: (serviceOwnerId: number) =>
        requestJson<void>(`/api/ownership/service-owners/${serviceOwnerId}`, "DELETE"),
      forService: (serviceId: number) =>
        requestJson<unknown[]>(`/api/ownership/services/${serviceId}/owners`, "GET"),
    },
  },
  notificationTemplates: {
    list: (request?: QueryParams) =>
      requestJson<unknown[]>("/api/notification-templates", "GET", { query: request }),
    create: (body: unknown) => requestJson<unknown>("/api/notification-templates", "POST", { body }),
    detail: (templateId: number) =>
      requestJson<unknown>(`/api/notification-templates/${templateId}`, "GET"),
    update: (templateId: number, body: unknown) =>
      requestJson<unknown>(`/api/notification-templates/${templateId}`, "PUT", { body }),
    preview: (templateId: number, body: unknown) =>
      requestJson<unknown>(`/api/notification-templates/${templateId}/preview`, "POST", { body }),
    deactivate: (templateId: number) =>
      requestJson<unknown>(`/api/notification-templates/${templateId}/deactivate`, "POST"),
    activate: (templateId: number) =>
      requestJson<unknown>(`/api/notification-templates/${templateId}/activate`, "POST"),
    variableKeys: () => requestJson<string[]>("/api/notification-templates/variable-keys", "GET"),
  },
  incidents: {
    list: (request?: QueryParams) => requestJson<unknown[]>("/api/incidents", "GET", { query: request }),
    create: (body: unknown) => requestJson<unknown>("/api/incidents", "POST", { body }),
    detail: (incidentId: number) => requestJson<unknown>(`/api/incidents/${incidentId}`, "GET"),
    update: (incidentId: number, body: unknown) =>
      requestJson<unknown>(`/api/incidents/${incidentId}`, "PATCH", { body }),
    delete: (incidentId: number) => requestJson<void>(`/api/incidents/${incidentId}`, "DELETE"),
    resolve: (incidentId: number, body: unknown) =>
      requestJson<unknown>(`/api/incidents/${incidentId}/resolve`, "PATCH", { body }),
    impacts: (incidentId: number) => requestJson<unknown[]>(`/api/incidents/${incidentId}/impacts`, "GET"),
    notifications: (incidentId: number) =>
      requestJson<unknown[]>(`/api/incidents/${incidentId}/notifications`, "GET"),
    notificationTargets: (incidentId: number) =>
      requestJson<unknown[]>(`/api/incidents/${incidentId}/notifications/targets`, "GET"),
    sendAlimtalk: (incidentId: number, body: unknown) =>
      requestJson<unknown>(`/api/incidents/${incidentId}/notifications/alimtalk`, "POST", { body }),
    sendNotifications: (incidentId: number, body: unknown) =>
      requestJson<unknown>(`/api/incidents/${incidentId}/notifications/send`, "POST", { body }),
  },
  notificationHistories: {
    list: (request?: QueryParams) =>
      requestJson<unknown[]>("/api/notification-histories", "GET", { query: request }),
  },
  commonCodes: {
    list: () => requestJson<unknown[]>("/api/common-codes", "GET"),
    create: (body: unknown) => requestJson<unknown>("/api/common-codes", "POST", { body }),
    group: (codeGroup: string) => requestJson<unknown[]>(`/api/common-codes/${codeGroup}`, "GET"),
    groups: () => requestJson<string[]>("/api/common-codes/groups", "GET"),
    update: (codeGroup: string, code: string, body: unknown) =>
      requestJson<unknown>(`/api/common-codes/${codeGroup}/${code}`, "PUT", { body }),
    delete: (codeGroup: string, code: string) =>
      requestJson<void>(`/api/common-codes/${codeGroup}/${code}`, "DELETE"),
  },
  assistant: {
    refreshKnowledge: () => requestJson<unknown>("/api/assistant/knowledge/refresh", "POST"),
    chat: (body: unknown) => requestJson<unknown>("/api/assistant/chat", "POST", { body }),
    services: (keyword?: string) =>
      requestJson<unknown[]>("/api/assistant/services", "GET", { query: { keyword } }),
    searchServices: (keyword: string) =>
      requestJson<unknown[]>("/api/assistant/services/search", "GET", { query: { keyword } }),
    incidentReports: {
      list: (query?: QueryParams) =>
        requestJson<unknown[]>("/api/assistant/incident-reports", "GET", { query }),
      detail: (reportId: string) =>
        requestJson<unknown>(`/api/assistant/incident-reports/${reportId}`, "GET"),
      download: (reportId: string) =>
        requestBlob(`/api/assistant/incident-reports/${reportId}/download`),
      ingest: (file: File, useLlm = true) => {
        const body = new FormData();
        body.append("file", file);
        return requestJson<unknown>("/api/assistant/incident-reports/ingest", "POST", {
          body,
          query: { useLlm },
        });
      },
    },
    routingRules: {
      list: (query?: QueryParams) =>
        requestJson<unknown[]>("/api/assistant/routing-rules", "GET", { query }),
      create: (body: unknown) =>
        requestJson<unknown>("/api/assistant/routing-rules", "POST", { body }),
      detail: (ruleId: number) =>
        requestJson<unknown>(`/api/assistant/routing-rules/${ruleId}`, "GET"),
      update: (ruleId: number, body: unknown) =>
        requestJson<unknown>(`/api/assistant/routing-rules/${ruleId}`, "PUT", { body }),
      delete: (ruleId: number) =>
        requestJson<void>(`/api/assistant/routing-rules/${ruleId}`, "DELETE"),
      groups: () => requestJson<unknown[]>("/api/assistant/routing-rules/groups", "GET"),
      meta: () => requestJson<unknown>("/api/assistant/routing-rules/meta", "GET"),
      preview: (body: unknown) =>
        requestJson<unknown>("/api/assistant/routing-rules/preview", "POST", { body }),
      reload: () => requestJson<unknown>("/api/assistant/routing-rules/reload", "POST"),
    },
    runbooks: {
      get: (path: string) =>
        requestJson<unknown>("/api/assistant/runbooks", "GET", { query: { path } }),
      list: () => requestJson<unknown[]>("/api/assistant/runbooks/list", "GET"),
      upsert: (body: unknown) =>
        requestJson<unknown>("/api/assistant/runbooks", "POST", { body }),
      delete: (path: string) =>
        requestJson<void>("/api/assistant/runbooks", "DELETE", { query: { path } }),
    },
  },
  impact: {
    preview: (query: QueryParams) =>
      requestJson<unknown>("/api/impact/preview", "GET", { query }),
    service: (serviceId: number, depth?: number) =>
      requestJson<unknown>(`/api/impact/services/${serviceId}`, "GET", { query: { depth } }),
  },
  dashboard: {
    overview: () => requestJson<unknown>("/api/dashboard/overview", "GET"),
  },
  healthCheckJobs: {
    list: (query?: QueryParams) => requestJson<unknown[]>("/api/health-check-jobs", "GET", { query }),
    create: (body: unknown) => requestJson<unknown>("/api/health-check-jobs", "POST", { body }),
    detail: (jobId: number) => requestJson<unknown>(`/api/health-check-jobs/${jobId}`, "GET"),
    update: (jobId: number, body: unknown) =>
      requestJson<unknown>(`/api/health-check-jobs/${jobId}`, "PUT", { body }),
    delete: (jobId: number) => requestJson<void>(`/api/health-check-jobs/${jobId}`, "DELETE"),
    results: (jobId: number) => requestJson<unknown[]>(`/api/health-check-jobs/${jobId}/results`, "GET"),
    start: (jobId: number) => requestJson<unknown>(`/api/health-check-jobs/${jobId}/start`, "POST"),
    stop: (jobId: number) => requestJson<unknown>(`/api/health-check-jobs/${jobId}/stop`, "POST"),
  },
  healthCheckResults: {
    detail: (resultId: number) => requestJson<unknown>(`/api/health-check-results/${resultId}`, "GET"),
    notificationTargets: (resultId: number) =>
      requestJson<unknown[]>(`/api/health-check-results/${resultId}/notification-targets`, "GET"),
    notify: (resultId: number, body: unknown) =>
      requestJson<unknown>(`/api/health-check-results/${resultId}/notify`, "POST", { body }),
  },
  infraNodes: {
    list: (query?: QueryParams) => requestJson<unknown[]>("/api/infra-nodes", "GET", { query }),
    create: (body: unknown) => requestJson<unknown>("/api/infra-nodes", "POST", { body }),
    detail: (infraNodeId: number) => requestJson<unknown>(`/api/infra-nodes/${infraNodeId}`, "GET"),
    update: (infraNodeId: number, body: unknown) =>
      requestJson<unknown>(`/api/infra-nodes/${infraNodeId}`, "PUT", { body }),
    delete: (infraNodeId: number) => requestJson<void>(`/api/infra-nodes/${infraNodeId}`, "DELETE"),
    edges: (infraNodeId: number) => requestJson<unknown[]>(`/api/infra-nodes/${infraNodeId}/edges`, "GET"),
    createEdge: (body: unknown) => requestJson<unknown>("/api/infra-nodes/edges", "POST", { body }),
    deleteEdge: (infraEdgeId: number) =>
      requestJson<void>(`/api/infra-nodes/edges/${infraEdgeId}`, "DELETE"),
  },
  internalMonitoring: {
    jobs: () => requestJson<unknown[]>("/api/internal/monitoring/jobs", "GET"),
    job: (jobCode: string) => requestJson<unknown>(`/api/internal/monitoring/jobs/${jobCode}`, "GET"),
    recordResult: (body: unknown) =>
      requestJson<unknown>("/api/internal/monitoring/results", "POST", { body }),
    notifyResult: (resultId: number) =>
      requestJson<unknown>(`/api/internal/monitoring/results/${resultId}/notify`, "POST"),
  },
  statistics: {
    asset: (query?: QueryParams) => requestJson<unknown>("/api/statistics/asset", "GET", { query }),
    assetExcel: (query?: QueryParams) => requestBlob("/api/statistics/asset/excel", { query }),
    dependency: (query?: QueryParams) => requestJson<unknown>("/api/statistics/dependency", "GET", { query }),
    dependencyExcel: (query?: QueryParams) => requestBlob("/api/statistics/dependency/excel", { query }),
    operations: (query?: QueryParams) => requestJson<unknown>("/api/statistics/operations", "GET", { query }),
    operationsExcel: (query?: QueryParams) => requestBlob("/api/statistics/operations/excel", { query }),
    techstack: (query?: QueryParams) => requestJson<unknown>("/api/statistics/techstack", "GET", { query }),
    techstackExcel: (query?: QueryParams) => requestBlob("/api/statistics/techstack/excel", { query }),
  },
  topology: {
    graph: (query?: QueryParams) => requestJson<unknown>("/api/topology/graph", "GET", { query }),
  },
};

async function requestJson<T>(
  path: string,
  method: RequestMethod,
  options: RequestOptions = {}
): Promise<T> {
  const shouldAttachCsrf = method !== "GET";
  if (!hasAuthenticatedSession || (shouldAttachCsrf && !csrfToken)) {
    await ensureSession();
  }

  const response = await fetch(buildUrl(path, options.query), {
    method,
    credentials: "include",
    redirect: "manual",
    headers: buildHeaders(options.body, shouldAttachCsrf),
    body: serializeBody(options.body),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (isSessionChallengeResponse(response, contentType, text)) {
    hasAuthenticatedSession = false;
    csrfToken = null;

    if (options.retryAuth === false) {
      throw new ChainViewApiError({
        authRequired: true,
        body: text,
        message: "ChainView 로그인 세션이 필요합니다.",
        status: response.status,
      });
    }

    await ensureSession();
    return requestJson<T>(path, method, { ...options, retryAuth: false });
  }

  if (!response.ok) {
    throw new ChainViewApiError({
      body: text,
      message: extractErrorMessage(text) ?? `ChainView API 호출 실패 (${response.status})`,
      status: response.status,
    });
  }

  if (!text) {
    return undefined as T;
  }

  if (contentType.includes("application/json") || /^[\[{]/.test(text.trim())) {
    const parsed = JSON.parse(text) as ApiEnvelope<T> | T;
    if (isApiEnvelope<T>(parsed)) {
      if (parsed.success === false) {
        throw new ChainViewApiError({
          body: text,
          message: parsed.message ?? "ChainView API 요청이 실패했습니다.",
          status: response.status,
        });
      }
      return parsed.data as T;
    }
    return parsed as T;
  }

  return text as T;
}

async function requestBlob(
  path: string,
  options: Pick<RequestOptions, "query"> = {}
) {
  if (!hasAuthenticatedSession) {
    await ensureSession();
  }

  const response = await fetch(buildUrl(path, options.query), {
    credentials: "include",
    redirect: "manual",
    headers: { Accept: "*/*" },
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (isSessionChallengeResponse(response, contentType, "")) {
    hasAuthenticatedSession = false;
    csrfToken = null;
    await ensureSession();
    return requestBlob(path, options);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ChainViewApiError({
      body: text,
      message: extractErrorMessage(text) ?? `ChainView 파일 다운로드 실패 (${response.status})`,
      status: response.status,
    });
  }

  return response.blob();
}

async function ensureSession() {
  if (!sessionPromise) {
    sessionPromise = establishSession().finally(() => {
      sessionPromise = null;
    });
  }

  await sessionPromise;
}

async function establishSession(employeeNo = chainViewEmployeeNo) {
  if (await hasActiveApiSession()) {
    hasAuthenticatedSession = true;
    return;
  }

  if (await establishDevLoginSession(employeeNo)) {
    hasAuthenticatedSession = true;
    return;
  }

  if (!chainViewPassword) {
    throw new ChainViewApiError({
      authRequired: true,
      message:
        "ChainView devLogin 세션 생성에 실패했습니다. JSESSIONID 쿠키가 cross-site API 호출에 전송되도록 SameSite=None; Secure 설정을 확인해 주세요.",
      status: 0,
    });
  }

  await establishPasswordSession(employeeNo);
}

async function establishDevLoginSession(employeeNo: string) {
  try {
    await fetch(buildDevLoginUrl(employeeNo), {
      credentials: "include",
      mode: "no-cors",
    });
  } catch {
    return false;
  }

  return hasActiveApiSession();
}

async function establishPasswordSession(employeeNo: string) {
  const token = await fetchCsrfTokenFrom("/login");
  if (!token) {
    throw new ChainViewApiError({
      authRequired: true,
      message: "ChainView devLogin 세션 생성에 실패했고, 로그인 CSRF 토큰도 찾지 못했습니다.",
      status: 0,
    });
  }

  csrfToken = token;

  const body = new URLSearchParams({
    employeeNo,
    password: chainViewPassword,
    _csrf: token,
  });

  const response = await fetch(buildUrl("/login"), {
    method: "POST",
    credentials: "include",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const loginSucceeded =
    response.type === "opaqueredirect" ||
    response.status === 302 ||
    response.status === 303 ||
    response.status === 307;
  if (!loginSucceeded) {
    throw new ChainViewApiError({
      authRequired: true,
      message: "ChainView 로그인에 실패했습니다. 계정/비밀번호를 확인해 주세요.",
      status: response.status,
    });
  }
  hasAuthenticatedSession = true;
}

function buildDevLoginUrl(employeeNo: string) {
  return buildUrl(chainViewDevLoginPath, { devLogin: employeeNo });
}

async function fetchCsrfTokenFrom(path: string) {
  const response = await fetch(buildUrl(path), {
    credentials: "include",
    redirect: "manual",
    headers: { Accept: "text/html,application/xhtml+xml" },
  });

  if (
    response.type === "opaqueredirect" ||
    response.status === 0 ||
    response.status >= 300
  ) {
    return null;
  }

  const html = await response.text();
  return extractCsrfToken(html);
}

async function hasActiveApiSession() {
  const response = await fetch(buildUrl("/api/dashboard/overview"), {
    credentials: "include",
    redirect: "manual",
    headers: { Accept: "application/json" },
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (
    response.type === "opaqueredirect" ||
    response.status === 0 ||
    (response.status >= 300 && response.status < 400) ||
    contentType.includes("text/html")
  ) {
    return false;
  }

  return response.ok;
}

function buildUrl(path: string, query?: QueryParams) {
  const base = chainViewApiBaseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(
    path.startsWith("http") ? path : `${base}${normalizedPath}`,
    window.location.origin
  );

  Object.entries(query ?? {}).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => {
      if (item === undefined || item === null || item === "") {
        return;
      }
      url.searchParams.append(key, String(item));
    });
  });

  return url.toString();
}

function buildHeaders(body: unknown, withCsrf: boolean) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    headers["Content-Type"] = "application/json";
  }

  if (withCsrf && csrfToken) {
    headers["X-CSRF-TOKEN"] = csrfToken;
  }

  return headers;
}

function serializeBody(body: unknown) {
  if (body === undefined) {
    return undefined;
  }
  if (body instanceof FormData || body instanceof URLSearchParams || typeof body === "string") {
    return body;
  }
  return JSON.stringify(body);
}

function isApiEnvelope<T>(value: ApiEnvelope<T> | T): value is ApiEnvelope<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    ("success" in value || "data" in value || "timestamp" in value)
  );
}

function isSessionChallengeResponse(response: Response, contentType: string, body: string) {
  return (
    response.type === "opaqueredirect" ||
    response.status === 0 ||
    (response.status >= 300 && response.status < 400) ||
    response.redirected && response.url.includes("/session")
  ) || (
    contentType.includes("text/html") &&
    (body.includes('name="employeeNo"') || body.includes('name="_csrf"'))
  );
}

function extractCsrfToken(html: string) {
  const inputMatch =
    html.match(/name="_csrf"[^>]*value="([^"]+)"/) ??
    html.match(/value="([^"]+)"[^>]*name="_csrf"/);
  const metaMatch =
    html.match(/name="_csrf"[^>]*content="([^"]+)"/) ??
    html.match(/content="([^"]+)"[^>]*name="_csrf"/);
  return inputMatch?.[1] ?? metaMatch?.[1] ?? null;
}

function extractErrorMessage(text: string) {
  if (!text || !/^[\[{]/.test(text.trim())) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as { message?: string };
    return parsed.message ?? null;
  } catch {
    return null;
  }
}
