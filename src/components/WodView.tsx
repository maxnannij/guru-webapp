import React, { useState } from 'react';
import { Calendar, Dumbbell, Flame, Timer, Sparkles, ChevronRight, User } from 'lucide-react';
import { WOD, UserProfile } from '../types/gym';
import { gymService } from '../services/gymService';

interface WodViewProps {
  currentUser: UserProfile;
  onOpenOwnerPanel?: () => void;
}

export const WodView: React.FC<WodViewProps> = ({ currentUser, onOpenOwnerPanel }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate] = useState<string>(todayStr);
  const wod = gymService.getWOD(selectedDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-lg">
        <div className="flex items-center gap-3.5">
          <img
            src="/assets/aistudio/image_e8128fe0.png"
            alt="Gurú Box"
            className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0"
          />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-0.5">
              Gurú Box Training Program
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Entrenamiento del Día (WOD)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Rutina técnica completa para todos los turnos del box.
            </p>
          </div>
        </div>

        {currentUser.role === 'owner' && onOpenOwnerPanel && (
          <button
            onClick={onOpenOwnerPanel}
            className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Editar o Cargar WOD</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main WOD Content (Timer removed per user request) */}
      {wod ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-900 overflow-hidden shadow-xl max-w-4xl mx-auto">
          {/* WOD Title Bar */}
          <div className="p-6 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold mb-1">
                <Calendar className="w-4 h-4" />
                <span>Fecha: {wod.date}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  Coach: {wod.coach}
                </span>
              </div>
              <h3 className="text-2xl font-black font-heading text-white tracking-wide">{wod.title}</h3>
            </div>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold self-start sm:self-auto tracking-wide">
              WOD OFICIAL GURÚ BOX
            </span>
          </div>

          {/* Sections */}
          <div className="p-6 sm:p-8 space-y-6 divide-y divide-slate-800/80">
            {/* 01. Calentamiento */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2 mb-2.5">
                <Flame className="w-4 h-4" />
                <span>01. Calentamiento Dinámico & Activación</span>
              </h4>
              <div className="text-sm text-slate-200 whitespace-pre-line leading-relaxed bg-slate-950/50 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                {wod.warmUp}
              </div>
            </div>

            {/* 02. Fuerza / Técnica */}
            <div className="pt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2 mb-2.5">
                <Dumbbell className="w-4 h-4" />
                <span>02. Bloque de Fuerza & Técnica</span>
              </h4>
              <div className="text-sm text-slate-200 whitespace-pre-line leading-relaxed bg-slate-950/50 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                {wod.strength}
              </div>
            </div>

            {/* 03. Metcon Principal */}
            <div className="pt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2 mb-2.5">
                <Timer className="w-4 h-4" />
                <span>03. Metcon / Acondicionamiento Principal</span>
              </h4>
              <div className="text-sm text-white whitespace-pre-line leading-relaxed bg-rose-950/20 p-5 rounded-xl border border-rose-500/30 font-mono text-xs sm:text-sm font-bold shadow-inner">
                {wod.conditioning}
              </div>
            </div>

            {/* 04. Escalamiento */}
            {wod.scaling && (
              <div className="pt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-2.5">
                  <Sparkles className="w-4 h-4" />
                  <span>04. Opciones de Escalamiento (Scaled)</span>
                </h4>
                <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  {wod.scaling}
                </div>
              </div>
            )}

            {/* 05. Notas del Coach */}
            {wod.notes && (
              <div className="pt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Consejo de los Coaches:
                </h4>
                <p className="text-xs text-slate-300 italic bg-slate-800/40 p-4 rounded-xl border border-slate-700/40 leading-relaxed">
                  "{wod.notes}"
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-3">
          <Dumbbell className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">
            Aún no hay WOD cargado para esta fecha
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Melina o Alexis subirán el entrenamiento del día antes del primer turno.
          </p>
        </div>
      )}
    </div>
  );
};
