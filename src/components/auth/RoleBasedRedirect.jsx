import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';

const RoleBasedRedirect = () => {
  const { profile, loading } = useAuth();

  // Não faz nada enquanto o AuthProvider está carregando.
  if (loading) {
    return null;
  }

  // Define a página inicial padrão para cada role
  switch (profile?.role) {
    case 'admin':
    case 'supervisor':
      return <Navigate to="/dashboard" replace />;
    case 'backoffice':
      return <Navigate to="/lista-folhas" replace />;
    default:
      // Se não houver perfil (usuário deslogado), volta para o login.
      return <Navigate to="/login" replace />;
  }
};

export default RoleBasedRedirect;