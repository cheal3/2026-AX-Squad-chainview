import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AUTH_STORAGE_KEY = "chainview.auth.user.v1";

export const TEMP_USERS = {
  "8913812": {
    employeeNo: "8913812",
    name: "나현준",
    departmentName: "AX Squad",
    isAdmin: true,
  },
  "6011331": {
    employeeNo: "6011331",
    name: "이혜림",
    departmentName: "IT채널업무1팀",
    isAdmin: true,
  },
  "6011427": {
    employeeNo: "6011427",
    name: "최동욱",
    departmentName: "AX Squad",
    isAdmin: true,
  },
};

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.employeeNo && TEMP_USERS[parsed.employeeNo] ? parsed : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window === "undefined") return null;
    return readStoredUser();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (user) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  const value = useMemo(() => ({
    currentUser: user,
    login(employeeNo) {
      const normalizedEmployeeNo = String(employeeNo || "").trim();
      const nextUser = TEMP_USERS[normalizedEmployeeNo];
      if (!nextUser) {
        return { ok: false, message: "등록된 임시 사용자가 아닙니다." };
      }
      setUser(nextUser);
      return { ok: true, user: nextUser };
    },
    logout() {
      setUser(null);
    },
    users: TEMP_USERS,
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
