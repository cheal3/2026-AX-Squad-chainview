import { Bot, BookOpen, FileUp, Send, Sparkles } from "lucide-react";
import { AppShell } from "../../components/AppShell.jsx";

const quickQuestions = [
  "SSO/EAM 담당자 알려줘",
  "SSO 영향 범위 분석",
  "최근 장애 이력 조회",
  "P770 인프라 영향도",
  "배포 서버 정보 확인",
];

const runbookRows = [
  { title: "SSO/EAM 인증 장애", slug: "sso-eam-auth-failure" },
  { title: "배치 지연 대응", slug: "batch-delay-response" },
  { title: "DB 커넥션 고갈", slug: "db-connection-pool" },
];

export function AiAssistantPage() {
  return (
    <AppShell activeMenu="ai-assistant">
      <main className="main ai-page">
        <AiPageHeader
          icon={<Bot size={22} />}
          eyebrow="운영 / 운영 AI Assistant"
          title="운영 AI Assistant"
          description="ChainView 통합 데이터 기반 운영 질의 응답"
          action={<span className="ai-page__ready"><Sparkles size={14} /> AI Ready</span>}
        />

        <section className="ai-panel">
          <h2>추천 질문</h2>
          <div className="ai-chip-row">
            {quickQuestions.map((question) => (
              <button className="ai-chip" key={question} type="button">{question}</button>
            ))}
          </div>
        </section>

        <section className="ai-chat-shell">
          <div className="ai-message ai-message--assistant">
            <div className="ai-message__icon"><Bot size={16} /></div>
            <div className="ai-message__body">
              <p>안녕하세요! 운영 AI Assistant 입니다.</p>
              <p>궁금한 내용을 질문하시면 ChainView 데이터를 기반으로 답변드리겠습니다.</p>
              <time>오전 10:30</time>
            </div>
          </div>
          <div className="ai-message ai-message--user">
            <div className="ai-message__body">
              <p>SSO/EAM 담당자 알려줘</p>
              <time>오전 10:30</time>
            </div>
          </div>
          <div className="ai-message ai-message--assistant">
            <div className="ai-message__icon"><Bot size={16} /></div>
            <div className="ai-message__body ai-message__body--wide">
              <p>SSO/EAM 담당자 정보를 아래와 같이 안내드립니다.</p>
              <table className="ai-mini-table">
                <thead><tr><th>서비스</th><th>담당자</th><th>이메일</th><th>연락처</th></tr></thead>
                <tbody>
                  <tr><td>SSO-Service</td><td>이예정</td><td>hyojin.lee@company.com</td><td>010-1234-5678</td></tr>
                  <tr><td>EAM-Service</td><td>박수민</td><td>sunho.park@company.com</td><td>010-2345-6789</td></tr>
                </tbody>
              </table>
              <time>오전 10:30</time>
            </div>
          </div>
        </section>

        <section className="ai-input-shell">
          <input placeholder="궁금한 내용을 입력하세요. 예) SSO 장애 영향도 분석" />
          <button aria-label="질문 보내기" type="button"><Send size={16} /></button>
        </section>
      </main>
    </AppShell>
  );
}

export function AiRunbookPage() {
  return (
    <AppShell activeMenu="ai-runbook">
      <main className="main ai-page">
        <AiPageHeader
          icon={<BookOpen size={22} />}
          eyebrow="AI ASSISTANT / Runbook 관리"
          title="Assistant Runbook"
          description="운영 runbook 편집 및 검색 컨텍스트 관리"
          action={
            <div className="ai-page__actions">
              <button className="btn" type="button">벡터 새로고침</button>
              <button className="btn btn--primary" type="button">새 Runbook</button>
            </div>
          }
        />

        <section className="ai-panel">
          <h2>장애 보고서 업로드</h2>
          <p>DOCX/TXT/MD 보고서를 업로드하면 LLM이 구조화하고 runbook 초안을 생성합니다.</p>
          <div className="ai-upload-row">
            <label className="ai-file-box">
              <FileUp size={16} />
              <span>파일 선택</span>
              <input type="file" />
            </label>
            <label className="ai-check"><input defaultChecked type="checkbox" /> LLM 구조화 사용</label>
          </div>
          <button className="ai-wide-button" type="button">보고서 ingest</button>
        </section>

        <section className="ai-runbook-grid">
          <div className="ai-runbook-list">
            <label>검색</label>
            <input placeholder="파일명/slug 검색" />
            <div className="ai-runbook-items">
              {runbookRows.map((row) => (
                <button key={row.slug} type="button">
                  <strong>{row.title}</strong>
                  <span>{row.slug}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="ai-runbook-editor">
            <label>Slug (파일명, 확장자 제외)</label>
            <input defaultValue="sso-eam-auth-failure" />
            <label>Markdown 본문</label>
            <textarea defaultValue={"# SSO/EAM 인증 장애\n\n## 증상\n\n## 확인 절차\n\n## 조치"} />
            <div className="ai-runbook-footer">
              <button className="btn btn--danger" type="button">삭제</button>
              <button className="btn" type="button">미리보기</button>
              <button className="btn btn--primary" type="button">저장</button>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function AiPageHeader({ action, description, eyebrow, icon, title }) {
  return (
    <header className="ai-page__header">
      <div className="ai-page__title-wrap">
        <div className="ai-page__icon">{icon}</div>
        <div>
          <div className="ai-page__eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      {action}
    </header>
  );
}
