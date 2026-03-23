export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function cleanText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function uniqueId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeFolderSegment(segment: string): string {
  return cleanText(segment).replace(/[\\/]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function serializePath(segments: string[]): string {
  return segments.join(' / ');
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function normalizeUrlForMatch(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';

    if (parsed.pathname.endsWith('/') && parsed.pathname !== '/') {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

export function maskSecret(value: string): string {
  if (!value) {
    return '';
  }

  if (value.length <= 8) {
    return '•'.repeat(value.length);
  }

  return `${value.slice(0, 4)}${'•'.repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`;
}
