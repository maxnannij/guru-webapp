export type UserRole = 'athlete' | 'owner';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  tokens: number;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  hideRulesPopup?: boolean;
}

export type BookingStatus = 'confirmed' | 'cancelled_refunded' | 'cancelled_penalty' | 'cancelled_by_owner';

export interface Booking {
  id: string;
  slotDate: string; // YYYY-MM-DD
  slotTime: string; // HH:mm (e.g. "19:00")
  athleteId: string;
  athleteName: string;
  athleteEmail: string;
  status: BookingStatus;
  attended?: boolean;
  bookedAt: string;
  cancelledAt?: string;
  penaltyReason?: string;
}

export interface SpecialSlotLabel {
  id: string;
  slotDate: string;
  slotTime: string;
  title: string;
  updatedBy: string;
  updatedAt: string;
}

export interface CancelledSlot {
  id: string; // e.g. "2026-11-06_15:00"
  slotDate: string; // YYYY-MM-DD
  slotTime: string; // e.g. "15:00"
  reason: string;
  cancelledBy: string; // "Melina" or "Alexis"
  cancelledAt: string;
}

export interface WOD {
  date: string; // YYYY-MM-DD
  title: string;
  warmUp: string;
  strength: string;
  conditioning: string;
  scaling?: string;
  notes?: string;
  coach: string;
  createdAt: string;
}

export type NotificationType = 'booking' | 'cancellation' | 'token_recharge' | 'wod' | 'system' | 'slot_cancelled';

export interface NotificationItem {
  id: string;
  recipientId: string; // athlete uid or "owners" or "all"
  recipientRole?: 'all' | 'owner' | 'athlete';
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface TokenTransaction {
  id: string;
  athleteId: string;
  athleteName: string;
  amount: number; // positive for addition, negative for deduction
  type: 'admin_grant' | 'booking_spent' | 'booking_refund';
  reference?: string;
  createdAt: string;
}
