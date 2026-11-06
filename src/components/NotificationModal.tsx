import React, { useState } from 'react';
import { Bell, Check, X, ShieldAlert, Sparkles, Calendar, Zap } from 'lucide-react';
import { NotificationItem, UserRole } from '../types/gym';
import { gymService } from '../services/gymService';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  role: UserRole;
  notifications: NotificationItem[];
  onRefresh: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  userId,
  role,
  notifications,
  onRefresh,
}) => {
  const [pushStatus, setPushStatus] = useState<NotificationPermission>(gymService.getPushPermission());

  if (!isOpen) return null;

  const handleEnablePush = async () => {
    const granted = await gymService.requestPushPermission();
    setPushStatus(gymService.getPushPermission());
    if (granted) {
      gymService.sendWebPushNotification(
        'Notificaciones de IronBox activadas',
        'Recibirás recordatorios de turnos, confirmaciones y avisos de WOD en tiempo real.'
      );
    }
  };

  const handleMarkAllRead = () => {
    gymService.markAllNotificationsAsRead(userId, role);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Centro de Notificaciones</h2>
              <p className="text-xs text-slate-400">
                {role === 'owner' ? 'Avisos para Dueños / Coaches' : 'Turnos y avisos del gimnasio'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.read) && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium px-2 py-1 rounded hover:bg-slate-800 transition"
              >
                Marcar leídas
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Cerrar notificaciones"
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Push Notification Banner */}
        {pushStatus !== 'granted' && (
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-b border-amber-500/20 px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs text-slate-300">
                Activa las <strong>notificaciones push</strong> para recibir confirmaciones de reservas y WODs en tu móvil o PC.
              </p>
            </div>
            <button
              onClick={handleEnablePush}
              className="shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              Activar
            </button>
          </div>
        )}

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No tienes notificaciones pendientes.
            </div>
          ) : (
            notifications.map(n => {
              const Icon =
                n.type === 'booking'
                  ? Calendar
                  : n.type === 'token_recharge'
                  ? Zap
                  : n.type === 'cancellation'
                  ? ShieldAlert
                  : Bell;

              const iconColor =
                n.type === 'booking'
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : n.type === 'token_recharge'
                  ? 'text-amber-400 bg-amber-500/10'
                  : n.type === 'cancellation'
                  ? 'text-rose-400 bg-rose-500/10'
                  : 'text-blue-400 bg-blue-500/10';

              return (
                <div
                  key={n.id}
                  className={`p-4 rounded-xl transition ${
                    n.read ? 'opacity-70 bg-transparent' : 'bg-slate-800/40 border border-slate-700/40'
                  } flex items-start gap-3.5 my-1`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${iconColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 truncate">{n.title}</h3>
                      <span className="text-[11px] text-slate-500 shrink-0">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 self-center" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between bg-slate-900/80">
          <span>{notifications.length} notificaciones registradas</span>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
