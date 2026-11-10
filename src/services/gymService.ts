import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, db } from './firebase';
import {
  UserProfile,
  UserRole,
  Booking,
  WOD,
  NotificationItem,
  TokenTransaction,
  CancelledSlot,
} from '../types/gym';
import {
  canBookSlot,
  canCancelWithoutPenalty,
  deductToken,
  processCancellationRefund,
} from '../utils/bookingRules';

export const GYM_LOCATION = {
  name: 'Gurú Box Cross Training',
  address: 'Roma 2607, B1678ENA Caseros, Provincia de Buenos Aires',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Roma+2607,+B1678ENA+Caseros,+Provincia+de+Buenos+Aires',
  city: 'Caseros, Provincia de Buenos Aires',
  owners: 'Melina & Alexis',
};

function getTodayString(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

const STORAGE_KEYS = {
  USERS: 'gurubox_users_v3',
  BOOKINGS: 'gurubox_bookings_v3',
  CANCELLED_SLOTS: 'gurubox_cancelled_slots_v3',
  WODS: 'gurubox_wods_v3',
  NOTIFICATIONS: 'gurubox_notifications_v3',
  CURRENT_USER_ID: 'gurubox_current_uid_v3',
  PASSWORDS: 'gurubox_passwords_v3',
};

const SEED_USERS: UserProfile[] = [
  {
    uid: 'owner_melina',
    email: 'melina@gurubox.com',
    displayName: 'Melina (Dueña)',
    role: 'owner',
    tokens: 99,
    phone: '+54 9 11 5566-7788',
    avatarUrl: '/assets/aistudio/image_e8128fe0.png',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    uid: 'owner_alexis',
    email: 'alexis@gurubox.com',
    displayName: 'Alexis (Dueño)',
    role: 'owner',
    tokens: 99,
    phone: '+54 9 11 6677-8899',
    avatarUrl: '/assets/aistudio/image_e8128fe0.png',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
];

const todayStr = getTodayString(0);
const tomorrowStr = getTodayString(1);
const SEED_BOOKINGS: Booking[] = [];

const SEED_WODS: Record<string, WOD> = {
  [todayStr]: {
    date: todayStr,
    title: 'GURÚ FORCE // Fuerza & Metcon Puro',
    warmUp: '3 Rondas de Activación',
    strength: 'BACK SQUAT 5x5',
    conditioning: 'AMRAP 14',
    scaling: 'Scaled options',
    notes: 'Priorizar ritmo constante.',
    coach: 'Melina & Alexis',
    createdAt: '2026-11-06T06:00:00.000Z',
  },
  [tomorrowStr]: {
    date: tomorrowStr,
    title: 'GURÚ OLYMPIC',
    warmUp: 'Tabata hollow/arch',
    strength: 'Power clean + push jerk',
    conditioning: 'EMOM 16',
    scaling: 'Knee raises',
    coach: 'Alexis',
    createdAt: '2026-11-06T06:30:00.000Z',
  },
};

const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    recipientId: 'owners',
    recipientRole: 'owner',
    title: 'Sistema Gurú Box Activo',
    message: 'Sistema de turnos iniciado. Los tokens los asignan los dueños.',
    type: 'system',
    read: false,
    createdAt: new Date().toISOString(),
  },
];

class GymService {
  private users: UserProfile[] = [];
  private bookings: Booking[] = [];
  private cancelledSlots: CancelledSlot[] = [];
  private wods: Record<string, WOD> = {};
  private notifications: NotificationItem[] = [];
  private authPasswords: Record<string, string> = {};
  private currentUserId: string | null = null;
  private isPushSupported: boolean = typeof window !== 'undefined' && 'Notification' in window;
  private pushPermission: NotificationPermission =
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';

  constructor() {
    this.loadState();
  }

  private loadState() {
    if (typeof window === 'undefined') return;
    try {
      const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      this.users = storedUsers ? JSON.parse(storedUsers) : [...SEED_USERS];
      const oldMockUids = new Set([
        'athlete_lucas', 'athlete_sofia', 'athlete_mateo', 'athlete_camila',
        'ath_seed_1', 'ath_seed_2', 'ath_seed_3', 'ath_seed_4', 'ath_seed_5', 'ath_seed_6', 'ath_seed_7',
      ]);
      this.users = this.users.filter(
        u => u.role === 'owner' || (!oldMockUids.has(u.uid) && !u.uid.startsWith('ath_seed_'))
      );
      if (!this.users.some(u => u.email === 'melina@gurubox.com')) this.users.unshift(SEED_USERS[0]);
      if (!this.users.some(u => u.email === 'alexis@gurubox.com')) this.users.splice(1, 0, SEED_USERS[1]);

      const storedPasswords = localStorage.getItem(STORAGE_KEYS.PASSWORDS);
      this.authPasswords = storedPasswords ? JSON.parse(storedPasswords) : {};
      this.authPasswords['melina'] = 'meliguru';
      this.authPasswords['melina@gurubox.com'] = 'meliguru';
      this.authPasswords['alexis'] = 'alexguru';
      this.authPasswords['alexis@gurubox.com'] = 'alexguru';

      const storedBookings = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      this.bookings = storedBookings ? JSON.parse(storedBookings) : [...SEED_BOOKINGS];
      this.bookings = this.bookings.filter(b => !oldMockUids.has(b.athleteId));

      const storedCancelled = localStorage.getItem(STORAGE_KEYS.CANCELLED_SLOTS);
      this.cancelledSlots = storedCancelled ? JSON.parse(storedCancelled) : [];
      const storedWods = localStorage.getItem(STORAGE_KEYS.WODS);
      this.wods = storedWods ? JSON.parse(storedWods) : { ...SEED_WODS };
      const storedNotifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      this.notifications = storedNotifications ? JSON.parse(storedNotifications) : [...SEED_NOTIFICATIONS];
      const storedUid = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (storedUid && this.users.some(u => u.uid === storedUid)) this.currentUserId = storedUid;
    } catch (e) {
      console.warn('Error reading localStorage, using defaults', e);
      this.users = [...SEED_USERS];
      this.bookings = [];
      this.cancelledSlots = [];
      this.wods = { ...SEED_WODS };
      this.notifications = [...SEED_NOTIFICATIONS];
    }
  }

  private persistState() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(this.bookings));
      localStorage.setItem(STORAGE_KEYS.CANCELLED_SLOTS, JSON.stringify(this.cancelledSlots));
      localStorage.setItem(STORAGE_KEYS.WODS, JSON.stringify(this.wods));
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(this.notifications));
      localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(this.authPasswords));
      if (this.currentUserId) localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, this.currentUserId);
      else localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    } catch (e) {
      console.warn('Error saving state to localStorage', e);
    }
  }

  private cleanObject<T extends Record<string, any>>(obj: T): Record<string, any> {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) cleaned[key] = val;
    }
    return cleaned;
  }

  async refreshUsersFromFirestore(): Promise<UserProfile[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const remote: UserProfile[] = [];
      snap.forEach(d => {
        const data = d.data() as UserProfile;
        if (data) remote.push({ ...data, uid: data.uid || d.id });
      });
      if (remote.length > 0) {
        this.users = remote;
        this.persistState();
      }
      return this.getAthletes();
    } catch (error) {
      console.warn('No se pudo cargar users desde Firestore:', error);
      return this.getAthletes();
    }
  }

  async refreshSharedData(): Promise<void> {
    try {
      const bookSnap = await getDocs(collection(db, 'bookings'));
      const remoteBookings: Booking[] = [];
      bookSnap.forEach(d => {
        const data = d.data() as Booking;
        if (data) remoteBookings.push({ ...data, id: data.id || d.id });
      });
      const byId = new Map<string, Booking>();
      this.bookings.forEach(b => byId.set(b.id, b));
      remoteBookings.forEach(b => byId.set(b.id, b));
      this.bookings = Array.from(byId.values());
    } catch (error) {
      console.warn('refreshSharedData bookings notice:', error);
    }

    try {
      const cancelSnap = await getDocs(collection(db, 'cancelledSlots'));
      const remoteCancelled: CancelledSlot[] = [];
      cancelSnap.forEach(d => {
        const data = d.data() as CancelledSlot;
        if (data) remoteCancelled.push({ ...data, id: data.id || d.id });
      });
      this.cancelledSlots = remoteCancelled;
    } catch (error) {
      console.warn('refreshSharedData cancelledSlots notice:', error);
    }

    try {
      const wodSnap = await getDocs(collection(db, 'wods'));
      wodSnap.forEach(d => {
        const data = d.data() as WOD;
        const dateKey = (data && data.date) || d.id;
        if (dateKey) this.wods[dateKey] = { ...(data as WOD), date: dateKey };
      });
    } catch (error) {
      console.warn('refreshSharedData wods notice:', error);
    }

    this.persistState();
  }

  private ownerEmailForIdentifier(id: string): { email: string; password: string; seed: UserProfile } | null {
    const clean = id.trim().toLowerCase();
    if (clean === 'melina' || clean === 'melina@gurubox.com' || clean === 'owner_melina') {
      return { email: 'melina@gurubox.com', password: 'meliguru', seed: SEED_USERS[0] };
    }
    if (clean === 'alexis' || clean === 'alexis@gurubox.com' || clean === 'owner_alexis') {
      return { email: 'alexis@gurubox.com', password: 'alexguru', seed: SEED_USERS[1] };
    }
    return null;
  }

  private async ensureOwnerAccount(email: string, password: string, seed: UserProfile): Promise<UserProfile> {
    let fbUser: FirebaseUser;
    try {
      fbUser = (await signInWithEmailAndPassword(auth, email, password)).user;
    } catch {
      try {
        fbUser = (await createUserWithEmailAndPassword(auth, email, password)).user;
      } catch (e2: any) {
        if (e2?.code === 'auth/email-already-in-use') {
          fbUser = (await signInWithEmailAndPassword(auth, email, password)).user;
        } else throw e2;
      }
    }
    const uid = fbUser.uid;
    const ref = doc(db, 'users', uid);
    const existing = await getDoc(ref);
    let profile: UserProfile;
    if (existing.exists()) {
      profile = { ...(existing.data() as UserProfile), uid };
    } else {
      profile = { ...seed, uid, email, role: 'owner', tokens: 99, createdAt: seed.createdAt || new Date().toISOString() };
      await setDoc(ref, this.cleanObject(profile), { merge: true });
    }
    const idx = this.users.findIndex(u => u.uid === uid || u.email === email);
    if (idx >= 0) this.users[idx] = profile;
    else this.users.push(profile);
    this.currentUserId = uid;
    this.persistState();
    await this.refreshUsersFromFirestore();
    this.currentUserId = uid;
    this.persistState();
    return this.users.find(u => u.uid === uid) || profile;
  }

  async login(identifier: string, passwordAttempt: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = passwordAttempt.trim();
    if (!cleanPass) return { success: false, error: 'Por favor ingresa tu contraseña.' };

    const owner = this.ownerEmailForIdentifier(cleanId);
    if (owner) {
      if (cleanPass !== owner.password) return { success: false, error: `Contraseña incorrecta para ${owner.email}.` };
      try {
        const profile = await this.ensureOwnerAccount(owner.email, owner.password, owner.seed);
        return { success: true, user: profile };
      } catch (e: any) {
        console.error('owner login error', e);
        return { success: false, error: e?.message || 'No se pudo iniciar sesión de dueño en Firebase.' };
      }
    }

    if (!cleanId.includes('@')) {
      return { success: false, error: 'Ingresá tu email de registro o el usuario de dueño (melina / alexis).' };
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, cleanId, cleanPass);
      await this.refreshUsersFromFirestore();
      await this.refreshSharedData();
      let profile = this.users.find(u => u.uid === cred.user.uid);
      if (!profile) {
        const snap = await getDoc(doc(db, 'users', cred.user.uid));
        if (snap.exists()) {
          profile = { ...(snap.data() as UserProfile), uid: cred.user.uid };
          this.users.push(profile);
        } else {
          await signOut(auth);
          return { success: false, error: 'Esta cuenta ya no tiene una ficha activa en Gurú Box. Contactá a la administración.' };
        }
      }
      this.currentUserId = profile.uid;
      this.persistState();
      return { success: true, user: profile };
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        return { success: false, error: 'Email o contraseña incorrectos. Si sos nuevo, registrate.' };
      }
      console.error('login error', e);
      return { success: false, error: e?.message || 'Error al iniciar sesión.' };
    }
  }

  async loginWithBiometrics(targetIdentifier?: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanId = (targetIdentifier || '').trim().toLowerCase() || 'melina';
    const owner = this.ownerEmailForIdentifier(cleanId);
    if (owner) {
      try {
        const profile = await this.ensureOwnerAccount(owner.email, owner.password, owner.seed);
        return { success: true, user: profile };
      } catch (e: any) {
        return { success: false, error: e?.message || 'No se pudo autenticar al dueño.' };
      }
    }
    await this.refreshUsersFromFirestore();
    const targetUser = this.users.find(
      u => u.email.toLowerCase() === cleanId || u.displayName.toLowerCase().includes(cleanId) || u.uid === cleanId
    );
    if (!targetUser) {
      return { success: false, error: 'No se encontró la cuenta. Los atletas deben ingresar con email y contraseña.' };
    }
    this.currentUserId = targetUser.uid;
    this.persistState();
    return { success: true, user: targetUser };
  }

  logout() {
    this.currentUserId = null;
    this.persistState();
    signOut(auth).catch(() => {});
  }

  isLoggedIn(): boolean {
    return this.currentUserId !== null && this.users.some(u => u.uid === this.currentUserId);
  }

  getCurrentUser(): UserProfile | null {
    if (!this.currentUserId) return null;
    return this.users.find(u => u.uid === this.currentUserId) || null;
  }

  applyRemoteUser(profile: UserProfile): void {
    if (!profile?.uid) return;
    const idx = this.users.findIndex(u => u.uid === profile.uid);
    if (idx >= 0) this.users[idx] = { ...this.users[idx], ...profile };
    else this.users.push(profile);
    this.persistState();
  }

  subscribeToUser(uid: string, onUpdate: (profile: UserProfile) => void): () => void {
    if (!uid) return () => {};
    const ref = doc(db, 'users', uid);
    const unsub: Unsubscribe = onSnapshot(
      ref,
      snap => {
        if (!snap.exists()) return;
        const data = { ...(snap.data() as UserProfile), uid: snap.id };
        this.applyRemoteUser(data);
        onUpdate(data);
      },
      err => console.warn('subscribeToUser error:', err)
    );
    return () => unsub();
  }

  setCurrentUser(uid: string): UserProfile {
    const user = this.users.find(u => u.uid === uid);
    if (user) {
      this.currentUserId = uid;
      this.persistState();
      return user;
    }
    throw new Error('Usuario no encontrado');
  }

  getUsers(): UserProfile[] {
    return [...this.users];
  }

  getAthletes(): UserProfile[] {
    return this.users.filter(u => u.role === 'athlete');
  }

  async registerAthlete(
    email: string,
    displayName: string,
    passwordAttempt: string,
    phone?: string
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = passwordAttempt.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Por favor ingresa un correo electrónico válido.' };
    }
    if (cleanPass.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres (requisito de Firebase).' };
    }
    try {
      await this.refreshUsersFromFirestore();
      if (this.users.find(u => u.email.toLowerCase() === cleanEmail)) {
        return { success: false, error: 'Ya existe una cuenta con este correo. Inicia sesión.' };
      }
      let cred;
      try {
        cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
      } catch (e: any) {
        if (e?.code === 'auth/email-already-in-use') {
          return { success: false, error: 'Ya existe una cuenta con este correo. Inicia sesión.' };
        }
        if (e?.code === 'auth/weak-password') {
          return { success: false, error: 'La contraseña es demasiado débil (mínimo 6 caracteres).' };
        }
        throw e;
      }
      const newAthlete: UserProfile = {
        uid: cred.user.uid,
        email: cleanEmail,
        displayName: displayName.trim() || cleanEmail.split('@')[0],
        role: 'athlete',
        tokens: 0,
        phone: phone?.trim() || '',
        avatarUrl: '',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', newAthlete.uid), this.cleanObject(newAthlete), { merge: true });
      this.users.push(newAthlete);
      this.currentUserId = newAthlete.uid;
      this.persistState();
      this.createNotification({
        recipientId: 'owners',
        recipientRole: 'owner',
        title: 'Nuevo atleta registrado',
        message: `${newAthlete.displayName} (${newAthlete.email}) se registró. Asignale tokens desde el panel.`,
        type: 'system',
      });
      return { success: true, user: newAthlete };
    } catch (error: any) {
      console.error('registerAthlete error', error);
      return { success: false, error: error?.message || 'Error al registrar atleta.' };
    }
  }

  loginOrRegister(email: string, displayName?: string, role?: UserRole, password?: string): UserProfile {
    const cleanEmail = email.trim().toLowerCase();
    let user = this.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      user = {
        uid: (role === 'owner' ? 'owner_' : 'ath_real_') + Date.now(),
        email: cleanEmail,
        displayName: displayName || cleanEmail.split('@')[0],
        role: role || 'athlete',
        tokens: role === 'owner' ? 99 : 0,
        phone: '',
        avatarUrl: '',
        createdAt: new Date().toISOString(),
      };
      this.users.push(user);
      this.syncUserToFirestore(user).catch(() => {});
    }
    this.currentUserId = user.uid;
    this.persistState();
    return user;
  }

  isSlotCancelled(date: string, time: string): boolean {
    return this.cancelledSlots.some(s => s.slotDate === date && s.slotTime === time);
  }

  getCancelledSlot(date: string, time: string): CancelledSlot | undefined {
    return this.cancelledSlots.find(s => s.slotDate === date && s.slotTime === time);
  }

  async cancelSlotByOwner(
    date: string,
    time: string,
    reason: string,
    cancelledBy: string
  ): Promise<{ success: boolean; refundedCount: number; message: string }> {
    await this.refreshSharedData();

    if (this.isSlotCancelled(date, time)) {
      return { success: false, refundedCount: 0, message: 'Este turno ya se encuentra cancelado.' };
    }

    const newCancelledSlot: CancelledSlot = {
      id: `${date}_${time}`,
      slotDate: date,
      slotTime: time,
      reason: reason || 'Mantenimiento / Feriado en el Box',
      cancelledBy: cancelledBy || 'Administración Gurú Box',
      cancelledAt: new Date().toISOString(),
    };
    this.cancelledSlots.push(newCancelledSlot);

    try {
      await setDoc(doc(db, 'cancelledSlots', newCancelledSlot.id), this.cleanObject(newCancelledSlot), { merge: true });
    } catch (err) {
      console.warn('Firestore cancelledSlots write notice:', err);
    }

    const affectedBookings = this.bookings.filter(
      b => b.slotDate === date && b.slotTime === time && b.status === 'confirmed'
    );

    for (const b of affectedBookings) {
      b.status = 'cancelled_by_owner';
      b.cancelledAt = new Date().toISOString();
      b.penaltyReason = `Turno cancelado por administración (${reason})`;
      const athlete = this.users.find(u => u.uid === b.athleteId);
      if (athlete) {
        athlete.tokens += 1;
        await this.syncUserToFirestore(athlete);
        this.createNotification({
          recipientId: athlete.uid,
          recipientRole: 'athlete',
          title: `Turno de las ${time} hs cancelado (Token Reembolsado)`,
          message: `El turno del ${date} a las ${time} hs fue suspendido. Se te reintegró 1 token.`,
          type: 'slot_cancelled',
        });
      }
      await this.syncBookingToFirestore(b);
    }

    this.persistState();
    return {
      success: true,
      refundedCount: affectedBookings.length,
      message: `Turno cancelado. Se reembolsó token a ${affectedBookings.length} atleta(s).`,
    };
  }

  async reopenSlotByOwner(date: string, time: string): Promise<{ success: boolean; message: string }> {
    await this.refreshSharedData();
    const idx = this.cancelledSlots.findIndex(s => s.slotDate === date && s.slotTime === time);
    if (idx === -1) return { success: false, message: 'Ese turno no está cancelado.' };
    const slot = this.cancelledSlots[idx];
    this.cancelledSlots.splice(idx, 1);
    this.persistState();
    try {
      await deleteDoc(doc(db, 'cancelledSlots', slot.id || `${date}_${time}`));
    } catch (err) {
      console.warn('Firestore reopen slot notice:', err);
    }
    return { success: true, message: `Turno ${date} ${time} reabierto.` };
  }

  getCancelledSlots(): CancelledSlot[] {
    return [...this.cancelledSlots];
  }

  async deleteAthleteProfile(athleteId: string): Promise<{ success: boolean; error?: string }> {
    const user = this.users.find(u => u.uid === athleteId);
    if (!user || user.role !== 'athlete') {
      return { success: false, error: 'No se encontró un atleta válido para eliminar.' };
    }
    try {
      await deleteDoc(doc(db, 'users', athleteId));
      this.users = this.users.filter(u => u.uid !== athleteId);
      this.persistState();
      return { success: true };
    } catch (error: any) {
      console.error('deleteAthleteProfile error:', error);
      return { success: false, error: error?.message || 'No se pudo eliminar la ficha del atleta.' };
    }
  }

  async updateTokens(athleteId: string, amount: number, reason: string): Promise<{ success: boolean; newTokens: number }> {
    const user = this.users.find(u => u.uid === athleteId);
    if (!user) return { success: false, newTokens: 0 };
    user.tokens = Math.max(0, user.tokens + amount);
    this.persistState();
    try {
      await setDoc(doc(db, 'users', user.uid), this.cleanObject(user), { merge: true });
    } catch (err) {
      console.warn('Firestore updateTokens notice:', err);
    }
    this.createNotification({
      recipientId: athleteId,
      recipientRole: 'athlete',
      title: amount >= 0 ? `¡Tokens acreditados! (+${amount})` : `Ajuste de tokens (${amount})`,
      message: `${reason}. Saldo actual: ${user.tokens} tokens.`,
      type: 'token_recharge',
    });
    return { success: true, newTokens: user.tokens };
  }

  getWOD(date: string): WOD | null {
    return this.wods[date] || null;
  }

  async saveWOD(wod: WOD): Promise<void> {
    this.wods[wod.date] = wod;
    this.persistState();
    try {
      await setDoc(doc(db, 'wods', wod.date), this.cleanObject(wod), { merge: true });
    } catch (err) {
      console.warn('Firestore WOD write notice:', err);
    }
    this.createNotification({
      recipientId: 'all',
      recipientRole: 'athlete',
      title: `WOD del ${wod.date} publicado`,
      message: wod.title,
      type: 'wod',
    });
  }

  getBookingsForDate(date: string): Booking[] {
    return this.bookings.filter(b => b.slotDate === date && b.status === 'confirmed');
  }

  getBookingsForSlot(date: string, time: string): Booking[] {
    return this.bookings.filter(b => b.slotDate === date && b.slotTime === time && b.status === 'confirmed');
  }

  getBookingsForAthlete(athleteId: string): Booking[] {
    return this.bookings
      .filter(b => b.athleteId === athleteId)
      .sort((a, b) => (b.slotDate + b.slotTime).localeCompare(a.slotDate + a.slotTime));
  }

  getUserBookings(athleteId: string): Booking[] {
    return this.getBookingsForAthlete(athleteId);
  }

  getAllBookings(): Booking[] {
    return [...this.bookings].sort((a, b) => b.bookedAt.localeCompare(a.bookedAt));
  }

  bookSlot(params: {
    slotDate: string;
    slotTime: string;
    athlete: UserProfile;
  }): { success: boolean; booking?: Booking; error?: string } {
    const { slotDate, slotTime, athlete } = params;
    const isCancelled = this.isSlotCancelled(slotDate, slotTime);
    if (isCancelled) {
      const info = this.getCancelledSlot(slotDate, slotTime);
      return { success: false, error: `Turno suspendido (${info?.reason || 'Sin actividad'}).` };
    }
    const slotBookings = this.getBookingsForSlot(slotDate, slotTime);
    const alreadyBooked = slotBookings.some(b => b.athleteId === athlete.uid);
    const check = canBookSlot({
      currentTokens: athlete.tokens,
      currentBookingsCount: slotBookings.length,
      alreadyBookedByAthlete: alreadyBooked,
      isCancelledByOwner: isCancelled,
    });
    if (!check.canBook) return { success: false, error: check.reason };
    const tokenResult = deductToken(athlete.tokens);
    if (!tokenResult.success) return { success: false, error: 'No tienes tokens suficientes' };
    athlete.tokens = tokenResult.newTokens;
    const u = this.users.find(x => x.uid === athlete.uid);
    if (u) u.tokens = athlete.tokens;

    const newBooking: Booking = {
      id: 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      slotDate,
      slotTime,
      athleteId: athlete.uid,
      athleteName: athlete.displayName,
      athleteEmail: athlete.email,
      status: 'confirmed',
      bookedAt: new Date().toISOString(),
    };
    this.bookings.push(newBooking);
    this.persistState();
    this.syncBookingToFirestore(newBooking).catch(() => {});
    this.syncUserToFirestore(athlete).catch(() => {});
    this.createNotification({
      recipientId: 'owners',
      recipientRole: 'owner',
      title: '¡Nueva reserva!',
      message: `${athlete.displayName} reservó ${slotDate} ${slotTime}. Cupo: ${slotBookings.length + 1}/8.`,
      type: 'booking',
    });
    return { success: true, booking: newBooking };
  }

  cancelBooking(bookingId: string, referenceTime: Date = new Date()): { success: boolean; refunded: boolean; message: string } {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) return { success: false, refunded: false, message: 'Reserva no encontrada.' };
    if (booking.status !== 'confirmed') return { success: false, refunded: false, message: 'La reserva ya fue cancelada.' };
    const athlete = this.users.find(u => u.uid === booking.athleteId);
    if (!athlete) return { success: false, refunded: false, message: 'Atleta no encontrado.' };
    const penaltyCheck = canCancelWithoutPenalty(booking.slotDate, booking.slotTime, referenceTime);
    const refundOutcome = processCancellationRefund(athlete.tokens, penaltyCheck.allowedWithoutPenalty);
    booking.status = refundOutcome.status;
    booking.cancelledAt = new Date().toISOString();
    booking.penaltyReason = penaltyCheck.penaltyReason;
    athlete.tokens = refundOutcome.newTokens;
    this.persistState();
    this.syncBookingToFirestore(booking).catch(() => {});
    this.syncUserToFirestore(athlete).catch(() => {});
    return {
      success: true,
      refunded: refundOutcome.refunded,
      message: refundOutcome.refunded
        ? 'Cancelación con reembolso de 1 token.'
        : 'Cancelación con penalización (sin reembolso).',
    };
  }

  markAttendance(bookingId: string, attended: boolean) {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (booking) {
      booking.attended = attended;
      this.persistState();
      this.syncBookingToFirestore(booking).catch(() => {});
    }
  }

  getNotifications(userId: string, role: string): NotificationItem[] {
    return this.notifications
      .filter(
        n =>
          n.recipientId === userId ||
          n.recipientId === 'all' ||
          (role === 'owner' && (n.recipientId === 'owners' || n.recipientRole === 'owner'))
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getUnreadCount(userId: string, role: string): number {
    return this.getNotifications(userId, role).filter(n => !n.read).length;
  }

  markNotificationRead(id: string) {
    const n = this.notifications.find(x => x.id === id);
    if (n) {
      n.read = true;
      this.persistState();
      this.syncNotificationToFirestore(n).catch(() => {});
    }
  }

  markAllNotificationsAsRead(userId: string, role: 'athlete' | 'owner' | string) {
    const list = this.getNotifications(userId, role);
    list.forEach(n => {
      n.read = true;
    });
    this.persistState();
  }

  createNotification(partial: Omit<NotificationItem, 'id' | 'read' | 'createdAt'> & { id?: string }): NotificationItem {
    const notification: NotificationItem = {
      id: partial.id || 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      recipientId: partial.recipientId,
      recipientRole: partial.recipientRole,
      title: partial.title,
      message: partial.message,
      type: partial.type,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(notification);
    this.persistState();
    this.syncNotificationToFirestore(notification).catch(() => {});
    return notification;
  }

  async requestPushPermission(): Promise<boolean> {
    if (!this.isPushSupported) return false;
    try {
      const permission = await Notification.requestPermission();
      this.pushPermission = permission;
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  getPushPermission(): NotificationPermission {
    return this.pushPermission;
  }

  sendWebPushNotification(title: string, body: string) {
    if (this.isPushSupported && this.pushPermission === 'granted') {
      try {
        new Notification(title, { body, icon: '/logo.png', badge: '/logo.png' });
      } catch {}
    }
  }

  private async syncUserToFirestore(user: UserProfile) {
    try {
      await setDoc(doc(db, 'users', user.uid), this.cleanObject(user), { merge: true });
    } catch (error) {
      console.warn('Firestore sync user notice:', error);
    }
  }

  private async syncBookingToFirestore(booking: Booking) {
    try {
      await setDoc(doc(db, 'bookings', booking.id), this.cleanObject(booking), { merge: true });
    } catch (error) {
      console.warn('Firestore sync booking notice:', error);
    }
  }

  private async syncWodToFirestore(wod: WOD) {
    try {
      await setDoc(doc(db, 'wods', wod.date), this.cleanObject(wod), { merge: true });
    } catch (error) {
      console.warn('Firestore sync WOD notice:', error);
    }
  }

  private async syncNotificationToFirestore(notification: NotificationItem) {
    try {
      await setDoc(doc(db, 'notifications', notification.id), this.cleanObject(notification), { merge: true });
    } catch (error) {
      console.warn('Firestore sync notification notice:', error);
    }
  }
}

export const gymService = new GymService();
