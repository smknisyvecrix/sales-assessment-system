import type { AssessmentResult, QuestionScore } from './scoring';
import { buildTrainingPlan } from './trainingPlan';
import { defaultExamSet, type ExamSet } from './examSets';
import type { ExamQuestion } from '../data/examData';

export interface EmployeeAnalysis {
  weakDimensions: Array<{ dimension: string; percent: number; score: number; maxScore: number }>;
  strengths: Array<{ dimension: string; percent: number }>;
  keyFindings: string[];
  trainingPlan: string[];
  lowScoreQuestions: QuestionScore[];
}

const scoreRate = (question: QuestionScore) => question.score / Math.max(question.maxScore, 1);

const sanitizeIdPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'employee';

export const buildEmployeeAnalysis = (result: AssessmentResult): EmployeeAnalysis => {
  const dimensions = Object.entries(result.dimensionScores)
    .map(([dimension, bucket]) => ({
      dimension,
      percent: bucket.percent,
      score: bucket.score,
      maxScore: bucket.maxScore,
    }))
    .sort((left, right) => left.percent - right.percent);

  const weakDimensions = dimensions.filter((item) => item.percent < 75).slice(0, 3);
  const strengths = [...dimensions].sort((left, right) => right.percent - left.percent).slice(0, 2);
  const lowScoreQuestions = result.questionScores
    .filter((question) => scoreRate(question) < 0.7)
    .sort((left, right) => scoreRate(left) - scoreRate(right))
    .slice(0, 8);

  const keyFindings = [
    weakDimensions.length
      ? `优先补强：${weakDimensions.map((item) => `${item.dimension}${item.percent}%`).join('、')}。`
      : '能力维度没有明显短板，建议进入更高难度场景训练。',
    lowScoreQuestions.length
      ? `低分题集中在：${lowScoreQuestions.slice(0, 3).map((item) => item.title).join('、')}。`
      : '逐题得分较稳定，后续训练重点应放在表达完整度和复杂案例迁移。',
    result.questionScores.some((question) => question.needsManualReview)
      ? '开放题已自动标记人工复核，建议管理者结合答案原文确认表达质量。'
      : '客观题判断稳定，可增加开放式场景题检验真实应用能力。',
  ];

  return {
    weakDimensions,
    strengths,
    keyFindings,
    trainingPlan: buildTrainingPlan(result),
    lowScoreQuestions,
  };
};

const cloneTargetQuestion = (question: ExamQuestion, index: number): ExamQuestion => ({
  ...question,
  id: `T${index + 1}`,
  title: `针对训练：${question.title}`,
  prompt: `${question.prompt}\n\n请结合训练计划，写出你的判断依据和下一步动作。`,
});

export const buildTargetedExamForResult = (result: AssessmentResult, examSets: ExamSet[]): ExamSet => {
  const analysis = buildEmployeeAnalysis(result);
  const weakDimensionNames = analysis.weakDimensions.map((item) => item.dimension);
  const sourceExam = examSets.find((exam) => exam.id === result.examId) ?? defaultExamSet;
  const allQuestions = [...sourceExam.questions, ...defaultExamSet.questions];
  const selected = new Map<string, ExamQuestion>();

  allQuestions
    .filter((question) => question.dimensions.some((dimension) => weakDimensionNames.includes(dimension)))
    .forEach((question) => selected.set(`${question.section}-${question.title}`, question));

  if (selected.size < 6) {
    allQuestions.forEach((question) => {
      if (selected.size < 8) {
        selected.set(`${question.section}-${question.title}`, question);
      }
    });
  }

  const questions = [...selected.values()].slice(0, 10).map(cloneTargetQuestion);
  const totalScore = questions.reduce((sum, question) => sum + question.maxScore, 0);
  const employee = `${result.participant.department}-${result.participant.name}`;

  return {
    id: `target-${sanitizeIdPart(result.participant.name)}-${Date.now()}`,
    title: `针对性补考 - ${employee}`,
    description: `基于 ${result.examTitle ?? '销售能力测评'} 的个人短板生成。重点训练：${
      weakDimensionNames.length ? weakDimensionNames.join('、') : '综合销售场景'
    }。`,
    durationMinutes: Math.max(30, Math.min(60, questions.length * 6)),
    totalScore,
    questions,
    isActive: true,
  };
};
