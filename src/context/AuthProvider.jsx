import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/services/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true); // Começa como true

  useEffect(() => {
    // Função para buscar a sessão e o perfil do usuário
    const fetchUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          setSession(session);
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select(`id, full_name, role, avatar_url, matricula`)
            .eq('id', session.user.id)
            .single();
          
          if (profileError) throw profileError;
          setProfile(profileData);
        } else {
          // Garante que se não há sessão, o perfil também é nulo
          setProfile(null);
        }
      } catch (error) {
        console.error("AuthProvider Error:", error);
        // Limpa o estado em caso de erro
        setSession(null);
        setProfile(null);
      } finally {
        // ESSENCIAL: Garante que o loading termine, não importa o que aconteça
        setLoading(false);
      }
    };

    fetchUser();

    // Listener para mudanças de estado (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          const { data } = await supabase
            .from('profiles')
            .select(`id, full_name, role, avatar_url, matricula`)
            .eq('id', session.user.id)
            .single();
          setProfile(data);
        } else {
          setProfile(null);
        }
        setLoading(false); // Garante que o loading termine após login/logout
      }
    );

    // Limpa o listener ao desmontar
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = { session, profile, loading };

  // Renderiza os filhos APENAS quando o carregamento inicial terminar.
  // Isso evita "flashes" de conteúdo e a tela branca.
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Hook customizado para facilitar o uso do contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};