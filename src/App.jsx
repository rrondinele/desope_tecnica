import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import Login from "@/Pages/Login";
import Dashboard from "@/Pages/Dashboard";
import Cadastro from "@/Pages/Cadastro";
import NovaFolha from "@/Pages/NovaFolha";
import ListaFolhas from "@/Pages/ListaFolhas";
import DashboardFinanceiro from "./Pages/DashboardFinanceiro";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Página de exemplo para gerenciamento de usuários (acessível apenas por admins)
const AdminPage = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
    <p className="mt-2">Aqui você poderá listar, editar e atribuir perfis aos usuários do sistema.</p>
  </div>
);

export default function App() {
  return (
    <Routes>
      {/* Rota Pública: qualquer um pode acessar */}
      <Route path="/login" element={<Login />} />

      {/* Container de Rotas Privadas: exige que o usuário esteja logado */}
      <Route 
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Rotas acessíveis por QUALQUER usuário logado (admin, supervisor, backoffice) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cadastro" element={<Cadastro />} />

        {/* Rotas para 'backoffice', 'supervisor' e 'admin' */}
        <Route 
          path="/nova-folha" 
          element={
            <ProtectedRoute allowedRoles={['backoffice', 'supervisor', 'admin']}>
              <NovaFolha />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/lista-folhas" 
          element={
            <ProtectedRoute allowedRoles={['backoffice', 'supervisor', 'admin']}>
              <ListaFolhas />
            </ProtectedRoute>
          } 
        />

        {/* Rota para 'supervisor' e 'admin' */}
        <Route 
          path="/dashboard-financeiro" 
          element={
            <ProtectedRoute allowedRoles={['supervisor', 'admin']}>
              <DashboardFinanceiro />
            </ProtectedRoute>
          } 
        />
        
        {/* Rota exclusiva para 'admin' */}
        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          } 
        />
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