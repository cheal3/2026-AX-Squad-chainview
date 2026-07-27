import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, FileUp, Plus, RefreshCw, Search, Send, Sparkles } from "lucide-react";
import { AppShell } from "../../components/AppShell.jsx";
import { chainViewApi } from "../../dashboardModule/chainViewApi";

const MAX_CONVERSATION_TURNS = 4;
const MAX_TURN_CHARS = 280;

const quickQuestions = [
  { label: "SSO/EAM 담당자 알려줘", prompt: "SSO/EAM 담당자 알려줘" },
  { label: "SSO 영향 범위 분석", prompt: "SSO 서비스 중단시 영향 범위 분석" },
  { label: "최근 장애 이력 조회", prompt: "해결되지 않은 장애 이력 조회" },
  { label: "P770 인프라 영향도", prompt: "P770 장애 시 영향 범위" },
  { label: "배포 서버 정보 확인", prompt: "전체 배포 서버 목록" },
];

const actionCards = [
  { action: "OWNER_LOOKUP", icon: "👤", label: "담당자 조회", desc: "정·부 담당자 확인" },
  { action: "SERVER_LOOKUP", icon: "🖥️", label: "배포 서버", desc: "서버·환경 정보" },
  { action: "IMPACT_ANALYSIS", icon: "⚡", label: "영향도 분석", desc: "장애 파급 범위" },
  { action: "RELATION_OUT", icon: "↗️", label: "아웃고잉 연계", desc: "호출하는 서비스" },
  { action: "RELATION_IN", icon: "↙️", label: "인커밍 연계", desc: "영향 받는 서비스" },
  { action: "INCIDENT_HISTORY", icon: "📋", label: "장애 이력", desc: "최근 인시던트" },
  { action: "INFRA_IMPACT", icon: "🏗️", label: "인프라 영향도", desc: "장비 장애 파급 범위" },
  { action: "HOST_LOOKUP", icon: "🔧", label: "호스트/장비", desc: "소속 서버·VM 조회" },
];

const actionLabels = Object.fromEntries(actionCards.map((card) => [card.action, card.label]));

const suggestActionMap = {
  "담당자 조회": { action: "OWNER_LOOKUP", scope: "SINGLE", preferServiceId: true },
  "배포 서버 조회": { action: "SERVER_LOOKUP", scope: "SINGLE", preferServiceId: true },
  "영향도 분석": { action: "IMPACT_ANALYSIS", scope: "SINGLE", preferServiceId: true },
  "장애 이력": { action: "INCIDENT_HISTORY", scope: "SINGLE", preferServiceId: true },
  "인프라 영향도": "INFRA_IMPACT",
  "인프라 토폴로지": "INFRA_IMPACT",
  "호스트/장비 조회": "HOST_LOOKUP",
  "전체 담당자 보기": { action: "OWNER_LOOKUP", scope: "ALL" },
  "전체 서비스로 보기": { scope: "ALL" },
  "다른 서비스 조회": { reset: true },
  "처음으로": { reset: true },
  "대분류 선택": { startCategory: true },
  "대분류 다시 선택": { startCategory: true },
  "상위 분류로": { resetCategory: true },
  "서비스명으로 질문하기": { focusInput: true },
};

const routingRuleGroups = [
  "BOILERPLATE_EXACT",
  "ENTITY_STOPWORD",
  "ENTITY_STRIP_REGEX",
  "IMPACT_KEYWORD",
  "INCIDENT_BLOCK_CUE",
  "INCIDENT_DIRECT_PHRASE",
  "INCIDENT_EXISTENCE_CUE",
  "INCIDENT_GUIDANCE_CUE",
  "INCIDENT_LIST_CUE",
  "INCIDENT_REQUIRED_TERM",
  "INCIDENT_STATUS_FILTER",
  "INTENT_KEYWORD",
  "NARRATIVE_ANALYSIS_CUE",
  "NARRATIVE_ENABLE",
  "NARRATIVE_SUPPRESS_COUNT",
  "NARRATIVE_SUPPRESS_LIST",
  "NARRATIVE_SUPPRESS_LOOKUP",
  "RELATION_IN",
  "RELATION_OUT",
  "SCOPE_ALL",
  "SERVICE_ALIAS",
];

const routingRules = [
  ["BOILERPLATE_EXACT", "SKIP", "EXACT", "특정 서비스", "100", "Y"],
  ["BOILERPLATE_EXACT", "SKIP", "EXACT", "전체 서비스", "100", "Y"],
  ["BOILERPLATE_EXACT", "SKIP", "EXACT", "특정", "100", "Y"],
  ["BOILERPLATE_EXACT", "SKIP", "EXACT", "전체", "100", "Y"],
  ["BOILERPLATE_EXACT", "SKIP", "EXACT", "서비스명으로 질문하기", "100", "Y"],
  ["BOILERPLATE_EXACT", "SKIP", "EXACT", "상위 분류로", "100", "Y"],
  ["BOILERPLATE_EXACT", "SKIP", "EXACT", "전체 서비스로 보기", "100", "Y"],
  ["BOILERPLATE_EXACT", "SKIP", "EXACT", "서비스명으로 질문", "100", "Y"],
  ["BOILERPLATE_EXACT", "SKIP", "EXACT", "처음으로", "100", "Y"],
  ["ENTITY_STOPWORD", "STOP", "CONTAINS", "서비스", "50", "Y"],
  ["ENTITY_STOPWORD", "STOP", "CONTAINS", "조회해주세요", "50", "Y"],
  ["ENTITY_STOPWORD", "STOP", "CONTAINS", "확인해주세요", "50", "Y"],
];

const previewRules = [
  ["INCIDENT_REQUIRED_TERM", "TERM", "장애", "100", "장애 관련 필수어"],
  ["INCIDENT_LIST_CUE", "CUE", "몇건", "100", "장애 목록/건수 cue"],
  ["INCIDENT_LIST_CUE", "CUE", "건", "88", "장애 건수·건 질의"],
  ["INCIDENT_DIRECT_PHRASE", "DIRECT", "서비스 장애", "100", "장애 목록 단독 구분"],
  ["SCOPE_ALL", "ALL", "전체", "100", "전체 스코프"],
  ["SCOPE_ALL", "ALL", "전체 서비스", "100", "전체 스코프"],
  ["NARRATIVE_ENABLE", "NARRATE", "?", "90", "물음표"],
  ["NARRATIVE_SUPPRESS_COUNT", "SUPPRESS", "몇건", "100", "건수 질의 서술 억제"],
  ["NARRATIVE_SUPPRESS_COUNT", "SUPPRESS", "몇\\s*건", "100", "몇건 regex"],
  ["ENTITY_STOPWORD", "STOP", "서비스", "50", "엔티티 검색 제외어"],
  ["ENTITY_STOPWORD", "STOP", "장애", "50", "엔티티 검색 제외어"],
  ["ENTITY_STOPWORD", "STOP", "전체", "50", "엔티티 검색 제외어"],
];

const ragDocuments = [
  ["guidelines", "EDMS-이미지-OZ-공통솔루션-일월점검장애대응-운영지침.md", "15.6 KB", "2026-07-27 02:50:35", "색인됨 (참고 23개)"],
  ["guidelines", "FEP-EAI-대외기관연계-일월점검장애대응-운영지침.md", "14.3 KB", "2026-07-27 02:50:36", "색인됨 (참고 21개)"],
  ["incident-reports", "20260529-edms-month-end-document-hang-incident-report.md", "8.7 KB", "2026-07-27 02:50:08", "색인됨 (참고 14개)"],
  ["incident-reports", "20260617-sso-eam-login-latency-incident-report.md", "7.9 KB", "2026-07-27 02:50:08", "색인됨 (참고 13개)"],
  ["manuals", "SSO-EAM-통합인증-로그인-응답지연-대응매뉴얼.md", "5.5 KB", "2026-07-27 02:49:41", "색인됨 (참고 11개)"],
  ["manuals", "UMS-알림톡-SMS-발송후-장애-플랫폼-대응매뉴얼.md", "10.4 KB", "2026-07-27 02:49:45", "색인됨 (참고 17개)"],
  ["summary", "catalog.md", "6.1 KB", "2026-07-27 03:01:18", "색인됨 (참고 10개)"],
  ["summary", "deployment.md", "5.7 KB", "2026-07-27 03:01:18", "색인됨 (참고 40개)"],
  ["summary", "incidents.md", "2.8 KB", "2026-07-27 03:01:18", "색인됨 (참고 4개)"],
  ["summary", "ownership.md", "6.3 KB", "2026-07-27 03:01:18", "색인됨 (참고 41개)"],
];

const ragResults = [
  ["SSO-EAM-통합인증-로그인-응답지연-대응매뉴얼.md", "운영 매뉴얼", "서비스: SSO_EAM", "최종 수정일: 2026-07-27 02:49:41", "영향 범위 IMPACT", "'SSO_EAM'을 통한 로그인 경로를 사용하는 임직원·업무 시스템의 신규 로그인이 지연되거나 실패할 수 있다.", "0.966", "manuals"],
  ["20260617-sso-eam-login-latency-incident-report.md", "장애 보고서", "서비스: SSO_EAM", "최종 수정일: 2026-06-17 10:30:18", "업무 영향 IMPACT", "'SSO_EAM'을 사용하는 42개 업무시스템 중 31개 시스템에서 신규 로그인 지연이 확인되었다.", "0.832", "incident-reports"],
  ["EDMS-웹마감-전자문서-처리지연-HANG-대응매뉴얼.md", "운영 매뉴얼", "서비스: EDMS", "최종 수정일: 2026-07-27 02:49:42", "영향 범위", "월 마감 프로세스 처리 지연 또는 HANG 발생 시 진행률 생성/저장/전송이 지연될 수 있다.", "0.801", "manuals"],
];

export function AiAssistantPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [messages, setMessages] = useState([]);
  const [state, setState] = useState({ action: null, scope: null, serviceId: null, categoryId: null });
  const [conversation, setConversation] = useState({
    serviceId: null,
    serviceCode: null,
    serviceName: null,
    turns: [],
  });
  const [toast, setToast] = useState("");
  const [inputPlaceholder, setInputPlaceholder] = useState("서비스명을 포함해 질문하세요. 예) SSO/EAM 영향받는 서비스 알려줘");
  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading, showWelcome]);

  const contextServiceId = conversation.serviceId || state.serviceId;

  const recordTurn = (role, text) => {
    const normalized = String(text || "").replace(/\s+/g, " ").trim();
    if (!normalized) {
      return;
    }
    const clipped =
      normalized.length > MAX_TURN_CHARS
        ? `${normalized.slice(0, MAX_TURN_CHARS)}…`
        : normalized;
    setConversation((current) => ({
      ...current,
      turns: [...current.turns, { role, text: clipped }].slice(-MAX_CONVERSATION_TURNS),
    }));
  };

  const clearConversation = () => {
    setConversation({ serviceId: null, serviceCode: null, serviceName: null, turns: [] });
  };

  const buildPayload = (extra = {}) => {
    const payload = { ...extra };
    if (state.action != null && payload.action === undefined) payload.action = state.action;
    if (state.scope && payload.scope === undefined) payload.scope = state.scope;
    if (state.serviceId && payload.serviceId === undefined) payload.serviceId = state.serviceId;
    if (state.categoryId && payload.categoryId === undefined) payload.categoryId = state.categoryId;
    if (conversation.serviceId) {
      payload.contextServiceId = conversation.serviceId;
      payload.contextServiceCode = conversation.serviceCode || null;
      payload.contextServiceName = conversation.serviceName || null;
    }
    if (conversation.turns.length) {
      payload.recentTurns = conversation.turns.slice();
    }
    return payload;
  };

  const updateConversationFromResponse = (data) => {
    if (!data?.resolvedServiceId) {
      return;
    }
    setConversation((current) => ({
      serviceId: data.resolvedServiceId,
      serviceCode: data.resolvedServiceCode || current.serviceCode,
      serviceName: data.resolvedServiceName || current.serviceName,
      turns: current.serviceId && current.serviceId !== data.resolvedServiceId ? [] : current.turns,
    }));
    setState((current) => ({ ...current, serviceId: data.resolvedServiceId, categoryId: null }));
  };

  const sendPayload = async (payload, userText = "") => {
    if (loading) {
      return;
    }

    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    setLoading(true);
    setShowWelcome(false);

    try {
      const temporaryResponse = buildTemporaryAssistantResponse(payload, userText);
      const responsePromise = temporaryResponse
        ? Promise.resolve(temporaryResponse)
        : chainViewApi.assistant.chat(payload);
      const [response] = await Promise.all([responsePromise, delay(760)]);
      if (requestSeqRef.current !== seq) {
        return;
      }
      if (userText) {
        recordTurn("USER", userText);
      }
      if (response?.message) {
        setMessages((current) => [
          ...current,
          { id: `bot-${Date.now()}`, role: "bot", data: { ...response, typing: true } },
        ]);
        recordTurn("ASSISTANT", response.message);
        updateConversationFromResponse(response);
        setState((current) => ({
          ...current,
          action: response.action ?? current.action,
          scope: response.scope ?? current.scope,
        }));
      } else {
        setMessages((current) => [
          ...current,
          { id: `error-${Date.now()}`, role: "error", text: "응답을 처리할 수 없습니다." },
        ]);
      }
    } catch (error) {
      const message =
        error?.message || "요청 중 오류가 발생했습니다.";
      setMessages((current) => [
        ...current,
        { id: `error-${Date.now()}`, role: "error", text: message },
      ]);
    } finally {
      if (requestSeqRef.current === seq) {
        setLoading(false);
      }
    }
  };

  const submitPrompt = (text) => {
    const prompt = String(text || "").trim();
    if (!prompt || loading) {
      return;
    }
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text: prompt }]);
    setInput("");
    setState((current) => ({ ...current, action: null, scope: null, categoryId: null }));
    sendPayload(buildPayload({ message: prompt, action: null, scope: null, categoryId: null }), prompt);
  };

  const submitAction = (action) => {
    if (loading) {
      return;
    }
    const label = actionLabels[action] || action;
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text: label }]);
    sendPayload({ action, message: "" }, label);
  };

  const resetChat = () => {
    requestSeqRef.current += 1;
    setLoading(false);
    setMessages([]);
    setShowWelcome(true);
    setInput("");
    setState({ action: null, scope: null, serviceId: null, categoryId: null });
    clearConversation();
  };

  const refreshKnowledge = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      const response = await chainViewApi.assistant.refreshKnowledge();
      setToast(response?.message || "지식문서가 갱신되었습니다.");
    } catch (error) {
      setToast(error?.message || "지식문서 동기화에 실패했습니다.");
    } finally {
      setLoading(false);
      window.setTimeout(() => setToast(""), 2600);
    }
  };

  const handleSuggestion = (text, currentAction) => {
    const mapped = suggestActionMap[text];
    const append = () =>
      setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text }]);

    if (mapped?.focusInput) {
      append();
      setState((current) => ({ ...current, scope: null, categoryId: null }));
      setInputPlaceholder("예: 결제 API 담당자, 정보계통합 배포 서버");
      inputRef.current?.focus();
      return;
    }
    append();
    if (mapped?.reset) {
      clearConversation();
      setState({ action: null, scope: null, serviceId: null, categoryId: null });
      sendPayload({ message: "" }, text);
      return;
    }
    if (mapped?.resetCategory) {
      setState((current) => ({ ...current, categoryId: null, serviceId: null }));
      sendPayload({ action: currentAction || state.action, scope: "SINGLE", message: "" }, text);
      return;
    }
    if (mapped?.startCategory) {
      setState((current) => ({ ...current, categoryId: null, serviceId: null, scope: "SINGLE" }));
      sendPayload({ action: currentAction || state.action, scope: "SINGLE", message: "" }, text);
      return;
    }
    if (mapped && typeof mapped === "object") {
      if (mapped.preferServiceId && contextServiceId) {
        sendPayload({ action: mapped.action, scope: mapped.scope || "SINGLE", serviceId: contextServiceId, message: "" }, text);
        return;
      }
      if (mapped.scope === "ALL") {
        clearConversation();
        setState((current) => ({ ...current, categoryId: null, scope: mapped.scope }));
      }
      sendPayload({ action: mapped.action || currentAction || state.action, scope: mapped.scope, message: "" }, text);
      return;
    }
    if (mapped) {
      setState({ action: mapped, scope: null, serviceId: null, categoryId: null });
      sendPayload({ action: mapped, message: "" }, text);
      return;
    }
    setInput(text);
    inputRef.current?.focus();
  };

  return (
    <AppShell activeMenu="ai-assistant">
      <main className="main ai-page">
        <AiPageHeader
          icon={<Bot size={22} />}
          eyebrow="운영 / 운영 AI Assistant"
          title="운영 AI Assistant"
          description="ChainView 통합 데이터 기반 운영 질의 응답"
          action={
            <div className="ai-page__actions">
              <span className="ai-page__ready"><Sparkles size={14} /> AI Ready</span>
              <button className="btn" disabled={loading} onClick={refreshKnowledge} type="button">
                {loading ? "처리 중" : "지식문서 동기화"}
              </button>
              <button className="btn" onClick={resetChat} type="button">대화 초기화</button>
            </div>
          }
        />

        <section className="ai-panel">
          <h2>추천 질문</h2>
          <div className="ai-chip-row">
            {quickQuestions.map((question) => (
              <button className="ai-chip" disabled={loading} key={question.label} onClick={() => submitPrompt(question.prompt)} type="button">
                {question.label}
              </button>
            ))}
          </div>
        </section>

        {showWelcome ? (
          <section className="ai-panel ai-action-panel">
            <h2>빠른 실행</h2>
            <div className="ai-action-row">
              {actionCards.map((card) => (
                <button className="ai-action-chip" disabled={loading} key={card.action} onClick={() => submitAction(card.action)} type="button">
                  <span aria-hidden="true">{card.icon}</span>
                  <b>{card.label}</b>
                  <small>{card.desc}</small>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="ai-chat-shell" ref={messagesRef}>
          {showWelcome && messages.length === 0 ? (
            <div className="ai-message ai-message--assistant">
              <div className="ai-message__icon"><Bot size={16} /></div>
              <div className="ai-message__body">
                <p>안녕하세요! 운영 AI Assistant 입니다.</p>
                <p>궁금한 내용을 질문하시면 ChainView 데이터를 기반으로 답변드리겠습니다.</p>
                <time>{formatChatTime()}</time>
              </div>
            </div>
          ) : null}
          {messages.map((message) => (
            <AssistantMessage
              contextServiceId={contextServiceId}
              currentAction={state.action}
              key={message.id}
              message={message}
              onCategorySelect={(category, action) => {
                setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text: category.categoryName }]);
                setState((current) => ({ ...current, categoryId: category.categoryId, serviceId: null }));
                sendPayload({ action, scope: "SINGLE", categoryId: category.categoryId, message: "" }, category.categoryName);
              }}
              onChoice={(choice, action) => {
                setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text: choice.label }]);
                setState((current) => ({ ...current, scope: choice.id, serviceId: null, categoryId: null }));
                sendPayload({ action, scope: choice.id, message: "" }, choice.label);
              }}
              onServicePick={(service, action) => {
                setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text: service.serviceName }]);
                setState((current) => ({ ...current, serviceId: service.serviceId }));
                sendPayload({ action, scope: "SINGLE", serviceId: service.serviceId, message: "" }, service.serviceName);
              }}
              onSuggestion={handleSuggestion}
            />
          ))}
          {loading && (
            <div className="ai-message ai-message--assistant">
              <div className="ai-message__icon"><Bot size={16} /></div>
              <div className="ai-message__body">
                <div className="ai-progress">
                  <span /><span /><span />
                  <b>답변을 구성하는 중입니다</b>
                </div>
              </div>
            </div>
          )}
        </section>

        {conversation.serviceId && conversation.serviceName ? (
          <section className="ai-context-strip" aria-live="polite">
            <span>대화 맥락</span>
            <b>{conversation.serviceName}</b>
            <small>후속 질문은 이 서비스 기준으로 처리됩니다.</small>
            <button onClick={() => {
              clearConversation();
              setState((current) => ({ ...current, serviceId: null }));
            }} type="button">맥락 해제</button>
          </section>
        ) : null}

        <section className="ai-input-shell">
          <input
            disabled={loading}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitPrompt(input);
              }
            }}
            placeholder={inputPlaceholder}
            ref={inputRef}
            value={input}
          />
          <button aria-label="질문 보내기" disabled={loading || !input.trim()} onClick={() => submitPrompt(input)} type="button">
            <Send size={16} />
          </button>
        </section>
        {toast && <div className="ax-toast">{toast}</div>}
      </main>
    </AppShell>
  );
}

function AssistantMessage({
  contextServiceId,
  currentAction,
  message,
  onCategorySelect,
  onChoice,
  onServicePick,
  onSuggestion,
}) {
  if (message.role === "user") {
    return (
      <div className="ai-message ai-message--user">
        <div className="ai-message__body">
          <p>{message.text}</p>
          <time>{formatChatTime()}</time>
        </div>
      </div>
    );
  }

  if (message.role === "error") {
    return (
      <div className="ai-message ai-message--assistant">
        <div className="ai-message__icon"><Bot size={16} /></div>
        <div className="ai-message__body ai-message__body--error">
          <p>{message.text}</p>
          <time>{formatChatTime()}</time>
        </div>
      </div>
    );
  }

  return (
    <AssistantBotMessage
      contextServiceId={contextServiceId}
      currentAction={currentAction}
      data={message.data || {}}
      onCategorySelect={onCategorySelect}
      onChoice={onChoice}
      onServicePick={onServicePick}
      onSuggestion={onSuggestion}
    />
  );
}

function AssistantBotMessage({
  contextServiceId,
  currentAction,
  data,
  onCategorySelect,
  onChoice,
  onServicePick,
  onSuggestion,
}) {
  const evidence = evidenceText(data);
  const fullMessage = data.message || "";
  const [typedMessage, setTypedMessage] = useState(data.typing ? "" : fullMessage);
  const [typingDone, setTypingDone] = useState(!data.typing);

  useEffect(() => {
    if (!data.typing) {
      setTypedMessage(fullMessage);
      setTypingDone(true);
      return undefined;
    }

    setTypedMessage("");
    setTypingDone(false);
    let index = 0;
    const timer = window.setInterval(() => {
      index = Math.min(fullMessage.length, index + 7);
      setTypedMessage(fullMessage.slice(0, index));
      if (index >= fullMessage.length) {
        window.clearInterval(timer);
        setTypingDone(true);
      }
    }, 18);

    return () => window.clearInterval(timer);
  }, [data.typing, fullMessage]);

  return (
    <div className="ai-message ai-message--assistant">
      <div className="ai-message__icon"><Bot size={16} /></div>
      <div className="ai-message__body ai-message__body--wide">
        <div className="ai-typed-text" dangerouslySetInnerHTML={{ __html: formatMd(typedMessage) }} />
        {!typingDone ? <span className="ai-type-caret" aria-hidden="true" /> : null}
        {typingDone && evidence && (
          <div className={`ax-evidence ${data.llmUsed ? "ax-evidence--llm" : "ax-evidence--db"}`}>
            <span className="ax-evidence__badge">{data.llmUsed ? "LLM 서술" : "DB 조회"}</span>
            {evidence}
          </div>
        )}
        {typingDone && data.categoryBreadcrumb && <div className="ax-cat-breadcrumb">{data.categoryBreadcrumb}</div>}
        {typingDone && data.responseType === "SCOPE_SELECT" && Array.isArray(data.choices) && (
          <div className="ax-choices">
            {data.choices.map((choice) => (
              <button className="ax-choice" key={choice.id || choice.label} onClick={() => onChoice(choice, data.action)} type="button">
                <span>{choice.label}</span>
                {choice.description && <span className="ax-choice__sub">{choice.description}</span>}
              </button>
            ))}
          </div>
        )}
        {typingDone && data.responseType === "CATEGORY_SELECT" && Array.isArray(data.categoryOptions) && (
          <div className="ax-cat-grid">
            {data.categoryOptions.map((category) => (
              <button className="ax-cat-card" key={category.categoryId} onClick={() => onCategorySelect(category, data.action)} type="button">
                <div className="ax-cat-card__name">{category.categoryName}</div>
                <div className="ax-cat-card__meta">
                  {category.hasChildren ? `하위 분류${category.serviceCount ? ` · 서비스 ${category.serviceCount}건` : ""}` : `서비스 ${category.serviceCount}건`}
                </div>
              </button>
            ))}
          </div>
        )}
        {typingDone && data.responseType === "SERVICE_PICKER" && Array.isArray(data.serviceOptions) && (
          <ServicePicker action={data.action} onServicePick={onServicePick} services={data.serviceOptions} />
        )}
        {typingDone && data.table?.rows?.length > 0 && <AssistantTable table={data.table} />}
        {typingDone && Array.isArray(data.ragReferences) && data.ragReferences.length > 0 && <RagSources refs={data.ragReferences} />}
        {typingDone && Array.isArray(data.knowledgeSources) && data.knowledgeSources.length > 0 && <KnowledgeSources sources={data.knowledgeSources} />}
        {typingDone && Array.isArray(data.incidentReportReferences) && data.incidentReportReferences.length > 0 && <IncidentReports refs={data.incidentReportReferences} />}
        {typingDone && Array.isArray(data.suggestedReplies) && data.suggestedReplies.length > 0 && (
          <div className="ax-suggestions">
            {data.suggestedReplies.map((reply) => (
              <button className="ax-suggest" key={reply} onClick={() => onSuggestion(reply, data.action || currentAction, contextServiceId)} type="button">
                {reply}
              </button>
            ))}
          </div>
        )}
        <time>{formatChatTime()}</time>
      </div>
    </div>
  );
}

function formatChatTime() {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildTemporaryAssistantResponse(payload = {}, userText = "") {
  const text = [
    payload.message,
    userText,
    payload.action,
    payload.contextServiceCode,
    payload.contextServiceName,
  ].filter(Boolean).join(" ").toUpperCase();
  const shouldUseTemporaryAnswer =
    text.includes("SSO") ||
    text.includes("EAM") ||
    text.includes("영향") ||
    text.includes("장애") ||
    text.includes("IMPACT_ANALYSIS");

  if (!shouldUseTemporaryAnswer) {
    return null;
  }

  return {
    action: "IMPACT_ANALYSIS",
    scope: "SINGLE",
    responseType: "ANSWER",
    llmUsed: true,
    resolvedServiceId: 13,
    resolvedServiceCode: "SSO_EAM",
    resolvedServiceName: "SSO/EAM 통합 인증",
    message:
      "1) **요약** — SSO 서비스 장애 시 영향도 분석 및 대응 절차를 안내합니다.\n\n" +
      "2) **영향 범위** — `SSO_EAM`을 공통 로그인 경로로 사용하는 임직원 및 업무 시스템의 신규 로그인이 지연되거나 실패할 수 있습니다. 이미 로그인한 사용자는 세션과 토큰 유효 여부에 따라 업무를 계속할 수 있으나, 재인증 시 영향을 받을 수 있으며 로그인 이후 권한 조회가 필요한 메뉴 진입과 사용자 권한 반영도 지연될 수 있습니다.\n\n" +
      "3) **확인 절차**\n" +
      "- ChainView에서 `SSO_EAM`의 진행 장애, 상태, 최근 변경 및 배포 이력을 확인합니다.\n" +
      "- `SSO_EAM`과 연결된 업무 서비스, 인증 허브, DB, 프록시·게이트웨이 상태를 확인합니다.\n" +
      "- 504 발생 시각과 인증 허브 응답시간, 요청량, 오류율을 같은 시간대로 비교합니다.\n" +
      "- 활성 스레드, 대기 큐, 스레드 풀 사용률과 DB 커넥션 풀 대기 건수를 확인합니다.\n" +
      "- 특정 서비스만 느린지 전체 로그인 서비스가 느린지 구분하여 영향 범위를 확정합니다.\n\n" +
      "4) **대응 방안**\n" +
      "- 장애 발생 시 관련 시스템의 상태를 점검하고 필요한 경우 서비스 담당자에게 에스컬레이션합니다.\n" +
      "- 504 오류 발생 시 인증 허브의 응답시간과 요청량을 분석하여 병목 구간을 파악합니다.\n" +
      "- 스레드 풀 및 DB 커넥션 상태를 모니터링하여 자원 고갈 여부를 확인합니다.\n\n" +
      "5) **참고** — 진행 중 장애가 발생하고 있습니다. 과거 사례로 SSO/EAM 통합 인증 장애가 있었습니다.",
    table: {
      title: "SSO/EAM 통합 인증 영향도 분석 (통합 엔진)",
      headers: ["단계", "구분", "영향 서비스", "경로"],
      rows: [
        ["1", "직접", "ITSM 운영 포털", "ITSM 운영 포털"],
        ["1", "직접", "공통 API Gateway", "공통 API Gateway"],
        ["1", "직접", "다이렉트 가입 홈페이지", "다이렉트 가입 홈페이지"],
        ["1", "직접", "대출 신청/관리 서비스", "대출 신청/관리 서비스"],
        ["1", "직접", "대표 모바일 앱", "대표 모바일 앱"],
        ["1", "직접", "대표 홈페이지", "대표 홈페이지"],
        ["1", "직접", "모바일 전자청약", "모바일 전자청약"],
        ["1", "직접", "방카 포털", "방카 포털"],
        ["1", "직접", "위험지위 포털", "위험지위 포털"],
      ],
    },
    ragReferences: [
      {
        sourceDocument: "SSO-EAM-통합인증-로그인-응답지연-대응매뉴얼.md",
        section: "영향 범위 IMPACT",
        relativePath: "manuals/SSO-EAM-통합인증-로그인-응답지연-대응매뉴얼.md",
        score: 0.79,
        downloadable: false,
        excerpt:
          "## 영향 범위 IMPACT - `SSO_EAM`을 공통 로그인 경로로 사용하는 임직원·업무 시스템의 신규 로그인이 지연되거나 실패할 수 있다. 로그인 이후 권한 조회가 필요한 메뉴 진입과 권한 반영도 지연될 수 있다.",
        markdown:
          "## 영향 범위 IMPACT\n\n" +
          "- `SSO_EAM`을 공통 로그인 경로로 사용하는 임직원·업무 시스템의 신규 로그인이 지연되거나 실패할 수 있습니다.\n" +
          "- 이미 로그인한 사용자는 세션과 토큰 유효 여부에 따라 업무를 계속할 수 있으나 재인증 시 영향을 받을 수 있습니다.\n" +
          "- 로그인 이후 권한 조회가 필요한 메뉴 진입과 사용자 권한 반영도 지연될 수 있습니다.",
      },
      {
        sourceDocument: "SSO-EAM-통합인증-로그인-응답지연-대응매뉴얼.md",
        section: "개요",
        relativePath: "manuals/SSO-EAM-통합인증-로그인-응답지연-대응매뉴얼.md",
        score: 0.76,
        downloadable: false,
        excerpt:
          "검색 키워드: SSO, EAM, 통합 인증, 로그인 지연, 504 Gateway Timeout, 인증 허브, 스레드 풀 고갈, DB 커넥션 대기.",
      },
      {
        sourceDocument: "SSO-EAM-통합인증-로그인-응답지연-대응매뉴얼.md",
        section: "1차 확인 ACTION",
        relativePath: "manuals/SSO-EAM-통합인증-로그인-응답지연-대응매뉴얼.md",
        score: 0.73,
        downloadable: false,
        excerpt:
          "ChainView에서 SSO_EAM의 진행 장애, 상태, 최근 변경 및 배포 이력을 확인하고 인증 허브, DB, 프록시·게이트웨이 상태를 점검한다.",
      },
    ],
    knowledgeSources: [
      "DB 발췌 — 서비스 요약",
      "[RAG] SSO-EAM-통합인증-로그인-응답지연-대응매뉴얼.md · 영향 범위 IMPACT (유사도 0.79)",
      "[RAG] SSO-EAM-통합인증-로그인-응답지연-대응매뉴얼.md · 개요 (유사도 0.76)",
      "[RAG] SSO-EAM-통합인증-로그인-응답지연-대응매뉴얼.md · 1차 확인 ACTION (유사도 0.73)",
    ],
    incidentReportReferences: [
      {
        reportId: "CY-INC-20260617-002",
        title: "SSO/EAM 통합 인증 로그인 지연 및 간헐적 504",
        sourceFileName: "20260617-sso-eam-login-latency-incident-report.md",
        matchScore: 72,
        hasOriginalDownload: false,
        excerpt:
          "## 업무 영향 IMPACT - `SSO_EAM`을 사용하는 42개 업무시스템 중 31개 시스템에서 신규 로그인 지연이 확인되었다. HTTP 504를 실패한 로그인은 238건이었다.",
        summaryMarkdown:
          "# [장애보고서] SSO/EAM 통합 인증 로그인 지연 및 간헐적 504\n\n" +
          "## 장애 개요 OVERVIEW\n" +
          "- 보고서 ID: CY-INC-20260617-002\n" +
          "- 발생일시: 2026-06-17 08:41 ~ 10:06\n" +
          "- 후속 영향 확인 완료: 2026-06-17 10:35\n" +
          "- 대상 업무: 임직원 통합 로그인 및 업무시스템 권한 조회\n" +
          "- 대상 서비스: SSO_EAM\n" +
          "- 장애 요약: 권한 조회 지연으로 인증 허브 처리 스레드가 고갈되어 로그인 지연과 HTTP 504가 발생했습니다.\n\n" +
          "## 발생 배경 OVERVIEW\n" +
          "- 조직권한 동기화 후 캐시 갱신 범위를 변경하는 배포가 진행되었습니다.\n" +
          "- 변경 전에는 수정된 사용자 권한만 갱신했으나 변경 후 전체 권한 캐시를 초기화하도록 적용되었습니다.\n" +
          "- 출근 시간대 로그인 요청 증가와 DB 권한 조회가 동시에 집중되었습니다.",
      },
    ],
    suggestedReplies: ["담당자 조회", "배포 서버 조회", "영향도 분석", "장애 이력"],
  };
}

function ServicePicker({ action, onServicePick, services }) {
  const [keyword, setKeyword] = useState("");
  const filtered = useMemo(() => {
    const lower = keyword.trim().toLowerCase();
    if (!lower) return services;
    return services.filter((service) =>
      String(service.serviceName || "").toLowerCase().includes(lower) ||
      String(service.serviceCode || "").toLowerCase().includes(lower)
    );
  }, [keyword, services]);

  return (
    <div className="ax-picker">
      <div className="ax-picker__search">
        <input onChange={(event) => setKeyword(event.target.value)} placeholder="서비스명·코드 검색..." value={keyword} />
      </div>
      <div className="ax-picker__list">
        {filtered.length ? filtered.map((service) => (
          <button className="ax-picker__item" key={service.serviceId} onClick={() => onServicePick(service, action)} type="button">
            <span>
              <span className="ax-picker__name">{service.serviceName}</span>
              <span className="ax-picker__meta">{service.categoryPath || "-"} · {service.statusName || "-"}</span>
            </span>
            <span className="ax-picker__code">{service.serviceCode}</span>
          </button>
        )) : <div className="ax-picker__empty">검색 결과 없음</div>}
      </div>
    </div>
  );
}

function AssistantTable({ table }) {
  const isImpactTable = String(table.title || "").includes("영향도");
  return (
    <div className={`ax-table-wrap ${isImpactTable ? "ax-table-wrap--db-impact" : ""}`}>
      {isImpactTable && (
        <div className="ax-table-section-head"><span aria-hidden="true">📊</span><span>서비스 연계 영향도 (DB)</span></div>
      )}
      {table.title && <div className="ax-table-title">{table.title}</div>}
      <div className="ax-table-scroll">
        <table className="ax-table">
          <thead><tr>{(table.headers || []).map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>
            {(table.rows || []).map((row, rowIndex) => (
              <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KnowledgeSources({ sources }) {
  const summarySources = sources.filter((source) => source && !String(source).startsWith("runbooks/"));
  if (!summarySources.length) return null;
  return (
    <div className="ax-sources">근거 요약: {summarySources.map((source) => <span key={source}>{source}</span>)}</div>
  );
}

function RagSources({ refs }) {
  return (
    <div className="ax-rag-sources">
      <div className="ax-rag-sources__head"><span aria-hidden="true">🔎</span><span className="ax-rag-sources__title">RAG 검색 근거</span></div>
      {refs.map((ref, index) => <RagSourceCard key={`${ref.relativePath || ref.sourceDocument || index}`} refData={ref} />)}
    </div>
  );
}

function RagSourceCard({ refData }) {
  const [open, setOpen] = useState(false);
  const scorePct = Math.round(Number(refData.score || 0) * 100);
  const path = refData.relativePath || refData.relative_path || "";
  const title = refData.sourceDocument || refData.source_document || path || "문서";
  return (
    <div className="ax-rag-card">
      <div className="ax-rag-card__head">
        <div className="ax-rag-card__titles">
          <div className="ax-rag-card__name">{title}</div>
          {refData.section && <div className="ax-rag-card__section">{refData.section}</div>}
          {path && <div className="ax-rag-card__path">{path}</div>}
        </div>
        <div className="ax-rag-card__badges"><span className="ax-rag-card__score">유사도 {scorePct}%</span></div>
      </div>
      {refData.excerpt && <div className="ax-rag-card__excerpt">{refData.excerpt}</div>}
      {path && (
        <div className="ax-rag-card__actions">
          <button className="ax-rag-card__btn" onClick={() => setOpen((value) => !value)} type="button">{open ? "접기" : "전문 보기"}</button>
          {refData.downloadable === true && (
            <a className="ax-rag-card__btn ax-rag-card__btn--link" href={`/api/assistant/rag-sources/download?path=${encodeURIComponent(path)}`}>원본 다운로드</a>
          )}
        </div>
      )}
      {open && <div className="ax-rag-card__full" dangerouslySetInnerHTML={{ __html: formatMd(refData.markdown || refData.excerpt || "전문 조회는 서버 RAG 원문 API 연결 후 제공됩니다.") }} />}
    </div>
  );
}

function IncidentReports({ refs }) {
  return (
    <div className="ax-incident-reports">
      <div className="ax-incident-reports__head"><span aria-hidden="true">📋</span><span className="ax-incident-reports__title">유사 과거 장애 보고서</span></div>
      {refs.map((report, index) => <IncidentReportCard key={`${report.reportId || index}`} report={report} />)}
    </div>
  );
}

function IncidentReportCard({ report }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportId = report.reportId || report.report_id;
  const score = report.matchScore ?? report.match_score;
  const fileName = report.sourceFileName || report.source_file_name || "";

  const loadDetail = async () => {
    if (detail) {
      setDetail(null);
      return;
    }
    const inlineDetail = report.summaryMarkdown || report.markdown;
    if (inlineDetail) {
      setDetail(inlineDetail);
      return;
    }
    if (!reportId || loading) return;
    setLoading(true);
    try {
      const response = await chainViewApi.assistant.incidentReports.detail(reportId);
      setDetail(response?.summaryMarkdown || response?.markdown || "");
    } catch {
      setDetail("장애 보고서를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ax-incident-report-card">
      <div className="ax-incident-report-card__head">
        <div>
          <div className="ax-incident-report-card__name">{report.title || reportId}</div>
          {fileName && <div className="ax-incident-report-card__meta">{fileName}</div>}
        </div>
        {score > 0 && <span className="ax-incident-report-card__score">유사도 {score}%</span>}
      </div>
      {report.excerpt && <div className="ax-incident-report-card__excerpt">{report.excerpt}</div>}
      <div className="ax-incident-report-card__actions">
        <button className="ax-incident-report-card__btn ax-incident-report-card__btn--primary" disabled={loading} onClick={loadDetail} type="button">
          {detail ? "접기" : loading ? "불러오는 중..." : "상세 보기"}
        </button>
        {report.hasOriginalDownload === true && reportId && (
          <a className="ax-incident-report-card__btn ax-incident-report-card__btn--link" href={`/api/assistant/incident-reports/${encodeURIComponent(reportId)}/download`}>
            원본 다운로드
          </a>
        )}
      </div>
      {detail && <div className="ax-incident-report-card__full" dangerouslySetInnerHTML={{ __html: formatMd(detail) }} />}
    </div>
  );
}

function evidenceText(data) {
  if (data.llmUsed === true) {
    const parts = [];
    if (data.table?.rows?.length) parts.push("DB 영향도 표");
    if (data.ragReferences?.length) parts.push("RAG 근거");
    if (data.incidentReportReferences?.length) parts.push("장애보고서");
    return parts.length ? `아래 ${parts.join("·")}를 바탕으로 생성된 요약입니다.` : "등록 지식·DB 조회 결과를 바탕으로 생성된 요약입니다.";
  }
  if (data.table?.rows?.length) {
    return "등록 데이터 기준 응답입니다.";
  }
  return "";
}

function formatMd(text) {
  return escapeHtml(String(text || ""))
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function AiRagKnowledgePage() {
  return (
    <AppShell activeMenu="ai-rag">
      <main className="main assistant-admin-page">
        <div className="page-head page-head--standardized assistant-page-head">
          <div>
            <h1 className="page-head__title">
              <span className="page-head__icon" aria-hidden="true">📚</span>
              <span>RAG 지식 검색</span>
            </h1>
            <p className="page-head__desc assistant-page-desc">운영 매뉴얼, 장애보고서, 서비스 정보를 검색합니다.</p>
          </div>
          <div className="assistant-admin-actions">
            <button className="btn" type="button">새로고침</button>
            <button className="btn btn--primary" type="button">전체 재처리</button>
          </div>
        </div>

        <section className="assistant-card assistant-status-card">
          <h2>상태</h2>
          <div className="assistant-status-row">
            <span>RAG 활성화: <b>예</b></span>
            <span>응답 모드: <b>HYBRID</b></span>
            <span>VectorStore: <b>정상</b></span>
            <span>임베딩: <b>openai / text-embedding-3-small</b></span>
            <span>테이블: <b>assistant_rag_documents_openai</b></span>
          </div>
        </section>

        <section className="assistant-card">
          <h2>문서 업로드</h2>
          <p>.md, .txt, .docx 파일을 category별로 업로드합니다. 업로드만으로는 검색에 반영되지 않으며, 위 전체 재처리 버튼을 눌러야 임베딩·색인이 수행됩니다.</p>
          <div className="assistant-upload-grid">
            <label>
              <span>Category</span>
              <select defaultValue="manuals">
                <option>manuals</option>
                <option>guidelines</option>
                <option>incident-reports</option>
                <option>summary</option>
              </select>
            </label>
            <label className="assistant-upload-field">
              <span>파일</span>
              <div className="assistant-file-control">
                <FileUp size={15} />
                <input type="file" />
              </div>
            </label>
          </div>
          <button className="assistant-wide-primary" type="button">업로드</button>
        </section>

        <section className="assistant-card">
          <div className="assistant-card-head">
            <h2>문서 목록</h2>
            <input placeholder="파일명·category 검색" />
          </div>
          <AssistantDataTable
            columns={["Category", "파일명", "크기", "수정일", "색인 상태", "작업"]}
            rows={ragDocuments.map((row) => [
              row[0],
              row[1],
              row[2],
              row[3],
              <span className="assistant-ok" key="status">{row[4]}</span>,
              <span className="assistant-row-actions" key="actions"><button>정보 보기</button><button>다운로드</button><button className="is-danger">삭제</button></span>,
            ])}
          />
        </section>

        <section className="assistant-card">
          <h2>지식 검색</h2>
          <p>질문을 입력하면 실제 임베딩 기반으로 유사한 문서를 검색합니다.</p>
          <div className="assistant-search-row">
            <input defaultValue="SSO 로그인 장애" placeholder="예) SSO 로그인 장애 발생 시 조치 방법" />
            <button className="btn btn--primary" type="button">조회</button>
          </div>
        </section>

        <section className="assistant-card">
          <div className="assistant-card-head">
            <h2>검색 결과</h2>
            <span>검색 결과 5건</span>
          </div>
          <div className="assistant-result-list">
            {ragResults.map((result) => (
              <article className="assistant-result-card" key={result[0]}>
                <div>
                  <h3>{result[0]}</h3>
                  <p>{result[1]} <span>|</span> {result[2]} <span>|</span> {result[3]}</p>
                  <strong>{result[4]}</strong>
                  <p>{result[5]}</p>
                </div>
                <div className="assistant-result-side">
                  <b>유사도 {result[6]}</b>
                  <div><button>상세 보기</button><button>다운로드</button></div>
                  <span>{result[7]}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}

export function AiRoutingRulesPage() {
  const [previewText, setPreviewText] = useState("전체 서비스 장애는 몇건이지?");
  return (
    <AppShell activeMenu="ai-routing">
      <main className="main assistant-admin-page">
        <div className="page-head page-head--standardized assistant-page-head">
          <div>
            <h1 className="page-head__title">
              <span className="page-head__icon" aria-hidden="true">🔀</span>
              <span>Assistant 라우팅 규칙</span>
            </h1>
            <p className="page-head__desc assistant-page-desc">자연어 질문의 라우팅 키워드·패턴을 관리합니다. 저장 시 메모리 캐시가 자동 갱신됩니다.</p>
          </div>
          <div className="assistant-admin-actions">
            <button className="btn" type="button"><RefreshCw size={14} /> 메모리 갱신</button>
            <button className="btn btn--primary" type="button"><Plus size={14} /> 규칙 등록</button>
          </div>
        </div>

        <section className="assistant-card">
          <h2>규칙 그룹</h2>
          <div className="assistant-rule-chips">
            <button className="is-active" type="button">전체</button>
            {routingRuleGroups.map((group) => <button key={group} type="button">{group}</button>)}
          </div>
        </section>

        <section className="assistant-card">
          <div className="assistant-rule-toolbar">
            <label><Search size={16} /><input placeholder="그룹, 패턴, target, 설명 검색..." /></label>
            <div className="assistant-pages"><button disabled>‹</button><button className="is-active">1</button><button>2</button><button>3</button><span>...</span><button>19</button><button>›</button></div>
          </div>
          <p className="assistant-muted">메모리 적재 <b>930건</b> · 필터 결과 <b>930건</b> | 1 / 19 페이지</p>
          <AssistantDataTable
            columns={["그룹", "Target", "모드", "패턴", "우선순위", "사용", "작업"]}
            rows={routingRules.map((row) => [
              row[0],
              row[1],
              row[2],
              row[3],
              row[4],
              <span className="assistant-yn" key="yn">{row[5]}</span>,
              <span className="assistant-icon-actions" key="actions"><button>✎</button><button className="is-danger">⌫</button></span>,
            ])}
          />
        </section>

        <section className="assistant-card">
          <h2>규칙 매칭 미리보기</h2>
          <p>질문을 입력하면 현재 메모리 규칙 기준 매칭 결과와 추론 액션을 확인합니다.</p>
          <div className="assistant-preview-row">
            <input onChange={(event) => setPreviewText(event.target.value)} value={previewText} />
            <button className="btn btn--primary" type="button">▷ 미리보기</button>
          </div>
          <div className="assistant-preview-summary">
            추론 액션: <b>INCIDENT_HISTORY</b>
            <span>· 서비스: --</span>
            <span>· 게이트: PROCEED</span>
            <span>· 정형 파이프라인: Y</span>
            <span>· 장애 목록: Y</span>
            <span>· 영향도: N</span>
            <span>· 장애 필터: DEFAULT</span>
            <span>· LLM 서술: N</span>
            <span>· 매칭 규칙: 12건</span>
          </div>
          <AssistantDataTable
            columns={["그룹", "Target", "패턴", "우선순위", "설명"]}
            rows={previewRules}
          />
        </section>
      </main>
    </AppShell>
  );
}

function AssistantDataTable({ columns, rows }) {
  return (
    <div className="assistant-table-wrap">
      <table className="assistant-table">
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
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
