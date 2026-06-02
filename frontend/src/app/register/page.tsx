"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { GuestGuard } from "@/components/AuthGuard";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function RegisterPage() {
  return (
    <GuestGuard>
      <RegisterForm />
    </GuestGuard>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Senha precisa ter ao menos 8 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      await register(email, password);
      showToast("Conta criada com sucesso!");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a conta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell auth-wrap">
      <div className="auth-card animate">
        <Logo />
        <h1 className="auth-title">Criar conta</h1>
        <p className="auth-sub">Gratuito. Sem cartão. Comece a detectar agora.</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              E-mail
            </label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-pass">
              Senha (mín. 8 caracteres)
            </label>
            <input
              id="reg-pass"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Criando…" : "Criar conta"}
          </button>
        </form>

        <div className="auth-switch">
          Já tenho conta. <Link href="/login">Entrar</Link>
        </div>
      </div>
    </div>
  );
}
