import React, { useState } from 'react';
import { UserRole } from '../types';
import { 
  FileText, 
  LayoutDashboard, 
  Users, 
  RefreshCw,
  Menu,
  X,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  Settings2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'table' | 'contract' | 'master';
  setActiveTab: (tab: 'dashboard' | 'table' | 'contract' | 'master') => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isSyncing: boolean;
  onSync: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  isSyncing,
  onSync,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('aky_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('aky_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const effectiveCollapsed = isCollapsed;

  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      sublabel: 'Ringkasan & Jatuh Tempo',
      icon: LayoutDashboard,
    },
    {
      id: 'table' as const,
      label: 'Database Karyawan',
      sublabel: 'Master Data & Import Excel',
      icon: FileSpreadsheet,
    },
    {
      id: 'contract' as const,
      label: 'Cetak Kontrak',
      sublabel: 'Pratinjau A4 & Mail Merge',
      icon: FileText,
    },
    {
      id: 'master' as const,
      label: 'Master Data',
      sublabel: 'Penomoran Kontrak & Agenda',
      icon: Settings2,
    },
  ];

  return (
    <>
      {/* Mobile Top Header (Only visible on small screens < md) */}
      <header className="md:hidden print:hidden w-full bg-slate-900 text-white border-b border-slate-800 p-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-2.5" onClick={() => setActiveTab('dashboard')}>
          <div className="flex items-center bg-white p-1 rounded-lg">
            <svg className="w-7 h-5" viewBox="0 0 140 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="70" cy="40" rx="65" ry="34" stroke="#0072CE" strokeWidth="6" />
              <path d="M42 40C42 28 55 20 70 20C85 20 98 28 98 40C98 52 85 60 70 60C55 60 42 52 42 40Z" stroke="#00A859" strokeWidth="5" />
              <text x="70" y="48" textAnchor="middle" fill="#003B70" fontFamily="sans-serif" fontWeight="900" fontSize="28">AKY</text>
            </svg>
          </div>
          <div>
            <h1 className="font-extrabold text-xs tracking-tight text-white">PT. ANDHANA KIRANA YASA</h1>
            <p className="text-[10px] text-blue-400 font-semibold">HRD LEGAL • PKWT / PKWTT</p>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Dropdown Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden print:hidden bg-slate-900 text-white border-b border-slate-800 p-4 space-y-3 z-40">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-3 transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as UserRole)}
              className="bg-slate-800 text-white font-semibold text-xs rounded-lg px-2.5 py-1.5 border border-slate-700"
            >
              <option value="admin">Super Admin (HR)</option>
              <option value="hr">Staf HRD</option>
              <option value="manager">Manager</option>
              <option value="employee">Karyawan</option>
            </select>

            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
              <span>Sinkron</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Vertical Left Sidebar (Manual Collapsible via Click) */}
      <aside 
        className={`hidden md:flex print:hidden bg-slate-900 text-white border-r border-slate-800 flex-col justify-between shrink-0 h-screen sticky top-0 z-40 select-none shadow-xl transition-all duration-300 ${
          effectiveCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        <div className="p-3.5 space-y-4">
          {/* Top Logo & Controls */}
          <div className="flex items-center justify-between">
            <div 
              className={`flex items-center cursor-pointer group rounded-xl hover:bg-slate-800/60 transition-colors ${
                effectiveCollapsed ? 'justify-center w-full p-1' : 'space-x-2.5 p-1'
              }`} 
              onClick={() => setActiveTab('dashboard')}
              title="PT. ANDHANA KIRANA YASA - Dashboard"
            >
              <div className="flex items-center bg-white p-1 rounded-lg shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-8 h-6" viewBox="0 0 140 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="70" cy="40" rx="65" ry="34" stroke="#0072CE" strokeWidth="6" />
                  <path d="M42 40C42 28 55 20 70 20C85 20 98 28 98 40C98 52 85 60 70 60C55 60 42 52 42 40Z" stroke="#00A859" strokeWidth="5" />
                  <text x="70" y="48" textAnchor="middle" fill="#003B70" fontFamily="sans-serif" fontWeight="900" fontSize="28">AKY</text>
                </svg>
              </div>
              {!effectiveCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-xs tracking-tight text-white leading-tight truncate">
                      PT. ANDHANA KIRANA YASA
                    </span>
                  </div>
                  <p className="text-[9.5px] text-blue-400 font-bold uppercase tracking-wider mt-0.5">
                    HRD LEGAL DIVISION
                  </p>
                </div>
              )}
            </div>

            {/* Manual Toggle Button (Klik untuk Ciutkan) */}
            {!effectiveCollapsed && (
              <button
                type="button"
                onClick={toggleCollapsed}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Ciutkan Navigator (Klik Manual)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Collapsed manual expansion button (Tombol Garis 3 Menu) */}
          {effectiveCollapsed && (
            <div className="flex flex-col items-center gap-2 pt-1">
              <button
                type="button"
                onClick={toggleCollapsed}
                className="p-2 rounded-xl bg-slate-800 text-blue-400 hover:text-white hover:bg-blue-600 transition-all cursor-pointer shadow-xs group"
                title="Buka Penuh Navigator (Klik Manual)"
              >
                <Menu className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-1">
            {!effectiveCollapsed && (
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Menu Utama
                </span>
              </div>
            )}
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={effectiveCollapsed ? `${item.label} - ${item.sublabel}` : undefined}
                    className={`w-full rounded-xl text-xs font-bold flex items-center transition-all cursor-pointer group ${
                      effectiveCollapsed 
                        ? 'p-2.5 justify-center' 
                        : 'px-3 py-2.5 justify-between'
                    } ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className={`flex items-center ${effectiveCollapsed ? 'justify-center' : 'space-x-3'}`}>
                      <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-800 text-slate-300 group-hover:text-white'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {!effectiveCollapsed && (
                        <div className="text-left">
                          <div className="leading-tight">{item.label}</div>
                          <div className={`text-[10px] font-normal ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                            {item.sublabel}
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer: Role, Sync, Info */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
          {/* User Role Selector */}
          {!effectiveCollapsed ? (
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Peran Pengguna:
              </label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as UserRole)}
                className="w-full bg-slate-800 text-white font-semibold text-xs rounded-xl px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="admin">Super Admin (HR)</option>
                <option value="hr">Staf HRD</option>
                <option value="manager">Manager</option>
                <option value="employee">Karyawan</option>
              </select>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="p-2 rounded-lg bg-slate-800 text-blue-400" title={`Peran: ${userRole.toUpperCase()}`}>
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>
          )}

          {/* Database & Sync Status */}
          <div className={`flex items-center bg-slate-800/70 p-2 rounded-xl border border-slate-700/80 text-xs ${
            effectiveCollapsed ? 'justify-center' : 'justify-between'
          }`}>
            {!effectiveCollapsed && (
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <p className="text-[10.5px] font-bold text-slate-200 leading-tight">Firestore Cloud</p>
                  <p className="text-[9px] text-slate-400">Database Real-time</p>
                </div>
              </div>
            )}
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
              title="Sinkronisasi Ulang Data Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Fixed Bottom Navigation Bar (< md) for thumb-friendly one-tap navigation */}
      <nav className="md:hidden print:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around py-1.5 px-1 shadow-lg select-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-blue-400 font-extrabold scale-105'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">
                {item.id === 'table' ? 'Database' : item.id === 'contract' ? 'Cetak' : item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
