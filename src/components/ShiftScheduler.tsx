import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Zap,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Ban,
  MapPin,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getGymSlotTimesForDate, SlotTime, MAX_SLOT_CAPACITY, formatDateLabel } from '../utils/bookingRules';
import { UserProfile, Booking } from '../types/gym';
import { gymService } from '../services/gymService';

interface ShiftSchedulerProps {
  currentUser: UserProfile;
  onBookingChanged: () => void;
}

export const ShiftScheduler: React.FC<ShiftSchedulerProps> = ({
  currentUser,
  onBookingChanged,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const toLocalISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate() + i);
    const isoDate = toLocalISODate(d);
    const isToday = i === 0;
    const isTomorrow = i === 1;

    let label = isToday ? 'Hoy' : isTomorrow ? 'Mañana' : formatDateLabel(isoDate);

    return {
      isoDate,
      label,
      fullDate: d.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
      dayOfWeek: d.toLocaleDateString('es-AR', { weekday: 'short' }),
      dayNumber: d.getDate(),
    };
  });

  const [selectedDate, setSelectedDate] = useState<string>(days[0].isoDate);
  useEffect(() => {
    setSelectedDate(days[0].isoDate);
  }, [days[0].isoDate]);
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<SlotTime | null>(null);
  const [bookingNotice, setBookingNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const bookingsForDate = gymService.getBookingsForDate(selectedDate);
  const slotsForSelectedDate = getGymSlotTimesForDate(selectedDate);
  const isSelectedDateToday = selectedDate === toLocalISODate(currentTime);
  const availableSlots = slotsForSelectedDate.filter(slotTime => {
    if (!isSelectedDateToday) return true;
    const [hours, minutes] = slotTime.split(':').map(Number);
    return hours * 60 + minutes > currentTime.getHours() * 60 + currentTime.getMinutes();
  });

  const handleConfirmBooking = () => {
    if (!selectedSlotForBooking) return;

    const res = gymService.bookSlot({
      slotDate: selectedDate,
      slotTime: selectedSlotForBooking,
      athlete: currentUser,
    });

    if (res.success) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#22c55e', '#39ff14', '#ffffff'],
      });

      setBookingNotice({
        type: 'success',
        message: `¡Turno reservado para las ${selectedSlotForBooking} hs! Te quedan ${currentUser.tokens} tokens.`,
      });
      setSelectedSlotForBooking(null);
      onBookingChanged();
    } else {
      setBookingNotice({
        type: 'error',
        message: res.error || 'No se pudo concretar la reserva.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {bookingNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in ${
            bookingNotice.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {bookingNotice.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{bookingNotice.message}</span>
          </div>
          <button
            onClick={() => setBookingNotice(null)}
            className="text-xs uppercase font-bold tracking-wider hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Header Info Strip with Gurú Box Logo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-lg">
        <div className="flex items-center gap-3.5">
          <img
            src="/assets/aistudio/image_e8128fe0.png"
            alt="Gurú Box"
            className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Turnos Oficiales Gurú Box</span>
              </span>
              <span className="text-slate-500">·</span>
              <span className="flex items-center gap-1 text-slate-300 normal-case font-medium">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Roma 2607, Caseros</span>
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Reserva tu lugar en el box
            </h2>
            <p className="text-xs text-slate-400">
              Máximo 8 atletas por turno · 1 token por sesión · Cancelación sin penalización hasta 1h antes
            </p>
          </div>
        </div>

        {/* Current user token widget */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-inner">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Tus Tokens</span>
              <span className="text-lg font-black text-emerald-400 flex items-center gap-1">
                <Zap className="w-4 h-4 fill-emerald-400" />
                {currentUser.tokens} <span className="text-xs font-normal text-slate-400">créditos</span>
              </span>
            </div>
            <div
              title="Los tokens sólo pueden ser asignados por Melina y Alexis"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Asignados por Coach</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date Selector Tabs */}
      <div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {days.map(day => {
            const isSelected = selectedDate === day.isoDate;
            return (
              <button
                key={day.isoDate}
                onClick={() => setSelectedDate(day.isoDate)}
                className={`flex flex-col items-center justify-center min-w-[76px] py-3 px-2 rounded-xl border text-center transition cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] font-bold'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                <span className={`text-[11px] uppercase tracking-wider ${isSelected ? 'text-slate-950 font-extrabold' : 'text-slate-400'}`}>
                  {day.dayOfWeek}
                </span>
                <span className={`text-xl font-black ${isSelected ? 'text-slate-950' : 'text-white'}`}>
                  {day.dayNumber}
                </span>
                <span className={`text-[10px] mt-0.5 font-medium ${isSelected ? 'text-slate-900' : 'text-emerald-400/90'}`}>
                  {day.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Shift Slots Grid */}
      {slotsForSelectedDate.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
          <Calendar className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Domingo cerrado</h3>
          <p className="text-sm text-slate-400 mt-1">No hay turnos disponibles los domingos.</p>
        </div>
      ) : availableSlots.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
          <Clock className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No quedan turnos para hoy</h3>
          <p className="text-sm text-slate-400 mt-1">Podés consultar los horarios de los próximos días.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {availableSlots.map(slotTime => {
          const bookings = bookingsForDate.filter(b => b.slotTime === slotTime);
          const count = bookings.length;
          const isFull = count >= MAX_SLOT_CAPACITY;
          const alreadyBooked = bookings.some(b => b.athleteId === currentUser.uid);
          const isCancelledByOwner = gymService.isSlotCancelled(selectedDate, slotTime);
          const cancelledInfo = gymService.getCancelledSlot(selectedDate, slotTime);

          const percent = Math.min(100, Math.round((count / MAX_SLOT_CAPACITY) * 100));

          return (
            <div
              key={slotTime}
              className={`rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                isCancelledByOwner
                  ? 'bg-slate-950/70 border-rose-500/30 opacity-75'
                  : alreadyBooked
                  ? 'bg-emerald-950/25 border-emerald-500/50 ring-1 ring-emerald-500/30'
                  : isFull
                  ? 'bg-slate-900/40 border-slate-800/80 opacity-75'
                  : 'bg-slate-900 border-slate-800 hover:border-emerald-500/40'
              }`}
            >
              <div>
                {/* Time & Capacity Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${alreadyBooked ? 'text-emerald-400' : isCancelledByOwner ? 'text-rose-400' : 'text-emerald-400'}`} />
                    <span className="text-xl font-extrabold text-white tracking-tight">
                      {slotTime} <span className="text-xs font-normal text-slate-400">hs</span>
                    </span>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isCancelledByOwner
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : alreadyBooked
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isFull
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : count >= 6
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {isCancelledByOwner
                      ? 'Suspendido'
                      : alreadyBooked
                      ? 'Tu reserva'
                      : isFull
                      ? 'Completo'
                      : `${MAX_SLOT_CAPACITY - count} libres`}
                  </span>
                </div>

                {isCancelledByOwner ? (
                  <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Ban className="w-3.5 h-3.5" />
                      <span>Horario Suspendido</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Motivo: {cancelledInfo?.reason || 'Administración Gurú Box'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Capacity Progress Bar */}
                    <div className="space-y-1 mb-4">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> Cupos:
                        </span>
                        <span className="font-bold text-slate-200">
                          {count} / {MAX_SLOT_CAPACITY} atletas
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            isFull ? 'bg-rose-500' : count >= 6 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Athlete roster avatars */}
                    <div className="min-h-[46px] mb-4">
                      <span className="text-[11px] text-slate-400 font-medium block mb-1.5">
                        {count === 0 ? 'Aún sin atletas anotados' : 'Atletas confirmados:'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {bookings.map(b => (
                          <div
                            key={b.id}
                            title={`${b.athleteName} (${b.athleteEmail})`}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                              b.athleteId === currentUser.uid
                                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 font-bold'
                                : 'bg-slate-800/80 border-slate-700/60 text-slate-300'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="truncate max-w-[85px]">{b.athleteName.split(' ')[0]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-800/80">
                {isCancelledByOwner ? (
                  <div className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs font-semibold text-center">
                    Turno no disponible
                  </div>
                ) : alreadyBooked ? (
                  <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>Lugar reservado</span>
                  </div>
                ) : isFull ? (
                  <button
                    disabled
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800/60 border border-slate-800 text-slate-500 text-xs font-semibold cursor-not-allowed text-center"
                  >
                    Turno Completo (8/8)
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (currentUser.tokens <= 0) {
                        setBookingNotice({
                          type: 'error',
                          message:
                            'No tienes tokens disponibles. Recuerda que los tokens sólo son asignados por los Coach (Melina y Alexis). Acércate a recepción en Roma 2607, Caseros para cargar créditos.',
                        });
                      } else {
                        setSelectedSlotForBooking(slotTime);
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <span>Reservar turno</span>
                    <span className="text-[10px] font-bold opacity-80">(1 Token)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Confirmation Modal */}
      {selectedSlotForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-emerald-500/30 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <img
                src="/assets/aistudio/image_e8128fe0.png"
                alt="Gurú Box"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/50"
              />
              <div>
                <h3 className="font-bold text-base text-white">Confirmar Reserva de Turno</h3>
                <p className="text-xs text-slate-400">Gurú Box Cross Training</p>
              </div>
            </div>

            <div className="my-5 space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Día y Horario:</span>
                  <span className="text-base font-bold text-white">
                    {selectedDate} a las {selectedSlotForBooking} hs
                  </span>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-1 rounded">
                  8 atletas máx
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Costo de reserva:</span>
                  <span className="text-sm font-semibold text-emerald-400">1 Token de tu saldo</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Saldo posterior:</span>
                  <span className="text-sm font-bold text-white">{currentUser.tokens - 1} tokens</span>
                </div>
              </div>

              {/* 1-Hour Cancellation Warning */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Política de Cancelación:</strong> Podrás cancelar la reserva con devolución de tu token hasta <strong>1 hora antes</strong> del inicio del turno.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSlotForBooking(null)}
                className="py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-xs transition cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmBooking}
                className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Confirmar (-1 Token)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
