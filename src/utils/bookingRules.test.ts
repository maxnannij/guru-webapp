import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GYM_SLOT_TIMES,
  MAX_SLOT_CAPACITY,
  canCancelWithoutPenalty,
  canBookSlot,
  deductToken,
  processCancellationRefund,
  isValidSlotTime,
} from './bookingRules';

test('schedule contains exact 7 requested gym shifts', () => {
  assert.equal(GYM_SLOT_TIMES.length, 7);
  assert.deepEqual([...GYM_SLOT_TIMES], [
    '08:00',
    '09:30',
    '15:00',
    '16:15',
    '17:30',
    '19:00',
    '20:30',
  ]);
  assert.equal(isValidSlotTime('08:00'), true);
  assert.equal(isValidSlotTime('16:15'), true);
  assert.equal(isValidSlotTime('12:00'), false);
});

test('slot capacity limit is strictly 8 athletes', () => {
  assert.equal(MAX_SLOT_CAPACITY, 8);

  // 7 bookings: can still book
  const res1 = canBookSlot({
    currentTokens: 3,
    currentBookingsCount: 7,
    alreadyBookedByAthlete: false,
  });
  assert.equal(res1.canBook, true);

  // 8 bookings: slot full, cannot book
  const res2 = canBookSlot({
    currentTokens: 3,
    currentBookingsCount: 8,
    alreadyBookedByAthlete: false,
  });
  assert.equal(res2.canBook, false);
  assert.match(res2.reason || '', /completo/i);
});

test('cannot book if slot was cancelled by owners (Melina or Alexis)', () => {
  const res = canBookSlot({
    currentTokens: 5,
    currentBookingsCount: 2,
    alreadyBookedByAthlete: false,
    isCancelledByOwner: true,
  });
  assert.equal(res.canBook, false);
  assert.match(res.reason || '', /cancelado por los dueños/i);
});

test('booking checks token availability and duplicate prevention', () => {
  // Athlete with 0 tokens cannot book
  const resZero = canBookSlot({
    currentTokens: 0,
    currentBookingsCount: 3,
    alreadyBookedByAthlete: false,
  });
  assert.equal(resZero.canBook, false);
  assert.match(resZero.reason || '', /tokens/i);

  // Athlete already booked cannot double-book
  const resDuplicate = canBookSlot({
    currentTokens: 5,
    currentBookingsCount: 3,
    alreadyBookedByAthlete: true,
  });
  assert.equal(resDuplicate.canBook, false);
  assert.match(resDuplicate.reason || '', /reserva activa/i);
});

test('token deduction subtracts exactly 1 token', () => {
  assert.deepEqual(deductToken(3), { success: true, newTokens: 2 });
  assert.deepEqual(deductToken(1), { success: true, newTokens: 0 });
  assert.deepEqual(deductToken(0), { success: false, newTokens: 0 });
});

test('cancellation at least 60 minutes before allows penalty-free cancellation and token refund', () => {
  const slotDate = '2026-11-10';
  const slotTime = '19:00';
  const refTime90MinBefore = new Date(2026, 10, 10, 17, 30, 0);

  const check = canCancelWithoutPenalty(slotDate, slotTime, refTime90MinBefore);
  assert.equal(check.allowedWithoutPenalty, true);
  assert.equal(check.minutesRemaining, 90);

  const refundResult = processCancellationRefund(2, check.allowedWithoutPenalty);
  assert.equal(refundResult.refunded, true);
  assert.equal(refundResult.newTokens, 3);
  assert.equal(refundResult.status, 'cancelled_refunded');
});

test('cancellation less than 60 minutes before penalizes athlete and does not refund token', () => {
  const slotDate = '2026-11-10';
  const slotTime = '19:00';
  const refTime40MinBefore = new Date(2026, 10, 10, 18, 20, 0);

  const check = canCancelWithoutPenalty(slotDate, slotTime, refTime40MinBefore);
  assert.equal(check.allowedWithoutPenalty, false);
  assert.equal(check.minutesRemaining, 40);
  assert.match(check.penaltyReason || '', /penalización/i);

  const refundResult = processCancellationRefund(2, check.allowedWithoutPenalty);
  assert.equal(refundResult.refunded, false);
  assert.equal(refundResult.newTokens, 2);
  assert.equal(refundResult.status, 'cancelled_penalty');
});
