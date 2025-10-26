import React from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarContent, SidebarTrigger } from "./components/ui/sidebar";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/services/supabaseClient";
import { Notification } from "@/entities/Notification";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  LogOut, Settings, User, Zap, Menu,
  ClipboardList, FileText, Files, BarChart3, TrendingUp, Users,Bell, Loader2 
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
  { name: "Lista de Folhas", href: "/lista-folhas", icon: "ListaFolhas", roles: ['backoffice', 'supervisor', 'admin', 'visitante'] },
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
  const { profile, session } = useAuth();
  const [notifications, setNotifications] = React.useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = React.useState(false);
  const sessionUser = session?.user;
  const sessionEmail = sessionUser?.email ?? null;
  const metadataEmail = sessionUser?.user_metadata?.email ?? null;
  const profileEmail = profile?.email ?? null;
  const sessionFullName = sessionUser?.user_metadata?.full_name ?? null;

  const currentUserEmail = React.useMemo(
    () => sessionEmail || profileEmail || metadataEmail || null,
    [sessionEmail, profileEmail, metadataEmail],
  );

  const unreadCount = React.useMemo(
    () => notifications.filter((notification) => !notification?.is_read).length,
    [notifications],
  );

  const formatNotificationTime = React.useCallback((value) => {
    if (!value) return "";
    try {
      const date = typeof value === "string" ? parseISO(value) : new Date(value);
      if (!date || Number.isNaN(date.getTime())) return "";
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (error) {
      console.error("[Layout] Falha ao formatar data de notificação", error);
      return "";
    }
  }, []);

  const fetchNotifications = React.useCallback(async (silent = false) => {
    if (!currentUserEmail) {
      setNotifications([]);
      return;
    }
    if (!silent) {
      setIsLoadingNotifications(true);
    }
    try {
      const data = await Notification.listByUser(currentUserEmail, { includeRead: true, limit: 50 });
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[Layout] Erro ao buscar notificações", error);
    } finally {
      if (!silent) {
        setIsLoadingNotifications(false);
      }
    }
  }, [currentUserEmail]);

  const handleToggleNotifications = React.useCallback(() => {
    setIsNotificationsOpen((prev) => {
      const next = !prev;
      if (!prev) {
        fetchNotifications(true);
      }
      return next;
    });
  }, [fetchNotifications]);

  const handleNotificationClick = React.useCallback(async (notification) => {
    if (!notification) return;

    try {
      if (!notification.is_read && notification.id) {
        await Notification.markAsRead(notification.id);
      }
    } catch (error) {
      console.error("[Layout] Não foi possível marcar notificação como lida", error);
    }

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item,
      ),
    );

    setIsNotificationsOpen(false);
    const destination = notification.link || createPageUrl("ListaFolhas");
    navigate(destination.startsWith("/") ? destination : createPageUrl("ListaFolhas"));
  }, [navigate]);

  const handleMarkAllAsRead = React.useCallback(async () => {
    if (!currentUserEmail) return;
    try {
      await Notification.markAllAsRead(currentUserEmail);
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch (error) {
      console.error("[Layout] Não foi possível marcar todas as notificações como lidas", error);
    }
  }, [currentUserEmail]);

  React.useEffect(() => {
    if (!currentUserEmail) {
      setNotifications([]);
      return;
    }
    fetchNotifications(true);
  }, [currentUserEmail, fetchNotifications]);

  React.useEffect(() => {
    if (!currentUserEmail) return undefined;
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUserEmail, fetchNotifications]);

  React.useEffect(() => {
    if (!isNotificationsOpen) return undefined;
    const handleClickOutside = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const isTrigger = target.closest('[data-notification-trigger]');
      const isPanel = target.closest('[data-notification-panel]');
      if (isTrigger || isPanel) {
        return;
      }
      setIsNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotificationsOpen]);

  const notificationChannelRef = React.useRef(null);

  React.useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    if (!currentUserEmail) {
      if (notificationChannelRef.current) {
        notificationChannelRef.current.unsubscribe();
        notificationChannelRef.current = null;
      }
      return undefined;
    }

    const channel = supabase
      .channel(`notifications:${currentUserEmail}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_email=eq.${currentUserEmail}`,
        },
        () => {
          fetchNotifications(true);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          notificationChannelRef.current = channel;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          channel.unsubscribe();
          if (notificationChannelRef.current === channel) {
            notificationChannelRef.current = null;
          }
        }
      });

    return () => {
      channel.unsubscribe();
      if (notificationChannelRef.current === channel) {
        notificationChannelRef.current = null;
      }
    };
  }, [currentUserEmail, fetchNotifications, supabase]);


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






  const LayoutSidebar = ({ variant = "desktop" }) => {
    const isDesktop = variant === "desktop";
    const containerClasses = isDesktop
      ? "hidden md:flex flex-col w-64 bg-white border-r border-gray-200 relative"
      : "flex flex-col w-64 bg-white border-r border-gray-200 relative h-full";
    const panelPositionClass = isDesktop ? "left-6 right-6 bottom-28" : "left-4 right-4 bottom-6";
    const unreadDisplay = unreadCount > 99 ? "99+" : unreadCount;
    const notificationItems = notifications.filter((item) => item && item.message);
    const mainUserLabel =
      profile?.full_name ||
      profile?.display_name ||
      sessionFullName ||
      sessionEmail ||
      profileEmail ||
      "Usuário";
    const secondaryUserLabel =
      profile?.role ||
      sessionEmail ||
      profileEmail ||
      "";

    return (
      <aside className={containerClasses}>
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
        <div className="flex-1 flex flex-col gap-2 p-3">
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
          {/* Central de Notificações */}
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-3">
              Central de Notificações
            </div>
            <div className="px-3">
              <button
                type="button"
                data-notification-trigger
                onClick={handleToggleNotifications}
                className="relative flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-gray-500" />
                  <span>Notificações</span>
                </span>
                <span className="flex items-center gap-2">
                  {isLoadingNotifications ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : unreadCount > 0 ? (
                    <span className="inline-flex min-w-[1.5rem] justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {unreadDisplay}
                    </span>
                  ) : null}
                </span>
              </button>            
            </div>
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
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
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
            <p className="font-semibold text-gray-900 text-sm truncate">{mainUserLabel}</p>
            {secondaryUserLabel && (
              <p className="text-xs text-gray-500 truncate capitalize">{secondaryUserLabel}</p>
            )}
          </div>
          <Link to="/settings" title="Configurações">
            <Settings className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" />
          </Link>
          <button onClick={handleLogout} title="Sair" className="p-2 rounded-md hover:bg-red-100 transition-colors">
            <LogOut className="w-4 h-4 text-red-500" />
          </button>
        </div>








        {isNotificationsOpen && (
          <div
            data-notification-panel
            className={`absolute z-30 rounded-xl border border-gray-200 bg-white shadow-2xl ${panelPositionClass} max-h-[22rem] overflow-hidden`}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-sm font-semibold text-gray-700">Notificações</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-[18rem] overflow-y-auto divide-y divide-gray-100">
              {isLoadingNotifications ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  Carregando...
                </div>
              ) : notificationItems.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500">Nenhuma notificação disponível.</div>
              ) : (
                notificationItems.map((notification) => {
                  const key = notification.id || `${notification.created_at}-${notification.message}`;
                  const isUnread = !notification.is_read;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                        isUnread ? 'bg-blue-50/70 hover:bg-blue-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-800">{notification.message}</span>
                        {isUnread && <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-blue-500" />}
                      </div>
                      <span className="mt-1 block text-xs text-gray-500">
                        {formatNotificationTime(notification.created_at)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </aside>
    );
  };
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-white">
        <LayoutSidebar />
        <SidebarContent>
          <LayoutSidebar variant="mobile" />
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
