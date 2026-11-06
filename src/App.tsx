/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, ActiveView } from './components/Navbar';
import { ShiftScheduler } from './components/ShiftScheduler';
import { MyBookingsView } from './components/MyBookingsView';
import { WodView } from './components/WodView';
import { OwnerAdminPanel } from './components/OwnerAdminPanel';
import { NotificationModal } from './components/NotificationModal';
import { LoginScreen } from './components/LoginScreen';
import { gymService, GYM_LOCATION } from './services/gymService';
import { UserProfile } from './types/gym';
import { testConnection } from './services/firebase';
import { MapPin, Phone, ShieldCheck, WifiOff, ExternalLink } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(gymService.getCurrentUser());
  const [activeView, setActiveView] = useState<ActiveView>(
    currentUser?.role === 'owner' ? 'owner_admin' : 'scheduler'
  );
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Offline detection
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    testConnection().catch(e => console.warn('Firebase boot test notice:', e));

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerRefresh = () => {
    setCurrentUser(gymService.getCurrentUser());
    setRefreshKey(k => k + 1);
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    if (user.role === 'owner') {
      setActiveView('owner_admin');
    } else {
      setActiveView('scheduler');
    }
    triggerRefresh();
  };

  const handleLogout = () => {
    gymService.logout();
    setCurrentUser(null);
  };

  // If user is not logged in, display the Gurú Box Login Screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const notifications = gymService.getNotifications(currentUser.uid, currentUser.role);
  const unreadCount = gymService.getUnreadCount(currentUser.uid, currentUser.role);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-slate-950 text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>Modo Sin Conexión — La aplicación sigue funcionando con datos en caché de Gurú Box.</span>
        </div>
      )}

      {/* Main Top Navigation */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        currentUser={currentUser}
        unreadNotificationsCount={unreadCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {activeView === 'scheduler' && (
          <ShiftScheduler
            key={`sched_${refreshKey}`}
            currentUser={currentUser}
            onBookingChanged={triggerRefresh}
          />
        )}

        {activeView === 'wod' && (
          <WodView
            key={`wod_${refreshKey}`}
            currentUser={currentUser}
            onOpenOwnerPanel={() => setActiveView('owner_admin')}
          />
        )}

        {activeView === 'my_bookings' && (
          <MyBookingsView
            key={`bookings_${refreshKey}`}
            currentUser={currentUser}
            onRefresh={triggerRefresh}
            onOpenSchedule={() => setActiveView('scheduler')}
          />
        )}

        {activeView === 'owner_admin' && (
          <OwnerAdminPanel
            key={`admin_${refreshKey}`}
            currentUser={currentUser}
            onRefresh={triggerRefresh}
          />
        )}
      </main>

      {/* Clean Footer with Official Address: Roma 2607, Caseros */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 text-xs text-slate-400 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/image_e8128fe0.png"
              alt="Gurú Box"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0"
            />
            <div>
              <span className="font-heading font-black text-white text-sm tracking-wider">
                GURÚ BOX CROSS TRAINING
              </span>
              <p className="text-[11px] text-slate-400">
                Turnos oficiales: 8:00 · 9:30 · 15:00 · 16:15 · 17:30 · 19:00 · 20:30 (Máx. 8 atletas)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-slate-300 text-xs">
            <a
              href={GYM_LOCATION.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-emerald-400 transition bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800"
              title="Ver ubicación en Google Maps"
            >
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{GYM_LOCATION.address}</span>
              <ExternalLink className="w-3 h-3 text-slate-500 ml-0.5" />
            </a>

            <span className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Dueños: Melina & Alexis</span>
            </span>

            <span className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>PWA Multiplataforma (iOS & Android)</span>
            </span>
          </div>

          <div className="text-[11px] text-slate-500 text-center md:text-right">
            © {new Date().getFullYear()} Gurú Box · Roma 2607, Caseros.
          </div>
        </div>
      </footer>

      {/* Notification Center Modal */}
      <NotificationModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        userId={currentUser.uid}
        role={currentUser.role}
        notifications={notifications}
        onRefresh={triggerRefresh}
      />
    </div>
  );
}
