import React, { useState, useEffect } from 'react';
import {
  Users,
  Zap,
  Plus,
  Minus,
  Search,
  Ban,
  RotateCcw,
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
import { GYM_SLOT_TIMES, SlotTime } from '../utils/bookingRules';

interface OwnerAdminPanelProps {
  currentUser: UserProfile;
  onRefresh: () => void;
}

type AdminTab = 'tokens' | 'cancel_slots' | 'wod_builder' | 'attendance' | 'reservations';

export const OwnerAdminPanel: React.FC<OwnerAdminPanelProps> = ({ currentUser, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('tokens');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const [cancelDate, setCancelDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cancelTime, setCancelTime] = useState<string>('15:00');
  const [cancelReason, setCancelReason] = useState('Feriado / Mantenimiento del Box');

  const [wodDate, setWodDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [wodTitle, setWodTitle] = useState('');
  const [wodWarmUp, setWodWarmUp] = useState('');
  const [wodStrength, setWodStrength] = useState('');
  const [wodConditioning, setWodConditioning] = useState('');
  const [wodScaling, setWodScaling] = useState('');
  const [wodNotes, setWodNotes] = useState('');
  const [wodCoach, setWodCoach] = useState(currentUser.displayName);

  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceTime, setAttendanceTime] = useState<string>('15:00');

  const currentWod = gymService.getWOD(attendanceDate);

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

  const slotBookings = gymService.getBookingsForSlot(attendanceDate, attendanceTime);
  const cancelledSlots = gymService.getCancelledSlots();
  const allBookings = gymService.getAllBookings().slice(0, 30);

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
              <input type="date" value={cancelDate} onChange={e => setCancelDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm" required />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Horario</label>
              <select value={cancelTime} onChange={e => setCancelTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm">
                {GYM_SLOT_TIMES.map(t => (
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
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm" />
            <select value={attendanceTime} onChange={e => setAttendanceTime(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm">
              {GYM_SLOT_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="rounded-2xl border border-slate-800 divide-y divide-slate-800">
            {slotBookings.length === 0 && (
              <p className="p-6 text-center text-sm text-slate-500">Sin reservas confirmadas en este turno.</p>
            )}
            {slotBookings.map(b => (
              <div key={b.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <span className="font-bold text-white">{b.athleteName}</span>
                  <span className="text-xs text-slate-500 block">{b.athleteEmail}</span>
                </div>
                <button
                  onClick={() => { gymService.markAttendance(b.id, !b.attended); onRefresh(); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    b.attended ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {b.attended ? 'Presente' : 'Marcar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reservations' && (
        <div className="rounded-2xl border border-slate-800 divide-y divide-slate-800">
          {allBookings.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-500">Aún no hay reservas.</p>
          )}
          {allBookings.map(b => (
            <div key={b.id} className="px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white">{b.athleteName}</span>
                <span className="text-xs text-slate-500 block">{b.slotDate} {b.slotTime}</span>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${
                b.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}>{b.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
