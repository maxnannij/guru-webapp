/**
 * Business rules for Gurú Box gym booking system.
 * Pure logic decoupled for testability and deterministic assertions.
 */

export const GYM_SLOT_TIMES = [
  '08:00',
  '09:30',
  '15:00',
  '16:15',
  '17:30',
  '19:00',
  '20:30',
] as const;

export type SlotTime = (typeof GYM_SLOT_TIMES)[number];

export const MAX_SLOT_CAPACITY = 8;
export const CANCELLATION_PENALTY_WINDOW_MINUTES = 60; // 1 hour rule

export interface SlotAvailability {
  date: string; // YYYY-MM-DD
  time: string;
  totalBookings: number;
  maxCapacity: number;
  availableSpots: number;
  isFull: boolean;
  isCancelledByOwner?: boolean;
}

/**
 * Checks if a slot time is one of the official gym schedule times
 */
export function isValidSlotTime(time: string): boolean {
  return (GYM_SLOT_TIMES as readonly string[]).includes(time);
}

/**
 * Calculates remaining minutes until slot start time.
 */
export function getMinutesUntilSlot(slotDate: string, slotTime: string, referenceTime: Date = new Date()): number {
  const [hours, minutes] = slotTime.split(':').map(Number);
  const [year, month, day] = slotDate.split('-').map(Number);

  const slotDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
  const diffMs = slotDateTime.getTime() - referenceTime.getTime();
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Rule: Can cancel without penalty if at least 60 minutes before slot start time.
 */
export function canCancelWithoutPenalty(
  slotDate: string,
  slotTime: string,
  referenceTime: Date = new Date()
): { allowedWithoutPenalty: boolean; minutesRemaining: number; penaltyReason?: string } {
  const minutesRemaining = getMinutesUntilSlot(slotDate, slotTime, referenceTime);

  if (minutesRemaining >= CANCELLATION_PENALTY_WINDOW_MINUTES) {
    return {
      allowedWithoutPenalty: true,
      minutesRemaining,
    };
  }

  return {
    allowedWithoutPenalty: false,
    minutesRemaining,
    penaltyReason:
      minutesRemaining < 0
        ? 'El turno ya ha comenzado o finalizado.'
        : `Faltan menos de 60 minutos (${minutesRemaining} min). Se aplicará penalización y no se reembolsará el token.`,
  };
}

/**
 * Validates if an athlete can book a slot.
 */
export function canBookSlot(params: {
  currentTokens: number;
  currentBookingsCount: number;
  maxCapacity?: number;
  alreadyBookedByAthlete: boolean;
  isPast?: boolean;
  isCancelledByOwner?: boolean;
}): { canBook: boolean; reason?: string } {
  const { currentTokens, currentBookingsCount, maxCapacity = MAX_SLOT_CAPACITY, alreadyBookedByAthlete, isPast, isCancelledByOwner } = params;

  if (isCancelledByOwner) {
    return { canBook: false, reason: 'Este horario fue cancelado por los coach de Gurú Box.' };
  }

  if (isPast) {
    return { canBook: false, reason: 'No se puede reservar un turno que ya pasó.' };
  }

  if (alreadyBookedByAthlete) {
    return { canBook: false, reason: 'Ya tienes una reserva activa en este turno.' };
  }

  if (currentBookingsCount >= maxCapacity) {
    return { canBook: false, reason: `El turno está completo (máximo ${maxCapacity} atletas).` };
  }

  if (currentTokens < 1) {
    return { canBook: false, reason: 'No tienes tokens disponibles. Recarga créditos para reservar.' };
  }

  return { canBook: true };
}

/**
 * Deducts token for a confirmed booking
 */
export function deductToken(currentTokens: number): { success: boolean; newTokens: number } {
  if (currentTokens <= 0) {
    return { success: false, newTokens: currentTokens };
  }
  return { success: true, newTokens: currentTokens - 1 };
}

/**
 * Refunds token if cancellation is within allowed time window
 */
export function processCancellationRefund(
  currentTokens: number,
  canRefund: boolean
): { refunded: boolean; newTokens: number; status: 'cancelled_refunded' | 'cancelled_penalty' } {
  if (canRefund) {
    return {
      refunded: true,
      newTokens: currentTokens + 1,
      status: 'cancelled_refunded',
    };
  }
  return {
    refunded: false,
    newTokens: currentTokens,
    status: 'cancelled_penalty',
  };
}

/**
 * Helper to format date in Argentine / Spanish standard format
 */
export function formatDateLabel(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
