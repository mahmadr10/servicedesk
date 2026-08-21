import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "../types";
import { meRequest } from "../api/auth";
import { connectSocket, disconnectSocket } from "../socket";

// React Context — a way to make a value (here: "who's logged in") available
// to any component in the tree without manually passing it down as a prop
// through every level ("prop drilling"). Any page can call useAuth() to
// read the current user or log out.
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // true while we check for a saved session

  // On first load, check localStorage for a token from a previous session
  // (e.g. the user refreshed the page). If found, ask the backend "who is
  // this token for?" via /auth/me instead of trusting stale local data.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    meRequest()
      .then((freshUser) => {
        setUser(freshUser);
        connectSocket(token);
      })
      .catch(() => {
        localStorage.removeItem("token"); // token expired/invalid — clear it
      })
      .finally(() => setLoading(false));
  }, []);

  function login(newUser: User, token: string) {
    localStorage.setItem("token", token);
    setUser(newUser);
    connectSocket(token);
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    disconnectSocket();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
