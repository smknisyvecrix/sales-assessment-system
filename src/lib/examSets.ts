import { examMeta, examQuestions, type ExamQuestion } from '../data/examData';
import { supabase } from './supabase';

export interface ExamSet {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalScore: number;
  questions: ExamQuestion[];
  isActive: boolean;
  createdAt?: string;
}

export const defaultExamSet: ExamSet = {
  id: 'sales-v3',
  title: examMeta.title,
  description: '销售能力综合笔试 V3版，19 题，总分 100 分。',
  durationMinutes: examMeta.durationMinutes,
  totalScore: examMeta.totalScore,
  questions: examQuestions,
  isActive: true,
};

interface ExamSetRow {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  total_score: number;
  questions: ExamQuestion[];
  is_active: boolean;
  created_at: string;
}

const toExamSet = (row: ExamSetRow): ExamSet => ({
  id: row.id,
  title: row.title,
  description: row.description || '',
  durationMinutes: row.duration_minutes,
  totalScore: row.total_score,
  questions: row.questions,
  isActive: row.is_active,
  createdAt: row.created_at,
});

export const buildExamSections = (questions: ExamQuestion[]) =>
  Array.from(new Set(questions.map((question) => question.section)));

export const getExamDimensions = (questions: ExamQuestion[]) =>
  Array.from(new Set(questions.flatMap((question) => question.dimensions)));

export const fetchExamSets = async () => {
  const { data, error } = await supabase
    .from('exam_sets')
    .select('id, title, description, duration_minutes, total_score, questions, is_active, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return [defaultExamSet];
  }

  const cloudExams = (data as ExamSetRow[]).map(toExamSet);
  const hasDefault = cloudExams.some((exam) => exam.id === defaultExamSet.id);
  return hasDefault ? cloudExams : [defaultExamSet, ...cloudExams];
};

const isQuestion = (value: unknown): value is ExamQuestion => {
  const question = value as Partial<ExamQuestion>;
  const hasBaseFields = Boolean(
    question &&
      typeof question.id === 'string' &&
      typeof question.type === 'string' &&
      typeof question.section === 'string' &&
      typeof question.title === 'string' &&
      typeof question.prompt === 'string' &&
      typeof question.module === 'string' &&
      Array.isArray(question.dimensions) &&
      typeof question.maxScore === 'number',
  );

  if (!hasBaseFields) return false;
  if (question.type === 'path') {
    const pathQuestion = question as Partial<Extract<ExamQuestion, { type: 'path' }>>;
    return Array.isArray(pathQuestion.options) && Array.isArray(pathQuestion.correctAnswers) && Array.isArray(pathQuestion.reasonKeywords);
  }
  if (question.type === 'open') {
    const openQuestion = question as Partial<Extract<ExamQuestion, { type: 'open' }>>;
    return Array.isArray(openQuestion.scoringPoints);
  }
  return false;
};

export const normalizeUploadedExam = (payload: unknown): ExamSet => {
  const raw = payload as Partial<ExamSet> & {
    duration_minutes?: number;
    total_score?: number;
    is_active?: boolean;
  };
  const questions = raw.questions;

  if (!raw.title || !Array.isArray(questions) || !questions.every(isQuestion)) {
    throw new Error('试卷 JSON 格式不正确');
  }

  const totalScore = raw.totalScore ?? raw.total_score ?? questions.reduce((sum, question) => sum + question.maxScore, 0);

  return {
    id: raw.id || `exam-${Date.now()}`,
    title: raw.title,
    description: raw.description || '',
    durationMinutes: raw.durationMinutes ?? raw.duration_minutes ?? 60,
    totalScore,
    questions,
    isActive: raw.isActive ?? raw.is_active ?? true,
  };
};

export const uploadExamSet = async (exam: ExamSet) => {
  const { error } = await supabase.from('exam_sets').upsert({
    id: exam.id,
    title: exam.title,
    description: exam.description,
    duration_minutes: exam.durationMinutes,
    total_score: exam.totalScore,
    questions: exam.questions,
    is_active: exam.isActive,
  });

  if (error) {
    throw error;
  }
};
