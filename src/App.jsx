import React, { useEffect } from "react"; // 1. Adicionado useEffect
import { Routes, Route, useNavigate } from "react-router-dom"; // 2. Adicionado useNavigate
import Layout from "./Layout";
import Login from "@/Pages/Login";
import Dashboard from "@/Pages/Dashboard";
import Cadastro from "@/Pages/Cadastro";
import NovaFolha from "@/Pages/NovaFolha";
import ListaFolhas from "@/Pages/ListaFolhas";
import DashboardFinanceiro from "./Pages/DashboardFinanceiro";
import Settings from "./Pages/Settings";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleBasedRedirect from "./components/auth/RoleBasedRedirect";
import { supabase } from "./services/supabaseClient";
import ResetPassword from "@/Pages/ResetPassword";

const AdminPage = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
    <p className="mt-2">Aqui você poderá listar, editar e atribuir perfis e matrículas aos usuários.</p>
  </div>
);

export default function App() {
  // 5. Adicionado o listener para capturar o evento de recuperação de senha
  const navigate = useNavigate();

  useEffect(() => {
    // Ouve os eventos de autenticação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Se o evento for de recuperação de senha, redireciona para a página correta
        navigate('/reset-password');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);


  return (
    <Routes>
      {/* --- ROTAS PÚBLICAS --- */}
      <Route path="/login" element={<Login />} />
      {/* 6. Adicionada a rota pública para a página de atualização de senha */}
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* --- ROTAS PROTEGIDAS --- */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<RoleBasedRedirect />} />
        <Route path="dashboard" element={<ProtectedRoute allowedRoles={['supervisor', 'admin']}><Dashboard /></ProtectedRoute>} />
        <Route path="cadastro" element={<ProtectedRoute allowedRoles={['admin']}><Cadastro /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="nova-folha" element={<ProtectedRoute allowedRoles={['backoffice', 'supervisor', 'admin']}><NovaFolha /></ProtectedRoute>} />
        <Route path="lista-folhas" element={<ProtectedRoute allowedRoles={['backoffice', 'supervisor', 'admin']}><ListaFolhas /></ProtectedRoute>} />
        <Route path="dashboard-financeiro" element={<ProtectedRoute allowedRoles={['supervisor', 'admin']}><DashboardFinanceiro /></ProtectedRoute>} />
        <Route path="admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

{/*

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import Cadastro from "@/Pages/Cadastro";
import Dashboard from "@/Pages/Dashboard";
import NovaFolha from "@/Pages/NovaFolha";
import ListaFolhas from "@/Pages/ListaFolhas";
import DashboardFinanceiro from "./Pages/DashboardFinanceiro";
import Login from "@/Pages/Login";

export default function App() {
  return (
    <Routes>

      // Rota pública de Login (sem Layout)     
      <Route path="/login" element={<Login />} />

      // Rotas privadas (com Layout)
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard-financeiro" element={<DashboardFinanceiro />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/nova-folha" element={<NovaFolha />} />
        <Route path="/lista-folhas" element={<ListaFolhas />} />
      </Route>
    </Routes>
  );
}
*/}
