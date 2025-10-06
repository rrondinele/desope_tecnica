import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { supabase } from "@/services/supabaseClient";

// --- Componente Principal ---

export default function Login() {
  const [view, setView] = useState('signin'); // 'signin', 'forgot', 'signup'
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const hasHandledRecoveryRedirect = useRef(false);

  const fromLocation = location.state?.from?.pathname;
  const redirectTo = fromLocation && fromLocation !== "/login" ? fromLocation : "/";

  useEffect(() => {
    if (hasHandledRecoveryRedirect.current) return;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const tokenHash = queryParams.get("token_hash") || queryParams.get("token");
    const recoveryType = hashParams.get("type") || queryParams.get("type");
    const hasAccessToken = hashParams.has("access_token");

    const cleanUrlState = (fieldsToRemove = []) => {
      const remainingQuery = new URLSearchParams(window.location.search);
      fieldsToRemove.forEach((field) => remainingQuery.delete(field));
      const queryString = remainingQuery.toString();
      const cleanUrl = `${window.location.origin}${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
      window.history.replaceState({}, document.title, cleanUrl);
    };

    if (tokenHash) {
      hasHandledRecoveryRedirect.current = true;

      const handleTokenRecovery = async () => {
        setError("");
        setMessage("");

        try {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
          if (error) throw error;

          cleanUrlState(["token", "token_hash", "type"]);
          navigate("/reset-password", { replace: true });
        } catch (err) {
          setError(err.message || "Não foi possível validar o link de redefinição. Solicite um novo e-mail.");
        }
      };

      handleTokenRecovery();
      return;
    }

    if (recoveryType !== "recovery" || !hasAccessToken) return;

    hasHandledRecoveryRedirect.current = true;

    const handleRecoveryRedirect = async () => {
      setError("");
      setMessage("");

      try {
        const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error) throw error;

        cleanUrlState();
        navigate("/reset-password", { replace: true });
      } catch (err) {
        setError(err.message || "Não foi possível validar o link de redefinição. Solicite um novo e-mail.");
      }
    };

    handleRecoveryRedirect();
  }, [navigate]);

  const resetFormState = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setMessage("");
  }

  const handleSetView = (newView) => {
    resetFormState();
    setView(newView);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!email || !password) return setError("Informe e-mail e senha.");
    
    setIsLoading(true);
    try {
      // CORREÇÃO AQUI:
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Não foi possível entrar. Verifique suas credenciais.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordReset(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!email) return setError("Por favor, informe seu e-mail.");

    setIsLoading(true);
    try {
      // CORREÇÃO AQUI:
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        //redirectTo: `${window.location.origin}/`,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage("Se uma conta existir para este e-mail, um link de redefinição foi enviado.");
    } catch (err) {
      setError(err.message || "Não foi possível enviar o link. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignUp(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirmPassword) return setError("As senhas não coincidem.");
    if (password.length < 8) return setError("A senha deve ter no mínimo 8 caracteres.");

    setIsLoading(true);
    try {
      // CORREÇÃO AQUI:
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setMessage("Cadastro realizado! Por favor, verifique sua caixa de entrada para confirmar seu e-mail.");
    } catch (err) {
      setError(err.message || "Não foi possível criar a conta. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }


  const renderContent = () => {
    // --- Tela de "Esqueceu a Senha" ---
    if (view === 'forgot') {
      return (
        <div className="space-y-4 sm:space-y-6">
          <button type="button" onClick={() => handleSetView('signin')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors -mb-2">
            <ArrowLeft className="h-4 w-4" />Voltar para o login
          </button>
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Redefinir sua senha</h2>
            <p className="text-slate-600 text-sm sm:text-base">Digite seu e-mail e enviaremos um link para redefinir sua senha</p>
          </div>
          <form onSubmit={handlePasswordReset} className="space-y-4 sm:space-y-5">
            <div className="space-y-1.5 text-left">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input type="email" id="email" placeholder="seu@email.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} className="md:text-sm pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400" />
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full h-11 sm:h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm rounded-xl transition-all duration-200">
              {isLoading ? "Enviando..." : "Enviar link de redefinição"}
            </Button>
          </form>
        </div>
      );
    }

    // --- Tela de "Criar Conta" ---
    if (view === 'signup') {
      return (
        <div className="space-y-4">
          <button type="button" onClick={() => handleSetView('signin')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors -mb-2">
            <ArrowLeft className="h-4 w-4" />Voltar para o login
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center">Crie sua conta</h2>
          <form onSubmit={handleSignUp} className="space-y-3 sm:space-y-4">
            <div className="space-y-3 text-left">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700" htmlFor="email">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="email" id="email" placeholder="seu@email.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} className="md:text-sm pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700" htmlFor="password">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="password" id="password" placeholder="Mín. 8 caracteres" required value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} className="md:text-sm pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700" htmlFor="confirmPassword">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="password" id="confirmPassword" placeholder="Repita a senha" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={isLoading} className="md:text-sm pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400" />
                </div>
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full h-11 sm:h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm rounded-xl transition-all duration-200">
              {isLoading ? "Criando..." : "Criar conta"}
            </Button>
          </form>
        </div>
      );
    }

    // --- Tela de Login (Padrão) ---
    return (
      <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full blur-xl opacity-30 group-hover:opacity-40 transition-opacity duration-300"></div>
          <span className="flex shrink-0 overflow-hidden rounded-full relative h-20 w-20 sm:h-24 sm:w-24 shadow-lg ring-4 ring-white/50 group-hover:shadow-xl transition-all duration-300">
            <img className="aspect-square h-full w-full object-cover" alt="Logo" src="https://nldawnoanfzfyyauljwc.supabase.co/storage/v1/object/public/public-images/raio.png"/>
          </span>
        </div>
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Bem-vindo ao DesOpe</h1>
          <p className="text-slate-500 text-sm sm:text-base font-medium">Faça login para continuar</p>
        </div>
        <div className="w-full">
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-sm font-medium text-slate-700" htmlFor="email">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="email" id="email" placeholder="seu@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className="md:text-sm pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400" />
                </div>
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-sm font-medium text-slate-700" htmlFor="password">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="password" id="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="md:text-sm pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400" />
                </div>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <Button type="submit" disabled={isLoading} className="w-full h-11 sm:h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm rounded-xl transition-all duration-200">
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 pt-2">
                <button type="button" onClick={() => handleSetView('forgot')} className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors">Esqueceu a senha?</button>
                <button type="button" onClick={() => handleSetView('signup')} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Precisa de uma conta? <span className="font-medium text-slate-700">Cadastre-se</span></button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden border-0 shadow-2xl bg-white/95 backdrop-blur-sm rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200"></div>
          <div className="p-8 sm:p-10 md:pt-12 md:pb-10 md:px-10">
            {/* Mensagens de erro e sucesso */}
            {error && <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 text-center">{error}</div>}
            {message && <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 text-center">{message}</div>}
            
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
