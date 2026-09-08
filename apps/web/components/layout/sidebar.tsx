'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Package, 
  Receipt, 
  MessageSquare,
  Settings, 
  LogOut, 
  Activity,
  Wrench,
  Briefcase
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'Receipts', href: '/receipts', icon: Receipt },
  { name: 'Accessories', href: '/accessories', icon: Wrench },
  { name: 'Staff & Payroll', href: '/stuffs', icon: Briefcase },
  { name: 'Packages', href: '/packages', icon: Package },
  { name: 'SMS', href: '/smsinfo', icon: MessageSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC<{ onCloseMobile?: () => void }> = ({ onCloseMobile }) => {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="w-64 h-full flex flex-col glass-panel border-r border-white/10 dark:border-white/10 backdrop-blur-xl">
      {/* Brand Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-white/10 dark:border-white/10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-900 border border-red-500/40 flex items-center justify-center text-white shadow-glow-red-sm">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-100 dark:text-white leading-tight tracking-tight">Luckydental</h2>
          <span className="text-[11px] font-medium text-red-500 dark:text-red-400 uppercase tracking-wider">Dental Care System</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && (pathname?.startsWith(item.href) ?? false));

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-red-900/60 to-red-950/40 text-white border border-red-700/40 shadow-glow-red-sm font-bold'
                  : 'text-gray-400 hover:text-gray-200 dark:hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-red-400' : 'text-gray-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle & Logout Footer */}
      <div className="p-4 border-t border-white/10 dark:border-white/10 space-y-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-gray-400 font-medium">Theme Mode</span>
          <ThemeToggle />
        </div>

        <button
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            logout();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-950/20 transition-colors"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
