import type { AssessmentResult } from './scoring';

const csvEscape = (value: unknown) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const parseAssessmentFiles = async (files: File[]) => {
  const results = await Promise.all(
    files.map(async (file) => {
      const text = await file.text();
      return JSON.parse(text) as AssessmentResult;
    }),
  );

  return results.filter((result) => result.participant && result.questionScores && result.dimensionScores);
};

export const exportResultsToCsv = (results: AssessmentResult[]) => {
  const dimensionNames = results[0] ? Object.keys(results[0].dimensionScores) : [];
  const headers = ['姓名', '部门', '提交时间', '总分', '等级', ...dimensionNames];
  const rows = results.map((result) => [
    result.participant.name,
    result.participant.department,
    new Date(result.submittedAt).toLocaleString(),
    result.totalScore,
    result.grade,
    ...dimensionNames.map((dimension) => `${result.dimensionScores[dimension as keyof typeof result.dimensionScores].percent}%`),
  ]);

  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
};

export const calculateLevelDistribution = (results: AssessmentResult[]) =>
  results.reduce(
    (acc, result) => {
      acc[result.grade] = (acc[result.grade] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

export const calculateDimensionAverage = (results: AssessmentResult[]) => {
  if (!results.length) return [] as Array<{ dimension: string; average: number }>;
  const dimensionNames = Object.keys(results[0].dimensionScores);

  return dimensionNames
    .map((dimension) => {
      const average = Math.round(
        results.reduce((sum, result) => sum + result.dimensionScores[dimension as keyof typeof result.dimensionScores].percent, 0) /
          results.length,
      );
      return { dimension, average };
    })
    .sort((left, right) => left.average - right.average);
};
