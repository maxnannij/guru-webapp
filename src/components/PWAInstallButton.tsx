import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running inside standalone PWA mode
  if (isInstalled && !justInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 5000);
    }
  };

  return (
    <>
      {/* Desktop / Android install button */}
      {isInstallable && (
        <button
          onClick={handleInstallClick}
          aria-label="Instalar IronBox en este dispositivo"
          className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 text-xs transition-colors shadow-sm cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Instalar App</span>
        </button>
      )}

      {/* iOS Safari banner / button */}
      {isIOS && !isInstalled && (
        <button
          onClick={() => setShowIOSGuide(true)}
          aria-label="Instalar IronBox en iPhone o iPad"
          className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Instalar en iOS</span>
        </button>
      )}

      {/* Modal Guide for iOS Safari */}
      {showIOSGuide && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="ios-install-title">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <h3 id="ios-install-title" className="font-semibold text-slate-100">Instalar en iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
                aria-label="Cerrar guía"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-amber-400 font-bold text-xs">
                  1
                </span>
                <p>
                  Abre esta página en <strong>Safari</strong> y toca el botón <strong>Compartir</strong> (el ícono del cuadrado con la flecha hacia arriba) en la barra inferior.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-amber-400 font-bold text-xs">
                  2
                </span>
                <p>
                  Desliza hacia abajo y selecciona <strong>«Agregar a pantalla de inicio»</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-amber-400 font-bold text-xs">
                  3
                </span>
                <p>
                  Toca <strong>«Agregar»</strong> en la esquina superior derecha. ¡Listo! Tendrás IronBox como app nativa con notificaciones.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-sm font-medium text-slate-200 transition"
            >
              Entendido
            </button>
          </div>
        </div>,
        document.body
      )}

      {justInstalled && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold px-4 py-2 text-sm shadow-xl animate-in slide-in-from-bottom">
          <Check className="w-4 h-4" />
          ¡IronBox instalado con éxito!
        </div>
      )}
    </>
  );
};
