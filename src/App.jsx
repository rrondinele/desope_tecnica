import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Cadastro from "@/Pages/Cadastro";
import Dashboard from "@/Pages/Dashboard";
import NovaFolha from "@/Pages/NovaFolha";
import ListaFolhas from "@/Pages/ListaFolhas";
import DashboardFinanceiro from "./Pages/DashboardFinanceiro";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} /> {/* Rota raiz opcional */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboardfinanceiro" element={<DashboardFinanceiro />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/nova-folha" element={<NovaFolha />} />
        <Route path="/lista-folhas" element={<ListaFolhas />} />
      </Routes>
    </Layout>
  );
}