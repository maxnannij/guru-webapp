import React, { useState } from 'react';
import {
  Users,
  Dumbbell,
  Clock,
  Zap,
  Plus,
  Minus,
  Search,
  CheckCircle,
  Calendar,
  AlertCircle,
  Save,
  Bell,
  Check,
  Ban,
  RotateCcw,
  ShieldAlert,
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

  // Slot cancellation states
  const todayStr = new Date().toISOString().split('T')[0];
  const [cancelDate, setCancelDate] = useState<string>(todayStr);
  const [cancelTime, setCancelTime] = useState<SlotTime>('15:00');
  const [cancelReason, setCancelReason] = useState('Feriado / Mantenimiento del Box');

  // Attendance tab states
  const [attendanceDate, setAttendanceDate] = useState<string>(todayStr);
  const [attendanceTime, setAttendanceTime] = useState<SlotTime>('19:00');

  // WOD Builder form states
  const currentWod = gymService.getWOD(attendanceDate);
  const [wodDate, setWodDate] = useState(todayStr);
  const [wodTitle, setWodTitle] = useState(currentWod?.title || 'GURÚ FORCE // Fuerza & Metcon');
  const [wodWarmUp, setWodWarmUp] = useState(
    currentWod?.warmUp ||
      '3 Rondas de Activación:\n- 200m Remo o Trote suave\n- 10 Inchworms con flexión\n- 15 Sentadillas lentas con pausa (3s)\n- 10 Dislocaciones con banda'
  );
  const [wodStrength, setWodStrength] = useState(
    currentWod?.strength || 'BACK SQUAT (Sentadilla Trasera):\n5 series x 5 reps al 75-80% 1RM. Descanso 2 min entre series.'
  );
  const [wodConditioning, setWodConditioning] = useState(
    currentWod?.conditioning ||
      'AMRAP 14 MINUTOS:\n- 12 Kettlebell Swings (24/16kg)\n- 9 Burpees sobre la barra\n- 6 Dominadas estrictas / C2B\n- 50 Saltos dobles a la soga'
  );
  const [wodScaling, setWodScaling] = useState(
    currentWod?.scaling || 'Opción Scaled: KB 16kg, Saltos al cajón o Ring Rows, 100 saltos simples.'
  );
  const [wodNotes, setWodNotes] = useState(
    currentWod?.notes || 'Mantener cadencia constante en los burpees. Hidratarse bien.'
  );
  const [wodCoach, setWodCoach] = useState(currentWod?.coach || currentUser.displayName);

  const athletes = gymService.getAthletes();
  const filteredAthletes = athletes.filter(
    a =>
      a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdjustTokens = (athlete: UserProfile, delta: number) => {
    const reason = delta > 0 ? `Asignación manual por ${currentUser.displayName}` : `Ajuste manual de créditos`;
    const res = gymService.updateTokens(athlete.uid, delta, reason);
    if (res.success) {
      setActionFeedback(`Se ajustaron los tokens de ${athlete.displayName}. Saldo actual: ${res.newTokens}`);
      setTimeout(() => setActionFeedback(null), 4000);
      onRefresh();
    }
  };

  const handleCancelSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = gymService.cancelSlotByOwner(
      cancelDate,
      cancelTime,
      cancelReason,
      currentUser.displayName
    );

    if (res.success) {
      setActionFeedback(res.message);
      setTimeout(() => setActionFeedback(null), 5000);
      onRefresh();
    } else {
      setActionFeedback(res.message);
      setTimeout(() => setActionFeedback(null), 5000);
    }
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
    setActionFeedback(`¡WOD para el ${wodDate} guardado y publicado a todos los atletas de Gurú Box!`);
    setTimeout(() => setActionFeedback(null), 4000);
    onRefresh();
  };

  const slotBookings = gymService.getBookingsForSlot(attendanceDate, attendanceTime);
  const isSelectedSlotCancelled = gymService.isSlotCancelled(cancelDate, cancelTime);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <img
            src="/assets/aistudio/image_e8128fe0.png"
            alt="Gurú Box Logo"
            className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Acceso Exclusivo Dueños Gurú Box</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Panel de Dueño: {currentUser.displayName}
            </h2>
            <p className="text-xs text-slate-400">
              Asigna tokens a atletas, cancela horarios de entrenamiento y carga los WODs diarios.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            👑 Dueño Activo
          </span>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('athletes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'athletes'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Asignar Tokens ({athletes.length} Atletas)</span>
        </button>

        <button
          onClick={() => setActiveTab('cancel_slots')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'cancel_slots'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Ban className="w-4 h-4" />
          <span>Cancelar Horarios de Entrenamiento</span>
        </button>

        <button
          onClick={() => setActiveTab('wod_builder')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'wod_builder'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span>Cargar WOD del Día</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Control de Asistencia</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings_feed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'bookings_feed'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Avisos de Reservas</span>
        </button>
      </div>

      {/* Tab 1: Athletes & Token Allocation */}
      {activeTab === 'athletes' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar atleta por nombre o email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Athletes Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
            {filteredAthletes.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">
                  {searchQuery ? 'No se encontraron atletas con esa búsqueda' : 'No hay atletas registrados actualmente'}
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {searchQuery
                    ? 'Prueba con otro nombre o correo electrónico.'
                    : 'A medida que los atletas creen su cuenta en Gurú Box (con usuario y contraseña o biometría), aparecerán en esta lista para que Melina o Alexis les asignen tokens para entrenar.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-bold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Atleta</th>
                      <th className="py-3 px-4">Email / Contacto</th>
                      <th className="py-3 px-4">Tokens Actuales</th>
                      <th className="py-3 px-4 text-right">Asignar Créditos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredAthletes.map(athlete => (
                      <tr key={athlete.uid} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0 ring-1 ring-emerald-500/30">
                              {athlete.displayName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-white block">{athlete.displayName}</span>
                              <span className="text-[11px] text-slate-400">Atleta Gurú Box</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="text-slate-200">{athlete.email}</div>
                            <div className="text-slate-400 text-[11px]">{athlete.phone || 'Sin teléfono'}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-black text-emerald-400 text-sm bg-emerald-400/10 px-2.5 py-1 rounded-lg">
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            {athlete.tokens}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => handleAdjustTokens(athlete, 1)}
                              title="Agregar 1 token"
                              className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition font-bold text-xs cursor-pointer"
                            >
                              +1 Token
                            </button>
                            <button
                              onClick={() => handleAdjustTokens(athlete, 4)}
                              title="Agregar 4 tokens"
                              className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition font-bold text-xs cursor-pointer"
                            >
                              +4 Tokens
                            </button>
                            <button
                              onClick={() => handleAdjustTokens(athlete, 8)}
                              title="Agregar 8 tokens (Pase Mensual)"
                              className="p-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition font-black text-xs cursor-pointer"
                            >
                              +8 Tokens
                            </button>
                            {athlete.tokens > 0 && (
                              <button
                                onClick={() => handleAdjustTokens(athlete, -1)}
                                title="Restar 1 token"
                                className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition font-bold text-xs cursor-pointer"
                              >
                                -1
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Cancel Training Shift (User requested: "cancelar horarios de entrenamiento") */}
      {activeTab === 'cancel_slots' && (
        <div className="space-y-6">
          <form
            onSubmit={handleCancelSlotSubmit}
            className="rounded-2xl border border-rose-500/30 bg-slate-900 p-6 space-y-5 shadow-lg"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Suspender o Cancelar Horario de Entrenamiento
                </h3>
                <p className="text-xs text-slate-400">
                  Como dueños (Melina o Alexis), pueden suspender un turno. Cualquier atleta anotado recibirá el reembolso de su token de forma inmediata.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">
                  Fecha del turno a suspender:
                </label>
                <input
                  type="date"
                  required
                  value={cancelDate}
                  onChange={e => setCancelDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">
                  Horario de entrenamiento:
                </label>
                <select
                  value={cancelTime}
                  onChange={e => setCancelTime(e.target.value as SlotTime)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  {GYM_SLOT_TIMES.map(t => (
                    <option key={t} value={t}>
                      {t} hs ({gymService.getBookingsForSlot(cancelDate, t).length} atletas anotados)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">
                Motivo de la cancelación (se notificará a los atletas):
              </label>
              <input
                type="text"
                required
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Ej: Feriado nacional, refacción del box, competencia interna..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong>Acción automática de Gurú Box:</strong> Se reintegrará el token a todos los atletas que tengan reserva en ese turno y se les enviará una notificación push.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {isSelectedSlotCancelled ? (
                <button
                  type="button"
                  onClick={() => handleReopenSlot(cancelDate, cancelTime)}
                  className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Rehabilitar este turno</span>
                </button>
              ) : (
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-4 h-4" />
                  <span>Cancelar turno de las {cancelTime} hs</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: WOD Builder */}
      {activeTab === 'wod_builder' && (
        <form onSubmit={handleSaveWod} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Cargar Entrenamiento del Día (WOD)</h3>
              <p className="text-xs text-slate-400">
                Al guardar, se enviará una notificación a todos los atletas de Gurú Box.
              </p>
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Publicar WOD</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">
                Fecha del WOD:
              </label>
              <input
                type="date"
                required
                value={wodDate}
                onChange={e => {
                  setWodDate(e.target.value);
                  const existing = gymService.getWOD(e.target.value);
                  if (existing) {
                    setWodTitle(existing.title);
                    setWodWarmUp(existing.warmUp);
                    setWodStrength(existing.strength);
                    setWodConditioning(existing.conditioning);
                    setWodScaling(existing.scaling || '');
                    setWodNotes(existing.notes || '');
                    setWodCoach(existing.coach);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">
                Coach / Dueño responsable:
              </label>
              <input
                type="text"
                required
                value={wodCoach}
                onChange={e => setWodCoach(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">
              Título del WOD:
            </label>
            <input
              type="text"
              required
              value={wodTitle}
              onChange={e => setWodTitle(e.target.value)}
              placeholder="Ej: GURÚ BEAST // Back Squat & Metcon"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">
              01. Calentamiento (Warm-up & Movilidad):
            </label>
            <textarea
              rows={3}
              value={wodWarmUp}
              onChange={e => setWodWarmUp(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">
              02. Fuerza / Técnica (Strength / Skill):
            </label>
            <textarea
              rows={3}
              value={wodStrength}
              onChange={e => setWodStrength(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">
              03. Metcon / Acondicionamiento (AMRAP, For Time, EMOM):
            </label>
            <textarea
              rows={4}
              required
              value={wodConditioning}
              onChange={e => setWodConditioning(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">
                Escalamiento (Scaled):
              </label>
              <textarea
                rows={2}
                value={wodScaling}
                onChange={e => setWodScaling(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">
                Notas y Consejos del Coach:
              </label>
              <textarea
                rows={2}
                value={wodNotes}
                onChange={e => setWodNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
          </div>
        </form>
      )}

      {/* Tab 4: Attendance per Shift */}
      {activeTab === 'attendance' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase block mb-1.5">
                Seleccionar Fecha:
              </label>
              <input
                type="date"
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase block mb-1.5">
                Seleccionar Turno ({GYM_SLOT_TIMES.length} horarios):
              </label>
              <select
                value={attendanceTime}
                onChange={e => setAttendanceTime(e.target.value as SlotTime)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              >
                {GYM_SLOT_TIMES.map(t => (
                  <option key={t} value={t}>
                    Turno {t} hs ({gymService.getBookingsForSlot(attendanceDate, t).length}/{MAX_SLOT_CAPACITY} atletas)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Roster Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  Atletas anotados en el turno de las {attendanceTime} hs
                </h3>
                <p className="text-xs text-slate-400">
                  Fecha: {attendanceDate} · Ocupación: {slotBookings.length} de {MAX_SLOT_CAPACITY} plazas
                </p>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  slotBookings.length >= MAX_SLOT_CAPACITY
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {slotBookings.length >= MAX_SLOT_CAPACITY ? 'COMPLETO' : `${MAX_SLOT_CAPACITY - slotBookings.length} lugares disponibles`}
              </span>
            </div>

            {slotBookings.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No hay atletas anotados todavía en este turno.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {slotBookings.map((b, idx) => (
                  <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-white text-sm block">{b.athleteName}</span>
                        <span className="text-[11px] text-slate-400">{b.athleteEmail}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          gymService.toggleAttendance(b.id, !b.attended);
                          onRefresh();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          b.attended
                            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                            : 'border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{b.attended ? 'Presente' : 'Marcar Presente'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Live Bookings & Owner Notifications Feed */}
      {activeTab === 'bookings_feed' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Avisos automáticos de reservas y cancelaciones</h3>
              <p className="text-xs text-slate-400">
                Notificaciones en tiempo real para Melina y Alexis.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-800/60">
            {gymService
              .getNotifications(currentUser.uid, 'owner')
              .map(n => (
                <div key={n.id} className="py-3 flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      n.type === 'booking'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : n.type === 'slot_cancelled'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{n.title}</span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">{n.message}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
