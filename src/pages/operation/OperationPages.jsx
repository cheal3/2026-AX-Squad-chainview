import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, History, List, Pencil, Play, Plus, Power, RotateCcw, Search, Trash2, X } from "lucide-react";

import { AppShell } from "../../components/AppShell.jsx";
import { ModalBackdrop } from "../../components/ModalBackdrop.jsx";
import { usePortalData } from "../../dashboardModule/PortalDataStore";
import { matchesSearchText, searchableText } from "../../utils/search";

const operationMenuMeta = {
  "service-checks": { section: "운영", label: "서비스 점검" },
  "notification-history": { section: "운영", label: "알림 전송 이력" },
  "notification-templates": { section: "운영", label: "알림 템플릿 관리" },
};

const OPERATION_PAGE_SIZE = 5;

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

const notificationTemplateRows = [
  { code: "INCIDENT_CRITICAL_V1", name: "인시던트 긴급 알림톡", channel: "알림톡", purpose: "인시던트", provider: "더미(개발)", variables: "3 / 4 (필수/전체)", active: "Y", title: "[장애] {{serviceName}} 긴급 장애 발생" },
  { code: "SERVICE_DOWN_V1", name: "서비스 장애 알림톡", channel: "알림톡", purpose: "서비스 장애", provider: "더미(개발)", variables: "2 / 2 (필수/전체)", active: "Y", title: "[오류] {{serviceName}} 장애 알림" },
  { code: "SERVICE_DOWN_SMS_V1", name: "서비스 장애 SMS", channel: "SMS", purpose: "서비스 장애", provider: "더미(개발)", variables: "2 / 2 (필수/전체)", active: "Y", title: "[장애] {{serviceName}}" },
];

const notificationHistorySeed = [
  { incidentCode: "INC-2506-0142", incidentTitle: "대외계 MCI 2호기 네트워크 간헐 단절", severity: "장애", progress: "진행중", channel: "이메일", sendStatus: "대기", targetType: "사용자", recipient: "오세훈 (CV1007)", contact: "cv1007@chainview.local", title: "[상세] MCI 영향 서비스 점검 요청", template: "INCIDENT_DETAIL_V1", sentAt: "2025-06-20 10:36" },
  { incidentCode: "INC-2506-0141", incidentTitle: "대외계 MCI 2호기 네트워크 간헐 단절", severity: "주의", progress: "진행중", channel: "SMS", sendStatus: "성공", targetType: "대내외계 온콜그룹", recipient: "강하늘 (CV1008)", contact: "010-3000-1008", title: "[오류] 대외계 장애 알림", template: "INCIDENT_MAJOR_V1", sentAt: "2025-06-20 10:35" },
  { incidentCode: "INC-2506-0140", incidentTitle: "대외계 MCI 2호기 네트워크 간헐 단절", severity: "주의", progress: "전파중", channel: "SMS", sendStatus: "성공", targetType: "대내외계 온콜그룹", recipient: "오세훈 (CV1007)", contact: "010-3000-1007", title: "[오류] 대외계 장애 알림", template: "INCIDENT_MAJOR_V1", sentAt: "2025-06-20 10:35" },
  { incidentCode: "INC-2506-0139", incidentTitle: "대외계 MCI 2호기 네트워크 간헐 단절", severity: "주의", progress: "진행중", channel: "SMS", sendStatus: "성공", targetType: "대내외계 온콜그룹", recipient: "은가은 (CV1009)", contact: "010-3000-1009", title: "[오류] 대외계 장애 알림", template: "INCIDENT_MAJOR_V1", sentAt: "2025-06-20 10:35" },
  { incidentCode: "INC-2506-0138", incidentTitle: "대외계 MCI 2호기 네트워크 간헐 단절", severity: "주의", progress: "진행중", channel: "알림톡", sendStatus: "성공", targetType: "채널통합 담당그룹", recipient: "오세훈 (CV1007)", contact: "010-3000-1007", title: "[장애] 대외계 MCI 2호기 네트워크 단절", template: "INCIDENT_MAJOR_V1", sentAt: "2025-06-20 10:35" },
];

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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstVisiblePage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const visiblePages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => firstVisiblePage + index
  );
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);
  const moveToPage = (nextPage) => {
    setPage(Math.max(1, Math.min(nextPage, totalPages)));
  };

  return (
    <div className="pager">
      <div className="pager__info">전체 {total}건 · {start}-{end} / {page} 페이지</div>
      <div className="pager__nav">
        <button aria-label="이전 페이지" disabled={page <= 1} onClick={() => moveToPage(page - 1)} type="button">‹</button>
        {visiblePages.map((pageNumber) => (
          <button aria-current={pageNumber === page ? "page" : undefined} className={pageNumber === page ? "is-on" : ""} key={pageNumber} onClick={() => moveToPage(pageNumber)} type="button">{pageNumber}</button>
        ))}
        <button aria-label="다음 페이지" disabled={page >= totalPages} onClick={() => moveToPage(page + 1)} type="button">›</button>
      </div>
    </div>
  );
}

function OperationFormRow({ children, label, required = false }) {
  return <label className="form-row"><span>{label}{required ? <i className="req">*</i> : null}</span>{children}</label>;
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

export function ServiceCheckPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const pageSize = OPERATION_PAGE_SIZE;
  const rows = serviceCheckRowsSeed.filter((row) =>
    matchesSearchText(searchableText(row.code, row.name, row.target), search)
  );
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);

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
        <select defaultValue="all" aria-label="대상"><option value="all">대상 전체</option><option>서비스</option><option>서버</option></select>
        <select defaultValue="all" aria-label="실행"><option value="all">실행 전체</option><option>실행</option><option>중지</option></select>
        <select defaultValue="all" aria-label="활성"><option value="all">활성 전체</option><option>Y</option><option>N</option></select>
        <button className="btn" type="button"><RotateCcw size={14} /> 초기화</button>
        <div className="right"><span className="op-period">기간&nbsp;&nbsp;<b>최근 29일</b></span></div>
      </div>

      <div className="card operation-card">
        <table className="tbl operation-table operation-table--checks">
          <thead><tr><th>점검</th><th>대상</th><th>실행 방식</th><th>상태</th><th>최근 결과</th><th className="col-actions">관리</th></tr></thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.code}>
                <td title={`${row.name} · ${row.code}`}><span className="operation-inline-cell"><b>{row.name}</b><code>{row.code}</code></span></td>
                <td title={row.target}>{row.target}</td>
                <td title={`${row.type} · ${row.cron}`}><span className="operation-inline-cell"><b>{row.type}</b><code>{row.cron}</code></span></td>
                <td><span className="pill pill--idle">{row.status}</span></td>
                <td title={`${row.lastCheckedAt} · ${row.result}`}><span className="operation-check-result"><span>{row.lastCheckedAt}</span><small className={`op-result ${row.result === "성공" ? "is-ok" : ""}`}>{row.result}</small></span></td>
                <td>
                  <div className="row-actions op-row-actions">
                    <OperationIconButton label="점검 시작" primary><Play size={16} /></OperationIconButton>
                    <OperationIconButton label="점검 이력" onClick={() => setModal({ type: "history", row })}><History size={16} /></OperationIconButton>
                    <OperationIconButton label="점검 수정" onClick={() => setModal({ type: "form", row })}><Pencil size={16} /></OperationIconButton>
                    <OperationIconButton danger label="점검 삭제"><Trash2 size={16} /></OperationIconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <OperationPager page={page} pageSize={pageSize} setPage={setPage} total={rows.length} />
      </div>
      {modal?.type === "form" ? <ServiceCheckModal row={modal.row} onClose={() => setModal(null)} /> : null}
      {modal?.type === "history" ? <ServiceCheckHistoryModal row={modal.row} onClose={() => setModal(null)} /> : null}
    </OperationPageShell>
  );
}

function ServiceCheckModal({ onClose, row }) {
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal operation-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head"><h3>{row ? "점검 수정" : "점검 등록"}</h3><button className="close" onClick={onClose} type="button"><X size={18} /></button></div>
        <div className="modal__body">
          <h4 className="form-section__title">기본 정보</h4>
          <div className="operation-form-grid">
            <OperationFormRow label="점검 코드" required><input defaultValue={row?.code ?? ""} placeholder="예: SSO-HEALTH-01" type="text" /></OperationFormRow>
            <OperationFormRow label="점검명" required><input defaultValue={row?.name ?? ""} placeholder="점검명을 입력하세요" type="text" /></OperationFormRow>
            <OperationFormRow label="대상" required><select defaultValue={row?.target ?? ""}><option value="">대상 선택</option><option>대표 모바일 앱</option><option>SSO/EAM 통합 인증</option><option>공통 API Gateway</option></select></OperationFormRow>
            <OperationFormRow label="유형" required><select defaultValue={row?.type ?? "HTTP GET"}><option>HTTP GET</option><option>TCP CHECK</option><option>PROCESS</option></select></OperationFormRow>
            <OperationFormRow label="URL" required><input placeholder="https://host/path 또는 http://..." type="text" /></OperationFormRow>
            <OperationFormRow label="Timeout (ms)"><input defaultValue="5000" type="number" /></OperationFormRow>
            <OperationFormRow label="Cron" required><input defaultValue={row?.cron ?? "0 */5 * * * *"} type="text" /></OperationFormRow>
            <OperationFormRow label="실패 임계값" required><input defaultValue="1" type="number" /></OperationFormRow>
            <OperationFormRow label="활성 여부"><div className="radio-row"><label><input defaultChecked name="activeYn" type="radio" /> 활성</label><label><input name="activeYn" type="radio" /> 비활성</label></div></OperationFormRow>
            <OperationFormRow label="실행 상태"><div className="radio-row"><label><input defaultChecked name="runYn" type="radio" /> Y</label><label><input name="runYn" type="radio" /> N</label></div></OperationFormRow>
            <OperationFormRow label="알림 담당"><input placeholder="점검에 대한 설명을 입력하세요" type="text" /></OperationFormRow>
            <OperationFormRow label="실행 방법"><select defaultValue="Y"><option>Y</option><option>N</option></select></OperationFormRow>
          </div>
        </div>
        <div className="modal__foot"><button className="btn" onClick={onClose} type="button">취소</button><button className="btn btn--primary op-btn-dark" onClick={onClose} type="button">저장</button></div>
      </div>
    </ModalBackdrop>
  );
}

function ServiceCheckHistoryModal({ onClose, row }) {
  const history = [
    ["2026-07-03 18:59:36", "성공", "142ms", "200", "-", "{\"status\":\"UP\"}", "건너뜀", "-"],
    ["2026-07-03 17:59:36", "성공", "136ms", "200", "-", "{\"status\":\"UP\"}", "건너뜀", "-"],
    ["2026-07-03 16:59:36", "성공", "146ms", "200", "-", "{\"status\":\"UP\"}", "건너뜀", "-"],
    ["2026-07-03 15:59:36", "실패", "-", "-", "Connection timeout after 5000ms", "-", "발송완료", "-"],
    ["2026-07-03 14:59:36", "성공", "162ms", "200", "-", "{\"status\":\"UP\"}", "건너뜀", "-"],
  ];
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal modal--lg operation-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head"><h3>점검 이력 - {row?.name}</h3><button className="close" onClick={onClose} type="button"><X size={18} /></button></div>
        <div className="modal__body">
          <p className="op-modal-desc">선택한 서비스 점검의 최근 실행 결과입니다.</p>
          <table className="tbl operation-table operation-table--history"><thead><tr><th>시간</th><th>결과</th><th>Latency</th><th>HTTP</th><th>실패 사유</th><th>응답 요약</th><th>알림</th><th>비고</th></tr></thead><tbody>{history.map((item) => <tr key={item.join("-")}><td>{item[0]}</td><td><span className={`pill ${item[1] === "성공" ? "pill--ok" : "pill--crit"}`}>{item[1]}</span></td><td>{item[2]}</td><td>{item[3]}</td><td>{item[4]}</td><td><code>{item[5]}</code></td><td>{item[6]}</td><td>{item[7]}</td></tr>)}</tbody></table>
        </div>
        <div className="modal__foot"><button className="btn" type="button">새로고침</button><button className="btn" onClick={onClose} type="button">닫기</button></div>
      </div>
    </ModalBackdrop>
  );
}

export function NotificationHistoryPage() {
  const navigate = useNavigate();
  const portalData = usePortalData();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const pageSize = OPERATION_PAGE_SIZE;
  const baseRows = Array.from({ length: 20 }, (_, index) => notificationHistorySeed[index % notificationHistorySeed.length]).map((row, index) => ({
    ...row,
    incidentCode: `INC-2506-${String(142 - index).padStart(4, "0")}`,
    incidentId: portalData.incidents[index % Math.max(1, portalData.incidents.length)]?.incidentId ?? portalData.incidents[0]?.incidentId,
    recipient: index >= notificationHistorySeed.length ? `${row.recipient.split(" ")[0]} (CV${String(1010 + index)})` : row.recipient,
  }));
  const rows = baseRows.filter((row) =>
    matchesSearchText(
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
    )
  );
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
        <select defaultValue="all"><option value="all">알림 유형 전체</option><option>이메일</option><option>SMS</option><option>알림톡</option></select>
        <select defaultValue="all"><option value="all">대상 유형 전체</option><option>사용자</option><option>그룹</option></select>
        <select defaultValue="all"><option value="all">발송 대상 전체</option></select>
        <span className="op-date-range">2025-06-13 ~ 2025-06-20</span>
        <button className="btn" type="button"><RotateCcw size={14} /> 초기화</button>
        <button className="btn btn--primary op-btn-dark" type="button"><Search size={14} /> 조회</button>
      </div>
      <div className="operation-summary"><b>전체 192</b><span>성공 180</span><span>실패 12</span><span>실행 중 0</span><span className="is-danger">(ALERT) 6</span></div>
      <div className="card operation-card">
        <table className="tbl operation-table operation-table--notifications">
          <thead><tr><th>인시던트</th><th>채널</th><th>수신자</th><th>알림</th><th>발송 시간</th></tr></thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={`${row.incidentCode}-${row.recipient}-${row.sentAt}`}>
                <td title={`${row.incidentCode} ${row.incidentTitle}`}>
                  <button className="op-text-link" onClick={() => navigate(row.incidentId ? `/dashboard?incidentId=${row.incidentId}` : "/admin-incidents")} type="button">
                    <span>{row.incidentTitle}</span><small>{row.incidentCode}</small>
                  </button>
                </td>
                <td><span className="op-channel-status"><span>{row.channel}</span><span className={`pill ${row.sendStatus === "성공" ? "pill--ok" : "pill--idle"}`}>{row.sendStatus}</span></span></td>
                <td title={`${row.targetType} · ${row.recipient} · ${row.contact}`}>{row.recipient}</td>
                <td title={`${row.title} / ${row.template}`}><button className="op-text-link" onClick={() => setDetail(row)} type="button"><span>{row.title}</span><small>{row.template}</small></button></td>
                <td title={row.sentAt}>{row.sentAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <OperationPager page={page} pageSize={pageSize} setPage={setPage} total={rows.length} />
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
  const pageSize = OPERATION_PAGE_SIZE;
  const rows = notificationTemplateRows.filter((row) =>
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
        <button className="btn" type="button"><Filter size={14} /> 고급 필터</button>
      </div>
      <div className="operation-summary"><b>총 {rows.length}개 템플릿</b></div>
      <div className="card operation-card">
        <table className="tbl operation-table operation-table--templates">
          <thead><tr><th>템플릿</th><th>채널</th><th>용도</th><th>변수</th><th>상태</th><th className="col-actions">관리</th></tr></thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.code}>
                <td title={`${row.name} · ${row.code}`}><button className="op-text-link" onClick={() => setModal(row)} type="button"><span>{row.name}</span><small>{row.code}</small></button></td>
                <td>{row.channel}</td>
                <td>{row.purpose}</td>
                <td>{row.variables}</td>
                <td><span className="pill pill--ok">{row.active === "Y" ? "활성" : "비활성"}</span></td>
                <td><div className="row-actions op-row-actions"><OperationIconButton label="템플릿 수정" onClick={() => setModal(row)}><Pencil size={16} /></OperationIconButton><OperationIconButton danger label="템플릿 비활성"><Power size={16} /></OperationIconButton></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <OperationPager page={page} pageSize={pageSize} setPage={setPage} total={rows.length} />
      </div>
      {modal ? <TemplateModal row={modal.code ? modal : null} onClose={() => setModal(null)} /> : null}
    </OperationPageShell>
  );
}

function TemplateModal({ onClose, row }) {
  const [titlePattern, setTitlePattern] = useState(row?.title ?? "[장애] {{serviceName}}");
  const [bodyPattern, setBodyPattern] = useState(
    "{{serviceName}}에서 {{severityName}} 등급의 장애가 발생했습니다.\n영향 범위: {{impactSummary}}"
  );
  const [variables, setVariables] = useState([
    { key: "serviceName", label: "서비스명", required: true, example: "결제 서비스" },
    { key: "severityName", label: "심각도", required: true, example: "치명" },
    { key: "impactSummary", label: "영향 요약", required: false, example: "로그인 및 결제 지연" },
  ]);
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

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal modal--lg operation-modal operation-modal--template" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head"><h3>{row ? "알림 템플릿 수정" : "알림 템플릿 등록"}</h3><button className="close" onClick={onClose} type="button"><X size={18} /></button></div>
        <div className="modal__body operation-template-body">
          <section>
            <h4 className="form-section__title">기본 정보</h4>
            <div className="operation-form-grid">
              <OperationFormRow label="템플릿 코드" required><input defaultValue={row?.code ?? ""} placeholder="영문, 숫자, _ 입력" type="text" /></OperationFormRow>
              <OperationFormRow label="템플릿명" required><input defaultValue={row?.name ?? ""} placeholder="템플릿명을 입력하세요" type="text" /></OperationFormRow>
              <OperationFormRow label="Provider" required><select defaultValue={row?.provider ?? "더미(개발)"}><option>더미(개발)</option><option>운영 Provider</option></select></OperationFormRow>
              <OperationFormRow label="채널" required><select defaultValue={row?.channel ?? ""}><option value="">선택하세요</option><option>알림톡</option><option>SMS</option><option>이메일</option></select></OperationFormRow>
              <OperationFormRow label="용도" required><select defaultValue={row?.purpose ?? ""}><option value="">선택하세요</option><option>인시던트</option><option>서비스 장애</option></select></OperationFormRow>
              <OperationFormRow label="활성" required><select defaultValue={row?.active ?? "Y"}><option>Y</option><option>N</option></select></OperationFormRow>
            </div>
            <div className="operation-pattern-guide">
              제목과 본문에 <code>{"{{변수명}}"}</code>을 입력하면 발송 시 실제 값으로 치환됩니다.
            </div>
            <OperationFormRow label="제목 패턴"><input value={titlePattern} onChange={(event) => setTitlePattern(event.target.value)} type="text" /></OperationFormRow>
            <OperationFormRow label="본문 패턴" required><textarea value={bodyPattern} onChange={(event) => setBodyPattern(event.target.value)} placeholder="예: {{serviceName}} 장애가 발생했습니다." rows={6} /></OperationFormRow>
            <OperationFormRow label="설명"><textarea placeholder="검색·관리를 위한 설명을 입력하세요. (선택)" rows={4} /></OperationFormRow>
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
        <div className="modal__foot"><button className="btn" onClick={onClose} type="button">취소</button><button className="btn btn--primary op-btn-dark" onClick={onClose} type="button">{row ? "저장" : "등록"}</button></div>
      </div>
    </ModalBackdrop>
  );
}
