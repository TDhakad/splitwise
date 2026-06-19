import MSIcon from '../MSIcon';
import type { User } from '../../types/api';

interface HeaderProps {
  currentUser: User;
}

export default function Header({ currentUser }: HeaderProps) {
  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 shrink-0 z-10 sticky top-0">
      <div className="relative w-64 md:w-96">
        <MSIcon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search expenses, friends..." 
          className="w-full bg-gray-100/80 border-transparent rounded-full py-2.5 pl-11 pr-4 text-sm font-medium text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#007A64]/20 focus:bg-white transition-all" 
        />
      </div>
      
      <div className="flex items-center gap-3 md:gap-5">
        <button className="relative text-gray-500 hover:text-gray-900 transition-colors">
          <MSIcon name="notifications" />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
        </button>
        <button className="text-gray-500 hover:text-gray-900 transition-colors hidden md:block">
          <MSIcon name="settings" />
        </button>
        <div className="hidden md:block w-px h-6 bg-gray-300 mx-1" />
        <button className="w-9 h-9 rounded-full bg-[#007A64] flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white">
          {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
        </button>
      </div>
    </header>
  );
}
