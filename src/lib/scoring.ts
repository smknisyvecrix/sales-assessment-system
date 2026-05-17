import { dimensions, examQuestions, type Dimension, type ExamQuestion, type OpenQuestion, type PathQuestion } from '../data/examData';

export interface Participant {
  name: string;
  department: string;
}

export interface UserAnswer {
  questionId: string;
  selected?: string[];
  reason?: string;
  text?: string;
}

export interface QuestionScore {
  questionId: string;
  title: string;
  section: string;
  module: string;
  maxScore: number;
  score: number;
  needsManualReview: boolean;
  matchedPoints: string[];
  missingPoints: string[];
  feedback: string;
}

export interface ScoreBucket {
  score: number;
  maxScore: number;
  percent: number;
}

export interface AssessmentResult {
  id: string;
  submittedAt: string;
  participant: Participant;
  totalScore: number;
  maxScore: number;
  grade: 'A' | 'B+' | 'B' | 'C' | 'D';
  moduleScores: Record<string, ScoreBucket>;
  dimensionScores: Record<Dimension, ScoreBucket>;
  abilityProfile: string[];
  mainProblems: string[];
  questionScores: QuestionScore[];
  answers: UserAnswer[];
}

const normalize = (value = '') => value.trim().toLowerCase();

const includesKeyword = (text: string, keywords: string[]) => {
  const body = normalize(text);
  return keywords.some((keyword) => body.includes(normalize(keyword)));
};

const sameSelection = (actual: string[] = [], expected: string[] = []) => {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  return actualSet.size === expectedSet.size && [...expectedSet].every((item) => actualSet.has(item));
};

export const getGrade = (score: number): AssessmentResult['grade'] => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
};

const scorePathQuestion = (question: PathQuestion, answer?: UserAnswer): QuestionScore => {
  const selectedScore = sameSelection(answer?.selected, question.correctAnswers) ? 2 : 0;
  const reasonScore = includesKeyword(answer?.reason ?? '', question.reasonKeywords) ? 1 : 0;
  const score = selectedScore + reasonScore;

  return {
    questionId: question.id,
    title: question.title,
    section: question.section,
    module: question.module,
    maxScore: question.maxScore,
    score,
    needsManualReview: false,
    matchedPoints: [
      ...(selectedScore ? ['路径选择正确'] : []),
      ...(reasonScore ? ['理由命中关键点'] : []),
    ],
    missingPoints: [
      ...(!selectedScore ? ['路径选择未完全匹配标准答案'] : []),
      ...(!reasonScore ? ['理由缺少关键判断依据'] : []),
    ],
    feedback: score === question.maxScore ? '判断路径清晰，理由能支撑动作。' : '建议补充客户状态、决策链或产品边界等判断依据。',
  };
};

const scoreOpenQuestion = (question: OpenQuestion, answer?: UserAnswer): QuestionScore => {
  const text = answer?.text ?? '';
  const matchedPoints = question.scoringPoints.filter((point) => includesKeyword(text, point.keywords));
  const score = Math.min(
    question.maxScore,
    matchedPoints.reduce((sum, point) => sum + point.score, 0),
  );
  const missingPoints = question.scoringPoints
    .filter((point) => !matchedPoints.includes(point))
    .map((point) => point.label);

  return {
    questionId: question.id,
    title: question.title,
    section: question.section,
    module: question.module,
    maxScore: question.maxScore,
    score,
    needsManualReview: true,
    matchedPoints: matchedPoints.map((point) => point.label),
    missingPoints,
    feedback: missingPoints.length
      ? `已命中 ${matchedPoints.length} 个评分点，建议人工复核表达质量和完整性。`
      : '关键词评分点完整，仍建议人工复核答案质量。',
  };
};

const scoreQuestion = (question: ExamQuestion, answer?: UserAnswer) => {
  if (question.type === 'path') {
    return scorePathQuestion(question, answer);
  }
  return scoreOpenQuestion(question, answer);
};

const emptyDimensionScores = () =>
  dimensions.reduce(
    (acc, dimension) => ({
      ...acc,
      [dimension]: { score: 0, maxScore: 0, percent: 0 },
    }),
    {} as Record<Dimension, ScoreBucket>,
  );

const toPercent = (score: number, maxScore: number) => (maxScore > 0 ? Math.round((score / maxScore) * 100) : 0);

export const calculateScore = (participant: Participant, answers: UserAnswer[]): AssessmentResult => {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));
  const questionScores = examQuestions.map((question) => scoreQuestion(question, answerMap.get(question.id)));
  const totalScore = questionScores.reduce((sum, item) => sum + item.score, 0);
  const maxScore = examQuestions.reduce((sum, question) => sum + question.maxScore, 0);

  const moduleScores: Record<string, ScoreBucket> = {};
  const dimensionScores = emptyDimensionScores();

  examQuestions.forEach((question) => {
    const scored = questionScores.find((item) => item.questionId === question.id);
    if (!scored) return;

    moduleScores[question.module] ??= { score: 0, maxScore: 0, percent: 0 };
    moduleScores[question.module].score += scored.score;
    moduleScores[question.module].maxScore += question.maxScore;

    question.dimensions.forEach((dimension) => {
      dimensionScores[dimension].score += scored.score;
      dimensionScores[dimension].maxScore += question.maxScore;
    });
  });

  Object.values(moduleScores).forEach((bucket) => {
    bucket.percent = toPercent(bucket.score, bucket.maxScore);
  });

  Object.values(dimensionScores).forEach((bucket) => {
    bucket.percent = toPercent(bucket.score, bucket.maxScore);
  });

  const sortedDimensions = [...dimensions].sort((a, b) => dimensionScores[b].percent - dimensionScores[a].percent);
  const weakDimensions = sortedDimensions.filter((dimension) => dimensionScores[dimension].percent < 70);

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    submittedAt: new Date().toISOString(),
    participant,
    totalScore,
    maxScore,
    grade: getGrade(totalScore),
    moduleScores,
    dimensionScores,
    abilityProfile: sortedDimensions.map(
      (dimension) => `${dimension}：${dimensionScores[dimension].percent}%`,
    ),
    mainProblems: weakDimensions.length
      ? weakDimensions.map((dimension) => `${dimension}低于 70%，需要优先训练。`)
      : ['未发现明显低分能力维度，建议加强高客单场景下的稳定输出。'],
    questionScores,
    answers,
  };
};
