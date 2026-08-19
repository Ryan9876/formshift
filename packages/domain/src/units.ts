import type { Millimeters } from './types.js';

const MM_PER_INCH = 25.4;
const MM_PER_FOOT = 304.8;

export function inchesToMm(inches: number): Millimeters {
  requireFinite(inches, 'inches');
  return inches * MM_PER_INCH;
}

export function feetToMm(feet: number): Millimeters {
  requireFinite(feet, 'feet');
  return feet * MM_PER_FOOT;
}

export function feetAndInchesToMm(feet: number, inches: number): Millimeters {
  return feetToMm(feet) + inchesToMm(inches);
}

export function mmToInches(mm: Millimeters): number {
  requireFinite(mm, 'millimeters');
  return mm / MM_PER_INCH;
}

export function mmToMeters(mm: Millimeters): number {
  requireFinite(mm, 'millimeters');
  return mm / 1000;
}

export function roundMm(mm: Millimeters, precision = 0.1): Millimeters {
  requireFinite(mm, 'millimeters');
  requireFinite(precision, 'precision');
  if (precision <= 0) throw new RangeError('precision must be greater than zero');
  return Math.round(mm / precision) * precision;
}

function requireFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
}
