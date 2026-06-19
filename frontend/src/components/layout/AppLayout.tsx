import { useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import type { User, GroupDetail, Plan } from '../../types/api';

import { ReactNode } from 'react';

interface AppLayoutProps {
  children?: ReactNode;
  currentUser: User;
  onLogout: () => void;
  onAddExpense: (group?: GroupDetail | null, plan?: Plan | null) => void;
}

export type AppOutletContextType = {
  onAddExpense: (group?: GroupDetail | null, plan?: Plan | null) => void;
};

export function useAppOutletContext() {
  return useOutletContext<AppOutletContextType>();
}

export default function AppLayout({ children, currentUser, onLogout, onAddExpense }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-sans text-gray-900 selection:bg-[#007A64] selection:text-white">
      <Sidebar 
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onAddExpense={() => onAddExpense()}
        onLogout={onLogout}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA] relative overflow-hidden">
        <Header currentUser={currentUser} />
        <main className="flex-1 overflow-auto relative">
          {children ? children : <Outlet context={{ onAddExpense } as AppOutletContextType} />}
        </main>
      </div>
    </div>
  );
}
