import type { AnalysisResult, WorksheetSnapshot } from './types';

const STORAGE_KEY = 't1d:analyzerSession';

export interface AnalyzerSession {
  fileName: string;
  result: AnalysisResult;
  worksheet: WorksheetSnapshot | null;
  savedAt: string;
}

export function saveAnalyzerSession(session: AnalyzerSession) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function readAnalyzerSession(): AnalyzerSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AnalyzerSession;
  } catch {
    return null;
  }
}

export function clearAnalyzerSession() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
