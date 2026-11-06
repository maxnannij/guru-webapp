import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
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

// Gurú Box Official Location
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

// Initial Seed Users: EXCLUSIVAMENTE LOS DUEÑOS (Melina & Alexis)
// Sin atletas precargados - los atletas se registran y los dueños les asignan tokens
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

// Sin reservas iniciales simuladas (lista de atletas limpia)
const SEED_BOOKINGS: Booking[] = [];

const SEED_WODS: Record<string, WOD> = {
  [todayStr]: {
    date: todayStr,
    title: 'GURÚ FORCE // Fuerza & Metcon Puro',
    warmUp: '3 Rondas de Activación:\n- 200m Remo / Trote suave\n- 10 Inchworms con flexión de brazos\n- 15 Sentadillas aéreas lentas con pausa (3s)\n- 10 Dislocaciones con banda elástica',
    strength: 'BACK SQUAT (Sentadilla Trasera):\n5 series x 5 repeticiones al 75-80% 1RM.\nDescanso de 2:00 min entre series. Enfoque en profundidad y control.',
    conditioning: 'AMRAP 14 MINUTOS (As Many Rounds As Possible):\n- 12 Kettlebell Swings (24kg / 16kg)\n- 9 Burpees sobre la barra\n- 6 Dominadas estrictas / Chest to Bar\n- 50 Saltos dobles (Double Unders)',
    scaling: 'Opción Scaled:\n- KB Swing con 16kg / 12kg\n- Burpees estándar al piso\n- Ring Rows o Saltos al cajón\n- 100 Saltos simples de soga',
    notes: 'Priorizar ritmo constante en el Metcon sin frenar en los burpees. Hidratarse bien y escuchar al coach.',
    coach: 'Melina & Alexis',
    createdAt: '2026-11-06T06:00:00.000Z',
  },
  [tomorrowStr]: {
    date: tomorrowStr,
    title: 'GURÚ OLYMPIC // Clean & Jerk Complejo',
    warmUp: 'Tabata: Hollow Rock + Arch Rock + Burgener con barra vacía',
    strength: 'POWER CLEAN + PUSH JERK:\nEncontrar peso pesado para el complejo 1+1 en 15 minutos.',
    conditioning: 'EMOM 16 MINUTOS:\n- Min 1: 15 Calorías Remo / Bici\n- Min 2: 12 Toes to Bar\n- Min 3: 10 Dumbbell Snatch alternados (22.5 / 15kg)\n- Min 4: Descanso activo',
    scaling: 'Knee raises en barra y mancuerna de 15kg / 10kg.',
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
    message: 'Sistema de turnos iniciado. Sede: Roma 2607, Caseros. Los tokens son asignados exclusivamente por los dueños.',
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
  private currentUserId: string | null = null; // starts null to show Login Screen by default!
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

      // Limpiar atletas anteriores simulados: NO QUEDA NINGÚN ATLETA MOCK, SÓLO LOS DUEÑOS
      const oldMockUids = new Set([
        'athlete_lucas',
        'athlete_sofia',
        'athlete_mateo',
        'athlete_camila',
        'ath_seed_1',
        'ath_seed_2',
        'ath_seed_3',
        'ath_seed_4',
        'ath_seed_5',
        'ath_seed_6',
        'ath_seed_7',
      ]);
      this.users = this.users.filter(
        u => u.role === 'owner' || (!oldMockUids.has(u.uid) && !u.uid.startsWith('ath_seed_'))
      );

      // Garantizar que siempre existan Melina y Alexis como dueños
      if (!this.users.some(u => u.uid === 'owner_melina')) {
        this.users.unshift(SEED_USERS[0]);
      }
      if (!this.users.some(u => u.uid === 'owner_alexis')) {
        this.users.splice(1, 0, SEED_USERS[1]);
      }

      // Cargar contraseñas
      const storedPasswords = localStorage.getItem(STORAGE_KEYS.PASSWORDS);
      this.authPasswords = storedPasswords ? JSON.parse(storedPasswords) : {};
      // Contraseñas de los dueños (Melina: meliguruo, Alexis: alexguru)
      this.authPasswords['melina'] = 'meliguruo';
      this.authPasswords['melina@gurubox.com'] = 'meliguruo';
      this.authPasswords['owner_melina'] = 'meliguruo';
      this.authPasswords['alexis'] = 'alexguru';
      this.authPasswords['alexis@gurubox.com'] = 'alexguru';
      this.authPasswords['owner_alexis'] = 'alexguru';

      const storedBookings = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      this.bookings = storedBookings ? JSON.parse(storedBookings) : [...SEED_BOOKINGS];
      // Filtrar reservas de atletas antiguos eliminados
      this.bookings = this.bookings.filter(b => !oldMockUids.has(b.athleteId));

      const storedCancelled = localStorage.getItem(STORAGE_KEYS.CANCELLED_SLOTS);
      this.cancelledSlots = storedCancelled ? JSON.parse(storedCancelled) : [];

      const storedWods = localStorage.getItem(STORAGE_KEYS.WODS);
      this.wods = storedWods ? JSON.parse(storedWods) : { ...SEED_WODS };

      const storedNotifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      this.notifications = storedNotifications ? JSON.parse(storedNotifications) : [...SEED_NOTIFICATIONS];

      const storedUid = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (storedUid && this.users.some(u => u.uid === storedUid)) {
        this.currentUserId = storedUid;
      }
    } catch (e) {
      console.warn('Error reading localStorage, using defaults', e);
      this.users = [...SEED_USERS];
      this.bookings = [...SEED_BOOKINGS];
      this.cancelledSlots = [];
      this.wods = { ...SEED_WODS };
      this.notifications = [...SEED_NOTIFICATIONS];
      this.authPasswords = {
        melina: 'meliguruo',
        'melina@gurubox.com': 'meliguruo',
        owner_melina: 'meliguruo',
        alexis: 'alexguru',
        'alexis@gurubox.com': 'alexguru',
        owner_alexis: 'alexguru',
      };
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
      if (this.currentUserId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, this.currentUserId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
      }
    } catch (e) {
      console.warn('Error saving state to localStorage', e);
    }
  }

  // --- Autenticación con Contraseña y Biometría ---

  login(
    identifier: string,
    passwordAttempt: string
  ): { success: boolean; user?: UserProfile; error?: string } {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = passwordAttempt.trim();

    if (!cleanPass) {
      return { success: false, error: 'Por favor ingresa tu contraseña o accede con biometría.' };
    }

    // Melina (Dueña) - Contraseña requerida: meliguruo
    if (cleanId === 'melina' || cleanId === 'melina@gurubox.com') {
      if (cleanPass === 'meliguruo') {
        const melina = this.users.find(u => u.uid === 'owner_melina') || SEED_USERS[0];
        this.currentUserId = melina.uid;
        this.persistState();
        return { success: true, user: melina };
      }
      return { success: false, error: 'Contraseña incorrecta para Melina (Dueña).' };
    }

    // Alexis (Dueño) - Contraseña requerida: alexguru
    if (cleanId === 'alexis' || cleanId === 'alexis@gurubox.com') {
      if (cleanPass === 'alexguru') {
        const alexis = this.users.find(u => u.uid === 'owner_alexis') || SEED_USERS[1];
        this.currentUserId = alexis.uid;
        this.persistState();
        return { success: true, user: alexis };
      }
      return { success: false, error: 'Contraseña incorrecta para Alexis (Dueño).' };
    }

    // Comprobación de atleta registrado
    const athlete = this.users.find(
      u =>
        u.email.toLowerCase() === cleanId ||
        u.displayName.toLowerCase().includes(cleanId)
    );

    if (athlete) {
      const storedPass = this.authPasswords[athlete.email.toLowerCase()] || this.authPasswords[athlete.uid];
      if (storedPass && storedPass !== cleanPass) {
        return { success: false, error: 'Contraseña incorrecta. Por favor verifica tus datos o usa biometría.' };
      }
      if (cleanPass.length < 4) {
        return { success: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
      }
      this.currentUserId = athlete.uid;
      this.persistState();
      return { success: true, user: athlete };
    }

    return {
      success: false,
      error: 'Usuario no encontrado. Si eres atleta nuevo, regístrate para que los dueños puedan asignarte tokens.',
    };
  }

  // Acceso mediante Biometría (Huella dactilar, Face ID, Touch ID, Windows Hello)
  async loginWithBiometrics(targetIdentifier?: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanId = (targetIdentifier || '').trim().toLowerCase();

    let targetUser: UserProfile | undefined;
    if (cleanId === 'melina' || cleanId === 'melina@gurubox.com' || cleanId === 'owner_melina') {
      targetUser = this.users.find(u => u.uid === 'owner_melina');
    } else if (cleanId === 'alexis' || cleanId === 'alexis@gurubox.com' || cleanId === 'owner_alexis') {
      targetUser = this.users.find(u => u.uid === 'owner_alexis');
    } else if (cleanId) {
      targetUser = this.users.find(
        u => u.email.toLowerCase() === cleanId || u.displayName.toLowerCase().includes(cleanId) || u.uid === cleanId
      );
    } else {
      // Si no especificó, buscar dueño Melina o primer usuario
      targetUser = this.users.find(u => u.uid === 'owner_melina') || this.users[0];
    }

    if (!targetUser) {
      return { success: false, error: 'No se encontró la cuenta para autenticar con biometría.' };
    }

    this.currentUserId = targetUser.uid;
    this.persistState();
    return { success: true, user: targetUser };
  }

  logout() {
    this.currentUserId = null;
    this.persistState();
  }

  isLoggedIn(): boolean {
    return this.currentUserId !== null && this.users.some(u => u.uid === this.currentUserId);
  }

  getCurrentUser(): UserProfile | null {
    if (!this.currentUserId) return null;
    return this.users.find(u => u.uid === this.currentUserId) || null;
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

  // Registro de Atletas:
  // IMPORTANTE: tokens inician en 0 porque los atletas NO los pueden comprar, sólo los dueños los asignan.
  registerAthlete(
    email: string,
    displayName: string,
    passwordAttempt: string,
    phone?: string
  ): { success: boolean; user?: UserProfile; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = passwordAttempt.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Por favor ingresa un correo electrónico válido.' };
    }
    if (cleanPass.length < 4) {
      return { success: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
    }

    const existing = this.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, error: 'Ya existe una cuenta con este correo. Inicia sesión con tu contraseña o biometría.' };
    }

    const newAthlete: UserProfile = {
      uid: 'ath_real_' + Date.now(),
      email: cleanEmail,
      displayName: displayName.trim() || cleanEmail.split('@')[0],
      role: 'athlete',
      tokens: 0, // Tokens en 0: únicamente los dueños (Melina y Alexis) pueden asignarlos
      phone: phone?.trim() || '',
      avatarUrl: '',
      createdAt: new Date().toISOString(),
    };

    this.users.push(newAthlete);
    this.authPasswords[cleanEmail] = cleanPass;
    this.authPasswords[newAthlete.uid] = cleanPass;

    this.currentUserId = newAthlete.uid;
    this.persistState();

    // Notificación a los dueños para avisar que hay un nuevo atleta
    this.createNotification({
      recipientId: 'owners',
      recipientRole: 'owner',
      title: 'Nuevo atleta registrado',
      message: `${newAthlete.displayName} (${newAthlete.email}) se registró. Asignale tokens desde el panel para que pueda reservar turnos.`,
      type: 'system',
    });

    this.syncUserToFirestore(newAthlete).catch(err => console.warn('Firestore sync user notice:', err));

    return { success: true, user: newAthlete };
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
        tokens: role === 'owner' ? 99 : 0, // Solo los dueños asignan tokens
        phone: '',
        avatarUrl: '',
        createdAt: new Date().toISOString(),
      };
      this.users.push(user);
      if (password) {
        this.authPasswords[cleanEmail] = password;
        this.authPasswords[user.uid] = password;
      }
      this.syncUserToFirestore(user).catch(err => console.warn('Firestore sync user notice:', err));
    }
    this.currentUserId = user.uid;
    this.persistState();
    return user;
  }

  // --- Owner Slot Cancellation Feature ---

  isSlotCancelled(date: string, time: string): boolean {
    return this.cancelledSlots.some(s => s.slotDate === date && s.slotTime === time);
  }

  getCancelledSlot(date: string, time: string): CancelledSlot | undefined {
    return this.cancelledSlots.find(s => s.slotDate === date && s.slotTime === time);
  }

  cancelSlotByOwner(
    date: string,
    time: string,
    reason: string,
    cancelledBy: string
  ): { success: boolean; refundedCount: number; message: string } {
    const slotId = `${date}_${time}`;
    if (this.isSlotCancelled(date, time)) {
      return { success: false, refundedCount: 0, message: 'Este turno ya se encuentra cancelado.' };
    }

    const newCancelledSlot: CancelledSlot = {
      id: slotId,
      slotDate: date,
      slotTime: time,
      reason: reason || 'Mantenimiento / Feriado en el Box',
      cancelledBy: cancelledBy || 'Administración Gurú Box',
      cancelledAt: new Date().toISOString(),
    };
    this.cancelledSlots.push(newCancelledSlot);

    // Cancel all confirmed bookings for this slot and refund tokens to each athlete
    const affectedBookings = this.bookings.filter(
      b => b.slotDate === date && b.slotTime === time && b.status === 'confirmed'
    );

    affectedBookings.forEach(b => {
      b.status = 'cancelled_by_owner';
      b.cancelledAt = new Date().toISOString();
      b.penaltyReason = `Turno cancelado por administración (${reason})`;

      // Refund token
      const athlete = this.users.find(u => u.uid === b.athleteId);
      if (athlete) {
        athlete.tokens += 1;
        this.syncUserToFirestore(athlete).catch(e => console.warn('Sync user notice:', e));

        // Notify athlete
        this.createNotification({
          recipientId: athlete.uid,
          recipientRole: 'athlete',
          title: `Turno de las ${time} hs cancelado (Token Reembolsado)`,
          message: `El turno del ${date} a las ${time} hs fue suspendido por ${cancelledBy}. Motivo: ${reason}. Se te reintegró 1 token (Saldo: ${athlete.tokens}).`,
          type: 'slot_cancelled',
        });
      }

      this.syncBookingToFirestore(b).catch(e => console.warn('Sync booking notice:', e));
    });

    // Notify owners
    this.createNotification({
      recipientId: 'owners',
      recipientRole: 'owner',
      title: `Horario ${time} hs cancelado`,
      message: `${cancelledBy} canceló el turno de las ${time} hs para el día ${date}. Se reembolsaron ${affectedBookings.length} reservas.`,
      type: 'slot_cancelled',
    });

    this.persistState();

    return {
      success: true,
      refundedCount: affectedBookings.length,
      message: `El turno de las ${time} hs fue cancelado exitosamente. Se reembolsó el token a ${affectedBookings.length} atleta(s).`,
    };
  }

  reopenSlotByOwner(date: string, time: string): { success: boolean; message: string } {
    const idx = this.cancelledSlots.findIndex(s => s.slotDate === date && s.slotTime === time);
    if (idx === -1) {
      return { success: false, message: 'El turno no estaba cancelado.' };
    }

    this.cancelledSlots.splice(idx, 1);
    this.persistState();

    this.createNotification({
      recipientId: 'all',
      recipientRole: 'athlete',
      title: `Turno habilitado: ${time} hs`,
      message: `El turno de las ${time} hs (${date}) ha sido reabierto para inscripciones en Gurú Box.`,
      type: 'system',
    });

    return {
      success: true,
      message: `El turno de las ${time} hs ha sido rehabilitado para reservas.`,
    };
  }

  // Admin updates tokens for an athlete
  updateTokens(athleteId: string, amount: number, reason: string): { success: boolean; newTokens: number } {
    const user = this.users.find(u => u.uid === athleteId);
    if (!user) return { success: false, newTokens: 0 };

    user.tokens = Math.max(0, user.tokens + amount);
    this.persistState();

    this.syncUserToFirestore(user).catch(err => console.warn('Firestore updateTokens notice:', err));

    this.createNotification({
      recipientId: athleteId,
      recipientRole: 'athlete',
      title: amount >= 0 ? `¡Tokens acreditados! (+${amount})` : `Ajuste de tokens (${amount})`,
      message: `${reason}. Saldo actual: ${user.tokens} tokens en Gurú Box.`,
      type: 'token_recharge',
    });

    return { success: true, newTokens: user.tokens };
  }

  // --- Booking Operations ---

  getBookingsForDate(date: string): Booking[] {
    return this.bookings.filter(b => b.slotDate === date && b.status === 'confirmed');
  }

  getBookingsForSlot(date: string, time: string): Booking[] {
    return this.bookings.filter(
      b => b.slotDate === date && b.slotTime === time && b.status === 'confirmed'
    );
  }

  getUserBookings(athleteId: string): Booking[] {
    return this.bookings
      .filter(b => b.athleteId === athleteId)
      .sort((a, b) => (b.slotDate + b.slotTime).localeCompare(a.slotDate + a.slotTime));
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
      return {
        success: false,
        error: `Este turno fue suspendido por la administración de Gurú Box (${info?.reason || 'Sin actividad'}).`,
      };
    }

    const slotBookings = this.getBookingsForSlot(slotDate, slotTime);
    const alreadyBooked = slotBookings.some(b => b.athleteId === athlete.uid);

    const check = canBookSlot({
      currentTokens: athlete.tokens,
      currentBookingsCount: slotBookings.length,
      alreadyBookedByAthlete: alreadyBooked,
      isCancelledByOwner: isCancelled,
    });

    if (!check.canBook) {
      return { success: false, error: check.reason };
    }

    const tokenResult = deductToken(athlete.tokens);
    if (!tokenResult.success) {
      return { success: false, error: 'No tienes tokens suficientes' };
    }

    athlete.tokens = tokenResult.newTokens;

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

    this.syncBookingToFirestore(newBooking).catch(err => console.warn('Firestore booking sync notice:', err));
    this.syncUserToFirestore(athlete).catch(err => console.warn('Firestore user sync notice:', err));

    const totalCount = slotBookings.length + 1;
    this.createNotification({
      recipientId: 'owners',
      recipientRole: 'owner',
      title: '¡Nueva reserva en Gurú Box!',
      message: `${athlete.displayName} reservó para ${slotDate} a las ${slotTime} hs. Cupo: ${totalCount}/8 atletas.`,
      type: 'booking',
    });

    this.createNotification({
      recipientId: athlete.uid,
      recipientRole: 'athlete',
      title: '¡Turno reservado en Gurú Box!',
      message: `Te anotaste para el ${slotDate} a las ${slotTime} hs. Te quedan ${athlete.tokens} tokens disponibles.`,
      type: 'booking',
    });

    this.sendWebPushNotification(
      'Turno Confirmado en Gurú Box',
      `Reserva para ${slotDate} a las ${slotTime} hs confirmada. ¡A entrenar fuerte!`
    );

    return { success: true, booking: newBooking };
  }

  cancelBooking(
    bookingId: string,
    referenceTime: Date = new Date()
  ): {
    success: boolean;
    refunded: boolean;
    message: string;
  } {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) {
      return { success: false, refunded: false, message: 'Reserva no encontrada.' };
    }

    if (booking.status !== 'confirmed') {
      return { success: false, refunded: false, message: 'La reserva ya fue cancelada previamente.' };
    }

    const athlete = this.users.find(u => u.uid === booking.athleteId);
    if (!athlete) {
      return { success: false, refunded: false, message: 'Atleta no encontrado.' };
    }

    const penaltyCheck = canCancelWithoutPenalty(booking.slotDate, booking.slotTime, referenceTime);
    const refundOutcome = processCancellationRefund(athlete.tokens, penaltyCheck.allowedWithoutPenalty);

    booking.status = refundOutcome.status;
    booking.cancelledAt = new Date().toISOString();
    booking.penaltyReason = penaltyCheck.penaltyReason;

    athlete.tokens = refundOutcome.newTokens;

    this.persistState();

    this.syncBookingToFirestore(booking).catch(err => console.warn('Firestore sync cancel notice:', err));
    this.syncUserToFirestore(athlete).catch(err => console.warn('Firestore sync user notice:', err));

    const outcomeMessage = refundOutcome.refunded
      ? 'Cancelación realizada con más de 1 hora de anticipación: 1 token ha sido reembolsado.'
      : 'Cancelación con menos de 1 hora de anticipación: Se aplicó penalización y el token NO es reembolsado.';

    this.createNotification({
      recipientId: athlete.uid,
      recipientRole: 'athlete',
      title: refundOutcome.refunded ? 'Reserva cancelada (Token Reembolsado)' : 'Reserva cancelada con penalización',
      message: `${outcomeMessage} Turno: ${booking.slotDate} ${booking.slotTime} hs.`,
      type: 'cancellation',
    });

    this.createNotification({
      recipientId: 'owners',
      recipientRole: 'owner',
      title: 'Cancelación de turno en Gurú Box',
      message: `${booking.athleteName} canceló su lugar en el turno de las ${booking.slotTime} hs (${booking.slotDate}).`,
      type: 'cancellation',
    });

    return {
      success: true,
      refunded: refundOutcome.refunded,
      message: outcomeMessage,
    };
  }

  toggleAttendance(bookingId: string, attended: boolean) {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (booking) {
      booking.attended = attended;
      this.persistState();
      this.syncBookingToFirestore(booking).catch(err => console.warn('Firestore attendance notice:', err));
    }
  }

  // --- WOD Operations ---

  getWOD(date: string): WOD | null {
    return this.wods[date] || null;
  }

  saveWOD(wod: WOD) {
    this.wods[wod.date] = { ...wod };
    this.persistState();

    this.createNotification({
      recipientId: 'all',
      recipientRole: 'athlete',
      title: `Nuevo WOD Gurú Box: ${wod.title}`,
      message: `El coach ${wod.coach} cargó el entrenamiento del día ${wod.date}. ¡Consultalo ya!`,
      type: 'wod',
    });

    this.sendWebPushNotification(
      `Nuevo WOD Gurú Box: ${wod.title}`,
      `Entrenamiento del día cargado por ${wod.coach}. ¡Mirá la rutina!`
    );

    this.syncWodToFirestore(wod).catch(err => console.warn('Firestore WOD notice:', err));
  }

  // --- Asignación Exclusiva de Tokens por Dueños ---
  // Los atletas no pueden comprar tokens; los dueños los asignan directamente desde su panel.

  // --- Notifications & Push ---

  getNotifications(userId: string, role: 'athlete' | 'owner'): NotificationItem[] {
    return this.notifications
      .filter(n => {
        if (role === 'owner') {
          return n.recipientId === 'owners' || n.recipientRole === 'owner' || n.recipientId === userId;
        }
        return n.recipientId === userId || n.recipientRole === 'all' || (n.recipientRole === 'athlete' && n.recipientId === 'all');
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getUnreadCount(userId: string, role: 'athlete' | 'owner'): number {
    return this.getNotifications(userId, role).filter(n => !n.read).length;
  }

  markAllNotificationsAsRead(userId: string, role: 'athlete' | 'owner') {
    const list = this.getNotifications(userId, role);
    list.forEach(n => {
      n.read = true;
    });
    this.persistState();
  }

  createNotification(item: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>): NotificationItem {
    const notification: NotificationItem = {
      ...item,
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(notification);
    this.persistState();

    this.syncNotificationToFirestore(notification).catch(err =>
      console.warn('Firestore notif notice:', err)
    );
    return notification;
  }

  async requestPushPermission(): Promise<boolean> {
    if (!this.isPushSupported) return false;
    try {
      const permission = await Notification.requestPermission();
      this.pushPermission = permission;
      return permission === 'granted';
    } catch (e) {
      console.warn('Error requesting notification permission', e);
      return false;
    }
  }

  getPushPermission(): NotificationPermission {
    return this.pushPermission;
  }

  sendWebPushNotification(title: string, body: string) {
    if (this.isPushSupported && this.pushPermission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/logo.png',
          badge: '/logo.png',
        });
      } catch (e) {
        console.warn('Push notification delivery skipped:', e);
      }
    }
  }

  // --- Firestore Sync with defensive payload sanitation ---

  private cleanObject<T extends Record<string, any>>(obj: T): Record<string, any> {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        cleaned[key] = val;
      }
    }
    return cleaned;
  }

  private async syncUserToFirestore(user: UserProfile) {
    try {
      await setDoc(doc(db, 'users', user.uid), this.cleanObject(user), { merge: true });
    } catch (error) {
      console.warn('Firestore sync user notice (offline fallback in use):', error);
    }
  }

  private async syncBookingToFirestore(booking: Booking) {
    try {
      await setDoc(doc(db, 'bookings', booking.id), this.cleanObject(booking), { merge: true });
    } catch (error) {
      console.warn('Firestore sync booking notice (offline fallback in use):', error);
    }
  }

  private async syncWodToFirestore(wod: WOD) {
    try {
      await setDoc(doc(db, 'wods', wod.date), this.cleanObject(wod), { merge: true });
    } catch (error) {
      console.warn('Firestore sync WOD notice (offline fallback in use):', error);
    }
  }

  private async syncNotificationToFirestore(notification: NotificationItem) {
    try {
      await setDoc(doc(db, 'notifications', notification.id), this.cleanObject(notification), { merge: true });
    } catch (error) {
      console.warn('Firestore sync notification notice (offline fallback in use):', error);
    }
  }
}

export const gymService = new GymService();
