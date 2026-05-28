"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

export type UserRole = "super_admin" | "finance" | "receptionist" | "branch_manager" | "auditor";

export interface AuthUser {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  branch?: string;
  mustChangePassword?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  hasPermission: () => false,
  isRole: () => false,
});

const PUBLIC_PATHS = ["/login"];

const PERMISSION_MAP: Record<UserRole, string[]> = {
  super_admin: ["admin", "create", "edit", "delete", "export", "audit", "finance", "manage_users", "manage_branches", "manage_medical_aids"],
  finance: ["create", "edit", "export", "audit", "finance"],
  receptionist: ["create", "edit"],
  branch_manager: ["create", "edit", "export"],
  auditor: ["audit", "export"],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/me", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        const d = json.data;
        setUser({
          id: d.userId,
          userId: d.userId,
          email: d.email,
          firstName: d.firstName,
          lastName: d.lastName,
          role: d.role,
          branch: d.branch,
          mustChangePassword: d.mustChangePassword,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (!user && !isPublic) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Login failed");
    }
    const d = json.data;
    setUser({
      id: d.id || d.userId,
      userId: d.id || d.userId,
      email: d.email,
      firstName: d.firstName,
      lastName: d.lastName,
      role: d.role,
      branch: d.branch,
      mustChangePassword: d.mustChangePassword,
    });
    router.replace("/dashboard");
  }, [router]);

  const logout = useCallback(async () => {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    router.replace("/login");
  }, [router]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    return PERMISSION_MAP[user.role]?.includes(permission) ?? false;
  }, [user]);

  const isRole = useCallback((...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}