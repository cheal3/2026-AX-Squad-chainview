import { useEffect, useState } from "react";
import { Eye, EyeOff, Link2, LockKeyhole, ShieldCheck, Sun, UserRound } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext.jsx";
import "./LoginPage.css";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, login } = useAuth();
  const [employeeNo, setEmployeeNo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberId, setRememberId] = useState(false);
  const [error, setError] = useState("");
  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    const savedEmployeeNo = window.localStorage.getItem("chainview.login.remembered-id") || "";
    if (savedEmployeeNo) {
      setEmployeeNo(savedEmployeeNo);
      setRememberId(true);
    }
  }, []);

  if (currentUser) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = login(employeeNo);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (rememberId) {
      window.localStorage.setItem("chainview.login.remembered-id", String(employeeNo).trim());
    } else {
      window.localStorage.removeItem("chainview.login.remembered-id");
    }
    navigate(from, { replace: true });
  };

  return (
    <main className="login-page">
      <header className="login-topbar">
        <div className="login-brand-mini">
          <span className="login-logo-mark" aria-hidden="true"><Link2 size={25} /></span>
          <span>ChainView</span>
        </div>
        <button className="login-theme-button" type="button">
          <Sun size={18} aria-hidden="true" />
          다크모드
        </button>
      </header>

      <section className="login-hero" aria-label="ChainView 로그인">
        <div className="login-visual">
          <div className="login-network" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => (
              <span key={index} />
            ))}
          </div>
          <div className="login-brand-center">
            <span className="login-logo-mark is-large" aria-hidden="true"><Link2 size={70} /></span>
            <h1>ChainView</h1>
            <p>AI 이상감지 및 서비스 관계 기반<br />장애 영향도 분석 플랫폼</p>
          </div>
          <div className="login-orbit is-service"><ServiceIcon /><span>SERVICE</span></div>
          <div className="login-orbit is-platform"><PlatformIcon /><span>PLATFORM</span></div>
          <div className="login-orbit is-infra"><InfraIcon /><span>INFRA</span></div>
          <div className="login-orbit is-channel"><ChannelIcon /><span>CHANNEL</span></div>
          <div className="login-orbit is-owner"><OwnerIcon /><span>OWNER</span></div>
          <div className="login-stack" aria-hidden="true"><i /><i /><i /></div>
          <div className="login-wave" aria-hidden="true" />
        </div>

        <div className="login-panel-wrap">
          <form className="login-card" onSubmit={handleSubmit}>
            <h2>로그인</h2>
            <p>ChainView 관리자 콘솔에 오신 것을 환영합니다.<br />계정 정보를 입력하여 로그인해 주세요.</p>
            <div className="login-security">
              <ShieldCheck size={17} aria-hidden="true" />
              <span>보안 접속이 완료되었습니다.</span>
            </div>

            <label className="login-field">
              <span>사용자 ID</span>
              <div>
                <UserRound size={20} aria-hidden="true" />
                <input
                  autoComplete="username"
                  autoFocus
                  onChange={(event) => {
                    setEmployeeNo(event.target.value);
                    setError("");
                  }}
                  placeholder="사용자 ID를 입력하세요"
                  value={employeeNo}
                />
              </div>
            </label>

            <label className="login-field">
              <span>비밀번호</span>
              <div>
                <LockKeyhole size={19} aria-hidden="true" />
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <label className="login-remember">
              <input checked={rememberId} onChange={(event) => setRememberId(event.target.checked)} type="checkbox" />
              <span>아이디 저장</span>
            </label>

            {error ? <div className="login-error" role="alert">{error}</div> : null}

            <button className="login-submit" type="submit">로그인</button>
          </form>
          <footer>ChainView v1.0.0 · Created by Hyunjun Na</footer>
        </div>
      </section>
    </main>
  );
}

function ServiceIcon() {
  return <svg viewBox="0 0 32 32"><path d="M8 7h16v5H8zM8 14h16v5H8zM8 21h16v5H8z" /><path d="M11 10h10M11 17h10M11 24h10" /></svg>;
}

function PlatformIcon() {
  return <svg viewBox="0 0 32 32"><path d="M12 4h8v5h4v4h5v8h-5v4h-4v5h-8v-5H8v-4H3v-8h5V9h4z" /><path d="M12 12h8v8h-8z" /></svg>;
}

function InfraIcon() {
  return <svg viewBox="0 0 32 32"><ellipse cx="16" cy="8" rx="10" ry="4" /><path d="M6 8v16c0 2.2 4.5 4 10 4s10-1.8 10-4V8" /><path d="M6 16c0 2.2 4.5 4 10 4s10-1.8 10-4" /></svg>;
}

function ChannelIcon() {
  return <svg viewBox="0 0 32 32"><path d="M6 7h20v14H6z" /><path d="M12 27h8M16 21v6" /></svg>;
}

function OwnerIcon() {
  return <svg viewBox="0 0 32 32"><circle cx="16" cy="10" r="5" /><path d="M7 28c1-6 4.2-9 9-9s8 3 9 9" /></svg>;
}
