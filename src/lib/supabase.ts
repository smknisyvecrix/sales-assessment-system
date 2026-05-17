import { createClient } from '@supabase/supabase-js';
import type { AssessmentResult } from './scoring';

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
    submittedAt: row.result.submittedAt || row.submitted_at,
    participant: {
      name: row.result.participant?.name || row.participant_name,
      department: row.result.participant?.department || row.department,
    },
    totalScore: row.result.totalScore ?? row.total_score,
    maxScore: row.result.maxScore ?? row.max_score,
    grade: row.result.grade ?? row.grade,
  }));
};
