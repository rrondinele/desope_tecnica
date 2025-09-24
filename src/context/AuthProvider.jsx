import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/services/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      try {
        // 1. Pega a sessão atual. Isso é síncrono e rápido se já estiver carregado.
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session) {
          // 2. Se houver sessão, busca o perfil.
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select(`id, full_name, role, avatar_url, matricula`)
            .eq('id', session.user.id)
            .single();

          if (profileError) throw profileError;
          setProfile(profileData);
        }
      } catch (error) {
        console.error("AuthProvider fetchSession Error:", error);
        // Garante que o estado seja limpo em caso de erro
        setSession(null);
        setProfile(null);
      } finally {
        // 3. ESSENCIAL: Marca o carregamento como concluído, independentemente do resultado.
        setLoading(false);
      }
    };

    // Executa a verificação inicial da sessão.
    fetchSessionAndProfile();

    // 4. Configura o listener para MUDANÇAS futuras (login, logout, etc.).
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Quando o estado de autenticação muda, atualiza a sessão e o perfil.
        // Isso é mais simples porque a lógica de busca de perfil já está na função acima.
        // Apenas re-executamos a função para manter o código consistente.
        fetchSessionAndProfile();
      }
    );

    // Limpa o listener quando o componente for desmontado.
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // O array de dependências pode ficar vazio agora.

  const value = { session, profile, loading };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
        <p style={{ fontSize: '1.2rem', color: '#475569' }}>Carregando aplicação...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
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