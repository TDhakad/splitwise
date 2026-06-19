import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import MSIcon from '../MSIcon';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onAddExpense: () => void;
  onLogout: () => void;
}

export default function Sidebar({ isCollapsed, onToggle, onAddExpense, onLogout }: SidebarProps) {
  const tabs = [
    { id: 'dashboard', path: '/', icon: 'grid_view', label: 'Dashboard' },
    { id: 'friends', path: '/friends', icon: 'person', label: 'Friends' },
    { id: 'groups', path: '/groups', icon: 'groups', label: 'Groups' },
    { id: 'activity', path: '/activity', icon: 'history', label: 'Activity' },
    { id: 'preplanning', path: '/preplanning', icon: 'event_available', label: 'Preplanning' },
  ];

  return (
    <aside className={clsx(
      "bg-white border-r border-gray-200 flex flex-col shrink-0 relative z-20 transition-all duration-300",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Sidebar toggle button */}
      <button 
        onClick={onToggle}
        className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 shadow-sm z-30"
      >
        <MSIcon name={isCollapsed ? 'chevron_right' : 'chevron_left'} className="text-sm" />
      </button>

      <div className={clsx("p-6 flex", isCollapsed ? "justify-center" : "items-center gap-3")}>
        <div className="w-10 h-10 bg-[#007A64] rounded-xl flex items-center justify-center text-white shrink-0 shadow-md">
          <MSIcon name="account_balance_wallet" fill={1} className="text-xl" />
        </div>
        {!isCollapsed && (
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-[#007A64]">Equitable<br />Finance</h1>
          </div>
        )}
      </div>

      <div className="px-4 py-2">
        <button 
          onClick={onAddExpense} 
          className={clsx(
            "bg-[#007A64] hover:bg-[#00604f] text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 text-sm",
            isCollapsed ? "w-full px-0" : "w-full px-4"
          )}
          title={isCollapsed ? "Add Expense" : undefined}
        >
          <MSIcon name="add" /> 
          {!isCollapsed && <span>Add Expense</span>}
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {tabs.map(t => (
          <NavLink 
            key={t.id} 
            to={t.path}
            end={t.path === '/'}
            className={({ isActive }) => clsx(
              'w-full flex items-center gap-3.5 rounded-xl font-bold transition-all overflow-hidden whitespace-nowrap',
              isCollapsed ? 'justify-center py-3 px-0' : 'px-4 py-3',
              isActive ? 'bg-[#EAF5F2] text-[#007A64]' : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
            )}
            title={isCollapsed ? t.label : undefined}
          >
            {({ isActive }) => (
               <>
                 <MSIcon name={t.icon} fill={isActive ? 1 : 0} className="text-[22px] shrink-0" />
                 {!isCollapsed && <span>{t.label}</span>}
               </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-1.5">
        <button 
          className={clsx(
            "flex items-center gap-3.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 transition-colors overflow-hidden whitespace-nowrap",
            isCollapsed ? "w-full justify-center py-2.5 px-0" : "w-full px-4 py-2.5"
          )}
          title={isCollapsed ? "Settings" : undefined}
        >
          <MSIcon name="settings" className="text-xl shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </button>
        <button 
          className={clsx(
            "flex items-center gap-3.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 transition-colors overflow-hidden whitespace-nowrap",
            isCollapsed ? "w-full justify-center py-2.5 px-0" : "w-full px-4 py-2.5"
          )} 
          onClick={onLogout}
          title={isCollapsed ? "Log out" : undefined}
        >
          <MSIcon name="logout" className="text-xl shrink-0" />
          {!isCollapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
