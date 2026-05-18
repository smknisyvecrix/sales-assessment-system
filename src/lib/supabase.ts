import { createClient } from '@supabase/supabase-js';
import type { AssessmentResult } from './scoring';
import type { EmployeeAnalysis } from './employeeAnalysis';
import type { ExamSet } from './examSets';

const supabaseUrl = 'https://vprgpxjsjosvreoiysor.supabase.co';
const supabasePublishableKey = 'sb_publishable_YO6Kk7994LxE1zd25b9Q-w_6Ib56MOI';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

interface AssessmentResultRow {
  id: string;
  participant_name: string;
  department: string;
  total_score: number;
  max_score: number;
  grade: string;
  submitted_at: string;
  result: AssessmentResult;
}

export interface AiAnalysisRecord {
  result_id: string;
  participant_name: string;
  department: string;
  exam_id: string;
  exam_title: string;
  analysis: {
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    rootCauses?: string[];
    trainingPlan?: Array<{
      action?: string;
      practice?: string;
      successCriteria?: string;
    }>;
    rescoring?: {
      totalScore?: number;
      maxScore?: number;
      grade?: string;
      summary?: string;
      questionScores?: Array<{
        questionId?: string;
        title?: string;
        originalScore?: number;
        aiScore?: number;
        maxScore?: number;
        reason?: string;
        evidence?: string;
        manualReviewSuggestion?: string;
      }>;
    };
    managerCoachingNotes?: string[];
    [key: string]: unknown;
  };
  targeted_exam?: ExamSet | null;
  updated_at?: string;
}

export const saveResultToCloud = async (result: AssessmentResult) => {
  const { error } = await supabase.from('assessment_results').insert({
    participant_name: result.participant.name,
    department: result.participant.department,
    total_score: result.totalScore,
    max_score: result.maxScore,
    grade: result.grade,
    submitted_at: result.submittedAt,
    result,
  });

  if (error) {
    throw error;
  }
};

export const fetchCloudResults = async () => {
  const { data, error } = await supabase
    .from('assessment_results')
    .select('id, participant_name, department, total_score, max_score, grade, submitted_at, result')
    .order('submitted_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as AssessmentResultRow[]).map((row) => ({
    ...row.result,
    id: row.result.id || row.id,
    examId: row.result.examId || 'sales-v3',
    examTitle: row.result.examTitle || '销售能力综合笔试 V3版',
    submittedAt: row.result.submittedAt || row.submitted_at,
    participant: {
      name: row.result.participant?.name || row.participant_name,
      department: row.result.participant?.department || row.department,
    },
    totalScore: row.result.totalScore ?? row.total_score,
    maxScore: row.result.maxScore ?? row.max_score,
    grade: row.result.grade ?? (row.grade as AssessmentResult['grade']),
  }));
};

export const fetchAiAnalysisRecords = async () => {
  const { data, error } = await supabase
    .from('ai_analysis_results')
    .select('result_id, participant_name, department, exam_id, exam_title, analysis, targeted_exam, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data as AiAnalysisRecord[];
};

export const fetchEmployeeResults = async (name: string, department: string) => {
  const { data, error } = await supabase
    .from('assessment_results')
    .select('id, participant_name, department, total_score, max_score, grade, submitted_at, result')
    .eq('participant_name', name.trim())
    .eq('department', department.trim())
    .order('submitted_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as AssessmentResultRow[]).map((row) => ({
    ...row.result,
    id: row.result.id || row.id,
    examId: row.result.examId || 'sales-v3',
    examTitle: row.result.examTitle || '销售能力综合笔试 V3版',
    submittedAt: row.result.submittedAt || row.submitted_at,
    participant: {
      name: row.result.participant?.name || row.participant_name,
      department: row.result.participant?.department || row.department,
    },
    totalScore: row.result.totalScore ?? row.total_score,
    maxScore: row.result.maxScore ?? row.max_score,
    grade: row.result.grade ?? (row.grade as AssessmentResult['grade']),
  }));
};

export const fetchEmployeeAiAnalysisRecords = async (resultIds: string[]) => {
  if (!resultIds.length) return [] as AiAnalysisRecord[];

  const { data, error } = await supabase
    .from('ai_analysis_results')
    .select('result_id, participant_name, department, exam_id, exam_title, analysis, targeted_exam, updated_at')
    .in('result_id', resultIds);

  if (error) {
    throw error;
  }

  return data as AiAnalysisRecord[];
};

export const invokeAiAnalysis = async (result: AssessmentResult, localAnalysis: EmployeeAnalysis) => {
  const { data, error } = await supabase.functions.invoke('ai-analysis', {
    body: {
      result,
      localAnalysis,
    },
  });

  if (error) {
    throw error;
  }

  return data as {
    analysis: AiAnalysisRecord['analysis'];
    targetedExam?: ExamSet;
    targeted_exam?: ExamSet;
  };
};

export const saveAiAnalysisRecord = async (
  result: AssessmentResult,
  aiData: {
    analysis: AiAnalysisRecord['analysis'];
    targetedExam?: ExamSet;
    targeted_exam?: ExamSet;
  },
) => {
  const targetedExam = aiData.targetedExam ?? aiData.targeted_exam ?? null;
  const { error } = await supabase.from('ai_analysis_results').upsert({
    result_id: result.id,
    participant_name: result.participant.name,
    department: result.participant.department,
    exam_id: result.examId ?? 'sales-v3',
    exam_title: result.examTitle ?? '销售能力综合笔试 V3版',
    analysis: aiData.analysis,
    targeted_exam: targetedExam,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
};
