import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/services/supabaseClient'; // Importe seu cliente Supabase

// Cria o Contexto de Autenticação
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Tenta obter a sessão atual do Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // Se houver sessão, busca o perfil do usuário
      if (session) {
        supabase
          .from('profiles')
          .select(`*`)
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error('Erro ao buscar perfil:', error);
            } else {
              setProfile(data);
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    // 2. Escuta por mudanças no estado de autenticação (login, logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        // Se o usuário fez login, busca o perfil. Se fez logout, limpa o perfil.
        if (session) {
          const { data } = await supabase
            .from('profiles')
            .select(`*`)
            .eq('id', session.user.id)
            .single();
          setProfile(data);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // 3. Limpa o listener quando o componente é desmontado
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // O valor que será disponibilizado para os componentes filhos
  const value = {
    session,
    profile,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook customizado para facilitar o uso do contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};