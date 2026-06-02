"use client";

import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { userInitials } from "@/lib/verdict";

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (!user) return null;

  return (
    <header className="header">
      <Logo compact />
      <div className="header-right">
        <div className="user-chip">
          <div className="avatar">{userInitials(user.email)}</div>
          <span>{user.email}</span>
        </div>
        <button type="button" className="btn-ghost" onClick={handleLogout}>
          Sair
        </button>
      </div>
    </header>
  );
}
