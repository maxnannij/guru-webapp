import React, { useState, useEffect } from 'react';
import {
  Users, Dumbbell, Clock, Zap, Plus, Minus, Search, CheckCircle, Calendar,
  AlertCircle, Save, Bell, Ban, RotateCcw,
} from 'lucide-react';
import { UserProfile, WOD, Booking, CancelledSlot } from '../types/gym';
import { gymService } from '../services/gymService';
import { GYM_SLOT_TIMES, SlotTime, MAX_SLOT_CAPACITY } from '../utils/bookingRules';

interface OwnerAdminPanelProps {
  currentUser: UserProfile;
  onRefresh: () => void;
}

export const OwnerAdminPanel: React.FC<OwnerAdminPanelProps> = ({ currentUser, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'athletes' | 'cancel_slots' | 'wod_builder' | 'attendance' | 'bookings_feed'>('athletes');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const todayStr = new Date().toISOString().split('T')[0];
  const [cancelDate, setCancelDate] = useState(todayStr);
  const [cancelTime, setCancelTime] = useState<SlotTime>('15:00');
  const [cancelReason, setCancelReason] = useState('Feriado / Mantenimiento del Box');
  const [attendanceDate, setAttendanceDate] = useState(todayStr);
  const [attendanceTime, setAttendanceTime] = useState<SlotTime>('19:00');
  const currentWod = gymService.getWOD(attendanceDate);
  const [wodDate, setWodDate] = useState(todayStr);
  const [wodTitle, setWodTitle] = useState(currentWod?.title || 'GURÚ FORCE');
  const [wodWarmUp, setWodWarmUp] = useState(currentWod?.warmUp || '');
  const [wodStrength, setWodStrength] = useState(currentWod?.strength || '');
  const [wodConditioning, setWodConditioning] = useState(currentWod?.conditioning || '');
  const [wodScaling, setWodScaling] = useState(currentWod?.scaling || '');
  const [wodNotes, setWodNotes] = useState(currentWod?.notes || '');
  const [wodCoach, setWodCoach] = useState(currentWod?.coach || currentUser.displayName);

  const [athletes, setAthletes] = useState<UserProfile[]>(() => gymService.getAthletes());
  const [loadingAthletes, setLoadingAthletes] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingAthletes(true);
    gymService
      .refreshUsersFromFirestore()
      .then(list => { if (!cancelled) setAthletes(list); })
      .finally(() => { if (!cancelled) setLoadingAthletes(false); });
    return () => { cancelled = true; };
  }, [currentUser.uid]);

  const filteredAthletes = athletes.filter(
    a =>
      a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleCancelSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = gymService.cancelSlotByOwner(cancelDate, cancelTime, cancelReason, currentUser.displayName);
    setActionFeedback(res.message);
    setTimeout(() => setActionFeedback(null), 5000);
    onRefresh();
  };

  const handleReopenSlot = (date: string, time: string) => {
    const res = gymService.reopenSlotByOwner(date, time);
    setActionFeedback(res.message);
    setTimeout(() => setActionFeedback(null), 4000);
    onRefresh();
  };

  const handleSaveWod = (e: React.FormEvent) => {
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
    gymService.saveWOD(newWod);
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
      {icon}<span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30">
        <h2 className="text-xl font-bold text-white">Panel de Dueño: {currentUser.displayName}</h2>
        <p className="text-xs text-slate-400">Atletas se cargan desde Firebase (proyecto Guru Box).</p>
      </div>

      {actionFeedback && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /><span>{actionFeedback}</span>
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {tabBtn('athletes', `Asignar Tokens (${athletes.length})`, <Users className="w-4 h-4" />)}
        {tabBtn('cancel_slots', 'Cancelar Horarios', <Ban className="w-4 h-4" />)}
        {tabBtn('wod_builder', 'Cargar WOD', <Dumbbell className="w-4 h-4" />)}
        {tabBtn('attendance', 'Asistencia', <Clock className="w-4 h-4" />)}
        {tabBtn('bookings_feed', 'Reservas', <Bell className="w-4 h-4" />)}
      </div>

      {activeTab === 'athletes' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar atleta..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white" />
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            {filteredAthletes.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">
                  {loadingAthletes ? 'Cargando atletas desde Firebase…' : searchQuery ? 'Sin resultados' : 'No hay atletas registrados'}
                </h4>
                <p className="text-xs text-slate-400">Cuando un atleta se registre, aparece acá automáticamente.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Atleta</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Tokens</th>
                    <th className="py-3 px-4 text-right">Asignar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAthletes.map(athlete => (
                    <tr key={athlete.uid} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-white">{athlete.displayName}</td>
                      <td className="py-3 px-4">{athlete.email}<div className="text-slate-500">{athlete.phone || ''}</div></td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-black text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-lg">
                          <Zap className="w-3.5 h-3.5" />{athlete.tokens}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button onClick={() => handleAdjustTokens(athlete, -1)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-300"><Minus className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleAdjustTokens(athlete, 1)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-emerald-300"><Plus className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleAdjustTokens(athlete, 8)} className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">+8</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'cancel_slots' && (
        <div className="space-y-4 max-w-lg">
          <form onSubmit={handleCancelSlotSubmit} className="space-y-3 p-4 rounded-2xl border border-slate-800 bg-slate-900">
            <label className="text-xs text-slate-400 block">Fecha<input type="date" value={cancelDate} onChange={e => setCancelDate(e.target.value)} className="w-full mt-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm" /></label>
            <label className="text-xs text-slate-400 block">Horario
              <select value={cancelTime} onChange={e => setCancelTime(e.target.value as SlotTime)} className="w-full mt-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm">
                {GYM_SLOT_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-400 block">Motivo<input value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="w-full mt-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm" /></label>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-rose-500 text-white font-bold text-xs">Cancelar turno y reembolsar</button>
          </form>
          <div className="space-y-2">
            {cancelledSlots.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <span>{s.slotDate} {s.slotTime} — {s.reason}</span>
                <button onClick={() => handleReopenSlot(s.slotDate, s.slotTime)} className="text-emerald-400 flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" />Reabrir</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'wod_builder' && (
        <form onSubmit={handleSaveWod} className="space-y-3 max-w-2xl p-4 rounded-2xl border border-slate-800 bg-slate-900">
          <input type="date" value={wodDate} onChange={e => setWodDate(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm" />
          <input value={wodTitle} onChange={e => setWodTitle(e.target.value)} placeholder="Título" className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm" />
          <textarea value={wodWarmUp} onChange={e => setWodWarmUp(e.target.value)} placeholder="Warm-up" rows={3} className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm" />
          <textarea value={wodStrength} onChange={e => setWodStrength(e.target.value)} placeholder="Strength" rows={3} className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm" />
          <textarea value={wodConditioning} onChange={e => setWodConditioning(e.target.value)} placeholder="Conditioning" rows={4} className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm" />
          <textarea value={wodScaling} onChange={e => setWodScaling(e.target.value)} placeholder="Scaling" rows={2} className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm" />
          <textarea value={wodNotes} onChange={e => setWodNotes(e.target.value)} placeholder="Notes" rows={2} className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm" />
          <input value={wodCoach} onChange={e => setWodCoach(e.target.value)} placeholder="Coach" className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm" />
          <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2"><Save className="w-4 h-4" />Publicar WOD</button>
        </form>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm" />
            <select value={attendanceTime} onChange={e => setAttendanceTime(e.target.value as SlotTime)} className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm">
              {GYM_SLOT_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <p className="text-xs text-slate-400">Cupo: {slotBookings.length}/{MAX_SLOT_CAPACITY}</p>
          <div className="space-y-2">
            {slotBookings.length === 0 && <p className="text-sm text-slate-500">Sin reservas en este turno.</p>}
            {slotBookings.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <span className="font-bold text-white">{b.athleteName}</span>
                <button onClick={() => { gymService.markAttendance(b.id, !b.attended); onRefresh(); }}
                  className={`px-2 py-1 rounded-lg font-bold ${b.attended ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                  {b.attended ? 'Presente' : 'Marcar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'bookings_feed' && (
        <div className="space-y-2">
          {allBookings.length === 0 && <p className="text-sm text-slate-500">Sin reservas aún.</p>}
          {allBookings.map(b => (
            <div key={b.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex justify-between">
              <span><span className="font-bold text-white">{b.athleteName}</span> — {b.slotDate} {b.slotTime}</span>
              <span className="text-slate-400">{b.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
