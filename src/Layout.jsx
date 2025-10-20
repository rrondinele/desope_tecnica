import React from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
//import { SidebarProvider, SidebarTrigger, SidebarContent } from "@/components/ui/sidebar";
import { SidebarProvider, SidebarDesktop, SidebarContent, SidebarTrigger } from './components/ui/sidebar';
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/services/supabaseClient";
import { 
  LogOut, Settings, User, Zap, Menu,
  ClipboardList, FileText, Files, BarChart3, TrendingUp, Users 
} from "lucide-react";

// Mapeamento de ícones para facilitar o uso
const iconMap = {
  Cadastro: ClipboardList,
  NovaFolha: FileText,
  ListaFolhas: Files,
  Dashboard: BarChart3,
  DashboardFinanceiro: TrendingUp,
  AdminUsers: Users,
};

// Array de links com ícones e roles. GARANTA QUE OS 'href' COMECEM COM '/'
const allNavLinks = [
  { name: "Cadastro de Serviços", href: "/cadastro", icon: "Cadastro", roles: ['admin'] },
  { name: "Nova Folha de Medição", href: "/nova-folha", icon: "NovaFolha", roles: ['backoffice', 'supervisor', 'admin'] },
  { name: "Lista de Folhas", href: "/lista-folhas", icon: "ListaFolhas", roles: ['backoffice', 'supervisor', 'admin'] },
  { name: "Dashboard Operacional", href: "/dashboard", icon: "Dashboard", roles: ['supervisor', 'admin'] },
  { name: "Dashboard Financeiro", href: "/dashboard-financeiro", icon: "DashboardFinanceiro", roles: ['supervisor', 'admin'] },
  { name: "Gerenciar Usuários", href: "/admin/users", icon: "AdminUsers", roles: ['admin'] },
];

// Componente para o item do menu, para manter o código limpo
const NavItem = ({ link, pathname, disabled = false, onBlockedNavigate }) => {
  const Icon = iconMap[link.icon];
  const isActive = pathname === link.href;
  const baseClasses = "flex items-center gap-3 rounded-lg p-3 text-sm font-medium transition-all duration-200";
  const disabledClasses = "cursor-not-allowed opacity-60";
  const activeClasses = "bg-blue-50 text-blue-700";
  const inactiveClasses = "text-gray-600 hover:bg-gray-100 hover:text-gray-900";

  const handleClick = (event) => {
    if (!disabled) {
      return;
    }
    event.preventDefault();
    if (typeof onBlockedNavigate === "function") {
      onBlockedNavigate();
    }
  };

  return (
    <li>
      <Link
        to={link.href}
        onClick={handleClick}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        className={[
          baseClasses,
          disabled ? disabledClasses : isActive ? activeClasses : inactiveClasses,
        ].join(" ")}
      >
        {Icon && <Icon className="h-5 w-5" />}
        <span>{link.name}</span>
      </Link>
    </li>
  );
};

// Componente principal do Layout
export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const isEditingFolha = React.useMemo(() => {
    if (location.pathname !== "/nova-folha") {
      return false;
    }
    const params = new URLSearchParams(location.search || "");
    return params.has("editId");
  }, [location.pathname, location.search]);

  const blockedNavigationMessage =
    "Finalize a edição da folha clicando em 'Salvar e Concluir' para sair desta tela.";
  const handleBlockedNavigation = React.useCallback(() => {
    alert(blockedNavigationMessage);
  }, [blockedNavigationMessage]);

  const navLinks = allNavLinks.filter(link => 
    profile?.role && link.roles.includes(profile.role)
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const SidebarDesktop = () => (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-gray-100">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 text-lg">DesOpe</h2>
          <p className="text-xs text-gray-500 font-medium">Gestão de Serviços Elétricos</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-2 overflow-auto p-3">
        {/* Navegação Principal */}
        <div className="p-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-3">
            Navegação Principal
          </div>
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <NavItem
                key={link.name}
                link={link}
                pathname={location.pathname}
                disabled={
                  isEditingFolha &&
                  (link.href === "/nova-folha" || link.href === "/lista-folhas")
                }
                onBlockedNavigate={handleBlockedNavigation}
              />
            ))}
          </ul>
        </div>
        {/* Status do Sistema */}
        <div className="p-2 mt-auto">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-3">
            Status do Sistema
          </div>
          <div className="px-3 py-2 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">Sistema</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600 font-semibold text-xs">Online</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">Versão</span>
              <span className="text-gray-500 font-mono text-xs">v2.1.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 border-t border-gray-100 p-4">
        <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{profile?.full_name || profile?.email}</p>
          <p className="text-xs text-gray-500 truncate capitalize">{profile?.role || 'Usuário'}</p>
        </div>
        <Link to="/settings" title="Configurações">
          <Settings className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" />
        </Link>
        <button onClick={handleLogout} title="Sair" className="p-2 rounded-md hover:bg-red-100 transition-colors">
          <LogOut className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </aside>
  );

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-white">
        <SidebarDesktop />
        <SidebarContent>
          <SidebarDesktop />
        </SidebarContent>
        {/* A DIV <main> AGORA CONTROLA O FUNDO E O SCROLL */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-3 md:hidden shadow-sm">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg">
                <Menu className="h-6 w-6" />
              </SidebarTrigger>
              <h1 className="text-lg font-bold text-gray-900">DesOpe</h1>
            </div>
          </header>
          {/* A DIV INTERNA AGORA SÓ APLICA O PADDING */}
          <div className="flex-1 p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
