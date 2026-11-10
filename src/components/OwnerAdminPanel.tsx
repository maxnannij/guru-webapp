import React, { useState, useEffect } from 'react';
import {
  Users,
  Zap,
  Plus,
  Minus,
  Search,
  Ban,
  RotateCcw,
  Tag,
  Dumbbell,
  Calendar,
  Clock,
  CheckCircle2,
  Save,
  ClipboardList,
  Bell,
  Trash2,
} from 'lucide-react';
import { UserProfile, WOD, Booking, CancelledSlot } from '../types/gym';
import { gymService } from '../services/gymService';
import { getGymSlotTimesForDate, SlotTime } from '../utils/bookingRules';

const getLocalDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface OwnerAdminPanelProps {
  currentUser: UserProfile;
  onRefresh: () => void;
}

type AdminTab = 'tokens' | 'cancel_slots' | 'special_slots' | 'wod_builder' | 'attendance' | 'reservations';

export const OwnerAdminPanel: React.FC<OwnerAdminPanelProps> = ({ currentUser, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('tokens');
  const [searchQuery, setSearchQuery] = useState('');
  const [reservationSearch, setReservationSearch] = useState('');
  const [reservationDate, setReservationDate] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const [cancelDate, setCancelDate] = useState(() => getLocalDateString());
  const [cancelTime, setCancelTime] = useState<string>(() => getGymSlotTimesForDate(getLocalDateString())[0] || '');
  const [cancelReason, setCancelReason] = useState('Feriado / Mantenimiento del Box');
  const [specialDate, setSpecialDate] = useState(() => getLocalDateString());
  const [specialTime, setSpecialTime] = useState<string>(() => getGymSlotTimesForDate(getLocalDateString())[0] || '');
  const [specialTitle, setSpecialTitle] = useState('');

  const [wodDate, setWodDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [wodTitle, setWodTitle] = useState('');
  const [wodWarmUp, setWodWarmUp] = useState('');
  const [wodStrength, setWodStrength] = useState('');
  const [wodConditioning, setWodConditioning] = useState('');
  const [wodScaling, setWodScaling] = useState('');
  const [wodNotes, setWodNotes] = useState('');
  const [wodCoach, setWodCoach] = useState(currentUser.displayName);

  const [athletes, setAthletes] = useState<UserProfile[]>(() => gymService.getAthletes());
  const [loadingAthletes, setLoadingAthletes] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingAthletes(true);
    Promise.all([gymService.refreshUsersFromFirestore(), gymService.refreshSharedData()])
      .then(([list]) => { if (!cancelled) setAthletes(list); })
      .finally(() => { if (!cancelled) setLoadingAthletes(false); });
    return () => { cancelled = true; };
  }, [currentUser.uid]);

  const filteredAthletes = athletes.filter(
    a =>
      a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteAthlete = async (athlete: UserProfile) => {
    const confirmed = window.confirm(`¿Eliminar a ${athlete.displayName} de la lista de atletas? Esta acción quitará su ficha del sistema, pero no elimina su cuenta de Firebase Authentication ni sus reservas históricas.`);
    if (!confirmed) return;
    const result = await gymService.deleteAthleteProfile(athlete.uid);
    if (result.success) {
      setAthletes(list => list.filter(user => user.uid !== athlete.uid));
      setActionFeedback(`${athlete.displayName} fue eliminado de la lista de atletas.`);
    } else {
      setActionFeedback(result.error || 'No se pudo eliminar el atleta.');
    }
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const handleAdjustTokens = async (athlete: UserProfile, delta: number) => {
    const reason = delta > 0 ? `Asignación manual por ${currentUser.displayName}` : 'Ajuste manual de créditos';
    const res = await gymService.updateTokens(athlete.uid, delta, reason);
    if (res.success) {
      setActionFeedback(`Tokens de ${athlete.displayName}: ${res.newTokens}`);
      setTimeout(() => setActionFeedback(null), 4000);
      const list = await gymService.refreshUsersFromFirestore();
      setAthletes(list);
      onRefresh();
    }
  };

  const handleCancelSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await gymService.cancelSlotByOwner(cancelDate, cancelTime, cancelReason, currentUser.displayName);
    setActionFeedback(res.message);
    setTimeout(() => setActionFeedback(null), 5000);
    onRefresh();
  };

  const handleSaveSpecialSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await gymService.saveSpecialSlotLabel(specialDate, specialTime, specialTitle, currentUser.displayName);
    setActionFeedback(result.message);
    if (result.success) setSpecialTitle('');
    setTimeout(() => setActionFeedback(null), 5000);
    onRefresh();
  };

  const handleDeleteSpecialSlot = async (date: string, time: string) => {
    const result = await gymService.deleteSpecialSlotLabel(date, time);
    setActionFeedback(result.message);
    setTimeout(() => setActionFeedback(null), 4000);
    onRefresh();
  };

  const handleReopenSlot = async (date: string, time: string) => {
    const res = await gymService.reopenSlotByOwner(date, time);
    setActionFeedback(res.message);
    setTimeout(() => setActionFeedback(null), 4000);
    onRefresh();
  };

  const handleSaveWod = async (e: React.FormEvent) => {
    e.preventDefault();
    const newWod: WOD = {
      date: wodDate,
      title: wodTitle,
      warmUp: wodWarmUp,
      strength: wodStrength,
      conditioning: wodConditioning,
      scaling: wodScaling,
      notes: wodNotes,
      coach: wodCoach,
      createdAt: new Date().toISOString(),
    };
    await gymService.saveWOD(newWod);
    setActionFeedback(`WOD ${wodDate} publicado`);
    setTimeout(() => setActionFeedback(null), 4000);
    onRefresh();
  };

  const todayForAttendance = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();
  const attendanceBookings = gymService.getAllBookings()
    .filter(booking => booking.status === 'confirmed' && booking.slotDate >= todayForAttendance)
    .sort((a, b) => `${a.slotDate} ${a.slotTime}`.localeCompare(`${b.slotDate} ${b.slotTime}`));
  const attendanceByDate = attendanceBookings.reduce<Record<string, Booking[]>>((groups, booking) => {
    (groups[booking.slotDate] ||= []).push(booking);
    return groups;
  }, {});
  const cancelledSlots = gymService.getCancelledSlots();
  const specialSlotLabels = gymService.getSpecialSlotLabels();
  const allBookings = gymService.getAllBookings();
  const filteredBookings = allBookings.filter(booking => {
    const query = reservationSearch.trim().toLowerCase();
    const matchesAthlete = !query ||
      booking.athleteName.toLowerCase().includes(query) ||
      booking.athleteEmail.toLowerCase().includes(query);
    const matchesDate = !reservationDate || booking.slotDate === reservationDate;
    return matchesAthlete && matchesDate;
  });

  const tabBtn = (id: typeof activeTab, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
        activeTab === id ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-slate-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-2xl border border-emerald-500/30 bg-slate-900/80">
        <h2 className="text-lg font-black text-white">Panel de Coach: {currentUser.displayName}</h2>
        <p className="text-xs text-slate-400 mt-1">Atletas se cargan desde Firebase (proyecto Guru Box).</p>
      </div>

      {actionFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {actionFeedback}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabBtn('tokens', `Asignar Tokens (${athletes.length})`, <Users className="w-4 h-4" />)}
        {tabBtn('cancel_slots', 'Cancelar Horarios', <Ban className="w-4 h-4" />)}
        {tabBtn('special_slots', 'Nombres especiales', <Tag className="w-4 h-4" />)}
        {tabBtn('wod_builder', 'Cargar WOD', <Dumbbell className="w-4 h-4" />)}
        {tabBtn('attendance', 'Asistencia', <ClipboardList className="w-4 h-4" />)}
        {tabBtn('reservations', 'Reservas', <Bell className="w-4 h-4" />)}
      </div>

      {activeTab === 'tokens' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar atleta..."
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm"
            />
          </div>
          {loadingAthletes && <p className="text-xs text-slate-500">Cargando atletas desde Firebase…</p>}
          <div className="rounded-2xl border border-slate-800 overflow-hidden">
            <div className="grid grid-cols-[1fr_1.2fr_70px_205px] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-900/80">
              <span>Atleta</span>
              <span>Email</span>
              <span>Tokens</span>
              <span>Tokens / acciones</span>
            </div>
            {filteredAthletes.length === 0 && !loadingAthletes && (
              <p className="p-6 text-center text-sm text-slate-500">No hay atletas registrados aún.</p>
            )}
            {filteredAthletes.map(athlete => (
              <div
                key={athlete.uid}
                className="grid grid-cols-[1fr_1.2fr_70px_205px] gap-2 px-4 py-3 border-t border-slate-800/80 items-center text-sm"
              >
                <div>
                  <span className="font-bold text-white block">{athlete.displayName}</span>
                  {athlete.phone && <span className="text-[11px] text-slate-500">{athlete.phone}</span>}
                </div>
                <span className="text-xs text-slate-400 truncate">{athlete.email}</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <Zap className="w-3.5 h-3.5" />
                  {athlete.tokens}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAdjustTokens(athlete, -1)}
                    aria-label={`Restar un token a ${athlete.displayName}`}
                    className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-200 flex items-center justify-center"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleAdjustTokens(athlete, 1)}
                    aria-label={`Sumar un token a ${athlete.displayName}`}
                    className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-200 flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleAdjustTokens(athlete, 8)}
                    className="h-11 px-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-black"
                  >
                    +8
                  </button>
                  <button
                    onClick={() => handleDeleteAthlete(athlete)}
                    aria-label={`Eliminar a ${athlete.displayName}`}
                    className="h-11 w-11 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 flex items-center justify-center"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'cancel_slots' && (
        <div className="space-y-4 max-w-lg">
          <form onSubmit={handleCancelSlotSubmit} className="space-y-3 p-4 rounded-2xl border border-slate-800 bg-slate-900">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Fecha</label>
              <input type="date" value={cancelDate} onChange={e => { const date = e.target.value; setCancelDate(date); setCancelTime(getGymSlotTimesForDate(date)[0] || ''); }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm" required />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Horario</label>
              <select value={cancelTime} onChange={e => setCancelTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm">
                {getGymSlotTimesForDate(cancelDate).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Motivo</label>
              <input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm" required />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm">
              Cancelar turno y reembolsar
            </button>
          </form>
          <div className="space-y-2">
            {cancelledSlots.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <span className="text-slate-300">{s.slotDate} {s.slotTime} — {s.reason}</span>
                <button onClick={() => handleReopenSlot(s.slotDate, s.slotTime)} className="text-emerald-400 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" />Reabrir
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'special_slots' && (
        <div className="space-y-4 max-w-xl">
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900">
            <h3 className="text-sm font-bold text-white">Identificar una clase o evento</h3>
            <p className="text-xs text-slate-400 mt-1">Agregá un nombre visible para los atletas en una fecha y horario puntual. No modifica las reservas ni los cupos.</p>
          </div>
          <form onSubmit={handleSaveSpecialSlot} className="space-y-3 p-4 rounded-2xl border border-emerald-500/20 bg-slate-900">
            <div><label className="text-xs text-slate-400 block mb-1">Fecha</label><input type="date" value={specialDate} onChange={e => { const date = e.target.value; setSpecialDate(date); setSpecialTime(getGymSlotTimesForDate(date)[0] || ''); }} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm" required /></div>
            <div><label className="text-xs text-slate-400 block mb-1">Horario</label><select value={specialTime} onChange={e => setSpecialTime(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm" required disabled={getGymSlotTimesForDate(specialDate).length === 0}>{getGymSlotTimesForDate(specialDate).map(time => <option key={time} value={time}>{time} hs</option>)}</select>{getGymSlotTimesForDate(specialDate).length === 0 && <p className="text-xs text-amber-300 mt-1">Los domingos no hay horarios habilitados.</p>}</div>
            <div><label className="text-xs text-slate-400 block mb-1">Nombre del evento o entrenamiento</label><input value={specialTitle} onChange={e => setSpecialTitle(e.target.value)} maxLength={60} placeholder="Ej. Competencia / Entrenamiento Synchro" className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm" required /><p className="text-[10px] text-slate-500 mt-1">Máximo 60 caracteres.</p></div>
            <button type="submit" disabled={!specialTime || !specialTitle.trim()} className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black text-sm">Guardar nombre del turno</button>
          </form>
          <div className="space-y-2"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Nombres configurados</h3>
            {specialSlotLabels.length === 0 ? <p className="p-5 text-center rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-500">Todavía no hay eventos o entrenamientos identificados.</p> : specialSlotLabels.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800"><div className="min-w-0"><p className="text-sm font-bold text-white truncate">{item.title}</p><p className="text-xs text-slate-400">{item.slotDate} · {item.slotTime} hs · {item.updatedBy}</p></div><button type="button" onClick={() => handleDeleteSpecialSlot(item.slotDate, item.slotTime)} className="shrink-0 p-2 rounded-lg text-rose-300 hover:bg-rose-500/10" aria-label={`Quitar ${item.title}`}><Trash2 className="w-4 h-4" /></button></div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'wod_builder' && (
        <form onSubmit={handleSaveWod} className="space-y-3 max-w-2xl p-4 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Fecha</label>
              <input type="date" value={wodDate} onChange={e => setWodDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm" required />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Coach</label>
              <input value={wodCoach} onChange={e => setWodCoach(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Título</label>
            <input value={wodTitle} onChange={e => setWodTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm" required />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Warm-up</label>
            <textarea value={wodWarmUp} onChange={e => setWodWarmUp(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm" required />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Fuerza</label>
            <textarea value={wodStrength} onChange={e => setWodStrength(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm" required />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Metcon</label>
            <textarea value={wodConditioning} onChange={e => setWodConditioning(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm" required />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Escalamiento</label>
            <textarea value={wodScaling} onChange={e => setWodScaling(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Notas</label>
            <textarea value={wodNotes} onChange={e => setWodNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm" />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />Publicar WOD
          </button>
        </form>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-white">Asistencia y turnos próximos</h3>
              <p className="text-xs text-slate-400 mt-1">Reservas confirmadas desde hoy en adelante.</p>
            </div>
            <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 px-3 py-2 rounded-xl">
              {attendanceBookings.length} reservas
            </span>
          </div>

          {attendanceBookings.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
              <ClipboardList className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No hay reservas confirmadas para hoy ni para los próximos días.</p>
            </div>
          )}

          {Object.entries(attendanceByDate).map(([date, bookings]) => {
            const [year, month, day] = date.split('-').map(Number);
            const dateLabel = new Date(year, month - 1, day).toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
            const byTime = bookings.reduce<Record<string, Booking[]>>((groups, booking) => {
              (groups[booking.slotTime] ||= []).push(booking);
              return groups;
            }, {});

            return (
              <section key={date} className="rounded-2xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-white capitalize">{dateLabel}</h4>
                  <span className="text-[11px] text-slate-400">{bookings.length} {bookings.length === 1 ? 'reserva' : 'reservas'}</span>
                </div>

                <div className="divide-y divide-slate-800">
                  {Object.entries(byTime).sort(([a], [b]) => a.localeCompare(b)).map(([time, timeBookings]) => (
                    <div key={time} className="p-3 sm:p-4 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-black">{time}</span>
                        <span className="text-[10px] text-slate-500">{timeBookings.length}/8 atletas</span>
                      </div>

                      <div className="space-y-2">
                        {timeBookings.map(booking => (
                          <div key={booking.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/70 px-3 py-2.5">
                            <div className="min-w-0">
                              <span className="font-bold text-white text-sm block truncate">{booking.athleteName}</span>
                              <span className="text-[11px] text-slate-500 block truncate">{booking.athleteEmail}</span>
                            </div>
                            <button
                              onClick={() => { gymService.markAttendance(booking.id, !booking.attended); onRefresh(); }}
                              className={`shrink-0 min-w-[104px] px-3 py-2 rounded-lg text-xs font-bold ${
                                booking.attended ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300 hover:bg-emerald-500/15 hover:text-emerald-300'
                              }`}
                            >
                              {booking.attended ? 'Presente' : 'Marcar presente'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {activeTab === 'reservations' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_190px_auto] gap-2 p-3 rounded-2xl border border-slate-800 bg-slate-900/70">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={reservationSearch}
                onChange={e => setReservationSearch(e.target.value)}
                placeholder="Buscar por atleta o email..."
                aria-label="Buscar reservas por atleta"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={reservationDate}
                onChange={e => setReservationDate(e.target.value)}
                aria-label="Filtrar reservas por fecha"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => { setReservationSearch(''); setReservationDate(''); }}
              disabled={!reservationSearch && !reservationDate}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-200"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-400">
              {filteredBookings.length} de {allBookings.length} reservas
            </span>
            {(reservationSearch || reservationDate) && (
              <span className="text-[11px] text-emerald-300">Filtros activos</span>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 divide-y divide-slate-800 overflow-hidden">
            {filteredBookings.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">
                {allBookings.length === 0 ? 'Aún no hay reservas.' : 'No se encontraron reservas con esos filtros.'}
              </p>
            ) : filteredBookings.map(b => (
              <div key={b.id} className="px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-white block">{b.athleteName}</span>
                  <span className="text-xs text-slate-500 block">{b.athleteEmail}</span>
                  <span className="text-xs text-slate-400 block">{b.slotDate} · {b.slotTime} hs</span>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${
                  b.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}>{b.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
