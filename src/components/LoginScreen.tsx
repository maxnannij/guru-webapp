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

  // Submit Password Form
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (!identifier || !identifier.includes('@')) {
        setError('Por favor ingresa un correo electrónico válido.');
        return;
      }
      if (password.length < 4) {
        setError('La contraseña debe tener al menos 4 caracteres.');
        return;
      }
      const res = gymService.registerAthlete(identifier, name, password, phone);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Error al registrar atleta.');
      }
      return;
    }

    const res = gymService.login(identifier, password);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setError(res.error || 'Credenciales no válidas. Verifica tu contraseña o usa biometría.');
    }
  };

  // Quick fill / Quick login for owners (Melina & Alexis)
  const handleOwnerSelect = (owner: 'melina' | 'alexis') => {
    setError(null);
    if (owner === 'melina') {
      setIdentifier('melina');
      setPassword('');
    } else {
      setIdentifier('alexis');
      setPassword('');
    }
  };

  // Trigger Biometric Login (Fingerprint / Face ID / WebAuthn)
  const handleBiometricAuth = async (targetUser?: 'melina' | 'alexis') => {
    setError(null);
    setBiometricScanning(true);
    setBiometricSuccess(false);

    try {
      // Simulate/trigger biometric sensor verification delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const target = targetUser || (identifier.trim() ? identifier.trim() : 'melina');
      const res = await gymService.loginWithBiometrics(target);

      if (res.success && res.user) {
        setBiometricSuccess(true);
        setTimeout(() => {
          setBiometricScanning(false);
          onLoginSuccess(res.user!);
        }, 500);
      } else {
        setBiometricScanning(false);
        setError(res.error || 'No se pudo verificar la biometría. Ingresa con tu contraseña.');
      }
    } catch {
      setBiometricScanning(false);
      setError('Error al procesar biometría. Por favor ingresa tu contraseña.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-emerald-500 selection:text-slate-950">
      {/* Background radial neon-green ambient glow matching logo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Top Header Strip */}
      <header className="w-full max-w-6xl mx-auto px-4 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <img
            src="/assets/aistudio/image_e8128fe0.png"
            alt="Gurú Box"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          />
          <div>
            <span className="font-heading font-black tracking-wider text-base text-white flex items-center gap-1 leading-none">
              GURÚ <span className="text-emerald-400">BOX</span>
            </span>
            <span className="text-[10px] text-slate-400 block tracking-wider font-semibold uppercase">
              Cross Training · Caseros
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton />
        </div>
      </header>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto px-4 py-6 z-10">
        <div className="rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-emerald-500/30 p-7 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.7)] space-y-6">
          {/* Logo & Gym Branding */}
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <img
                src="/assets/aistudio/image_e8128fe0.png"
                alt="Gurú Box Logo"
                className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full object-cover shadow-[0_0_30px_rgba(34,197,94,0.45)] ring-2 ring-emerald-400/80 transition-transform duration-300 hover:scale-105"
              />
              <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-slate-950 font-black">
                ✓
              </span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wide">
                GURÚ <span className="text-emerald-400">BOX</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Gestión de Turnos, Tokens & WOD del Día
              </p>
              <a
                href={GYM_LOCATION.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-emerald-400/90 hover:text-emerald-300 mt-1 transition"
              >
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>{GYM_LOCATION.address}</span>
                <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-70" />
              </a>
            </div>
          </div>

          {/* Quick Access Card for Owners */}
          {!isRegister && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Acceso para Dueños</span>
                </span>
                <span className="text-[10px] text-slate-500">Contraseña o Biometría</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleOwnerSelect('melina')}
                  className={`p-2.5 rounded-xl border transition text-left cursor-pointer flex flex-col ${
                    identifier === 'melina'
                      ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15'
                  }`}
                >
                  <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Dueña</span>
                  <span className="text-sm font-black text-white">Melina</span>
                  <span className="text-[10px] text-slate-400 font-mono">meliguruo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOwnerSelect('alexis')}
                  className={`p-2.5 rounded-xl border transition text-left cursor-pointer flex flex-col ${
                    identifier === 'alexis'
                      ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15'
                  }`}
                >
                  <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Dueño</span>
                  <span className="text-sm font-black text-white">Alexis</span>
                  <span className="text-[10px] text-slate-400 font-mono">alexguru</span>
                </button>
              </div>

              {/* 1-Tap Biometric button for owners or selected user */}
              <button
                type="button"
                onClick={() => handleBiometricAuth()}
                disabled={biometricScanning}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 text-xs font-bold transition border border-emerald-500/40 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                <span>Ingresar con Huella / Face ID (Biometría)</span>
              </button>
            </div>
          )}

          {/* Authentication Method Selector (Contraseña vs Biometría) */}
          {!isRegister && (
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAuthMethod('password')}
                className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMethod === 'password'
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Contraseña</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('biometric')}
                className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMethod === 'biometric'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ScanFace className="w-3.5 h-3.5" />
                <span>Biometría</span>
              </button>
            </div>
          )}

          {/* Error notice */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Biometric Verification View */}
          {authMethod === 'biometric' && !isRegister ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/80 p-6 text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div
                  className={`absolute inset-0 rounded-full border-2 border-emerald-400/30 ${
                    biometricScanning ? 'animate-ping' : ''
                  }`}
                />
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  {biometricSuccess ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <Fingerprint className="w-8 h-8 text-emerald-400 animate-pulse" />
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">
                  {biometricSuccess ? '¡Identidad Verificada!' : 'Sensor Biométrico Activo'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  {identifier
                    ? `Autenticando cuenta de ${identifier}`
                    : 'Coloca tu huella dactilar o acerca tu rostro para Face ID.'}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleBiometricAuth()}
                  disabled={biometricScanning}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>{biometricScanning ? 'Escaneando Biometría...' : 'Confirmar con Huella / Face ID'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthMethod('password')}
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  O ingresar con Contraseña
                </button>
              </div>
            </div>
          ) : (
            /* Password / Register Form */
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              {isRegister && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre y Apellido:</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ej: Marcos Bianchi"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isRegister ? 'Correo electrónico:' : 'Usuario o Email:'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={isRegister ? 'email' : 'text'}
                    required
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder={isRegister ? 'tu.email@gmail.com' : 'melina, alexis o tu email'}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Contraseña:</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {isRegister && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">WhatsApp / Celular:</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+54 9 11 1234-5678"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Clarification banner about tokens */}
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Asignación de Tokens:</strong> Los tokens para entrenar son asignados exclusivamente por los dueños (Melina y Alexis) en la sede de <strong>Roma 2607, Caseros</strong>.
                    </p>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer mt-5"
              >
                <span>{isRegister ? 'Registrarme en Gurú Box' : 'Entrar a Gurú Box'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Toggle between Login and Register */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
                setAuthMethod('password');
              }}
              className="text-xs text-slate-400 hover:text-emerald-400 transition cursor-pointer"
            >
              {isRegister
                ? '¿Ya tienes cuenta? Inicia sesión aquí'
                : '¿Nuevo en el box? Registrate como atleta aquí'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer with official address */}
      <footer className="w-full max-w-6xl mx-auto px-4 py-6 text-center text-xs text-slate-500 z-10 space-y-1">
        <p className="text-slate-400 font-medium">
          GURÚ BOX · <a href={GYM_LOCATION.mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 underline decoration-slate-700">{GYM_LOCATION.address}</a>
        </p>
        <p className="text-slate-600 text-[11px]">
          Turnos: 8:00 · 9:30 · 15:00 · 16:15 · 17:30 · 19:00 · 20:30 hs (Máx. 8 cupos) · Dueños: Melina & Alexis
        </p>
      </footer>
    </div>
  );
};
