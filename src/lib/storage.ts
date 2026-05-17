import type { AssessmentResult, Participant, UserAnswer } from './scoring';

const SESSION_KEY = 'sales-assessment-session-v3';
const RESULT_KEY = 'sales-assessment-latest-result-v3';

export interface ExamSession {
  participant: Participant;
  startedAt: string;
  expiresAt: number;
  answers: UserAnswer[];
  submitted?: boolean;
}

export const saveExamSession = (session: ExamSession) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const loadExamSession = (): ExamSession | null => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ExamSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const clearExamSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const saveLatestResult = (result: AssessmentResult) => {
  localStorage.setItem(RESULT_KEY, JSON.stringify(result));
};

export const loadLatestResult = (): AssessmentResult | null => {
  const raw = localStorage.getItem(RESULT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AssessmentResult;
  } catch {
    localStorage.removeItem(RESULT_KEY);
    return null;
  }
};
