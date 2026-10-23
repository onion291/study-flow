import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "로그인 · StudyFlow" },
      { name: "description", content: "StudyFlow에 로그인하거나 회원가입하세요." },
      { property: "og:title", content: "로그인 · StudyFlow" },
      { property: "og:description", content: "StudyFlow 학습 플래너 로그인" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg.includes("Invalid login") ? "이메일 또는 비밀번호가 올바르지 않습니다." :
        msg.includes("not confirmed") ? "이메일 인증을 먼저 완료해 주세요." :
        msg.includes("already registered") ? "이미 가입된 이메일입니다." :
        msg.includes("Password") ? "비밀번호는 6자 이상이어야 합니다." : "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    // 직접 등록한 Google OAuth 키(BYOC)로 연결: Supabase Auth를 통해 바로 호출
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth" },
    });
    if (error) toast.error("Google 로그인에 실패했습니다.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="card-soft w-full max-w-sm p-7">
        <Link to="/" className="text-lg font-bold text-primary">StudyFlow</Link>
        <p className="mt-1 text-sm text-muted-foreground">나만의 학습 계획을 시작하세요</p>
        {sent ? (
          <div className="mt-6 rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
            <b>{email}</b>로 인증 메일을 보냈어요. 메일의 링크를 누르면 로그인됩니다.
          </div>
        ) : (
          <>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")} className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">로그인</TabsTrigger>
                <TabsTrigger value="signup">회원가입</TabsTrigger>
              </TabsList>
            </Tabs>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">이메일</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw">비밀번호</Label>
                <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {mode === "signin" ? "로그인" : "회원가입"}
              </Button>
            </form>
            <div className="my-4 text-center text-xs text-muted-foreground">또는</div>
            <Button variant="outline" className="w-full" onClick={google}>Google로 계속하기</Button>
          </>
        )}
      </div>
    </div>
  );
}
