import React, { useState } from 'react';
import { CalendarDays, Clock, Coins, ShieldCheck, X } from 'lucide-react';

interface RulesWelcomeModalProps {
  isOpen: boolean;
  onContinue: (dontShowAgain: boolean) => void | Promise<void>;
}

export const RulesWelcomeModal: React.FC<RulesWelcomeModalProps> = ({ isOpen, onContinue }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="rules-modal-title" className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-emerald-500/30 bg-slate-900 p-5 sm:p-6 shadow-2xl text-slate-100">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Gurú Box · Cross Training</span>
            <h2 id="rules-modal-title" className="text-xl font-black text-white mt-1">Antes de entrenar, recordá</h2>
            <p className="text-xs text-slate-400 mt-1">Un resumen de las reglas para reservar y cuidar tu lugar.</p>
          </div>
          <button type="button" onClick={() => onContinue(false)} aria-label="Cerrar" className="p-2 rounded-lg text-slate-400 hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div className="flex gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <Coins className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div><p className="text-sm font-bold text-white">Reservas y tokens</p><p className="text-xs text-slate-400 mt-1">Cada reserva consume 1 token. Los tokens son asignados por los coaches. Cada turno tiene un máximo de 8 atletas.</p></div>
          </div>
          <div className="flex gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <Clock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div><p className="text-sm font-bold text-white">Cancelaciones</p><p className="text-xs text-slate-400 mt-1">Podés cancelar hasta 1 hora antes del inicio y recuperar el token. Si cancelás con menos de 60 minutos, o el turno ya comenzó, no se reintegra.</p></div>
          </div>
          <div className="flex gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <CalendarDays className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div><p className="text-sm font-bold text-white">Horarios disponibles</p><p className="text-xs text-slate-400 mt-1">Lunes a viernes: 08:00, 09:30, 15:00, 16:15, 17:30, 19:00 y 20:30. Sábados: 09:00 y 11:00. Domingos: cerrado.</p></div>
          </div>
          <div className="flex gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div><p className="text-sm font-bold text-white">Reservá con anticipación</p><p className="text-xs text-slate-400 mt-1">Solo se pueden reservar horarios futuros y sujetos a disponibilidad. Si un turno figura suspendido, no se encuentra habilitado para reservar.</p></div>
          </div>
        </div>

        <label className="flex items-center gap-3 mt-5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 cursor-pointer">
          <input type="checkbox" checked={dontShowAgain} onChange={e => setDontShowAgain(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
          <span className="text-xs font-semibold text-slate-200">No volver a mostrar este resumen</span>
        </label>
        <button type="button" onClick={() => onContinue(dontShowAgain)} className="w-full mt-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm">Entendido, continuar</button>
        <p className="text-[10px] text-slate-500 text-center mt-3">Gurú Box · Roma 2607, Caseros</p>
      </div>
    </div>
  );
};
