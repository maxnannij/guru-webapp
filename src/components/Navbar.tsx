import React from 'react';
import { Dumbbell, Calendar, Zap, Bell, User, ShieldCheck, ShoppingCart, LogOut } from 'lucide-react';
import { UserProfile, UserRole } from '../types/gym';
import { PWAInstallButton } from './PWAInstallButton';

export type ActiveView = 'scheduler' | 'wod' | 'my_bookings' | 'owner_admin';

interface NavbarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  currentUser: UserProfile;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  currentUser,
  unreadNotificationsCount,
  onOpenNotifications,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-emerald-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark with Gurú Box Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveView(currentUser.role === 'owner' ? 'owner_admin' : 'scheduler')}
            className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group"
          >
            <img
              src="/assets/aistudio/image_e8128fe0.png"
              alt="Gurú Box Logo"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.35)] group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-heading text-lg font-black tracking-wider text-white flex items-center gap-1 leading-none">
                GURÚ <span className="text-emerald-400">BOX</span>
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider font-semibold uppercase block">
                Cross Training Club
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {currentUser.role === 'owner' ? (
            <>
              <button
                onClick={() => setActiveView('owner_admin')}
                className={`transition whitespace-nowrap shrink-0 hover:text-white py-1 cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'owner_admin'
                    ? 'text-emerald-400 border-b-2 border-emerald-400 font-bold'
                    : 'text-emerald-300/90'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Panel Dueños</span>
              </button>

              <button
                onClick={() => setActiveView('scheduler')}
                className={`transition whitespace-nowrap shrink-0 hover:text-white py-1 cursor-pointer ${
                  activeView === 'scheduler' ? 'text-emerald-400 border-b-2 border-emerald-400 font-bold' : ''
                }`}
              >
                Turnos del Box
              </button>

              <button
                onClick={() => setActiveView('wod')}
                className={`transition whitespace-nowrap shrink-0 hover:text-white py-1 cursor-pointer ${
                  activeView === 'wod' ? 'text-emerald-400 border-b-2 border-emerald-400 font-bold' : ''
                }`}
              >
                WOD del Día
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveView('scheduler')}
                className={`transition whitespace-nowrap shrink-0 hover:text-white py-1 cursor-pointer ${
                  activeView === 'scheduler' ? 'text-emerald-400 border-b-2 border-emerald-400 font-bold' : ''
                }`}
              >
                Turnos de Entrenamiento
              </button>

              <button
                onClick={() => setActiveView('wod')}
                className={`transition whitespace-nowrap shrink-0 hover:text-white py-1 cursor-pointer ${
                  activeView === 'wod' ? 'text-emerald-400 border-b-2 border-emerald-400 font-bold' : ''
                }`}
              >
                WOD del Día
              </button>

              <button
                onClick={() => setActiveView('my_bookings')}
                className={`transition whitespace-nowrap shrink-0 hover:text-white py-1 cursor-pointer ${
                  activeView === 'my_bookings' ? 'text-emerald-400 border-b-2 border-emerald-400 font-bold' : ''
                }`}
              >
                Mis Reservas
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Actions & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <PWAInstallButton />

          {/* Token Balance Pill (for athletes) or Owner Badge */}
          {currentUser.role === 'athlete' ? (
            <div
              title="Tokens asignados exclusivamente por los dueños de Gurú Box"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-emerald-400" />
              <span>{currentUser.tokens}</span>
              <span className="hidden sm:inline text-[10px] text-emerald-300/80 font-medium">tokens</span>
            </div>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold whitespace-nowrap">
              👑 {currentUser.displayName}
            </span>
          )}

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            aria-label="Abrir notificaciones"
            className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Logout / Salir */}
          <button
            onClick={onLogout}
            title="Cerrar sesión e ir a pantalla de inicio"
            className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition cursor-pointer text-xs"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline text-[11px] font-semibold">Salir</span>
          </button>
        </div>
      </div>

      {/* Mobile subnavigation bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-950 px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {currentUser.role === 'owner' ? (
          <>
            <button
              onClick={() => setActiveView('owner_admin')}
              className={`py-1 px-2 rounded-md ${
                activeView === 'owner_admin' ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-300/80'
              }`}
            >
              Panel Dueños
            </button>
            <button
              onClick={() => setActiveView('scheduler')}
              className={`py-1 px-2 rounded-md ${
                activeView === 'scheduler' ? 'text-emerald-400 bg-emerald-500/10' : ''
              }`}
            >
              Turnos
            </button>
            <button
              onClick={() => setActiveView('wod')}
              className={`py-1 px-2 rounded-md ${
                activeView === 'wod' ? 'text-emerald-400 bg-emerald-500/10' : ''
              }`}
            >
              WOD
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveView('scheduler')}
              className={`py-1 px-2 rounded-md ${
                activeView === 'scheduler' ? 'text-emerald-400 bg-emerald-500/10' : ''
              }`}
            >
              Turnos
            </button>
            <button
              onClick={() => setActiveView('wod')}
              className={`py-1 px-2 rounded-md ${
                activeView === 'wod' ? 'text-emerald-400 bg-emerald-500/10' : ''
              }`}
            >
              WOD
            </button>
            <button
              onClick={() => setActiveView('my_bookings')}
              className={`py-1 px-2 rounded-md ${
                activeView === 'my_bookings' ? 'text-emerald-400 bg-emerald-500/10' : ''
              }`}
            >
              Mis Reservas
            </button>
          </>
        )}
      </div>
    </header>
  );
};
