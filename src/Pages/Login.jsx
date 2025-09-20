import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// import { signInWithPassword } from "@/services/auth"; // Mantenha sua função de autenticação real
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock } from "lucide-react";

// Simulação da função de login, substitua pela sua importação real
const signInWithPassword = async ({ email, password }) => {
  console.log("Tentando login com:", email);
  // Simula uma chamada de API
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email === "teste@ceneged.com.br" && password === "123456") {
        resolve({ data: { session: "fake-session-token" }, error: null });
      } else {
        reject({ message: "Credenciais inválidas. Tente novamente." });
      }
    }, 1500);
  });
};


export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fromLocation = location.state?.from?.pathname;
  const redirectTo = fromLocation && fromLocation !== "/login" ? fromLocation : "/";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError("Informe e-mail e senha para continuar.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: authError } = await signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (!data?.session) {
        throw new Error("Não foi possível iniciar a sessão. Tente novamente.");
      }

      navigate(redirectTo, { replace: true });
    } catch (authErr) {
      const message = authErr?.message || "Não foi possível entrar. Tente novamente.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden border-0 shadow-2xl bg-white/95 backdrop-blur-sm rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200"></div>
          <div className="p-8 sm:p-10 md:pt-12 md:pb-10 md:px-10">
            <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8">
              
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full blur-xl opacity-30 group-hover:opacity-40 transition-opacity duration-300"></div>
                <span className="flex shrink-0 overflow-hidden rounded-full relative h-20 w-20 sm:h-24 sm:w-24 shadow-lg ring-4 ring-white/50 group-hover:shadow-xl transition-all duration-300">
                  <img className="aspect-square h-full w-max object-cover" alt="" src="https://nldawnoanfzfyyauljwc.supabase.co/storage/v1/object/public/public-images/tigrinhos.jpg"/>

                </span>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Bem-vindo ao DesOpe</h1>
                <p className="text-slate-500 text-sm sm:text-base font-medium">Faça login para continuar</p>
              </div>

              <div className="w-full">
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-sm font-medium text-slate-700" htmlFor="email">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="email"
                          id="email"
                          placeholder="seu@email.com"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoading}
                          className="md:text-sm pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-sm font-medium text-slate-700" htmlFor="password">Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="password"
                          id="password"
                          placeholder="••••••••"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isLoading}
                          className="md:text-sm pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 text-center">
                      {error}
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 sm:h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm rounded-xl transition-all duration-200"
                    >
                      {isLoading ? "Entrando..." : "Entrar"}
                    </Button>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 pt-2">
                      <button type="button" className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors">Esqueceu a senha?</button>
                      <button type="button" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Precisa de uma conta? <span className="font-medium text-slate-700">Cadastre-se</span></button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}