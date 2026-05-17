import type { Navigate } from '../App';
import { buildTrainingPlan } from '../lib/trainingPlan';
import { downloadResult } from '../lib/export';
import { loadLatestResult } from '../lib/storage';

interface ResultPageProps {
  navigate: Navigate;
}

export default function ResultPage({ navigate }: ResultPageProps) {
  const result = loadLatestResult();

  if (!result) {
    return (
      <section className="panel">
        <h2 className="text-xl font-bold">暂无测评结果</h2>
        <p className="mt-2 text-sm text-muted">请先完成一次考试。</p>
        <button className="btn-primary mt-5" onClick={() => navigate('/')}>返回员工入口</button>
      </section>
    );
  }

  const trainingPlan = buildTrainingPlan(result);

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="tag">提交时间：{new Date(result.submittedAt).toLocaleString()}</p>
            <h2 className="mt-3 text-2xl font-bold">{result.participant.name} 的测评报告</h2>
            <p className="mt-1 text-sm text-muted">{result.participant.department} · {result.examTitle ?? '销售能力综合笔试 V3版'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-line bg-paper p-4 text-center">
              <div className="text-2xl font-bold text-focus">{result.totalScore}</div>
              <div className="text-xs text-muted">总分</div>
            </div>
            <div className="rounded-md border border-line bg-paper p-4 text-center">
              <div className="text-2xl font-bold text-focus">{result.grade}</div>
              <div className="text-xs text-muted">等级</div>
            </div>
            <button className="btn-secondary" onClick={() => downloadResult(result, 'json')}>导出 JSON</button>
            <button className="btn-secondary" onClick={() => downloadResult(result, 'markdown')}>导出 Markdown</button>
            <button className="btn-secondary" onClick={() => downloadResult(result, 'html')}>导出 HTML</button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel">
          <h3 className="text-lg font-bold">模块得分</h3>
          <div className="mt-4 space-y-3">
            {Object.entries(result.moduleScores).map(([module, score]) => (
              <div key={module}>
                <div className="flex justify-between text-sm">
                  <span>{module}</span>
                  <span>{score.score}/{score.maxScore}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-paper">
                  <div className="h-2 rounded-full bg-focus" style={{ width: `${score.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3 className="text-lg font-bold">能力画像</h3>
          <div className="mt-4 space-y-3">
            {Object.entries(result.dimensionScores).map(([dimension, score]) => (
              <div key={dimension}>
                <div className="flex justify-between text-sm">
                  <span>{dimension}</span>
                  <span>{score.percent}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-paper">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${score.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel">
          <h3 className="text-lg font-bold">主要问题</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
            {result.mainProblems.map((problem) => <li key={problem}>{problem}</li>)}
          </ul>
        </div>
        <div className="panel">
          <h3 className="text-lg font-bold">训练建议</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
            {trainingPlan.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>

      <section className="panel overflow-x-auto">
        <h3 className="text-lg font-bold">逐题评分</h3>
        <table className="mt-4 w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="bg-paper text-left">
              <th className="border border-line p-2">题号</th>
              <th className="border border-line p-2">题目</th>
              <th className="border border-line p-2">得分</th>
              <th className="border border-line p-2">需人工复核</th>
              <th className="border border-line p-2">命中点</th>
              <th className="border border-line p-2">反馈</th>
            </tr>
          </thead>
          <tbody>
            {result.questionScores.map((item) => (
              <tr key={item.questionId}>
                <td className="border border-line p-2">{item.questionId}</td>
                <td className="border border-line p-2">{item.title}</td>
                <td className="border border-line p-2">{item.score}/{item.maxScore}</td>
                <td className="border border-line p-2">{item.needsManualReview ? '是' : '否'}</td>
                <td className="border border-line p-2">{item.matchedPoints.join('、') || '无'}</td>
                <td className="border border-line p-2">{item.feedback}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
