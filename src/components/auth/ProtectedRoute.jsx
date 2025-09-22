import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  // 1. Se o AuthProvider ainda está verificando a sessão, não renderize nada ainda.
  // O AuthProvider já tem um loader, então aqui podemos apenas esperar.
  if (loading) {
    return null; // Retornar null é seguro e evita a tela branca.
  }

  // 2. Se não houver sessão após o carregamento, redireciona para o login.
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Se a rota exige roles e o usuário não tem a role permitida, redireciona.
  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    // Redireciona para a página inicial (que será decidida pelo RoleBasedRedirect)
    return <Navigate to="/" replace />;
  }

  // 4. Se tudo estiver OK, renderiza o componente filho.
  return children;
};

export default ProtectedRoute;