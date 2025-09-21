import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';

/**
 * Protege uma rota, verificando se o usuário está logado e se tem a role necessária.
 * @param {React.ReactNode} children - O componente a ser renderizado se o acesso for permitido.
 * @param {string[]} [allowedRoles] - Lista opcional de roles que podem acessar a rota.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  // 1. Se ainda estiver carregando a sessão, não renderiza nada (ou um spinner)
  if (loading) {
    return <div>Carregando...</div>; // Ou um componente de Spinner
  }

  // 2. Se não houver sessão, redireciona para a página de login
  if (!session) {
    // Guarda a página que o usuário tentou acessar para redirecioná-lo de volta após o login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Se a rota exige roles específicas e o perfil do usuário não tem a role permitida
  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    // Redireciona para uma página de "Não Autorizado" ou para o dashboard
    console.warn(`Acesso negado para a rota ${location.pathname}. Role necessária: ${allowedRoles.join(', ')}. Role do usuário: ${profile?.role}`);
    return <Navigate to="/dashboard" state={{ from: location }} replace />; // Ou para uma página /unauthorized
  }

  // 4. Se tudo estiver OK, renderiza o componente filho
  return children;
};

export default ProtectedRoute;