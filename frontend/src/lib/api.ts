export type Verdict = "RELIABLE" | "SUSPICIOUS" | "FAKE";

export type User = { id: string; email: string };

export type Claim = {
  id: string;
  text: string;
  isVerified: boolean;
  confidence: number;
  sourceUrl: string | null;
};

export type Analysis = {
  id: string;
  userId: string;
  inputUrl: string | null;
  inputText: string | null;
  rawText: string | null;
  credibilityScore: number;
  verdict: Verdict;
  explanation: string | null;
  createdAt: string;
  claims: Claim[];
  sources: Array<{
    id: string;
    url: string;
    domain: string;
    reputationScore: number;
    isKnownSatire: boolean;
  }>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return { "Content-Type": "application/json" };
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export const api = {
  register(email: string, password: string) {
    return request<{ id: string; email: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  login(email: string, password: string) {
    return request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  me() {
    return request<User>("/api/users/me");
  },
  listAnalyses() {
    return request<Analysis[]>("/api/analyses");
  },
  getAnalysis(id: string) {
    return request<Analysis>(`/api/analyses/${id}`);
  },
  createAnalysis(body: { inputUrl?: string; inputText?: string }) {
    return request<Analysis>("/api/analyses", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  deleteAnalysis(id: string) {
    return fetch(`${API_URL}/api/analyses/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then((res) => {
      if (!res.ok && res.status !== 204) throw new Error("Delete failed");
    });
  },
};
