import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, CircleHelp, RefreshCw, Search } from "lucide-react";

import { ModalBackdrop } from "../../components/ModalBackdrop.jsx";
import { chainViewApi } from "../../dashboardModule/chainViewApi";
import { usePortalData } from "../../dashboardModule/PortalDataStore";
import { codeLabels } from "../../dashboardModule/mockData";
import { matchesSearchText, normalizeSearchText, searchableText } from "../../utils/search";

const adminMenuMetaByKey = {
  services: { section: "서비스", label: "서비스 조회", icon: "📦" },
  relations: { section: "서비스", label: "서비스 관계조회", icon: "🔗" },
  techstacks: { section: "서비스", label: "기술 스택", icon: "🧩" },
  servers: { section: "인프라", label: "서버 조회", icon: "🖥️" },
  deployments: { section: "인프라", label: "배포 현황", icon: "🚀" },
  owners: { section: "담당자", label: "담당자 조회", icon: "👨‍💼" },
  groups: { section: "담당자", label: "그룹 조회", icon: "📁" },
  users: { section: "시스템 관리", label: "사용자 관리", icon: "👥" },
  categories: { section: "시스템 관리", label: "서비스 분류 관리", icon: "🗂️" },
  codes: { section: "시스템 관리", label: "공통코드 관리", icon: "⚙️" },
};

function getMenuMeta(menu) {
  return adminMenuMetaByKey[menu] || { section: "서비스", label: "화면", icon: "📄" };
}

export function DynamicAdminListPage({ activeMenu, menu }) {
  const navigate = useNavigate();
  const portalData = usePortalData();
  const [ownerModal, setOwnerModal] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [adminModal, setAdminModal] = useState(null);
  const [apiDetailModal, setApiDetailModal] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const serviceById = useMemo(
    () => new Map(portalData.services.map((service) => [service.serviceId, service])),
    [portalData.services]
  );
  const serverById = useMemo(
    () => new Map(portalData.servers.map((server) => [server.serverId, server])),
    [portalData.servers]
  );
  const ownersByServiceId = useMemo(() => {
    const map = new Map();
    portalData.owners.forEach((owner) => {
      const key = String(owner.serviceId || "");
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(owner);
    });
    return map;
  }, [portalData.owners]);
  const ownersByServiceCode = useMemo(() => {
    const map = new Map();
    portalData.owners.forEach((owner) => {
      const key = String(owner.serviceCode || "").trim();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(owner);
    });
    return map;
  }, [portalData.owners]);
  const meta = getMenuMeta(activeMenu || menu);
  const remoteQueryKey = getRemoteQueryKey(menu);
  const remoteStatus = portalData.remoteApi.status;
  const isRemoteLoading =
    remoteStatus.state === "loading" && remoteStatus.source === remoteQueryKey;
  const showRemoteStatus =
    remoteStatus.source === remoteQueryKey || remoteStatus.source === "snapshot";
  const showRemoteApiButton = Boolean(remoteQueryKey);
  const handleRemoteApiTest = async () => {
    if (!remoteQueryKey) {
      return;
    }
    const status = await portalData.remoteApi.testQuery(remoteQueryKey);
    if (status.detail) {
      setApiDetailModal(status.detail);
    }
  };

  useEffect(() => {
    setKeyword("");
    setSelectedKeys([]);
  }, [menu]);

  const configs = {
    services: {
      actionLabel: "＋ 서비스 등록",
      columns: ["serviceId", "서비스", "분류", "유형", "중요도", "상태", "엔드포인트", "서버"],
      rows: portalData.services.map((service) => {
        const serviceOwners =
          ownersByServiceId.get(String(service.serviceId)) ??
          ownersByServiceCode.get(String(service.serviceCode)) ??
          [];
        return {
          key: service.serviceId,
          record: service,
          owner: serviceOwners[0] ?? null,
          hasOwner: serviceOwners.length > 0,
          searchText: adminSearchText(
            service.serviceId,
            service.serviceCode,
            service.serviceName,
            service.categoryPath,
            codeLabels.serviceType[service.serviceTypeCode],
            service.serviceTypeCode,
            codeLabels.importance[service.importanceCode],
            service.importanceCode,
            codeLabels.serviceStatus[service.statusCode],
            service.statusCode,
            service.endpointUrl,
            serverById.get(service.serverId)?.serverName,
            service.description
          ),
          onClick: () => navigate(`/admin-services/${service.serviceCode}`),
          cells: [
            <code>{service.serviceId}</code>,
            <><code>{service.serviceCode}</code> {service.serviceName}</>,
            service.categoryPath?.join(" > ") || "미분류",
            codeLabels.serviceType[service.serviceTypeCode] || service.serviceTypeCode,
            codeLabels.importance[service.importanceCode] || service.importanceCode || "-",
            codeLabels.serviceStatus[service.statusCode] || service.statusCode,
            service.endpointUrl || "-",
            serverById.get(service.serverId)?.serverName || "-",
          ],
        };
      }),
    },
    servers: {
      actionLabel: "＋ 서버 등록",
      columns: ["serverId", "서버명", "호스트", "IP", "환경", "OS", "상태", "설명"],
      rows: portalData.servers.map((server) => ({
        key: server.serverId,
        record: server,
        searchText: adminSearchText(
          server.serverId,
          server.serverName,
          server.hostName,
          server.ipAddress,
          codeLabels.envType[server.envCode],
          server.envCode,
          codeLabels.osType[server.osTypeCode],
          server.osTypeCode,
          server.osVersion,
          codeLabels.serverStatus[server.statusCode],
          server.statusCode,
          server.description
        ),
        cells: [
          <code>{server.serverId}</code>,
          <b>{server.serverName}</b>,
          server.hostName,
          server.ipAddress,
          codeLabels.envType[server.envCode] || server.envCode,
          `${codeLabels.osType[server.osTypeCode] || server.osTypeCode} ${server.osVersion}`,
          codeLabels.serverStatus[server.statusCode] || server.statusCode,
          server.description || "-",
        ],
      })),
    },
    relations: {
      actionLabel: "＋ 관계 등록",
      columns: ["relationId", "송신 서비스", "수신 서비스", "유형", "필수", "상태", "설명"],
      rows: portalData.relations.map((relation) => ({
        key: relation.relationId,
        record: relation,
        searchText: adminSearchText(
          relation.relationId,
          serviceLabel(serviceById.get(relation.sourceServiceId)),
          serviceLabel(serviceById.get(relation.targetServiceId)),
          codeLabels.relationType[relation.relationTypeCode],
          relation.relationTypeCode,
          relation.mandatoryYn,
          codeLabels.relationStatus[relation.relationStatusCode],
          relation.relationStatusCode,
          relation.description
        ),
        cells: [
          <code>{relation.relationId}</code>,
          formatServiceCell(serviceById.get(relation.sourceServiceId)),
          formatServiceCell(serviceById.get(relation.targetServiceId)),
          codeLabels.relationType[relation.relationTypeCode] || relation.relationTypeCode,
          relation.mandatoryYn,
          codeLabels.relationStatus[relation.relationStatusCode] || relation.relationStatusCode,
          relation.description || "-",
        ],
      })),
    },
    techstacks: {
      actionLabel: "＋ 기술스택 등록",
      columns: ["techStackId", "서비스", "유형", "기술명", "버전", "벤더"],
      rows: portalData.techStacks.map((stack) => ({
        key: stack.techStackId,
        record: stack,
        searchText: adminSearchText(
          stack.techStackId,
          serviceLabel(serviceById.get(stack.serviceId)),
          stack.techTypeName,
          stack.techName,
          stack.versionText,
          stack.vendorName
        ),
        cells: [
          <code>{stack.techStackId}</code>,
          formatServiceCell(serviceById.get(stack.serviceId)),
          stack.techTypeName,
          <b>{stack.techName}</b>,
          stack.versionText,
          stack.vendorName,
        ],
      })),
    },
    owners: {
      actionLabel: "＋ 담당자 지정",
      columns: ["serviceOwnerId", "서비스", "담당 유형", "담당자/그룹", "책임"],
      rows: portalData.owners.map((owner) => ({
        key: owner.serviceOwnerId,
        owner,
        searchText: adminSearchText(
          owner.serviceOwnerId,
          serviceLabel(serviceById.get(owner.serviceId)),
          owner.ownerTypeCode,
          codeLabels.ownerType[owner.ownerTypeCode],
          owner.ownerName,
          owner.responsibilityCode,
          codeLabels.responsibilityType[owner.responsibilityCode]
        ),
        cells: [
          <code>{owner.serviceOwnerId}</code>,
          formatServiceCell(serviceById.get(owner.serviceId)),
          codeLabels.ownerType[owner.ownerTypeCode] || owner.ownerTypeCode,
          <b>{owner.ownerName}</b>,
          codeLabels.responsibilityType[owner.responsibilityCode] || owner.responsibilityCode,
        ],
      })),
    },
    users: {
      actionLabel: "＋ 사용자 등록",
      columns: ["userId", "사번", "이름", "조직", "부서", "역할", "연락처", "이메일", "활성"],
      rows: portalData.users.map((user) => ({
        key: recordKey(user, "userId", "employeeNo"),
        record: user,
        searchText: adminSearchText(
          field(user, "userId", ""),
          field(user, "employeeNo", ""),
          field(user, "userName", ""),
          field(user, "orgName", ""),
          field(user, "departmentName", ""),
          field(user, "roleName", ""),
          field(user, "phoneNumber", ""),
          field(user, "email", ""),
          field(user, "activeYn", "")
        ),
        cells: [
          <code>{field(user, "userId")}</code>,
          <code>{field(user, "employeeNo")}</code>,
          <b>{field(user, "userName")}</b>,
          field(user, "orgName"),
          field(user, "departmentName"),
          field(user, "roleName"),
          field(user, "phoneNumber"),
          field(user, "email"),
          yesNoPill(field(user, "activeYn")),
        ],
      })),
    },
    groups: {
      actionLabel: "＋ 그룹 등록",
      columns: ["groupId", "groupCode", "그룹명", "설명"],
      rows: portalData.groups.map((group) => ({
        key: recordKey(group, "groupId", "groupCode"),
        record: group,
        searchText: adminSearchText(
          field(group, "groupId", ""),
          field(group, "groupCode", ""),
          field(group, "groupName", ""),
          field(group, "description", "")
        ),
        cells: [
          <code>{field(group, "groupId")}</code>,
          <code>{field(group, "groupCode")}</code>,
          <b>{field(group, "groupName")}</b>,
          field(group, "description"),
        ],
      })),
    },
    categories: {
      actionLabel: "＋ 분류 등록",
      columns: ["categoryId", "분류코드", "분류명", "레벨", "상위 ID", "정렬", "수정일"],
      rows: portalData.categories.map((category) => ({
        key: recordKey(category, "categoryId", "categoryCode"),
        record: category,
        searchText: adminSearchText(
          field(category, "categoryId", ""),
          field(category, "categoryCode", ""),
          field(category, "categoryName", ""),
          field(category, "categoryLevel", ""),
          field(category, "parentCategoryId", ""),
          field(category, "sortOrder", ""),
          field(category, "updatedAt", ""),
          field(category, "createdAt", "")
        ),
        cells: [
          <code>{field(category, "categoryId")}</code>,
          <code>{field(category, "categoryCode")}</code>,
          <b>{field(category, "categoryName")}</b>,
          field(category, "categoryLevel"),
          field(category, "parentCategoryId"),
          field(category, "sortOrder"),
          formatDateCell(field(category, "updatedAt") || field(category, "createdAt")),
        ],
      })),
    },
    codes: {
      actionLabel: "＋ 코드 등록",
      columns: ["코드그룹", "코드", "코드명", "정렬", "사용", "비고"],
      rows: portalData.codes.map((code) => ({
        key: `${field(code, "codeGroup")}-${field(code, "code")}`,
        record: code,
        searchText: adminSearchText(
          field(code, "codeGroup", ""),
          field(code, "code", ""),
          field(code, "codeName", ""),
          field(code, "sortOrder", ""),
          field(code, "useYn", ""),
          field(code, "remarks", "")
        ),
        cells: [
          <code>{field(code, "codeGroup")}</code>,
          <code>{field(code, "code")}</code>,
          <b>{field(code, "codeName")}</b>,
          field(code, "sortOrder"),
          yesNoPill(field(code, "useYn")),
          field(code, "remarks"),
        ],
      })),
    },
    deployments: {
      actionLabel: "＋ 배포 등록",
      columns: ["서비스", "서버", "배포 경로", "포트", "상태", "인스턴스"],
      rows: portalData.deployments.map((deployment) => ({
        key: field(deployment, "deploymentKey") || recordKey(deployment, "deploymentId", "serverId"),
        record: deployment,
        searchText: adminSearchText(
          field(deployment, "deploymentKey", ""),
          field(deployment, "deploymentId", ""),
          field(deployment, "serviceCode", ""),
          field(deployment, "serviceName", ""),
          field(deployment, "serverName", ""),
          field(deployment, "hostName", ""),
          field(deployment, "serverId", ""),
          field(deployment, "deployPath", ""),
          field(deployment, "portInfo", ""),
          field(deployment, "port", ""),
          field(deployment, "deploymentStatusName", ""),
          field(deployment, "deploymentStatusCode", ""),
          field(deployment, "instanceCount", "")
        ),
        cells: [
          <><code>{field(deployment, "serviceCode")}</code> {field(deployment, "serviceName")}</>,
          field(deployment, "serverName") || field(deployment, "hostName") || field(deployment, "serverId"),
          <code>{field(deployment, "deployPath")}</code>,
          field(deployment, "portInfo") || field(deployment, "port"),
          field(deployment, "deploymentStatusName") || field(deployment, "deploymentStatusCode"),
          field(deployment, "instanceCount"),
        ],
      })),
    },
  };
  const config = configs[menu];
  const filteredRows = useMemo(() => {
    const cleanedKeyword = normalizeSearchText(keyword);
    if (!cleanedKeyword) {
      return config.rows;
    }
    return config.rows.filter((row) =>
      matchesSearchText(buildRowSearchText(row), cleanedKeyword)
    );
  }, [config.rows, keyword]);
  const filteredRowKeys = filteredRows.map((row) => String(row.key));
  const isAllChecked =
    filteredRowKeys.length > 0 &&
    filteredRowKeys.every((key) => selectedKeys.includes(key));
  const toggleAllRows = (checked) => {
    if (!checked) {
      setSelectedKeys((current) =>
        current.filter((key) => !filteredRowKeys.includes(key))
      );
      return;
    }
    setSelectedKeys((current) => Array.from(new Set([...current, ...filteredRowKeys])));
  };
  const toggleRow = (key, checked) => {
    const normalizedKey = String(key);
    setSelectedKeys((current) =>
      checked
        ? Array.from(new Set([...current, normalizedKey]))
        : current.filter((item) => item !== normalizedKey)
    );
  };
  const resetList = () => {
    setKeyword("");
    setSelectedKeys([]);
  };
  const exportCsv = () => {
    downloadAdminCsv(`${menu}.csv`, config.columns, filteredRows);
  };
  const closeOwnerModal = () => {
    setOwnerModal(null);
    setSelectedOwner(null);
  };
  const closeAdminModal = () => {
    setAdminModal(null);
  };
  const openOwnerModal = (modal, owner) => {
    setSelectedOwner(owner);
    setOwnerModal(modal);
  };
  const openAdminModal = (mode, row) => {
    setAdminModal({ mode, menu, record: row?.record ?? null });
  };
  const handleEditRow = (row) => {
    if (menu === "owners") {
      openOwnerModal("edit", row.owner);
      return;
    }

    openAdminModal("edit", row);
  };
  const handleDeleteRow = (row) => {
    if (menu === "owners") {
      openOwnerModal("delete", row.owner);
      return;
    }

    openAdminModal("delete", row);
  };
  const handleOwnerAction = (row) => {
    if (row.hasOwner && row.owner) {
      openOwnerModal("edit", { ...row.owner, lockedService: true });
      return;
    }

    openOwnerModal("create", { serviceId: row.record.serviceId, lockedService: true });
  };

  return (
    <>
      <div className="page-header-stack">
        <div className="crumb crumb--standardized">
          <span>{meta.section}</span><span className="sep">/</span><span>{meta.label}</span>
        </div>
        <div className="page-head page-head--standardized">
          <div>
            <h1 className="page-head__title"><span className="page-head__icon" aria-hidden="true">{meta.icon}</span><span>{meta.label}</span></h1>
          </div>
          <div className="page-head__right">
            {showRemoteApiButton ? (
              <>
                <button
                  className="btn btn--ghost btn--sm"
                  disabled={isRemoteLoading}
                  onClick={handleRemoteApiTest}
                  title={`${meta.label} API 실행`}
                  type="button"
                >
                  <RefreshCw size={14} />
                  {isRemoteLoading ? "실행 중" : "API 실행"}
                </button>
                {showRemoteStatus ? (
                  <span
                    className={`pill ${remoteStatus.state === "success" ? "pill--ok" : remoteStatus.state === "error" || remoteStatus.state === "blocked" ? "pill--warn" : "pill--gray"}`}
                    title={`${portalData.remoteApi.origin}${remoteStatus.lastLoadedAt ? ` · ${remoteStatus.lastLoadedAt}` : ""}`}
                  >
                    {remoteStatus.message}
                  </span>
                ) : null}
              </>
            ) : null}
            <button className="btn" onClick={exportCsv} type="button">📥 CSV 내보내기</button>
            {config.actionLabel ? (
              <button
                className="btn btn--primary"
                onClick={menu === "owners" ? () => setOwnerModal("create") : () => openAdminModal("create")}
                type="button"
              >
                {config.actionLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">🔍<input type="text" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={`${meta.label} 검색...`} /></div>
        <div className="right"><button className="btn btn--ghost btn--sm" onClick={resetList} type="button">초기화</button></div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th className="col-check"><input type="checkbox" className="chk" checked={isAllChecked} onChange={(event) => toggleAllRows(event.target.checked)} /></th>
              {config.columns.map((column) => <th key={column}>{column}</th>)}
              <th className="col-actions">관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr className={row.onClick ? "is-clickable-incident" : undefined} key={row.key} onClick={row.onClick}>
                <td className="col-check"><input className="chk" checked={selectedKeys.includes(String(row.key))} onChange={(event) => toggleRow(row.key, event.target.checked)} onClick={(event) => event.stopPropagation()} type="checkbox" /></td>
                {row.cells.map((cell, index) => <td key={index}>{cell}</td>)}
                <td className="col-actions">
                  {config.readOnly ? (
                    <span className="pill pill--gray">조회</span>
                  ) : (
                    <div className="row-actions">
                      <button
                        className="ibtn"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditRow(row);
                        }}
                        type="button"
                        title="수정"
                      >
                        ✏️
                      </button>
                      {menu === "services" ? (
                        <button
                          aria-label={row.hasOwner ? "담당자 관리" : "담당자 등록"}
                          className={`ibtn ibtn--owner ${row.hasOwner ? "is-registered" : "is-empty"}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOwnerAction(row);
                          }}
                          title={row.hasOwner ? "담당자 관리" : "담당자 등록"}
                          type="button"
                        >
                          <svg className="owner-status-icon" viewBox="0 0 24 22" aria-hidden="true">
                            <path
                              className="owner-status-icon__shape"
                              d="M9.8 10.7c3.1 0 5.7 2.5 5.7 5.6V19H1.5v-2.7c0-3.1 2.6-5.6 5.7-5.6h2.6Zm-1.3-9C11 1.7 13 3.6 13 6s-2 4.3-4.5 4.3S4 8.4 4 6s2-4.3 4.5-4.3Zm9.6 10.1c2.4 0 4.4 2 4.4 4.4V19h-5.3v-2.7c0-2-.8-3.8-2-5.1.4.4.9.6 1.4.6h1.5Zm-.7-8.6c2 0 3.5 1.5 3.5 3.4S19.4 10 17.4 10 14 8.5 14 6.6s1.5-3.4 3.4-3.4Z"
                            />
                          </svg>
                        </button>
                      ) : null}
                      <button
                        className="ibtn ibtn--danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteRow(row);
                        }}
                        type="button"
                        title="삭제"
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pager">
          <div className="pager__info">전체 {filteredRows.length}건 · 1-{filteredRows.length} / 1 페이지 · 선택 {selectedKeys.filter((key) => filteredRowKeys.includes(key)).length}건</div>
          <div className="pager__nav"><button disabled>‹</button><button className="is-on">1</button><button disabled>›</button></div>
        </div>
      </div>
      {ownerModal ? (
        <OwnerManagementModals
          modal={ownerModal}
          onClose={closeOwnerModal}
          owner={selectedOwner}
          portalData={portalData}
          services={portalData.services}
        />
      ) : null}
      {adminModal ? (
        <AdminRecordModal
          modal={adminModal}
          onOpenApiDetail={setApiDetailModal}
          onClose={closeAdminModal}
          portalData={portalData}
          serverById={serverById}
          serviceById={serviceById}
        />
      ) : null}
      {apiDetailModal ? (
        <ApiQueryDetailModal
          detail={apiDetailModal}
          onClose={() => setApiDetailModal(null)}
        />
      ) : null}
    </>
  );
}

function ApiQueryDetailModal({ detail, onClose }) {
  const isSuccess = detail.state === "success";
  const stateLabel = {
    blocked: "차단",
    error: "실패",
    loading: "진행 중",
    success: "성공",
  }[detail.state] || detail.state;
  const previewText = JSON.stringify(detail.responsePreview ?? null, null, 2);

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal modal--lg api-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head">
          <h3>API 조회 상세</h3>
          <button className="close" onClick={onClose} type="button">×</button>
        </div>
        <div className="modal__body">
          <div className="api-detail-summary">
            <span className={`pill ${isSuccess ? "pill--ok" : "pill--warn"}`}>{stateLabel}</span>
            <b>{detail.label}</b>
            <span>{detail.durationMs ?? 0}ms</span>
          </div>
          <div className="api-detail-grid">
            <div><span>Method</span><b>{detail.method}</b></div>
            <div><span>Path</span><code>{detail.path}</code></div>
            <div><span>Origin</span><code>{detail.origin}</code></div>
            <div><span>URL</span><code>{detail.url}</code></div>
            <div><span>시작</span><b>{formatApiDate(detail.startedAt)}</b></div>
            <div><span>완료</span><b>{formatApiDate(detail.finishedAt)}</b></div>
            <div><span>결과 건수</span><b>{detail.rowCount ?? "-"}</b></div>
            <div><span>실행 가능 모드</span><b>development / test / production 서비스 조회</b></div>
          </div>
          {detail.errorMessage ? (
            <div className="api-detail-error">
              <b>오류</b>
              <p>{detail.errorMessage}</p>
            </div>
          ) : null}
          <div className="api-detail-response">
            <div className="api-detail-response__head">
              <b>응답 미리보기</b>
              <span>배열 응답은 앞 3건만 표시</span>
            </div>
            <pre>{previewText}</pre>
          </div>
        </div>
        <div className="modal__foot">
          <button className="btn btn--primary" onClick={onClose} type="button">확인</button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

function buildRowSearchText(row) {
  return searchableText(
    row.searchText,
    JSON.stringify(row.record ?? row.owner ?? {}),
    ...(row.cells ?? []).map(extractNodeText)
  );
}

function adminSearchText(...values) {
  return values.flatMap(flattenSearchValue).join(" ");
}

function flattenSearchValue(value) {
  if (value === null || value === undefined || typeof value === "boolean") {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(flattenSearchValue);
  }
  if (typeof value === "object") {
    return Object.values(value).flatMap(flattenSearchValue);
  }
  return [String(value)];
}

function extractNodeText(value) {
  if (value === null || value === undefined || typeof value === "boolean") {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(extractNodeText).join(" ");
  }
  if (typeof value === "object" && "props" in value) {
    return extractNodeText(value.props?.children);
  }
  return "";
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadAdminCsv(filename, columns, rows) {
  const lines = [
    columns.map(csvEscape).join(","),
    ...rows.map((row) => (row.cells ?? []).map((cell) => csvEscape(extractNodeText(cell))).join(",")),
  ];
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatApiDate(value) {
  if (!value) {
    return "-";
  }
  return value.replace("T", " ").slice(0, 19);
}

function isValidServiceCode(value) {
  return /^[A-Z0-9_-]+(?:-[A-Z0-9_-]+)*$/.test(String(value ?? ""));
}

function AdminRecordModal({ modal, onClose, onOpenApiDetail, portalData, serverById, serviceById }) {
  const { mode, menu, record } = modal;
  const isEdit = mode === "edit";
  const isCreate = mode === "create";
  const isDelete = mode === "delete";
  const [form, setForm] = useState(() => buildAdminFormState(menu, record, portalData));
  const title = getAdminModalTitle(menu, mode, record);

  useEffect(() => {
    setForm(buildAdminFormState(menu, record, portalData));
  }, [menu, mode, record, portalData]);

  const updateField = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);
  const requireValue = (value, label) => {
    const cleaned = String(value ?? "").trim();
    if (!cleaned) {
      window.alert(`${label} 값을 입력해주세요.`);
      return null;
    }
    return cleaned;
  };
  const handleSubmit = () => {
    if (isDelete) {
      if (menu === "services") {
        portalData.deleteService(record.serviceId);
      } else if (menu === "servers") {
        const result = portalData.deleteServer(record.serverId);
        window.alert(result.message);
        if (!result.ok) return;
      } else if (menu === "relations") {
        portalData.removeRelation(record.relationId);
      } else if (menu === "techstacks") {
        portalData.deleteTechStack(record.techStackId);
      } else if (menu === "users") {
        portalData.deleteUser(Number(record.userId));
      } else if (menu === "groups") {
        portalData.deleteGroup(Number(record.groupId));
      } else if (menu === "categories") {
        portalData.deleteCategory(Number(record.categoryId));
      } else if (menu === "codes") {
        portalData.deleteCode(String(record.codeGroup), String(record.code));
      } else if (menu === "deployments") {
        portalData.deleteDeployment(record);
      }
      onClose();
      return;
    }

    if (menu === "services") {
      const serviceCode = requireValue((form.serviceCode || "").toUpperCase(), "serviceCode")?.toUpperCase();
      const serviceName = requireValue(form.serviceName, "서비스명");
      const categoryPath = buildSelectedCategoryPath(form, portalData.categories);
      const categoryL1 = requireValue(categoryPath[0], "대분류");
      if (!serviceCode || !serviceName || !categoryL1) return;
      if (!isValidServiceCode(serviceCode)) {
        window.alert("서비스 코드는 대문자, 숫자, _, - 만 사용할 수 있습니다.");
        return;
      }
      const payload = {
        categoryId: Number(form.categoryId || form.categoryL3Id || form.categoryL2Id || form.categoryL1Id) || undefined,
        serviceCode,
        serviceName,
        categoryPath,
        serviceTypeCode: form.serviceTypeCode,
        importanceCode: form.importanceCode,
        statusCode: form.statusCode,
        endpointUrl: form.endpointUrl.trim(),
        serverId: Number(form.serverId) || portalData.servers[0]?.serverId || 1,
        deployPath: form.deployPath.trim(),
        portInfo: form.portInfo.trim(),
        deploymentStatusCode: form.deploymentStatusCode,
        instanceCount: Number(form.instanceCount) || 1,
        description: form.description.trim(),
      };
      if (isCreate) {
        portalData.addService(payload);
      } else {
        portalData.updateService(record.serviceId, payload);
      }
    } else if (menu === "servers") {
      const serverName = requireValue(form.serverName, "serverName");
      const hostName = requireValue(form.hostName, "hostname");
      const ipAddress = requireValue(form.ipAddress, "IP 주소");
      if (!serverName || !hostName || !ipAddress) return;
      const payload = {
        serverName,
        hostName,
        ipAddress,
        envCode: form.envCode,
        osTypeCode: form.osTypeCode,
        osVersion: form.osVersion.trim(),
        statusCode: form.statusCode,
        description: form.description.trim(),
      };
      if (isCreate) {
        portalData.addServer(payload);
      } else {
        portalData.updateServer(record.serverId, payload);
      }
    } else if (menu === "relations") {
      const sourceServiceId = Number(form.sourceServiceId);
      const targetServiceId = Number(form.targetServiceId);
      if (!sourceServiceId || !targetServiceId) {
        window.alert("source/target 서비스를 선택해주세요.");
        return;
      }
      if (sourceServiceId === targetServiceId) {
        window.alert("source와 target 서비스는 서로 달라야 합니다.");
        return;
      }
      const payload = {
        sourceServiceId,
        targetServiceId,
        relationTypeCode: form.relationTypeCode,
        mandatoryYn: form.mandatoryYn,
        relationStatusCode: form.relationStatusCode,
        description: form.description.trim(),
      };
      if (isCreate) {
        const result = portalData.addRelation(payload);
        if (!result.ok) {
          window.alert(result.message);
          return;
        }
      } else {
        portalData.updateRelation(record.relationId, payload);
      }
    } else if (menu === "techstacks") {
      const techName = requireValue(form.techName, "기술명");
      if (!techName) return;
      const serviceId = Number(form.serviceId) || portalData.services[0]?.serviceId;
      if (!serviceId) {
        window.alert("서비스를 선택해주세요.");
        return;
      }
      const payload = {
        serviceId,
        techTypeName: form.techTypeName.trim() || "서비스 기술",
        techName,
        versionText: form.versionText.trim() || "-",
        vendorName: form.vendorName.trim() || "-",
      };
      if (isCreate) {
        portalData.addTechStack(payload);
      } else {
        portalData.updateTechStack(record.techStackId, payload);
      }
    } else if (menu === "users") {
      const employeeNo = requireValue(form.employeeNo, "사번");
      const userName = requireValue(form.userName, "이름");
      if (!employeeNo || !userName) return;
      const payload = {
        employeeNo,
        userName,
        orgName: form.orgName.trim(),
        departmentName: form.departmentName.trim(),
        roleName: form.roleName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim(),
        active: form.active === "true",
      };
      if (isCreate) {
        portalData.createUser(payload);
      } else {
        portalData.updateUser(Number(record.userId), payload);
      }
    } else if (menu === "groups") {
      const groupCode = requireValue(form.groupCode, "groupCode");
      const groupName = requireValue(form.groupName, "그룹명");
      if (!groupCode || !groupName) return;
      const payload = {
        groupCode,
        groupName,
        description: form.description.trim(),
      };
      if (isCreate) {
        portalData.createGroup(payload);
      } else {
        portalData.updateGroup(Number(record.groupId), payload);
      }
    } else if (menu === "categories") {
      const categoryCode = requireValue(form.categoryCode, "분류코드");
      const categoryName = requireValue(form.categoryName, "분류명");
      if (!categoryCode || !categoryName) return;
      const payload = {
        parentCategoryId: Number(form.parentCategoryId) || null,
        categoryLevel: Number(form.categoryLevel) || 1,
        categoryCode,
        categoryName,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (isCreate) {
        portalData.createCategory(payload);
      } else {
        portalData.updateCategory(Number(record.categoryId), payload);
      }
    } else if (menu === "codes") {
      const codeGroup = requireValue(form.codeGroup, "코드그룹");
      const code = requireValue(form.code, "코드");
      const codeName = requireValue(form.codeName, "코드명");
      if (!codeGroup || !code || !codeName) return;
      const payload = {
        codeGroup,
        code,
        codeName,
        sortOrder: Number(form.sortOrder) || 0,
        useYn: form.useYn,
        remarks: form.remarks.trim(),
      };
      if (isCreate) {
        portalData.createCode(payload);
      } else {
        portalData.updateCode(String(record.codeGroup), String(record.code), payload);
      }
    } else if (menu === "deployments") {
      const serviceId = Number(form.serviceId);
      const serverId = Number(form.serverId);
      const deployPath = requireValue(form.deployPath, "배포 경로");
      if (!serviceId || !serverId || !deployPath) return;
      const service = portalData.services.find((item) => item.serviceId === serviceId);
      const server = portalData.servers.find((item) => item.serverId === serverId);
      const payload = {
        ...(record ?? {}),
        serviceId,
        serverId,
        serviceCode: service?.serviceCode,
        serviceName: service?.serviceName,
        serverName: server?.serverName,
        hostName: server?.hostName,
        deployPath,
        portInfo: form.portInfo.trim(),
        deploymentStatusCode: form.deploymentStatusCode,
        instanceCount: Number(form.instanceCount) || 1,
      };
      if (isCreate) {
        portalData.createDeployment(payload);
      } else {
        portalData.updateDeployment(payload);
      }
    }

    onClose();
  };

  if (isDelete) {
    return (
      <ModalBackdrop onClose={onClose}>
        <div className="modal confirm" onClick={(event) => event.stopPropagation()}>
          <div className="modal__head"><h3>{title}</h3><button className="close" onClick={onClose} type="button">×</button></div>
          <div className="modal__body">
            <div className="confirm__icon">⚠</div>
            <div className="confirm__msg"><b>{getAdminRecordLabel(menu, record, serviceById, serverById)}</b> 항목을 삭제하시겠습니까?</div>
            <div className="confirm__note">삭제 후 목록과 연결 데이터에 즉시 반영됩니다.</div>
          </div>
          <div className="modal__foot"><button className="btn" onClick={onClose} type="button">취소</button><button className="btn btn--danger" onClick={handleSubmit} type="button">삭제</button></div>
        </div>
      </ModalBackdrop>
    );
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div className={menu === "techstacks" ? "modal" : "modal modal--lg"} onClick={(event) => event.stopPropagation()}>
        <div className="modal__head">
          <h3>{title}</h3>
          <button className="close" onClick={onClose} type="button">×</button>
        </div>
        <div className="modal__body">
          {menu === "services" ? (
            <ServiceAdminForm
              form={form}
              isEdit={isEdit}
              onChange={updateField}
              onOpenApiDetail={onOpenApiDetail}
              portalData={portalData}
              servers={portalData.servers}
            />
          ) : null}
          {menu === "servers" ? (
            <ServerAdminForm form={form} onChange={updateField} isEdit={isEdit} />
          ) : null}
          {menu === "relations" ? (
            <RelationAdminForm form={form} onChange={updateField} services={portalData.services} serviceById={serviceById} isEdit={isEdit} />
          ) : null}
          {menu === "techstacks" ? (
            <TechStackAdminForm form={form} onChange={updateField} services={portalData.services} isEdit={isEdit} />
          ) : null}
          {["users", "groups", "categories", "codes", "deployments"].includes(menu) ? (
            <RemoteAdminForm
              form={form}
              isEdit={isEdit}
              menu={menu}
              onChange={updateField}
              portalData={portalData}
            />
          ) : null}
        </div>
        <div className="modal__foot">
          <button className="btn" onClick={onClose} type="button">취소</button>
          <button className="btn btn--primary" onClick={handleSubmit} type="button">{isCreate ? "등록" : "저장"}</button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

const categoryPrefixOverrides = {
  "공동 플랫폼": "COM",
  "공통 플랫폼": "COM",
  "공통": "COM",
  "공통 API": "COM",
  "기간계": "CORE",
  "기간계/업무계": "CORE",
  "정보계": "INFO",
  "데이터 분석계": "DATA",
  "대외계": "EXT",
  "대외 채널": "EXT",
  "채널계": "CHN",
  "인증": "AUTH",
  "SSO/EAM": "EAM",
  "EAM": "EAM",
  "계약": "POL",
  "고객": "CUST",
  "고객상담센터": "CS",
  "계좌": "ACC",
  "결제": "PAY",
  "대출": "LOAN",
  "대출 신청/관리": "LOAN",
  "문서/이미지 솔루션": "DOC",
  "메시징/알림 솔루션": "MSG",
  "병카 포털": "BANK",
  "수납/출납": "PAY",
  "수수료": "FEE",
  "승인": "APV",
  "취소": "CNL",
  "조회": "INQ",
  "이체": "TRF",
  "인사": "HR",
  "자동차TM": "TM",
  "정보계 마트": "MART",
  "퇴직연금 공통": "RET",
  "방카": "BANC",
  "BI/리포팅": "BI",
  "IFRS": "IFRS",
  "ITSM": "ITSM",
  "VOC": "VOC",
};

function compactText(value) {
  return String(value ?? "").trim();
}

function getCategoryId(category) {
  return Number(category?.categoryId ?? category?.id ?? 0) || 0;
}

function getCategoryParentId(category) {
  return Number(
    category?.parentCategoryId ??
    category?.parentId ??
    category?.parent?.categoryId ??
    category?.parentCategory?.categoryId ??
    0
  ) || 0;
}

function getCategoryName(category) {
  return compactText(category?.categoryName ?? category?.name ?? category?.label);
}

function getCategoryLevel(category) {
  const rawLevel = category?.categoryLevel ?? category?.level ?? category?.depth;
  const numericLevel = Number(rawLevel);
  if (Number.isFinite(numericLevel) && numericLevel > 0) {
    return numericLevel;
  }

  const textLevel = compactText(category?.levelName ?? category?.categoryLevelName).toUpperCase();
  if (textLevel.includes("L1") || textLevel.includes("대분류")) return 1;
  if (textLevel.includes("L2") || textLevel.includes("중분류")) return 2;
  if (textLevel.includes("L3") || textLevel.includes("소분류")) return 3;

  const code = getCategoryCode(category);
  const codeDepth = getCategoryCodeDepth(code);
  if (codeDepth) return codeDepth;

  return getCategoryParentId(category) ? 0 : 1;
}

function getCategoryCode(category) {
  return compactText(category?.categoryCode ?? category?.code);
}

function getCategoryParentCode(category) {
  return compactText(
    category?.parentCategoryCode ??
    category?.parentCode ??
    category?.parent?.categoryCode ??
    category?.parentCategory?.categoryCode
  );
}

function uniqueByName(options) {
  const seen = new Set();
  return options.filter((option) => {
    const key = option.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function codePartFromCategoryCode(code, level) {
  const parts = compactText(code).toUpperCase().split("-").filter(Boolean);
  const cleanParts = parts[0] === "CAT" ? parts.slice(1) : parts;
  return sanitizeServiceCodePart(cleanParts[level - 1] ?? cleanParts.at(-1) ?? "");
}

function getCategoryCodeDepth(code) {
  const parts = compactText(code).toUpperCase().split("-").filter(Boolean);
  if (!parts.length) return 0;
  const cleanParts = parts[0] === "CAT" ? parts.slice(1) : parts;
  return cleanParts.length >= 1 && cleanParts.length <= 3 ? cleanParts.length : 0;
}

function inferCategoryLevels(categories) {
  const byId = new Map(categories.filter((category) => category.id).map((category) => [category.id, category]));
  const byCode = new Map(categories.filter((category) => category.code).map((category) => [category.code, category]));
  const infer = (category, seen = new Set()) => {
    if (category.level > 0) return category.level;
    const key = category.id || category.code || category.name;
    if (seen.has(key)) return 1;
    seen.add(key);

    const parent = byId.get(category.parentId) || byCode.get(category.parentCode);
    if (parent) return Math.min(infer(parent, seen) + 1, 3);
    if (category.parentId || category.parentCode) return getCategoryCodeDepth(category.parentCode) + 1 || 2;
    return 1;
  };

  return categories.map((category) => ({ ...category, level: infer(category) }));
}

function fallbackCategoryPrefix(name) {
  const cleaned = compactText(name);
  if (!cleaned) return "";
  if (categoryPrefixOverrides[cleaned]) return sanitizeServiceCodePart(categoryPrefixOverrides[cleaned]);
  const ascii = cleaned
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9\s/_-]/g, " ")
    .split(/[\s/_-]+/)
    .filter(Boolean);
  if (ascii.length) {
    return sanitizeServiceCodePart(ascii.map((part) => part[0]).join("").slice(0, 4));
  }
  return `CAT${hashTextToNumber(cleaned)}`;
}

function hashTextToNumber(value) {
  let hash = 0;
  Array.from(value).forEach((char) => {
    hash = (hash * 31 + char.charCodeAt(0)) % 1000;
  });
  return String(hash).padStart(3, "0");
}

function sanitizeServiceCodePart(value) {
  return compactText(value).toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 12);
}

function buildCategoryCatalog(categories = [], services = []) {
  const paths = services.map((service) => service.categoryPath ?? []).filter((path) => path.length);
  const servicePathCatalog = {
    level1: uniqueByName(paths.map((path) => ({ name: compactText(path[0]), prefix: fallbackCategoryPrefix(path[0]) }))),
    level2: uniqueByName(paths.map((path) => ({
      name: compactText(path[1]),
      parentName: compactText(path[0]),
      prefix: fallbackCategoryPrefix(path[1]),
    }))),
    level3: uniqueByName(paths.map((path) => ({
      name: compactText(path[2]),
      parentName: compactText(path[1]),
      grandParentName: compactText(path[0]),
      prefix: fallbackCategoryPrefix(path[2]),
    }))),
  };
  const remoteCategories = buildNormalizedCategories(categories);

  if (remoteCategories.length) {
    const byId = new Map(remoteCategories.map((category) => [category.id, category]));
    const byCode = new Map(remoteCategories.map((category) => [category.code, category]));
    const optionsByLevel = [1, 2, 3].map((level) =>
      uniqueByName(remoteCategories.filter((category) => category.level === level).map((category) => {
        const parent = byId.get(category.parentId) || byCode.get(category.parentCode);
        const grandParent = parent ? byId.get(parent.parentId) || byCode.get(parent.parentCode) : null;
        return {
          ...category,
          parentName: parent?.name ?? "",
          grandParentName: grandParent?.name ?? "",
          prefix: codePartFromCategoryCode(category.code, level) || fallbackCategoryPrefix(category.name),
        };
      }))
    );
    return {
      level1: optionsByLevel[0],
      level2: optionsByLevel[1],
      level3: optionsByLevel[2],
    };
  }

  return servicePathCatalog;
}

function buildNormalizedCategories(categories = []) {
  return inferCategoryLevels(categories.map((category) => ({
    id: getCategoryId(category),
    parentId: getCategoryParentId(category),
    parentCode: getCategoryParentCode(category),
    level: getCategoryLevel(category),
    name: getCategoryName(category),
    code: getCategoryCode(category),
  })).filter((category) => category.name));
}

function findServiceCategoryChildren(category) {
  const childKeys = ["children", "childCategories", "subCategories", "items"];
  for (const key of childKeys) {
    if (Array.isArray(category?.[key])) {
      return category[key].filter((child) => child && typeof child === "object");
    }
  }
  return [];
}

function flattenServiceCategoryTree(categories = [], parent = null, level = 1) {
  return categories.flatMap((category) => {
    const children = findServiceCategoryChildren(category);
    const normalizedCategory = {
      ...category,
      categoryLevel: Number(category.categoryLevel ?? category.level ?? category.depth ?? level),
      parentCategoryId:
        Number(category.parentCategoryId ?? category.parentId ?? 0) ||
        Number(parent?.categoryId ?? parent?.id ?? 0) ||
        undefined,
      parentCategoryCode:
        compactText(category.parentCategoryCode ?? category.parentCode) ||
        compactText(parent?.categoryCode ?? parent?.code) ||
        undefined,
    };
    return [
      normalizedCategory,
      ...flattenServiceCategoryTree(children, normalizedCategory, level + 1),
    ];
  });
}

function findCategoryOptionById(options, id) {
  const numericId = Number(id);
  if (!numericId) return null;
  return options.find((option) => Number(option.id) === numericId) ?? null;
}

function getCategoryOptionValue(option) {
  if (!option) return "";
  if (option.id) return `id:${option.id}`;
  return `name:${option.grandParentName ?? ""}|${option.parentName ?? ""}|${option.name}`;
}

function findCategoryOptionByValue(options, value) {
  return options.find((option) => getCategoryOptionValue(option) === value) ?? null;
}

function findCategoryOptionByName(options, name, parentName = "", grandParentName = "") {
  const cleanedName = compactText(name);
  if (!cleanedName) return null;
  return options.find((option) => {
    if (option.name !== cleanedName) return false;
    if (parentName && option.parentName && option.parentName !== parentName) return false;
    if (grandParentName && option.grandParentName && option.grandParentName !== grandParentName) return false;
    return true;
  }) ?? null;
}

function buildSelectedCategoryPath(form, categories = []) {
  const catalog = buildCategoryCatalog(categories);
  const selectedL1 = findCategoryOptionById(catalog.level1, form.categoryL1Id) ||
    findCategoryOptionByName(catalog.level1, form.categoryL1);
  const selectedL2 = findCategoryOptionById(catalog.level2, form.categoryL2Id) ||
    findCategoryOptionByName(catalog.level2, form.categoryL2, selectedL1?.name);
  const selectedL3 = findCategoryOptionById(catalog.level3, form.categoryL3Id) ||
    findCategoryOptionByName(catalog.level3, form.categoryL3, selectedL2?.name, selectedL1?.name);

  return [
    selectedL1?.name ?? form.categoryL1,
    selectedL2?.name ?? form.categoryL2,
    selectedL3?.name ?? form.categoryL3,
  ].map((item) => compactText(item)).filter(Boolean);
}

function resolveCategoryPathFromEntry(entry, categories = []) {
  if (!entry) return [];
  const byId = new Map(categories.filter((category) => category.id).map((category) => [category.id, category]));
  const byCode = new Map(categories.filter((category) => category.code).map((category) => [category.code, category]));
  const chain = [];
  const seen = new Set();
  let current = entry;

  while (current) {
    const key = current.id || current.code || current.name;
    if (seen.has(key)) break;
    seen.add(key);
    chain.unshift(current);
    current = byId.get(current.parentId) || byCode.get(current.parentCode);
  }

  const leveledPath = [];
  chain.forEach((category, index) => {
    const level = Math.min(Math.max(Number(category.level) || index + 1, 1), 3);
    leveledPath[level - 1] = category.name;
  });

  return leveledPath.length ? leveledPath.map((item) => compactText(item)).filter(Boolean) : chain.map((category) => category.name);
}

function resolveCategoryPath(categoryPath = [], categories = [], categoryId = "") {
  const cleanedPath = categoryPath.map((item) => compactText(item)).filter(Boolean);
  const remoteCategories = buildNormalizedCategories(categories);
  const byId = new Map(remoteCategories.filter((category) => category.id).map((category) => [category.id, category]));
  const numericCategoryId = Number(categoryId);
  const categoryFromId = numericCategoryId ? byId.get(numericCategoryId) : null;
  const pathFromId = resolveCategoryPathFromEntry(categoryFromId, remoteCategories);
  if (pathFromId.length) return pathFromId;

  const leafName = cleanedPath.at(-1);
  const leafFromName = leafName
    ? remoteCategories
        .filter((category) => category.name === leafName)
        .sort((left, right) => right.level - left.level)[0]
    : null;
  const pathFromName = resolveCategoryPathFromEntry(leafFromName, remoteCategories);
  if (pathFromName.length > cleanedPath.length) return pathFromName;

  return cleanedPath;
}

function resolveCategorySelection(categoryPath = [], categories = [], categoryId = "") {
  const resolvedPath = resolveCategoryPath(categoryPath, categories, categoryId);
  const catalog = buildCategoryCatalog(categories);
  const selectedL1 = findCategoryOptionByName(catalog.level1, resolvedPath[0]);
  const selectedL2 = findCategoryOptionByName(catalog.level2, resolvedPath[1], selectedL1?.name);
  const selectedL3 = findCategoryOptionByName(catalog.level3, resolvedPath[2], selectedL2?.name, selectedL1?.name);
  const leaf = selectedL3 || selectedL2 || selectedL1;

  return {
    categoryPath: resolvedPath,
    categoryL1Id: selectedL1?.id ? String(selectedL1.id) : "",
    categoryL2Id: selectedL2?.id ? String(selectedL2.id) : "",
    categoryL3Id: selectedL3?.id ? String(selectedL3.id) : "",
    categoryId: leaf?.id ? String(leaf.id) : "",
  };
}

function filterChildCategories(options, parentName, grandParentName = "") {
  return options.filter((option) => {
    if (parentName && option.parentName && option.parentName !== parentName) return false;
    if (grandParentName && option.grandParentName && option.grandParentName !== grandParentName) return false;
    return true;
  });
}

function selectableChildCategories(options, parentName, grandParentName = "") {
  const filtered = filterChildCategories(options, parentName, grandParentName);
  return filtered.length ? filtered : options;
}

function selectableChildCategoryOptions(options, parentOption, grandParentOption = null) {
  if (!parentOption) return [];
  const filtered = options.filter((option) => {
    const matchesParentId = parentOption.id && Number(option.parentId) === Number(parentOption.id);
    const matchesParentCode = parentOption.code && option.parentCode && option.parentCode === parentOption.code;
    const matchesParentName = option.parentName && option.parentName === parentOption.name;
    const parentMatches = matchesParentId || matchesParentCode || matchesParentName || (!option.parentId && !option.parentCode && !option.parentName);
    if (!parentMatches) return false;

    if (!grandParentOption) return true;
    const matchesGrandParentName = !option.grandParentName || option.grandParentName === grandParentOption.name;
    return matchesGrandParentName;
  });
  return filtered;
}

function getSelectedCategoryPrefix(options, name) {
  return sanitizeServiceCodePart(options.find((option) => option.name === name)?.prefix) || fallbackCategoryPrefix(name);
}

function normalizeServiceCodeSuffix(value) {
  return compactText(value).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

function buildServiceCode(form, catalog) {
  const prefixParts = [
    getSelectedCategoryPrefix(catalog.level1, form.categoryL1),
    getSelectedCategoryPrefix(catalog.level2, form.categoryL2),
    getSelectedCategoryPrefix(catalog.level3, form.categoryL3),
  ].map(sanitizeServiceCodePart).filter(Boolean);
  const suffix = normalizeServiceCodeSuffix(form.serviceCodeSuffix || "001");
  return [...prefixParts, suffix].filter(Boolean).join("-");
}

function SearchableCategorySelect({ disabled = false, onChange, options, placeholder = "검색 또는 선택하세요", value }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const selectedOption = options.find((option) => option.name === value);
  const filteredOptions = options.filter((option) => {
    return matchesSearchText(
      searchableText(option.name, option.prefix),
      query
    );
  });

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  return (
    <div className="searchable-select" ref={rootRef}>
      <button
        className="searchable-select__trigger"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={value ? "" : "is-placeholder"}>{selectedOption?.name || value || placeholder}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div className="searchable-select__panel">
          <div className="searchable-select__search">
            <Search size={15} aria-hidden="true" />
            <input autoFocus type="text" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="searchable-select__list">
            {filteredOptions.length ? filteredOptions.map((option) => (
              <button
                className={option.name === value ? "is-selected" : ""}
                key={option.id ? `category-${option.id}` : `${option.grandParentName ?? ""}-${option.parentName ?? ""}-${option.name}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.name, option);
                  setOpen(false);
                }}
                type="button"
              >
                <span>{option.name}</span>
                {option.prefix ? <code>{option.prefix}</code> : null}
              </button>
            )) : <div className="searchable-select__empty">검색 결과가 없습니다.</div>}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SearchableServiceSelect({ disabled = false, onChange, placeholder = "검색 또는 선택하세요", services, value }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const selectedService = services.find((service) => String(service.serviceId) === String(value));
  const filteredServices = services.filter((service) => {
    return matchesSearchText(
      searchableText(service.serviceCode, service.serviceName, service.categoryPath),
      query
    );
  });

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  return (
    <div className="searchable-select" ref={rootRef}>
      <button
        className="searchable-select__trigger"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={selectedService ? "" : "is-placeholder"}>
          {selectedService ? `${selectedService.serviceCode} ${selectedService.serviceName}` : placeholder}
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div className="searchable-select__panel">
          <div className="searchable-select__search">
            <Search size={15} aria-hidden="true" />
            <input autoFocus type="text" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="searchable-select__list">
            {filteredServices.length ? filteredServices.map((service) => (
              <button
                className={String(service.serviceId) === String(value) ? "is-selected" : ""}
                key={service.serviceId}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(String(service.serviceId));
                  setOpen(false);
                }}
                type="button"
              >
                <span><code>{service.serviceCode}</code> {service.serviceName}</span>
              </button>
            )) : <div className="searchable-select__empty">검색 결과가 없습니다.</div>}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ServiceAdminForm({ form, onChange, onOpenApiDetail, portalData, servers, isEdit }) {
  const [apiCategories, setApiCategories] = useState([]);
  const [categorySourceLabel, setCategorySourceLabel] = useState("포털 데이터 기준");
  const categoryCatalog = useMemo(
    () => buildCategoryCatalog(apiCategories.length ? apiCategories : portalData.categories, portalData.services),
    [apiCategories, portalData.categories, portalData.services]
  );
  const categoryApiStatus = portalData.remoteApi.status;
  const isServiceApiLoading =
    categoryApiStatus.state === "loading" && categoryApiStatus.source === "categories";
  const showServiceApiStatus = categoryApiStatus.source === "categories";
  const selectedL1 = findCategoryOptionById(categoryCatalog.level1, form.categoryL1Id) ||
    findCategoryOptionByName(categoryCatalog.level1, form.categoryL1);
  const selectedL2 = findCategoryOptionById(categoryCatalog.level2, form.categoryL2Id) ||
    findCategoryOptionByName(categoryCatalog.level2, form.categoryL2, selectedL1?.name);
  const selectedL3 = findCategoryOptionById(categoryCatalog.level3, form.categoryL3Id) ||
    findCategoryOptionByName(categoryCatalog.level3, form.categoryL3, selectedL2?.name, selectedL1?.name);
  const level2Options = selectedL1 ? selectableChildCategoryOptions(categoryCatalog.level2, selectedL1) : [];
  const level3Options = selectedL2 ? selectableChildCategoryOptions(categoryCatalog.level3, selectedL2, selectedL1) : [];
  const serviceCodePreview = buildServiceCode(form, categoryCatalog);

  useEffect(() => {
    if (!portalData.remoteApi.enabled) {
      setApiCategories([]);
      setCategorySourceLabel("포털 데이터 기준");
      return undefined;
    }
    let cancelled = false;
    setCategorySourceLabel("카테고리 API 조회 중");
    (async () => {
      try {
        const treeRows = flattenServiceCategoryTree(await chainViewApi.serviceCategories.tree().catch(() => []));
        const nextCategories = treeRows.length
          ? treeRows
          : await chainViewApi.serviceCategories.list();
        if (cancelled) return;
        setApiCategories(Array.isArray(nextCategories) ? nextCategories : []);
        setCategorySourceLabel("카테고리 API 기준");
      } catch (error) {
        console.warn("서비스 카테고리 API 조회 실패, 포털 데이터를 사용합니다.", error);
        if (cancelled) return;
        setApiCategories([]);
        setCategorySourceLabel("포털 데이터 기준");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [portalData.remoteApi.enabled]);

  const changeCategory = (level, option) => {
    const nextOption = option ?? null;
    const nextId = nextOption?.id ? String(nextOption.id) : "";
    const nextName = nextOption?.name ?? "";
    if (level === 1) {
      onChange("categoryL1", nextName);
      onChange("categoryL1Id", nextId);
      onChange("categoryL2", "");
      onChange("categoryL2Id", "");
      onChange("categoryL3", "");
      onChange("categoryL3Id", "");
      onChange("categoryId", nextId);
      return;
    }
    if (level === 2) {
      onChange("categoryL2", nextName);
      onChange("categoryL2Id", nextId);
      onChange("categoryL3", "");
      onChange("categoryL3Id", "");
      onChange("categoryId", nextId || form.categoryL1Id);
      return;
    }
    onChange("categoryL3", nextName);
    onChange("categoryL3Id", nextId);
    onChange("categoryId", nextId || form.categoryL2Id || form.categoryL1Id);
  };
  const changeSuffix = (value) => {
    onChange("serviceCodeSuffix", normalizeServiceCodeSuffix(value));
  };
  const handleServiceApiLookup = async () => {
    const status = await portalData.remoteApi.testQuery("categories");
    if (status.detail) {
      onOpenApiDetail?.(status.detail);
    }
  };

  useEffect(() => {
    if (!isEdit) {
      onChange("serviceCode", serviceCodePreview);
    }
  }, [isEdit, onChange, serviceCodePreview]);

  return (
    <>
      <div className="service-api-lookup">
        <div>
          <b>서비스 분류 API</b>
          <span>/api/service-categories/tree 응답으로 대/중/소분류를 구성합니다.</span>
        </div>
        <div className="service-api-lookup__actions">
          <span className={`pill ${categorySourceLabel === "카테고리 API 기준" ? "pill--ok" : categorySourceLabel.includes("조회 중") ? "pill--gray" : "pill--warn"}`}>
            {categorySourceLabel}
          </span>
          {showServiceApiStatus ? (
            <span className={`pill ${categoryApiStatus.state === "success" ? "pill--ok" : categoryApiStatus.state === "error" || categoryApiStatus.state === "blocked" ? "pill--warn" : "pill--gray"}`}>
              {categoryApiStatus.message}
            </span>
          ) : null}
          <button
            className="btn btn--ghost btn--sm"
            disabled={isServiceApiLoading}
            onClick={handleServiceApiLookup}
            type="button"
          >
            <RefreshCw size={14} />
            {isServiceApiLoading ? "조회 중" : "API 결과 조회"}
          </button>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">분류 및 상태</h4>
        <div className="form-grid">
          <div className="form-row">
            <label>대분류 (categoryL1)<span className="req">*</span></label>
            <select
              value={getCategoryOptionValue(selectedL1)}
              onChange={(event) => changeCategory(1, findCategoryOptionByValue(categoryCatalog.level1, event.target.value))}
            >
              <option value="">선택</option>
              {categoryCatalog.level1.map((option) => (
                <option key={getCategoryOptionValue(option)} value={getCategoryOptionValue(option)}>{option.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row"><label>중분류 (categoryL2)</label><SearchableCategorySelect disabled={!selectedL1 || !level2Options.length} options={level2Options} value={selectedL2?.name ?? form.categoryL2} onChange={(_value, option) => changeCategory(2, option)} placeholder={level2Options.length ? "검색 또는 선택하세요" : "등록된 중분류가 없습니다"} /></div>
          <div className="form-row"><label>소분류 (categoryL3)</label><SearchableCategorySelect disabled={!selectedL2 || !level3Options.length} options={level3Options} value={selectedL3?.name ?? form.categoryL3} onChange={(_value, option) => changeCategory(3, option)} placeholder={level3Options.length ? "검색 또는 선택하세요" : "등록된 소분류가 없습니다"} /></div>
          <div className="form-row"><label>중요도 (IMPORTANCE)<span className="req">*</span></label><CodeSelect labels={codeLabels.importance} value={form.importanceCode} onChange={(value) => onChange("importanceCode", value)} /></div>
          <div className="form-row"><label>상태 (STATUS)<span className="req">*</span></label><CodeSelect labels={codeLabels.serviceStatus} value={form.statusCode} onChange={(value) => onChange("statusCode", value)} /></div>
          <div className="form-row"><label>서비스 유형 (SERVICE_TYPE)<span className="req">*</span></label><CodeSelect labels={codeLabels.serviceType} value={form.serviceTypeCode} onChange={(value) => onChange("serviceTypeCode", value)} /></div>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">기본 정보</h4>
        <div className="form-grid">
          <div className="form-row">
            <label>serviceCode<span className="req">*</span></label>
            <div className="service-code-rule">
              <input type="text" value={isEdit ? form.serviceCode : serviceCodePreview} disabled />
              {!isEdit ? <input className="service-code-rule__suffix" type="text" value={form.serviceCodeSuffix} onChange={(event) => changeSuffix(event.target.value)} placeholder="001" /> : null}
            </div>
            <span className="help">{isEdit ? "PK · 수정 불가" : "대/중/소분류 prefix 뒤에 마지막 업무코드만 추가됩니다. 예: COM-AUTH-EAM-001"}</span>
          </div>
          <div className="form-row"><label>서비스명<span className="req">*</span></label><input type="text" value={form.serviceName} onChange={(event) => onChange("serviceName", event.target.value)} placeholder="예: 결제 API" /></div>
          <div className="form-row full"><label>엔드포인트 URL</label><input type="text" value={form.endpointUrl} onChange={(event) => onChange("endpointUrl", event.target.value)} placeholder="https://..." /></div>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">배포 정보</h4>
        <div className="form-grid">
          <div className="form-row"><label>배포 서버</label><select value={form.serverId} onChange={(event) => onChange("serverId", event.target.value)}>{servers.map((server) => <option key={server.serverId} value={server.serverId}>{server.serverName}</option>)}</select></div>
          <div className="form-row"><label>배포 상태</label><CodeSelect labels={codeLabels.deploymentStatus} value={form.deploymentStatusCode} onChange={(value) => onChange("deploymentStatusCode", value)} /></div>
          <div className="form-row"><label>배포 경로</label><input type="text" value={form.deployPath} onChange={(event) => onChange("deployPath", event.target.value)} placeholder="/opt/app" /></div>
          <div className="form-row"><label>포트</label><input type="text" value={form.portInfo} onChange={(event) => onChange("portInfo", event.target.value)} placeholder="8080,8443" /></div>
          <div className="form-row"><label>인스턴스 수</label><input type="number" min="1" value={form.instanceCount} onChange={(event) => onChange("instanceCount", event.target.value)} /></div>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">설명</h4>
        <div className="form-row"><label>설명</label><textarea value={form.description} onChange={(event) => onChange("description", event.target.value)} placeholder="서비스 상세 설명" /></div>
      </div>
    </>
  );
}

function ServerAdminForm({ form, onChange, isEdit }) {
  return (
    <>
      <div className="form-section">
        <h4 className="form-section__title">기본 정보</h4>
        <div className="form-grid">
          <div className="form-row">
            <label>serverName<span className="req">*</span></label>
            <input type="text" value={form.serverName} onChange={(event) => onChange("serverName", event.target.value)} disabled={isEdit} placeholder="예: WAS-PRD-14" />
            {isEdit ? <span className="help">PK · 수정 불가</span> : <span className="help">고유 · 명명규칙 준수</span>}
          </div>
          <div className="form-row"><label>hostname<span className="req">*</span></label><input type="text" value={form.hostName} onChange={(event) => onChange("hostName", event.target.value)} placeholder="예: was-prd-14.bank.local" /></div>
          <div className="form-row"><label>IP 주소<span className="req">*</span></label><input type="text" value={form.ipAddress} onChange={(event) => onChange("ipAddress", event.target.value)} placeholder="예: 10.20.30.14" /></div>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">운영 환경</h4>
        <div className="form-grid">
          <div className="form-row"><label>환경 (ENVIRONMENT)<span className="req">*</span></label><CodeSelect labels={codeLabels.envType} value={form.envCode} onChange={(value) => onChange("envCode", value)} /></div>
          <div className="form-row"><label>상태</label><CodeSelect labels={codeLabels.serverStatus} value={form.statusCode} onChange={(value) => onChange("statusCode", value)} /></div>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">OS 정보</h4>
        <div className="form-grid">
          <div className="form-row"><label>OS 유형 (OS_TYPE)<span className="req">*</span></label><CodeSelect labels={codeLabels.osType} value={form.osTypeCode} onChange={(value) => onChange("osTypeCode", value)} /></div>
          <div className="form-row"><label>OS 버전</label><input type="text" value={form.osVersion} onChange={(event) => onChange("osVersion", event.target.value)} placeholder="예: RHEL 8.9" /></div>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">설명</h4>
        <div className="form-row"><label>설명</label><textarea value={form.description} onChange={(event) => onChange("description", event.target.value)} placeholder="서버 설명 또는 위치/IDC 정보" /></div>
      </div>
    </>
  );
}

function RelationAdminForm({ form, onChange, services, serviceById, isEdit }) {
  return (
    <>
      <div className="form-section">
        <h4 className="form-section__title">연결 서비스</h4>
        <div className="form-grid">
          <div className="form-row">
            <label>source 서비스<span className="req">*</span></label>
            <SearchableServiceSelect services={services} value={form.sourceServiceId} onChange={(value) => onChange("sourceServiceId", value)} disabled={isEdit} />
            <span className="help">호출하는 쪽</span>
          </div>
          <div className="form-row">
            <label>target 서비스<span className="req">*</span></label>
            <SearchableServiceSelect services={services} value={form.targetServiceId} onChange={(value) => onChange("targetServiceId", value)} disabled={isEdit} />
            <span className="help">호출받는 쪽</span>
          </div>
          {isEdit ? <div className="form-row full"><label>연결</label><input type="text" value={`${serviceLabel(serviceById.get(Number(form.sourceServiceId)))} → ${serviceLabel(serviceById.get(Number(form.targetServiceId)))}`} disabled /></div> : null}
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">관계 속성</h4>
        <div className="form-grid">
          <div className="form-row"><label>관계 유형 (RELATION_TYPE)<span className="req">*</span></label><CodeSelect labels={codeLabels.relationType} value={form.relationTypeCode} onChange={(value) => onChange("relationTypeCode", value)} /></div>
          <div className="form-row"><label>연결 상태</label><CodeSelect labels={codeLabels.relationStatus} value={form.relationStatusCode} onChange={(value) => onChange("relationStatusCode", value)} /></div>
          <div className="form-row"><label>필수 여부 (isRequired)</label><select value={form.mandatoryYn} onChange={(event) => onChange("mandatoryYn", event.target.value)}><option value="Y">Y (필수)</option><option value="N">N (선택)</option></select></div>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title form-section__title--with-help">
          <span>서비스 영향도</span>
          <span className="help-tooltip" tabIndex="0" aria-label="서비스 영향도 작성 안내">
            <CircleHelp size={16} />
            <span className="help-tooltip__panel" role="tooltip">
              <span>서비스 간 호출 목적과 장애 발생 시 영향을 함께 작성해주세요.</span>
              <span>예시) 로그인 불가 (메뉴/권한 조회 서비스 미호출)</span>
              <span>장애 발생 시 서비스 영향도 화면에 노출되는 정보입니다.</span>
            </span>
          </span>
        </h4>
        <div className="form-row">
          <label>서비스 영향도</label>
          <textarea
            value={form.description}
            onChange={(event) => onChange("description", event.target.value)}
            placeholder={"서비스 간 호출 목적과 장애 시 영향 내용을 입력하세요.\n예) 로그인 불가 (메뉴/권한 조회 서비스 미호출)"}
          />
        </div>
      </div>
    </>
  );
}

function TechStackAdminForm({ form, onChange, services, isEdit }) {
  return (
    <>
      <div className="form-section">
        <h4 className="form-section__title">연결 서비스</h4>
        <div className="form-row">
          <label>서비스<span className="req">*</span></label>
          <select value={form.serviceId} onChange={(event) => onChange("serviceId", event.target.value)} disabled={isEdit}>
            {services.map((service) => <option key={service.serviceId} value={service.serviceId}>{service.serviceCode} {service.serviceName}</option>)}
          </select>
        </div>
      </div>
      <div className="form-section">
        <h4 className="form-section__title">기술 정보</h4>
        <div className="form-grid">
          <div className="form-row"><label>유형 (TECH_TYPE)<span className="req">*</span></label><input type="text" value={form.techTypeName} onChange={(event) => onChange("techTypeName", event.target.value)} placeholder="예: FRAMEWORK" /></div>
          <div className="form-row"><label>기술명<span className="req">*</span></label><input type="text" value={form.techName} onChange={(event) => onChange("techName", event.target.value)} placeholder="예: Spring Boot" /></div>
          <div className="form-row"><label>기본버전</label><input type="text" value={form.versionText} onChange={(event) => onChange("versionText", event.target.value)} placeholder="예: 3.2.5" /></div>
          <div className="form-row"><label>벤더</label><input type="text" value={form.vendorName} onChange={(event) => onChange("vendorName", event.target.value)} placeholder="예: VMware" /></div>
        </div>
      </div>
    </>
  );
}

function RemoteAdminForm({ form, isEdit, menu, onChange, portalData }) {
  if (menu === "users") {
    return (
      <>
        <div className="form-section">
          <h4 className="form-section__title">사용자 정보</h4>
          <div className="form-grid">
            <div className="form-row"><label>사번<span className="req">*</span></label><input type="text" value={form.employeeNo} onChange={(event) => onChange("employeeNo", event.target.value)} disabled={isEdit} /></div>
            <div className="form-row"><label>이름<span className="req">*</span></label><input type="text" value={form.userName} onChange={(event) => onChange("userName", event.target.value)} /></div>
            <div className="form-row"><label>조직</label><input type="text" value={form.orgName} onChange={(event) => onChange("orgName", event.target.value)} /></div>
            <div className="form-row"><label>부서</label><input type="text" value={form.departmentName} onChange={(event) => onChange("departmentName", event.target.value)} /></div>
            <div className="form-row"><label>역할</label><input type="text" value={form.roleName} onChange={(event) => onChange("roleName", event.target.value)} /></div>
            <div className="form-row"><label>활성</label><select value={form.active} onChange={(event) => onChange("active", event.target.value)}><option value="true">활성</option><option value="false">비활성</option></select></div>
            <div className="form-row"><label>연락처</label><input type="text" value={form.phoneNumber} onChange={(event) => onChange("phoneNumber", event.target.value)} /></div>
            <div className="form-row"><label>이메일</label><input type="email" value={form.email} onChange={(event) => onChange("email", event.target.value)} /></div>
          </div>
        </div>
      </>
    );
  }

  if (menu === "groups") {
    return (
      <div className="form-section">
        <h4 className="form-section__title">그룹 정보</h4>
        <div className="form-grid">
          <div className="form-row"><label>groupCode<span className="req">*</span></label><input type="text" value={form.groupCode} onChange={(event) => onChange("groupCode", event.target.value.toUpperCase())} disabled={isEdit} /></div>
          <div className="form-row"><label>그룹명<span className="req">*</span></label><input type="text" value={form.groupName} onChange={(event) => onChange("groupName", event.target.value)} /></div>
          <div className="form-row full"><label>설명</label><textarea value={form.description} onChange={(event) => onChange("description", event.target.value)} /></div>
        </div>
      </div>
    );
  }

  if (menu === "categories") {
    return (
      <div className="form-section">
        <h4 className="form-section__title">분류 정보</h4>
        <div className="form-grid">
          <div className="form-row"><label>분류코드<span className="req">*</span></label><input type="text" value={form.categoryCode} onChange={(event) => onChange("categoryCode", event.target.value.toUpperCase())} disabled={isEdit} /></div>
          <div className="form-row"><label>분류명<span className="req">*</span></label><input type="text" value={form.categoryName} onChange={(event) => onChange("categoryName", event.target.value)} /></div>
          <div className="form-row"><label>레벨</label><input type="number" min="1" max="3" value={form.categoryLevel} onChange={(event) => onChange("categoryLevel", event.target.value)} disabled={isEdit} /></div>
          <div className="form-row"><label>상위 categoryId</label><input type="number" min="0" value={form.parentCategoryId} onChange={(event) => onChange("parentCategoryId", event.target.value)} disabled={isEdit} /></div>
          <div className="form-row"><label>정렬</label><input type="number" value={form.sortOrder} onChange={(event) => onChange("sortOrder", event.target.value)} /></div>
        </div>
      </div>
    );
  }

  if (menu === "codes") {
    return (
      <div className="form-section">
        <h4 className="form-section__title">공통코드 정보</h4>
        <div className="form-grid">
          <div className="form-row"><label>코드그룹<span className="req">*</span></label><input type="text" value={form.codeGroup} onChange={(event) => onChange("codeGroup", event.target.value.toUpperCase())} disabled={isEdit} /></div>
          <div className="form-row"><label>코드<span className="req">*</span></label><input type="text" value={form.code} onChange={(event) => onChange("code", event.target.value.toUpperCase())} disabled={isEdit} /></div>
          <div className="form-row"><label>코드명<span className="req">*</span></label><input type="text" value={form.codeName} onChange={(event) => onChange("codeName", event.target.value)} /></div>
          <div className="form-row"><label>정렬</label><input type="number" value={form.sortOrder} onChange={(event) => onChange("sortOrder", event.target.value)} /></div>
          <div className="form-row"><label>사용</label><select value={form.useYn} onChange={(event) => onChange("useYn", event.target.value)}><option value="Y">Y</option><option value="N">N</option></select></div>
          <div className="form-row full"><label>비고</label><textarea value={form.remarks} onChange={(event) => onChange("remarks", event.target.value)} /></div>
        </div>
      </div>
    );
  }

  if (menu === "deployments") {
    return (
      <div className="form-section">
        <h4 className="form-section__title">배포 정보</h4>
        <div className="form-grid">
          <div className="form-row"><label>서비스<span className="req">*</span></label><select value={form.serviceId} onChange={(event) => onChange("serviceId", event.target.value)} disabled={isEdit}>{portalData.services.map((service) => <option key={service.serviceId} value={service.serviceId}>{service.serviceCode} {service.serviceName}</option>)}</select></div>
          <div className="form-row"><label>서버<span className="req">*</span></label><select value={form.serverId} onChange={(event) => onChange("serverId", event.target.value)}>{portalData.servers.map((server) => <option key={server.serverId} value={server.serverId}>{server.serverName}</option>)}</select></div>
          <div className="form-row"><label>배포 상태</label><CodeSelect labels={codeLabels.deploymentStatus} value={form.deploymentStatusCode} onChange={(value) => onChange("deploymentStatusCode", value)} /></div>
          <div className="form-row"><label>인스턴스 수</label><input type="number" min="1" value={form.instanceCount} onChange={(event) => onChange("instanceCount", event.target.value)} /></div>
          <div className="form-row"><label>배포 경로<span className="req">*</span></label><input type="text" value={form.deployPath} onChange={(event) => onChange("deployPath", event.target.value)} /></div>
          <div className="form-row"><label>포트</label><input type="text" value={form.portInfo} onChange={(event) => onChange("portInfo", event.target.value)} /></div>
        </div>
      </div>
    );
  }

  return null;
}

function CodeSelect({ labels, value, onChange }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {Object.entries(labels).map(([code, label]) => (
        <option key={code} value={code}>{label} ({code})</option>
      ))}
    </select>
  );
}

function buildAdminFormState(menu, record, portalData) {
  if (menu === "services") {
    const categoryPath = record?.categoryPath ?? [];
    const categorySelection = resolveCategorySelection(categoryPath, portalData.categories, record?.categoryId);
    const resolvedCategoryPath = categorySelection.categoryPath;
    const categoryId = record?.categoryId ? String(record.categoryId) : categorySelection.categoryId;
    return {
      serviceCode: record?.serviceCode ?? "",
      serviceCodeSuffix: record?.serviceCode?.split("-").at(-1) ?? "001",
      serviceName: record?.serviceName ?? "",
      categoryL1: resolvedCategoryPath[0] ?? "",
      categoryL2: resolvedCategoryPath[1] ?? "",
      categoryL3: resolvedCategoryPath[2] ?? "",
      categoryL1Id: categorySelection.categoryL1Id,
      categoryL2Id: categorySelection.categoryL2Id,
      categoryL3Id: categorySelection.categoryL3Id,
      categoryId,
      serviceTypeCode: record?.serviceTypeCode ?? "API",
      importanceCode: record?.importanceCode ?? "NORMAL",
      statusCode: record?.statusCode ?? "NORMAL",
      endpointUrl: record?.endpointUrl ?? "",
      serverId: String(record?.serverId ?? portalData.servers[0]?.serverId ?? ""),
      deployPath: record?.deployPath ?? "/opt/app",
      portInfo: record?.portInfo ?? "8080",
      deploymentStatusCode: record?.deploymentStatusCode ?? "RUNNING",
      instanceCount: String(record?.instanceCount ?? 1),
      description: record?.description ?? "",
    };
  }

  if (menu === "servers") {
    return {
      serverName: record?.serverName ?? "",
      hostName: record?.hostName ?? "",
      ipAddress: record?.ipAddress ?? "",
      envCode: record?.envCode ?? "PROD",
      osTypeCode: record?.osTypeCode ?? "LINUX",
      osVersion: record?.osVersion ?? "",
      statusCode: record?.statusCode ?? "NORMAL",
      description: record?.description ?? "",
    };
  }

  if (menu === "relations") {
    return {
      sourceServiceId: String(record?.sourceServiceId ?? ""),
      targetServiceId: String(record?.targetServiceId ?? ""),
      relationTypeCode: record?.relationTypeCode ?? "REST",
      mandatoryYn: record?.mandatoryYn ?? "Y",
      relationStatusCode: record?.relationStatusCode ?? "ACTIVE",
      description: record?.description ?? "",
    };
  }

  if (menu === "techstacks") {
    return {
      serviceId: String(record?.serviceId ?? portalData.services[0]?.serviceId ?? ""),
      techTypeName: record?.techTypeName ?? "FRAMEWORK",
      techName: record?.techName ?? "",
      versionText: record?.versionText ?? "",
      vendorName: record?.vendorName ?? "",
    };
  }

  if (menu === "users") {
    const active = String(record?.active ?? record?.activeYn ?? "Y").toUpperCase();
    return {
      employeeNo: field(record, "employeeNo", ""),
      userName: field(record, "userName", ""),
      orgName: field(record, "orgName", ""),
      departmentName: field(record, "departmentName", ""),
      roleName: field(record, "roleName", ""),
      phoneNumber: field(record, "phoneNumber", ""),
      email: field(record, "email", ""),
      active: active === "N" || active === "FALSE" ? "false" : "true",
    };
  }

  if (menu === "groups") {
    return {
      groupCode: field(record, "groupCode", ""),
      groupName: field(record, "groupName", ""),
      description: field(record, "description", ""),
    };
  }

  if (menu === "categories") {
    return {
      categoryCode: field(record, "categoryCode", ""),
      categoryName: field(record, "categoryName", ""),
      categoryLevel: field(record, "categoryLevel", "1"),
      parentCategoryId: field(record, "parentCategoryId", ""),
      sortOrder: field(record, "sortOrder", "0"),
    };
  }

  if (menu === "codes") {
    return {
      codeGroup: field(record, "codeGroup", ""),
      code: field(record, "code", ""),
      codeName: field(record, "codeName", ""),
      sortOrder: field(record, "sortOrder", "0"),
      useYn: field(record, "useYn", "Y"),
      remarks: field(record, "remarks", ""),
    };
  }

  if (menu === "deployments") {
    return {
      serviceId: field(record, "serviceId", String(portalData.services[0]?.serviceId ?? "")),
      serverId: field(record, "serverId", String(portalData.servers[0]?.serverId ?? "")),
      deployPath: field(record, "deployPath", ""),
      portInfo: field(record, "portInfo", ""),
      deploymentStatusCode: field(record, "deploymentStatusCode", "RUNNING"),
      instanceCount: field(record, "instanceCount", "1"),
    };
  }

  return {};
}

function getAdminModalTitle(menu, mode, record) {
  const action = mode === "create" ? "＋" : mode === "delete" ? "🗑" : "✏️";
  const verb = mode === "create" ? "등록" : mode === "delete" ? "삭제" : "수정";
  const labels = {
    services: "서비스",
    servers: "서버",
    relations: "서비스 관계",
    techstacks: "기술스택",
    users: "사용자",
    groups: "그룹",
    categories: "서비스 분류",
    codes: "공통코드",
    deployments: "배포",
  };
  const id = record ? getAdminRecordId(menu, record) : "";
  return `${action} ${labels[menu]} ${verb}${id && mode !== "create" ? ` — ${id}` : ""}`;
}

function getAdminRecordId(menu, record) {
  if (menu === "services") return record.serviceCode;
  if (menu === "servers") return record.serverName;
  if (menu === "relations") return `REL-${String(record.relationId).padStart(4, "0")}`;
  if (menu === "techstacks") return `TECH-${String(record.techStackId).padStart(3, "0")}`;
  if (menu === "users") return record.employeeNo;
  if (menu === "groups") return record.groupCode;
  if (menu === "categories") return record.categoryCode;
  if (menu === "codes") return `${record.codeGroup}/${record.code}`;
  if (menu === "deployments") return `${record.serviceCode ?? record.serviceId}/${record.serverName ?? record.serverId}`;
  return "";
}

function getAdminRecordLabel(menu, record, serviceById, serverById) {
  if (menu === "services") return `${record.serviceCode} ${record.serviceName}`;
  if (menu === "servers") return `${record.serverName} (${record.ipAddress})`;
  if (menu === "relations") return `${serviceLabel(serviceById.get(record.sourceServiceId))} → ${serviceLabel(serviceById.get(record.targetServiceId))}`;
  if (menu === "techstacks") return `${serviceLabel(serviceById.get(record.serviceId))} / ${record.techName}`;
  if (menu === "users") return `${record.employeeNo} ${record.userName}`;
  if (menu === "groups") return `${record.groupCode} ${record.groupName}`;
  if (menu === "categories") return `${record.categoryCode} ${record.categoryName}`;
  if (menu === "codes") return `${record.codeGroup}/${record.code} ${record.codeName}`;
  if (menu === "deployments") return `${record.serviceCode ?? record.serviceId} / ${record.serverName ?? record.serverId}`;
  return getAdminRecordId(menu, record);
}

function serviceLabel(service) {
  return service ? `${service.serviceCode} ${service.serviceName}` : "서비스 미지정";
}

function OwnerManagementModals({ modal, onClose, owner, portalData, services }) {
  if (!modal) {
    return null;
  }

  const service = owner ? services.find((item) => item.serviceId === owner.serviceId) : services[0];
  const serviceLabel = service ? `${service.serviceCode} ${service.serviceName}` : "서비스 선택";
  const ownerId = owner?.serviceOwnerId ? `OWN-${String(owner.serviceOwnerId).padStart(4, "0")}` : "신규";
  const matchedGroupId = owner?.groupId ?? portalData.groups.find((group) => group.groupName === owner?.ownerName)?.groupId;
  const matchedUserId = owner?.userId ?? portalData.users.find((user) => user.userName === owner?.ownerName || `${user.userName}(${user.orgName ?? ""})` === owner?.ownerName)?.userId;
  const [form, setForm] = useState(() => ({
    serviceId: String(owner?.serviceId ?? services[0]?.serviceId ?? ""),
    ownerTypeCode: owner?.ownerTypeCode ?? "GROUP",
    groupId: String(matchedGroupId ?? portalData.groups[0]?.groupId ?? ""),
    userId: String(matchedUserId ?? portalData.users[0]?.userId ?? ""),
    responsibilityCode: owner?.responsibilityCode ?? "MAIN",
  }));
  const updateField = (field, value) => {
    setForm((current) => {
      if (field === "ownerTypeCode") {
        return {
          ...current,
          ownerTypeCode: value,
          groupId: value === "GROUP" ? current.groupId || String(portalData.groups[0]?.groupId ?? "") : "",
          userId: value === "USER" ? current.userId || String(portalData.users[0]?.userId ?? "") : "",
        };
      }
      return { ...current, [field]: value };
    });
  };
  const handleClose = () => onClose();
  const handleSubmit = () => {
    if (modal === "delete") {
      portalData.deleteOwner(owner.serviceOwnerId);
      onClose();
      return;
    }

    const ownerTypeCode = form.ownerTypeCode;
    const group = portalData.groups.find((item) => String(item.groupId) === String(form.groupId));
    const user = portalData.users.find((item) => String(item.userId) === String(form.userId));
    const payload = {
      serviceId: Number(form.serviceId),
      ownerTypeCode,
      groupId: Number(form.groupId) || null,
      groupName: group?.groupName,
      userId: Number(form.userId) || null,
      userName: user?.userName,
      responsibilityCode: form.responsibilityCode,
    };

    if (!payload.serviceId) {
      window.alert("서비스를 선택해주세요.");
      return;
    }
    if (ownerTypeCode === "GROUP" && !payload.groupId) {
      window.alert("그룹을 선택해주세요.");
      return;
    }
    if (ownerTypeCode === "USER" && !payload.userId) {
      window.alert("사용자를 선택해주세요.");
      return;
    }

    if (modal === "edit") {
      portalData.updateOwner(owner.serviceOwnerId, payload);
    } else {
      portalData.createOwner(payload);
    }
    onClose();
  };

  if (modal === "delete") {
    return (
      <ModalBackdrop onClose={onClose}>
        <div className="modal confirm" onClick={(event) => event.stopPropagation()}>
          <div className="modal__head"><h3>🗑 담당자 해제</h3><button className="close" onClick={onClose} type="button">×</button></div>
          <div className="modal__body">
            <div className="confirm__icon">⚠</div>
            <div className="confirm__msg"><b>{ownerId} ({serviceLabel} / {owner?.ownerName ?? "담당자"})</b>을 해제하시겠습니까?</div>
            <div className="confirm__note">해제 즉시 알림 수신 대상에서 제외됩니다.<br />일반적으로 종료일을 지정하여 이력 보존을 권장합니다.</div>
          </div>
          <div className="modal__foot"><button className="btn" onClick={handleClose} type="button">취소</button><button className="btn btn--danger" onClick={handleSubmit} type="button">해제</button></div>
        </div>
      </ModalBackdrop>
    );
  }

  const isEdit = modal === "edit";
  const serviceLocked = Boolean(owner?.lockedService);

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head">
          <h3>{isEdit ? `✏️ 담당자 관리 — ${ownerId}` : "＋ 담당자 등록"}</h3>
          <button className="close" onClick={handleClose} type="button">×</button>
        </div>
        <div className="modal__body">
          <div className="form-section">
            <h4 className="form-section__title">연결 서비스</h4>
            <div className="form-row">
              <label>서비스 (serviceCode)<span className="req">*</span></label>
              {serviceLocked ? (
                <div className="readonly-field">
                  {service ? <><code>{service.serviceCode}</code> {service.serviceName}</> : "서비스 미지정"}
                </div>
              ) : (
                <select value={form.serviceId} onChange={(event) => updateField("serviceId", event.target.value)}>
                  <option value="">선택</option>
                  {services.map((item) => (
                    <option key={item.serviceId} value={item.serviceId}>{item.serviceCode} {item.serviceName}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="form-section">
            <h4 className="form-section__title">담당자 정보</h4>
            <div className="form-grid">
              <div className="form-row">
                <label>담당자/그룹<span className="req">*</span></label>
                {form.ownerTypeCode === "GROUP" ? (
                  <select value={form.groupId} onChange={(event) => updateField("groupId", event.target.value)}>
                    <option value="">그룹 선택</option>
                    {portalData.groups.map((group) => <option key={group.groupId} value={group.groupId}>{group.groupCode} {group.groupName}</option>)}
                  </select>
                ) : (
                  <select value={form.userId} onChange={(event) => updateField("userId", event.target.value)}>
                    <option value="">사용자 선택</option>
                    {portalData.users.map((user) => <option key={user.userId} value={user.userId}>{user.employeeNo} {user.userName}</option>)}
                  </select>
                )}
              </div>
              <div className="form-row">
                <label>담당 유형</label>
                <select value={form.ownerTypeCode} onChange={(event) => updateField("ownerTypeCode", event.target.value)}>
                  <option value="GROUP">그룹</option>
                  <option value="USER">사용자</option>
                </select>
              </div>
              <div className="form-row">
                <label>책임</label>
                <select value={form.responsibilityCode} onChange={(event) => updateField("responsibilityCode", event.target.value)}>
                  <option value="MAIN">주담당</option>
                  <option value="SUB">부담당</option>
                  <option value="ALERT">알림수신</option>
                </select>
              </div>
            </div>
          </div>
          <div className="form-section">
            <h4 className="form-section__title">적용 기간</h4>
            <div className="form-grid">
              <div className="form-row"><label>시작일</label><input type="date" defaultValue="2024-01-02" /></div>
              <div className="form-row"><label>종료일</label><input type="date" /></div>
            </div>
          </div>
        </div>
        <div className="modal__foot"><button className="btn" onClick={handleClose} type="button">취소</button><button className="btn btn--primary" onClick={handleSubmit} type="button">{isEdit ? "저장" : "등록"}</button></div>
      </div>
    </ModalBackdrop>
  );
}

function formatServiceCell(service) {
  if (!service) {
    return "-";
  }
  return <><code>{service.serviceCode}</code> {service.serviceName}</>;
}

function field(record, key, fallback = "-") {
  const value = record?.[key];
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return String(value);
}

function recordKey(record, idKey, fallbackKey) {
  return field(record, idKey, field(record, fallbackKey, Math.random().toString(36)));
}

function formatDateCell(value) {
  if (!value || value === "-") {
    return "-";
  }
  return String(value).replace("T", " ").slice(0, 16);
}

function yesNoPill(value) {
  const normalized = String(value ?? "").toUpperCase();
  const enabled = normalized === "Y" || normalized === "TRUE" || normalized === "ACTIVE";
  return <span className={`pill ${enabled ? "pill--ok" : "pill--idle"}`}>{enabled ? "활성" : "비활성"}</span>;
}

function getRemoteQueryKey(menu) {
  return {
    services: "services",
    servers: "servers",
    relations: "relations",
    techstacks: "techstacks",
    owners: "owners",
    incidents: "incidents",
    users: "users",
    groups: "groups",
    categories: "categories",
    codes: "codes",
    deployments: "deployments",
  }[menu];
}
