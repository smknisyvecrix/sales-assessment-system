import { buildTrainingPlan } from './trainingPlan';
import type { AssessmentResult } from './scoring';

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export const safeFilename = (value: string) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'sales-assessment';

export const downloadText = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const resultToJson = (result: AssessmentResult) => JSON.stringify(result, null, 2);

export const resultToMarkdown = (result: AssessmentResult) => {
  const trainingPlan = buildTrainingPlan(result);
  const moduleRows = Object.entries(result.moduleScores)
    .map(([module, score]) => `| ${module} | ${score.score}/${score.maxScore} | ${score.percent}% |`)
    .join('\n');
  const dimensionRows = Object.entries(result.dimensionScores)
    .map(([dimension, score]) => `| ${dimension} | ${score.score}/${score.maxScore} | ${score.percent}% |`)
    .join('\n');
  const questionRows = result.questionScores
    .map(
      (item) =>
        `| ${item.questionId} | ${item.title} | ${item.score}/${item.maxScore} | ${item.needsManualReview ? '是' : '否'} | ${item.feedback} |`,
    )
    .join('\n');

  return `# 销售能力测评报告

- 姓名：${result.participant.name}
- 部门：${result.participant.department}
- 考试：${result.examTitle ?? '销售能力综合笔试 V3版'}
- 提交时间：${new Date(result.submittedAt).toLocaleString()}
- 总分：${result.totalScore}/${result.maxScore}
- 等级：${result.grade}

## 模块得分

| 模块 | 得分 | 得分率 |
| --- | --- | --- |
${moduleRows}

## 能力画像

| 能力维度 | 得分 | 得分率 |
| --- | --- | --- |
${dimensionRows}

## 主要问题

${result.mainProblems.map((item) => `- ${item}`).join('\n')}

## 训练建议

${trainingPlan.map((item) => `- ${item}`).join('\n')}

## 逐题评分

| 题号 | 题目 | 得分 | 需人工复核 | 反馈 |
| --- | --- | --- | --- | --- |
${questionRows}
`;
};

export const resultToHtml = (result: AssessmentResult) => {
  const trainingPlan = buildTrainingPlan(result);
  const rows = result.questionScores
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.questionId)}</td>
        <td>${escapeHtml(item.title)}</td>
        <td>${item.score}/${item.maxScore}</td>
        <td>${item.needsManualReview ? '是' : '否'}</td>
        <td>${escapeHtml(item.feedback)}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(result.participant.name)} - 销售能力测评报告</title>
  <style>
    body { font-family: Arial, "Microsoft YaHei", sans-serif; color: #172026; line-height: 1.6; margin: 32px; }
    h1, h2 { color: #12343b; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0 24px; }
    th, td { border: 1px solid #d8dee4; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f2f5f7; }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 12px; }
    .box { border: 1px solid #d8dee4; padding: 12px; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>销售能力测评报告</h1>
  <div class="summary">
    <div class="box"><strong>姓名</strong><br />${escapeHtml(result.participant.name)}</div>
    <div class="box"><strong>部门</strong><br />${escapeHtml(result.participant.department)}</div>
    <div class="box"><strong>考试</strong><br />${escapeHtml(result.examTitle ?? '销售能力综合笔试 V3版')}</div>
    <div class="box"><strong>总分</strong><br />${result.totalScore}/${result.maxScore}</div>
    <div class="box"><strong>等级</strong><br />${result.grade}</div>
  </div>
  <h2>能力画像</h2>
  <ul>${result.abilityProfile.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
  <h2>主要问题</h2>
  <ul>${result.mainProblems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
  <h2>训练建议</h2>
  <ul>${trainingPlan.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
  <h2>逐题评分</h2>
  <table>
    <thead><tr><th>题号</th><th>题目</th><th>得分</th><th>需人工复核</th><th>反馈</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
};

export const downloadResult = (result: AssessmentResult, format: 'json' | 'markdown' | 'html') => {
  const baseName = `${safeFilename(result.examTitle ?? '销售测评')}-${safeFilename(result.participant.department)}-${safeFilename(result.participant.name)}`;
  if (format === 'json') {
    downloadText(`${baseName}.json`, resultToJson(result), 'application/json');
  }
  if (format === 'markdown') {
    downloadText(`${baseName}.md`, resultToMarkdown(result), 'text/markdown');
  }
  if (format === 'html') {
    downloadText(`${baseName}.html`, resultToHtml(result), 'text/html');
  }
};
