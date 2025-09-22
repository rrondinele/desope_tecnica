import React, { createContext, useState, useContext } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthProvider';
import { Link, useLocation } from 'react-router-dom';

// 1. Criar o Contexto da Sidebar
const SidebarContext = createContext();

// 2. Criar o Provider que vai gerenciar o estado (aberto/fechado)
export const SidebarProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const value = { isOpen, setIsOpen };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

// 3. Criar e EXPORTAR o hook customizado 'useSidebar'
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar deve ser usado dentro de um SidebarProvider');
  }
  return context;
};

// 4. Componente que dispara a abertura da sidebar (geralmente um botão "hambúrguer")
export const SidebarTrigger = ({ children, className }) => {
  const { setIsOpen } = useSidebar();
  return (
    <button onClick={() => setIsOpen(true)} className={className}>
      {children}
    </button>
  );
};

// 5. O conteúdo da Sidebar que aparece no mobile
export const SidebarContent = ({ children }) => {
  const { isOpen, setIsOpen } = useSidebar();

  return (
    <>
      {/* Overlay escuro */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      {/* Painel da Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-end p-2">
          <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>
        {children}
      </div>
    </>
  );
};

export function SidebarMenu({ children, className }) {
  return <ul className={className}>{children}</ul>;
}

export function SidebarMenuItem({ children }) {
  return <li>{children}</li>;
}

// MODIFIQUE ESTE COMPONENTE PARA ACEITAR E PASSAR PROPS ADICIONAIS (...props)
export function SidebarMenuButton({ children, className, asChild, ...props }) {
  const Comp = asChild ? 'span' : 'button';
  return (
    <Comp className={className} {...props}> {/* Adicione {...props} aqui */}
      {children}
    </Comp>
  );
}

export function SidebarFooter({ children, className }) {
  return <div className={className}>{children}</div>;
}

// ADICIONE 'export' AQUI
export function SidebarDesktop() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="hidden md:flex md:flex-col md:justify-between md:h-screen md:w-64 bg-white p-4 border-r">
      {/* Logo ou Título da Sidebar */}
      <div className="text-xl font-semibold mb-4">Minha Sidebar</div>

      {/* Links da Sidebar */}
      <div className="flex-1">
        <Link to="/" className={`flex items-center p-2 text-gray-700 rounded-md hover:bg-gray-100 ${location.pathname === '/' ? 'bg-gray-100' : ''}`}>
          Início
        </Link>
        <Link to="/sobre" className={`flex items-center p-2 text-gray-700 rounded-md hover:bg-gray-100 ${location.pathname === '/sobre' ? 'bg-gray-100' : ''}`}>
          Sobre
        </Link>
        <Link to="/contato" className={`flex items-center p-2 text-gray-700 rounded-md hover:bg-gray-100 ${location.pathname === '/contato' ? 'bg-gray-100' : ''}`}>
          Contato
        </Link>
      </div>

      {/* Informações do Usuário e Logout */}
      <div>
        {user ? (
          <div className="flex items-center justify-between p-2 bg-gray-100 rounded-md">
            <div className="flex items-center">
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full mr-2" />
              <span className="text-gray-800 font-medium">{user.name}</span>
            </div>
            <button onClick={signOut} className="text-red-600 hover:underline">
              Sair
            </button>
          </div>
        ) : (
          <Link to="/login" className="block text-center text-white bg-blue-600 hover:bg-blue-700 rounded-md p-2">
            Fazer Login
          </Link>
        )}
      </div>
    </div>
  );
}