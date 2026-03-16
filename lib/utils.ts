import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================
// Observability Utilities for Booking System
// ============================================

/**
 * Extract or generate a correlation ID from the request
 */
export function getCorrelationId(req: Request, fallback?: string): string {
  return (
    req.headers.get("x-correlation-id") ||
    req.headers.get("x-request-id") ||
    req.headers.get("x-idempotency-key") ||
    fallback ||
    crypto.randomUUID()
  )
}

/**
 * Structured logging utility
 */
export function logEvent(
  event: string,
  data: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info"
): void {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    event,
    ...data,
  }

  if (level === "error") {
    console.error(JSON.stringify(logEntry))
  } else if (level === "warn") {
    console.warn(JSON.stringify(logEntry))
  } else {
    console.log(JSON.stringify(logEntry))
  }
}

/**
 * Normalizes any date/time input to a strict SAST (UTC+02:00) ISO string.
 * Prevents Cloudflare Edge UTC-zero drift.
 */
export function createSASTTimestamp(date: string, time: string): string {
  const cleanTime = time.length === 5 ? `${time}:00` : time;
  return `${date}T${cleanTime}+02:00`;
}

/**
 * Adds hours to a SAST timestamp and returns a new SAST-formatted string (+02:00).
 */
export function addHoursToSAST(sastStr: string, hours: number): string {
  const d = new Date(sastStr);
  const endD = new Date(d.getTime() + (hours * 60 * 60 * 1000));
  // Standardize the output format for database consistency
  return new Date(endD.getTime() + (2 * 60 * 60 * 1000)).toISOString().slice(0, 19) + "+02:00";
}

/**
 * Validate required environment variables
 * Returns missing var names or null if all present
 */
export function validateEnvVars(
  vars: string[]
): { missing: string[] } | null {
  const missing = vars.filter((v) => !process.env[v])
  return missing.length > 0 ? { missing } : null
}
