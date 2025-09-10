import React, { createContext, useContext, useState } from "react";

const SidebarContext = createContext();

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function Sidebar({ children, className }) {
  return (
    <aside className={`w-64 bg-white ${className}`}>{children}</aside>
  );
}

export function SidebarHeader({ children, className }) {
  return <div className={className}>{children}</div>;
}

export function SidebarContent({ children, className }) {
  return <div className={className}>{children}</div>;
}

export function SidebarGroup({ children, className }) {
  return <div className={className}>{children}</div>;
}

export function SidebarGroupLabel({ children, className }) {
  return <div className={className}>{children}</div>;
}

export function SidebarGroupContent({ children, className }) {
  return <div className={className}>{children}</div>;
}

export function SidebarMenu({ children, className }) {
  return <ul className={className}>{children}</ul>;
}

export function SidebarMenuItem({ children }) {
  return <li>{children}</li>;
}

export function SidebarMenuButton({ children, className, asChild }) {
  const Comp = asChild ? 'span' : 'button'; // ou 'div', ou até deixar o componente receber como prop
  return <Comp className={className}>{children}</Comp>;
}

export function SidebarFooter({ children, className }) {
  return <div className={className}>{children}</div>;
}

export function SidebarTrigger({ className }) {
  const { isOpen, setIsOpen } = useContext(SidebarContext);
  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={className}
      title="Alternar Menu"
    >
      ☰
    </button>
  );
}