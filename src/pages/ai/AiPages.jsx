import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, FileUp, Plus, RefreshCw, Search, Send, Sparkles } from "lucide-react";
import { AppShell } from "../../components/AppShell.jsx";
import { PAGE_SIZE, Pagination } from "../../components/Pagination.jsx";
import { chainViewApi, chainViewApiBaseUrl } from "../../dashboardModule/chainViewApi";

const MAX_CONVERSATION_TURNS = 4;
const MAX_TURN_CHARS = 280;

const quickQuestions = [
  { label: "SSO 장애 영향도/대응", prompt: "SSO 서비스 장애 시 영향도 분석 및 대응 절차 알려줘" },
  { label: "SSO 영향 범위 분석", prompt: "SSO 서비스 중단 시 영향 범위와 대응 절차 알려줘" },
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const serviceId = Number(params.get("serviceId")) || 0;
    if (!serviceId) {
      return;
    }
    const serviceName = params.get("serviceName") || "서비스";
    const decodedServiceName = decodeURIComponent(serviceName);
    const prompt = buildImpactNarrativePrompt(decodedServiceName);
    setShowWelcome(false);
    setState((current) => ({ ...current, serviceId }));
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", text: prompt },
    ]);
    sendPayload({ action: null, scope: "SINGLE", serviceId, message: prompt }, prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const [rawResponse] = await Promise.all([chainViewApi.assistant.chat(payload), delay(760)]);
      const response = normalizeAssistantResponse(rawResponse);
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
    if (action === "IMPACT_ANALYSIS" && contextServiceId) {
      const prompt = buildImpactNarrativePrompt(conversation.serviceName || "선택 서비스");
      sendPayload({ action: null, scope: "SINGLE", serviceId: contextServiceId, message: prompt }, label);
      return;
    }
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
        if (mapped.action === "IMPACT_ANALYSIS") {
          const prompt = buildImpactNarrativePrompt(conversation.serviceName || "선택 서비스");
          sendPayload({ action: null, scope: "SINGLE", serviceId: contextServiceId, message: prompt }, text);
          return;
        }
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
    if (text.includes("보기") && currentAction && contextServiceId) {
      sendPayload({
        action: guessSubAction(text) || currentAction,
        scope: "SINGLE",
        serviceId: contextServiceId,
        message: "",
      }, text);
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

function buildImpactNarrativePrompt(serviceName) {
  const name = String(serviceName || "선택 서비스").replace(/\s+/g, " ").trim();
  return `${name} 서비스 장애 시 영향도 분석 및 대응 절차 알려줘`;
}

function guessSubAction(text) {
  const value = String(text || "");
  if (value.includes("담당자")) return "OWNER_LOOKUP";
  if (value.includes("호스트") || value.includes("장비")) return "HOST_LOOKUP";
  if (value.includes("인프라") || value.includes("토폴로지")) return "INFRA_IMPACT";
  if (value.includes("서버")) return "SERVER_LOOKUP";
  if (value.includes("장애")) return "INCIDENT_HISTORY";
  if (value.includes("연계") || value.includes("영향")) return "IMPACT_ANALYSIS";
  return null;
}

function normalizeAssistantResponse(response) {
  const data = response?.data && typeof response.data === "object" ? response.data : response;
  if (!data || typeof data !== "object") {
    return data;
  }

  const message =
    data.message ??
    data.answer ??
    data.content ??
    data.text ??
    data.response ??
    "";

  return {
    ...data,
    message: String(message || ""),
    choices: Array.isArray(data.choices) ? data.choices : [],
    categoryOptions: Array.isArray(data.categoryOptions) ? data.categoryOptions : [],
    serviceOptions: Array.isArray(data.serviceOptions) ? data.serviceOptions : [],
    knowledgeSources: Array.isArray(data.knowledgeSources) ? data.knowledgeSources : [],
    ragReferences: Array.isArray(data.ragReferences) ? data.ragReferences : [],
    incidentReportReferences: Array.isArray(data.incidentReportReferences)
      ? data.incidentReportReferences
      : [],
    suggestedReplies: Array.isArray(data.suggestedReplies) ? data.suggestedReplies : [],
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
            {(table.rows || []).length ? (table.rows || []).map((row, rowIndex) => (
              <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
            )) : <tr><td colSpan={Math.max((table.headers || []).length, 1)}>조회 가능한 데이터가 없습니다.</td></tr>}
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
  const [fullMarkdown, setFullMarkdown] = useState(refData.markdown || "");
  const [loading, setLoading] = useState(false);
  const scorePct = Math.round(Number(refData.score || 0) * 100);
  const path = refData.relativePath || refData.relative_path || "";
  const title = refData.sourceDocument || refData.source_document || path || "문서";
  const toggleOpen = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (fullMarkdown || !path || loading) {
      return;
    }
    setLoading(true);
    try {
      const response = await chainViewApi.assistant.rag.sourceContent(path);
      setFullMarkdown(response?.markdown || response?.content || response?.text || "");
    } catch {
      setFullMarkdown("RAG 문서를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

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
          <button className="ax-rag-card__btn" disabled={loading} onClick={toggleOpen} type="button">
            {loading ? "불러오는 중..." : open ? "접기" : "전문 보기"}
          </button>
          {refData.downloadable === true && (
            <a className="ax-rag-card__btn ax-rag-card__btn--link" href={assistantApiHref("/api/assistant/rag-sources/download", { path })}>원본 다운로드</a>
          )}
        </div>
      )}
      {open && <div className="ax-rag-card__full" dangerouslySetInnerHTML={{ __html: formatMd(fullMarkdown || refData.excerpt || "") }} />}
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
          <a className="ax-incident-report-card__btn ax-incident-report-card__btn--link" href={assistantApiHref(`/api/assistant/incident-reports/${encodeURIComponent(reportId)}/download`)}>
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

function assistantApiHref(path, query = {}) {
  const base = chainViewApiBaseUrl || window.location.origin;
  const url = new URL(path, base.replace(/\/$/, ""));
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

export function AiRagKnowledgePage() {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("manuals");
  const [status, setStatus] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [docKeyword, setDocKeyword] = useState("");
  const [file, setFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [chunksModal, setChunksModal] = useState(null);
  const [loading, setLoading] = useState({ page: true, upload: false, reindex: false, search: false, chunks: false });
  const [message, setMessage] = useState("");

  const loadRagData = async () => {
    setLoading((current) => ({ ...current, page: true }));
    try {
      const [nextCategories, nextStatus, nextDocuments] = await Promise.all([
        chainViewApi.assistant.rag.categories(),
        chainViewApi.assistant.rag.status(),
        chainViewApi.assistant.rag.documents(),
      ]);
      setCategories(nextCategories || []);
      setCategory((current) => current || nextCategories?.[0] || "manuals");
      setStatus(nextStatus || null);
      setDocuments(nextDocuments || []);
      setMessage("");
    } catch (error) {
      setMessage(error?.message || "RAG 정보를 불러오지 못했습니다.");
    } finally {
      setLoading((current) => ({ ...current, page: false }));
    }
  };

  useEffect(() => {
    loadRagData();
  }, []);

  const filteredDocuments = useMemo(() => {
    const keyword = docKeyword.trim().toLowerCase();
    if (!keyword) return documents;
    return documents.filter((doc) =>
      String(doc.fileName || "").toLowerCase().includes(keyword) ||
      String(doc.category || "").toLowerCase().includes(keyword)
    );
  }, [docKeyword, documents]);

  const uploadDocument = async () => {
    if (!file) {
      setMessage("업로드할 파일을 선택하세요.");
      return;
    }
    setLoading((current) => ({ ...current, upload: true }));
    try {
      const response = await chainViewApi.assistant.rag.uploadDocument(file, category);
      setMessage(response?.message || "업로드 완료");
      setFile(null);
      await loadRagData();
    } catch (error) {
      setMessage(error?.message || "업로드에 실패했습니다.");
    } finally {
      setLoading((current) => ({ ...current, upload: false }));
    }
  };

  const reindexDocuments = async () => {
    setLoading((current) => ({ ...current, reindex: true }));
    try {
      const response = await chainViewApi.assistant.rag.reindex();
      setMessage(formatReindexMessage(response));
      await loadRagData();
    } catch (error) {
      setMessage(error?.message || "전체 재적재에 실패했습니다.");
    } finally {
      setLoading((current) => ({ ...current, reindex: false }));
    }
  };

  const deleteDocument = async (path) => {
    if (!path || !window.confirm(`"${path}" 문서를 삭제할까요?\n파일과 색인된 벡터가 함께 삭제됩니다.`)) return;
    try {
      await chainViewApi.assistant.rag.deleteDocument(path);
      setMessage("삭제되었습니다.");
      await loadRagData();
    } catch (error) {
      setMessage(error?.message || "삭제에 실패했습니다.");
    }
  };

  const viewChunks = async (doc) => {
    const path = doc.relativePath || doc.path;
    if (!path) return;
    setChunksModal({ title: doc.fileName || "청크 상세", path, chunks: [] });
    setLoading((current) => ({ ...current, chunks: true }));
    try {
      const chunks = await chainViewApi.assistant.rag.chunks(path);
      setChunksModal({ title: doc.fileName || "청크 상세", path, chunks: chunks || [] });
    } catch (error) {
      setChunksModal({ title: doc.fileName || "청크 상세", path, error: error?.message || "청크를 불러오지 못했습니다.", chunks: [] });
    } finally {
      setLoading((current) => ({ ...current, chunks: false }));
    }
  };

  const searchRag = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setMessage("검색할 질문을 입력하세요.");
      return;
    }
    setLoading((current) => ({ ...current, search: true }));
    try {
      const hits = await chainViewApi.assistant.rag.search(query);
      setSearchResults(hits || []);
      setMessage("");
    } catch (error) {
      setMessage(error?.message || "검색에 실패했습니다.");
    } finally {
      setLoading((current) => ({ ...current, search: false }));
    }
  };

  return (
    <AppShell activeMenu="ai-rag">
      <main className="main assistant-admin-page">
        <div className="page-head page-head--standardized assistant-page-head">
          <div>
            <h1 className="page-head__title">
              <span className="page-head__icon" aria-hidden="true">📚</span>
              <span>RAG 지식 관리</span>
            </h1>
            <p className="page-head__desc assistant-page-desc">운영 매뉴얼, 장애보고서, 서비스 정보를 검색합니다.</p>
          </div>
          <div className="assistant-admin-actions">
            <button className="btn" disabled={loading.page} onClick={loadRagData} type="button">새로고침</button>
            <button className="btn btn--primary" disabled={loading.reindex} onClick={reindexDocuments} type="button">
              {loading.reindex ? "재적재 중..." : "전체 재적재"}
            </button>
          </div>
        </div>

        <section className="assistant-card assistant-status-card">
          <h2>상태</h2>
          <div className="assistant-status-row">
            {loading.page && !status ? <span>불러오는 중...</span> : (
              <>
                <span>RAG 활성화: <b>{status?.ragEnabled ? "예" : "아니오"}</b></span>
                <span>응답 모드: <b>{status?.answerMode || "-"}</b></span>
                <span>VectorStore: <b className={status?.vectorStoreHealthy ? "" : "is-danger"}>{status?.vectorStoreHealthy ? "정상" : "미연결"}</b></span>
                <span>임베딩: <b>{status?.embeddingProvider || "-"} / {status?.embeddingModel || "-"}</b></span>
                <span>테이블: <b>{status?.vectorTableName || "-"}</b></span>
              </>
            )}
          </div>
          {message ? <pre className="assistant-result-note">{message}</pre> : null}
        </section>

        <section className="assistant-card">
          <h2>문서 업로드</h2>
          <p>.md, .txt, .docx 파일을 category별로 업로드합니다. 업로드만으로는 검색에 반영되지 않으며, 위 전체 재처리 버튼을 눌러야 임베딩·색인이 수행됩니다.</p>
          <div className="assistant-upload-grid">
            <label>
              <span>Category</span>
              <select onChange={(event) => setCategory(event.target.value)} value={category}>
                {(categories.length ? categories : ["manuals", "guidelines", "incident-reports", "summary"]).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="assistant-upload-field">
              <span>파일</span>
              <div className="assistant-file-control">
                <FileUp size={15} />
                <input accept=".md,.txt,.docx" onChange={(event) => setFile(event.target.files?.[0] || null)} type="file" />
              </div>
            </label>
          </div>
          <button className="assistant-wide-primary" disabled={loading.upload} onClick={uploadDocument} type="button">
            {loading.upload ? "업로드 중..." : "업로드"}
          </button>
        </section>

        <section className="assistant-card">
          <div className="assistant-card-head">
            <h2>문서 목록</h2>
            <input onChange={(event) => setDocKeyword(event.target.value)} placeholder="파일명·category 검색" value={docKeyword} />
          </div>
          <AssistantDataTable
            columns={["Category", "파일명", "크기", "수정일", "색인 상태", "작업"]}
            emptyText={loading.page ? "불러오는 중..." : "조회 가능한 데이터가 없습니다."}
            rows={filteredDocuments.map((doc) => {
              const path = doc.relativePath || doc.path || "";
              return [
                doc.category || "-",
                doc.fileName || "-",
                formatBytes(doc.sizeBytes),
                doc.modifiedAt || "-",
                <span className={doc.indexed ? "assistant-ok" : "assistant-muted-inline"} key="status">
                  {doc.indexed ? `색인됨 (청크 ${doc.chunkCount || 0}개)` : "미색인"}
                </span>,
                <span className="assistant-row-actions" key="actions">
                  {doc.indexed ? <button onClick={() => viewChunks(doc)} type="button">청크 보기</button> : null}
                  <button onClick={() => downloadRagDocument(path)} type="button">다운로드</button>
                  <button className="is-danger" onClick={() => deleteDocument(path)} type="button">삭제</button>
                </span>,
              ];
            })}
          />
        </section>

        <section className="assistant-card">
          <h2>테스트 검색</h2>
          <p>질문을 입력하면 실제 임베딩 유사도 검색 결과를 그대로 보여줍니다.</p>
          <div className="assistant-search-row">
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") searchRag();
              }}
              placeholder="예) SSO 로그인 실패 시 조치 방법"
              value={searchQuery}
            />
            <button className="btn btn--primary" disabled={loading.search} onClick={searchRag} type="button">
              {loading.search ? "검색 중..." : "검색"}
            </button>
          </div>
        </section>

        {searchResults.length ? (
          <section className="assistant-card">
            <div className="assistant-card-head">
              <h2>검색 결과</h2>
              <span>검색 결과 {searchResults.length}건</span>
            </div>
            <div className="assistant-result-list">
              {searchResults.map((hit, index) => (
                <article className="assistant-result-card" key={`${hit.id || hit.relativePath || index}`}>
                  <div>
                    <h3>{hit.sourceDocument || hit.fileName || "문서"}</h3>
                    <p>{hit.section || "-"} {hit.sectionType && hit.sectionType !== "OTHER" ? `(${hit.sectionType})` : ""} <span>|</span> {hit.category || "-"}</p>
                    {hit.serviceCodes ? <strong>서비스 {hit.serviceCodes}</strong> : null}
                    <p>{hit.content || hit.excerpt || "-"}</p>
                  </div>
                  <div className="assistant-result-side">
                    <b>유사도 {Number(hit.score || 0).toFixed(3)}</b>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
        {chunksModal ? (
          <AssistantModal title={chunksModal.title} onClose={() => setChunksModal(null)}>
            <p className="assistant-muted">경로: {chunksModal.path}</p>
            {loading.chunks ? <p className="assistant-muted">불러오는 중...</p> : null}
            {chunksModal.error ? <p className="assistant-error-text">{chunksModal.error}</p> : null}
            {chunksModal.chunks?.length ? (
              <div className="assistant-chunk-list">
                {chunksModal.chunks.map((chunk, index) => (
                  <article className="assistant-chunk-card" key={chunk.id || index}>
                    <div>
                      <strong>청크 #{Number(chunk.chunkIndex ?? index) + 1}</strong>
                      <span>{chunk.section || ""}{chunk.sectionType && chunk.sectionType !== "OTHER" ? ` (${chunk.sectionType})` : ""}</span>
                      <span>{chunk.category || ""}{chunk.serviceCodes ? ` · 서비스 ${chunk.serviceCodes}` : ""} · {chunk.contentLength || String(chunk.content || "").length}자</span>
                    </div>
                    <pre>{chunk.content || ""}</pre>
                  </article>
                ))}
              </div>
            ) : !loading.chunks && !chunksModal.error ? <p className="assistant-muted">적재된 청크가 없습니다.</p> : null}
          </AssistantModal>
        ) : null}
      </main>
    </AppShell>
  );
}

export function AiRoutingRulesPage() {
  const [previewText, setPreviewText] = useState("전체 서비스 장애는 몇건이지?");
  const [groups, setGroups] = useState([]);
  const [rules, setRules] = useState([]);
  const [meta, setMeta] = useState(null);
  const [activeGroup, setActiveGroup] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState(null);
  const [modalRule, setModalRule] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState({ page: true, preview: false, reload: false, save: false });
  const pageSize = PAGE_SIZE;

  const loadRoutingData = async () => {
    setLoading((current) => ({ ...current, page: true }));
    try {
      const [nextGroups, nextRules, nextMeta] = await Promise.all([
        chainViewApi.assistant.routingRules.groups(),
        chainViewApi.assistant.routingRules.list(),
        chainViewApi.assistant.routingRules.meta(),
      ]);
      setGroups(nextGroups || []);
      setRules(nextRules || []);
      setMeta(nextMeta || null);
      setMessage("");
    } catch (error) {
      setMessage(error?.message || "라우팅 규칙을 불러오지 못했습니다.");
    } finally {
      setLoading((current) => ({ ...current, page: false }));
    }
  };

  useEffect(() => {
    loadRoutingData();
  }, []);

  const filteredRules = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return rules.filter((rule) => {
      if (activeGroup && rule.ruleGroup !== activeGroup) return false;
      if (!q) return true;
      return [rule.ruleGroup, rule.targetCode, rule.pattern, rule.description, rule.matchMode]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [activeGroup, keyword, rules]);
  const totalPages = Math.max(1, Math.ceil(filteredRules.length / pageSize));
  const pageRows = filteredRules.slice((Math.min(page, totalPages) - 1) * pageSize, Math.min(page, totalPages) * pageSize);

  useEffect(() => {
    setPage(1);
  }, [activeGroup, keyword]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const reloadMemory = async () => {
    setLoading((current) => ({ ...current, reload: true }));
    try {
      await chainViewApi.assistant.routingRules.reload();
      const nextMeta = await chainViewApi.assistant.routingRules.meta();
      setMeta(nextMeta || null);
      setMessage("메모리 규칙을 갱신했습니다.");
    } catch (error) {
      setMessage(error?.message || "메모리 갱신에 실패했습니다.");
    } finally {
      setLoading((current) => ({ ...current, reload: false }));
    }
  };

  const runPreview = async () => {
    const messageText = previewText.trim();
    if (!messageText) return;
    setLoading((current) => ({ ...current, preview: true }));
    try {
      const data = await chainViewApi.assistant.routingRules.preview({ message: messageText });
      setPreview(data || {});
      setMessage("");
    } catch (error) {
      setMessage(error?.message || "미리보기에 실패했습니다.");
    } finally {
      setLoading((current) => ({ ...current, preview: false }));
    }
  };

  const deleteRule = async (ruleId) => {
    if (!ruleId || !window.confirm("이 규칙을 삭제할까요?")) return;
    try {
      await chainViewApi.assistant.routingRules.delete(Number(ruleId));
      setMessage("삭제되었습니다.");
      await loadRoutingData();
    } catch (error) {
      setMessage(error?.message || "삭제에 실패했습니다.");
    }
  };

  const saveRule = async (payload) => {
    setLoading((current) => ({ ...current, save: true }));
    try {
      if (payload.ruleId) {
        await chainViewApi.assistant.routingRules.update(Number(payload.ruleId), payload);
        setMessage("수정되었습니다.");
      } else {
        await chainViewApi.assistant.routingRules.create(payload);
        setMessage("등록되었습니다.");
      }
      setModalRule(null);
      await loadRoutingData();
    } catch (error) {
      setMessage(error?.message || "저장에 실패했습니다.");
    } finally {
      setLoading((current) => ({ ...current, save: false }));
    }
  };

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
            <button className="btn" disabled={loading.reload} onClick={reloadMemory} type="button"><RefreshCw size={14} /> {loading.reload ? "갱신 중..." : "메모리 갱신"}</button>
            <button className="btn btn--primary" onClick={() => setModalRule({})} type="button"><Plus size={14} /> 규칙 등록</button>
          </div>
        </div>
        {message ? <div className="assistant-inline-alert">{message}</div> : null}

        <section className="assistant-card">
          <h2>규칙 그룹</h2>
          <div className="assistant-rule-chips">
            <button className={!activeGroup ? "is-active" : ""} onClick={() => setActiveGroup("")} type="button">전체</button>
            {(groups.length ? groups : routingRuleGroups).map((group) => (
              <button className={activeGroup === group ? "is-active" : ""} key={group} onClick={() => setActiveGroup(group)} type="button">{group}</button>
            ))}
          </div>
        </section>

        <section className="assistant-card">
          <div className="assistant-rule-toolbar">
            <label><Search size={16} /><input onChange={(event) => setKeyword(event.target.value)} placeholder="그룹, 패턴, target, 설명 검색..." value={keyword} /></label>
          </div>
          <p className="assistant-muted">메모리 적재 <b>{meta?.ruleCount ?? rules.length}</b>건 · 필터 결과 <b>{filteredRules.length}</b>건</p>
          <AssistantDataTable
            columns={["그룹", "Target", "모드", "패턴", "우선순위", "사용", "작업"]}
            emptyText={loading.page ? "불러오는 중..." : "조회 가능한 데이터가 없습니다."}
            rows={pageRows.map((rule) => [
              rule.ruleGroup,
              rule.targetCode,
              rule.matchMode,
              <code key="pattern">{rule.pattern}</code>,
              rule.priority,
              <span className="assistant-yn" key="yn">{rule.enabledYn}</span>,
              <span className="assistant-icon-actions" key="actions">
                <button onClick={() => setModalRule(rule)} type="button">수정</button>
                <button className="is-danger" onClick={() => deleteRule(rule.ruleId)} type="button">삭제</button>
              </span>,
            ])}
          />
          <Pagination loading={loading.page} page={Math.min(page, totalPages)} setPage={setPage} total={filteredRules.length} />
        </section>

        <section className="assistant-card">
          <h2>규칙 매칭 미리보기</h2>
          <p>질문을 입력하면 현재 메모리 규칙 기준 매칭 결과와 추론 액션을 확인합니다.</p>
          <div className="assistant-preview-row">
            <input
              onChange={(event) => setPreviewText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runPreview();
              }}
              value={previewText}
            />
            <button className="btn btn--primary" disabled={loading.preview} onClick={runPreview} type="button">
              {loading.preview ? "확인 중..." : "▷ 미리보기"}
            </button>
          </div>
          {preview ? (
            <div className="assistant-preview-summary">
              추론 액션: <b>{preview.inferredAction || "—"}</b>
              <span>· 서비스: {preview.resolvedServiceCode || "—"}</span>
              <span>· 게이트: {preview.gateDecision || "—"}</span>
              <span>· 정형 파이프라인: {preview.prefersStructuredPipeline ? "Y" : "N"}</span>
              <span>· 장애 목록: {preview.incidentListQuery ? "Y" : "N"}</span>
              <span>· 영향도: {preview.impactQuery ? "Y" : "N"}</span>
              <span>· 장애 필터: {preview.inferredIncidentStatus || "DEFAULT"}</span>
              <span>· LLM 서술: {preview.shouldNarrate ? "Y" : "N"}</span>
              <span>· 매칭 규칙: {preview.totalMatches || 0}건</span>
            </div>
          ) : null}
          <AssistantDataTable
            columns={["그룹", "Target", "패턴", "우선순위", "설명"]}
            emptyText="조회 가능한 데이터가 없습니다."
            rows={(preview?.matches || []).map((match) => [
              match.ruleGroup,
              match.targetCode,
              <code key="pattern">{match.pattern}</code>,
              match.priority,
              match.description || "",
            ])}
          />
        </section>
        {modalRule ? (
          <RoutingRuleModal
            groups={groups.length ? groups : routingRuleGroups}
            loading={loading.save}
            onClose={() => setModalRule(null)}
            onSubmit={saveRule}
            rule={modalRule}
          />
        ) : null}
      </main>
    </AppShell>
  );
}

function AssistantDataTable({ columns, emptyText = "조회 가능한 데이터가 없습니다.", rows }) {
  return (
    <div className="assistant-table-wrap">
      <table className="assistant-table">
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          )) : <tr><td colSpan={columns.length} className="assistant-empty-cell">{emptyText}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function AssistantModal({ children, onClose, title }) {
  return (
    <div className="assistant-modal" role="dialog" aria-modal="true">
      <button className="assistant-modal__backdrop" onClick={onClose} type="button" aria-label="닫기" />
      <section className="assistant-modal__panel">
        <header className="assistant-modal__head">
          <h2>{title}</h2>
          <button onClick={onClose} type="button">×</button>
        </header>
        <div className="assistant-modal__body">{children}</div>
      </section>
    </div>
  );
}

function RoutingRuleModal({ groups, loading, onClose, onSubmit, rule }) {
  const [form, setForm] = useState({
    ruleId: rule.ruleId || null,
    ruleGroup: rule.ruleGroup || groups[0] || "",
    targetCode: rule.targetCode || "",
    matchMode: rule.matchMode || "CONTAINS",
    pattern: rule.pattern || "",
    excludePattern: rule.excludePattern || "",
    priority: rule.priority || 100,
    enabledYn: rule.enabledYn || "Y",
    description: rule.description || "",
  });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = () => {
    if (!form.ruleGroup || !form.targetCode || !form.matchMode || !form.pattern) {
      window.alert("규칙 그룹, Target 코드, 매칭 모드, 패턴을 입력하세요.");
      return;
    }
    onSubmit({
      ...form,
      excludePattern: form.excludePattern || null,
      description: form.description || null,
      priority: Number(form.priority) || 100,
    });
  };

  return (
    <AssistantModal onClose={onClose} title={form.ruleId ? "규칙 수정" : "규칙 등록"}>
      <div className="assistant-form-grid">
        <label>규칙 그룹
          <select onChange={(event) => update("ruleGroup", event.target.value)} value={form.ruleGroup}>
            {groups.map((group) => <option key={group} value={group}>{group}</option>)}
          </select>
        </label>
        <label>Target 코드
          <input maxLength={60} onChange={(event) => update("targetCode", event.target.value)} placeholder="예) INCIDENT_HISTORY, UNRESOLVED" value={form.targetCode} />
        </label>
        <label>매칭 모드
          <select onChange={(event) => update("matchMode", event.target.value)} value={form.matchMode}>
            <option value="CONTAINS">CONTAINS</option>
            <option value="REGEX">REGEX</option>
            <option value="EXACT">EXACT</option>
          </select>
        </label>
        <label>패턴
          <input maxLength={500} onChange={(event) => update("pattern", event.target.value)} value={form.pattern} />
        </label>
        <label>제외 패턴 (쉼표 구분)
          <input maxLength={500} onChange={(event) => update("excludePattern", event.target.value)} placeholder="예) unresolved" value={form.excludePattern || ""} />
        </label>
        <label>우선순위
          <input onChange={(event) => update("priority", event.target.value)} type="number" value={form.priority} />
        </label>
        <label>사용 여부
          <select onChange={(event) => update("enabledYn", event.target.value)} value={form.enabledYn}>
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </label>
        <label className="assistant-form-grid__full">설명
          <input maxLength={500} onChange={(event) => update("description", event.target.value)} value={form.description || ""} />
        </label>
      </div>
      <div className="assistant-modal__foot">
        <button className="btn" onClick={onClose} type="button">취소</button>
        <button className="btn btn--primary" disabled={loading} onClick={submit} type="button">{loading ? "저장 중..." : "저장"}</button>
      </div>
    </AssistantModal>
  );
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatReindexMessage(data) {
  if (!data || typeof data !== "object") return "전체 재적재가 완료되었습니다.";
  const lines = [
    `VectorStore 사용 가능: ${data.vectorStoreAvailable ? "예" : "아니오"}`,
    `처리 파일: ${data.filesProcessed ?? 0}건`,
    `색인 청크: ${data.chunksIndexed ?? 0}개`,
    `소요 시간: ${data.durationMs ?? 0}ms`,
  ];
  if (Array.isArray(data.skippedFiles) && data.skippedFiles.length) {
    lines.push("", "건너뜀:", ...data.skippedFiles);
  }
  if (Array.isArray(data.errors) && data.errors.length) {
    lines.push("", "오류:", ...data.errors);
  }
  return lines.join("\n");
}

async function downloadRagDocument(path) {
  if (!path) return;
  try {
    const blob = await chainViewApi.assistant.rag.download(path);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = path.split("/").pop() || "rag-document";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    window.alert(error?.message || "다운로드에 실패했습니다.");
  }
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
