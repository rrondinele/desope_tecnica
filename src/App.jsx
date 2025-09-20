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
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} /> {/* Rota raiz opcional */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard-financeiro" element={<DashboardFinanceiro />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/nova-folha" element={<NovaFolha />} />
        <Route path="/lista-folhas" element={<ListaFolhas />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Layout>
  );
}