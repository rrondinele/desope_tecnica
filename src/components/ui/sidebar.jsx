import React, { createContext, useState, useContext } from 'react';
import { X } from 'lucide-react';

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