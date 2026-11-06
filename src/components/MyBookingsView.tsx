import React, { useState } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle, ShieldAlert, X, ChevronRight, Zap } from 'lucide-react';
import { UserProfile, Booking } from '../types/gym';
import { gymService } from '../services/gymService';
import { canCancelWithoutPenalty } from '../utils/bookingRules';

interface MyBookingsViewProps {
  currentUser: UserProfile;
  onRefresh: () => void;
  onOpenSchedule: () => void;
}

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({
  currentUser,
  onRefresh,
  onOpenSchedule,
}) => {
  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState<Booking | null>(null);
  const [cancelFeedback, setCancelFeedback] = useState<{ message: string; refunded: boolean } | null>(null);

  const bookings = gymService.getUserBookings(currentUser.uid);
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const pastBookings = bookings.filter(b => b.status !== 'confirmed');

  const handleExecuteCancel = () => {
    if (!selectedBookingToCancel) return;

    const res = gymService.cancelBooking(selectedBookingToCancel.id);
    setSelectedBookingToCancel(null);
    setCancelFeedback({
      message: res.message,
      refunded: res.refunded,
    });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {cancelFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in ${
            cancelFeedback.refunded
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm">
            {cancelFeedback.refunded ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span>{cancelFeedback.message}</span>
          </div>
          <button
            onClick={() => setCancelFeedback(null)}
            className="text-xs font-bold uppercase tracking-wider hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800/80 border border-slate-800">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 block mb-1">
            Gestión Personal
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Mis Reservas y Clases
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Consulta tus horarios anotados o cancela con reembolso hasta 1 hora antes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSchedule}
            className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
          >
            <span>Reservar nuevo turno</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Bookings Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Turnos Confirmados ({confirmedBookings.length})</span>
          </h3>
          <span className="text-xs text-slate-400">
            Saldo: <strong className="text-amber-400 font-bold">⚡ {currentUser.tokens} tokens</strong>
          </span>
        </div>

        {confirmedBookings.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-base font-semibold text-slate-300">No tienes turnos reservados activos</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Elige el día y la hora que mejor se adapte a tu rutina para entrenar con nosotros en Gurú Box (Roma 2607, Caseros).
            </p>
            <button
              onClick={onOpenSchedule}
              className="mt-2 py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Ver horarios disponibles</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {confirmedBookings.map(booking => {
              const check = canCancelWithoutPenalty(booking.slotDate, booking.slotTime);

              return (
                <div
                  key={booking.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Confirmado
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {booking.slotDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Clock className="w-5 h-5 text-emerald-400" />
                      <div>
                        <span className="text-xl font-extrabold text-white">
                          {booking.slotTime} hs
                        </span>
                        <span className="text-xs text-slate-400 block">Gurú Box · Roma 2607, Caseros</span>
                      </div>
                    </div>

                    {/* Cancellation Status Preview */}
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                        check.allowedWithoutPenalty
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                      }`}
                    >
                      {check.allowedWithoutPenalty ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>
                            Cancelación sin penalización (faltan {check.minutesRemaining} min). Se reembolsa 1 token.
                          </span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>
                            Faltan menos de 60 min: Si cancelas ahora, se aplica penalización (no reembolsa token).
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/80">
                    <button
                      onClick={() => setSelectedBookingToCancel(booking)}
                      className="w-full py-2 px-3 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition cursor-pointer"
                    >
                      Cancelar reserva
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past / Cancelled History */}
      {pastBookings.length > 0 && (
        <div className="pt-4 border-t border-slate-800">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Historial de Reservas Anteriores
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Horario</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Asistencia</th>
                  <th className="py-3 px-4">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pastBookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-medium">{b.slotDate}</td>
                    <td className="py-3 px-4 font-bold text-white">{b.slotTime} hs</td>
                    <td className="py-3 px-4">
                      {b.status === 'cancelled_refunded' ? (
                        <span className="text-slate-400 font-medium">Cancelado (Reembolsado)</span>
                      ) : (
                        <span className="text-rose-400 font-medium">Cancelado (Con penalización)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {b.attended ? (
                        <span className="text-emerald-400 font-medium">Presente</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {b.penaltyReason || 'Cancelación de usuario'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {selectedBookingToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">¿Cancelar esta reserva?</h3>
              <button
                onClick={() => setSelectedBookingToCancel(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-3">
              <p className="text-xs text-slate-300">
                Estás a punto de cancelar tu turno del día <strong>{selectedBookingToCancel.slotDate}</strong> a las{' '}
                <strong>{selectedBookingToCancel.slotTime} hs</strong>.
              </p>

              {(() => {
                const check = canCancelWithoutPenalty(
                  selectedBookingToCancel.slotDate,
                  selectedBookingToCancel.slotTime
                );

                return check.allowedWithoutPenalty ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-emerald-200">Cancelación sin penalización:</strong>
                      Se te reembolsará <strong>1 token</strong> de inmediato a tu saldo.
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-amber-200">Aviso de Penalización (Regla de 1 Hora):</strong>
                      Faltan menos de 60 minutos para el inicio del turno. El token <strong>no</strong> se reintegrará.
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setSelectedBookingToCancel(null)}
                className="py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-xs transition cursor-pointer"
              >
                Mantener turno
              </button>
              <button
                onClick={handleExecuteCancel}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow cursor-pointer"
              >
                Confirmar cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
