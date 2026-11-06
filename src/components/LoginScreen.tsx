import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Fingerprint,
  ScanFace,
  MapPin,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile } from '../types/gym';
import { gymService, GYM_LOCATION } from '../services/gymService';
import { PWAInstallButton } from './PWAInstallButton';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [authMethod, setAuthMethod] = useState<'password' | 'biometric'>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricSuccess, setBiometricSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (!identifier || !identifier.includes('@')) {
        setError('Por favor ingresa un correo electrónico válido.');
        return;
      }
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres (requisito de Firebase).');
        return;
      }
      setSubmitting(true);
      try {
        const res = await gymService.registerAthlete(identifier, name, password, phone);
        if (res.success && res.user) onLoginSuccess(res.user);
        else setError(res.error || 'Error al registrar atleta.');
      } catch (err: any) {
        setError(err?.message || 'Error al registrar.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      const res = await gymService.login(identifier, password);
      if (res.success && res.user) onLoginSuccess(res.user);
      else setError(res.error || 'Credenciales no válidas.');
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOwnerSelect = (owner: 'melina' | 'alexis') => {
    setError(null);
    setIdentifier(owner);
    setPassword('');
  };

  const handleBiometricAuth = async (targetUser?: 'melina' | 'alexis') => {
    setError(null);
    setBiometricScanning(true);
    setBiometricSuccess(false);
    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      const target = targetUser || (identifier.trim() ? identifier.trim() : 'melina');
      const res = await gymService.loginWithBiometrics(target);
      if (res.success && res.user) {
        setBiometricSuccess(true);
        setTimeout(() => {
          setBiometricScanning(false);
          onLoginSuccess(res.user!);
        }, 400);
      } else {
        setBiometricScanning(false);
        setError(res.error || 'No se pudo verificar la biometría.');
      }
    } catch {
      setBiometricScanning(false);
      setError('Error al procesar biometría.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-emerald-500 selection:text-slate-950">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />

      <header className="w-full max-w-6xl mx-auto px-4 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <img src="/assets/aistudio/image_e8128fe0.png" alt="Gurú Box" className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/50" />
          <div>
            <span className="font-heading font-black tracking-wider text-base text-white">
              GURÚ <span className="text-emerald-400">BOX</span>
            </span>
            <span className="text-[10px] text-slate-400 block tracking-wider font-semibold uppercase">Cross Training · Caseros</span>
          </div>
        </div>
        <PWAInstallButton />
      </header>

      <div className="w-full max-w-md mx-auto px-4 py-6 z-10">
        <div className="rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-emerald-500/30 p-7 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.7)] space-y-6">
          <div className="text-center space-y-3">
            <img src="/assets/aistudio/image_e8128fe0.png" alt="Gurú Box Logo" className="w-24 h-24 mx-auto rounded-full object-cover ring-2 ring-emerald-400/80" />
            <h1 className="text-2xl font-black font-heading text-white tracking-wide">
              GURÚ <span className="text-emerald-400">BOX</span>
            </h1>
            <p className="text-xs text-slate-400">Gestión de Turnos, Tokens & WOD del Día</p>
            <a href={GYM_LOCATION.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-emerald-400/90">
              <MapPin className="w-3 h-3" />
              <span>{GYM_LOCATION.address}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {!isRegister && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Acceso para Dueños
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button type="button" onClick={() => handleOwnerSelect('melina')} className={`p-2.5 rounded-xl border text-left ${
                  identifier === 'melina' ? 'bg-emerald-500/20 border-emerald-400' : 'bg-emerald-950/30 border-emerald-500/30'
                }`}>
                  <span className="text-[10px] text-emerald-400 uppercase font-bold">Dueña</span>
                  <span className="text-sm font-black text-white block">Melina</span>
                  <span className="text-[10px] text-slate-400 font-mono">meliguru</span>
                </button>
                <button type="button" onClick={() => handleOwnerSelect('alexis')} className={`p-2.5 rounded-xl border text-left ${
                  identifier === 'alexis' ? 'bg-emerald-500/20 border-emerald-400' : 'bg-emerald-950/30 border-emerald-500/30'
                }`}>
                  <span className="text-[10px] text-emerald-400 uppercase font-bold">Dueño</span>
                  <span className="text-sm font-black text-white block">Alexis</span>
                  <span className="text-[10px] text-slate-400 font-mono">alexguru</span>
                </button>
              </div>
              <button type="button" onClick={() => handleBiometricAuth()} disabled={biometricScanning}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center justify-center gap-2">
                <Fingerprint className="w-4 h-4" /> Ingresar con Biometría
              </button>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-3">
            {isRegister && (
              <>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" required
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm" />
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Teléfono (opcional)"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm" />
                </div>
              </>
            )}
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={identifier} onChange={e => setIdentifier(e.target.value)}
                placeholder={isRegister ? 'Email' : 'Email o melina / alexis'} required
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm" />
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña (mín. 6)" required
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60">
              {submitting ? 'Procesando…' : isRegister ? 'Crear cuenta de atleta' : 'Ingresar'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <button type="button" onClick={() => { setIsRegister(!isRegister); setError(null); }}
            className="w-full text-xs text-slate-400 hover:text-emerald-400">
            {isRegister ? '¿Ya tenés cuenta? Iniciá sesión' : '¿Sos atleta nuevo? Registrate'}
          </button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Auth + datos en Firebase (proyecto Guru Box)
          </div>
        </div>
      </div>

      <footer className="text-center text-[11px] text-slate-500 py-6 z-10">
        © {new Date().getFullYear()} Gurú Box · Roma 2607, Caseros
      </footer>
    </div>
  );
};
