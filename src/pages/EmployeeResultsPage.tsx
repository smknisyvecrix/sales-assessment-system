import { useMemo, useState } from 'react';
import { buildTrainingPlan } from '../lib/trainingPlan';
import { fetchEmployeeAiAnalysisRecords, fetchEmployeeResults, type AiAnalysisRecord } from '../lib/supabase';
import type { AssessmentResult } from '../lib/scoring';
import { stringifyAiValue, toAiTextList, toAiTrainingPlan } from '../lib/aiDisplay';

export default function EmployeeResultsPage() {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [aiRecords, setAiRecords] = useState<Record<string, AiAnalysisRecord>>({});
  const [selectedResultId, setSelectedResultId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedResult = useMemo(
    () => results.find((result) => result.id === selectedResultId) ?? results[0],
    [results, selectedResultId],
  );
  const selectedAi = selectedResult ? aiRecords[selectedResult.id] : undefined;

  const searchResults = async () => {
    if (!name.trim() || !department.trim()) {
      setError('请输入姓名和部门。');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const employeeResults = await fetchEmployeeResults(name, department);
      const records = await fetchEmployeeAiAnalysisRecords(employeeResults.map((result) => result.id));
      setResults(employeeResults);
      setAiRecords(Object.fromEntries(records.map((record) => [record.result_id, record])));
      setSelectedResultId(employeeResults[0]?.id ?? '');
      if (!employeeResults.length) {
        setError('没有查询到匹配的考试记录，请确认姓名和部门与考试时填写一致。');
      }
    } catch {
      setError('查询失败，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel">
        <h2 className="text-2xl font-bold">我的考试与分析</h2>
        <p className="mt-2 text-sm text-muted">输入考试时填写的姓名和部门，可查看自己的历史考试结果和已生成的 AI 分析。</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="block text-sm font-medium text-ink">
            姓名
            <input className="field mt-1" value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入姓名" />
          </label>
          <label className="block text-sm font-medium text-ink">
            部门
            <input className="field mt-1" value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="请输入部门" />
          </label>
          <button className="btn-primary self-end" disabled={isLoading} onClick={searchResults}>
            {isLoading ? '查询中' : '查询我的结果'}
          </button>
        </div>
        {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>

      {results.length > 0 && (
        <section className="panel">
          <h3 className="text-lg font-bold">历史考试</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-[320px_1fr]">
            <label className="block text-sm font-medium text-ink">
              选择记录
              <select className="field mt-1" value={selectedResult?.id ?? ''} onChange={(event) => setSelectedResultId(event.target.value)}>
                {results.map((result) => (
                  <option key={result.id} value={result.id}>
                    {new Date(result.submittedAt).toLocaleString()} · {result.examTitle}
                  </option>
                ))}
              </select>
            </label>
            {selectedResult && (
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-md border border-line bg-paper p-3">
                  <div className="text-xs text-muted">考试</div>
                  <div className="mt-1 text-sm font-semibold">{selectedResult.examTitle}</div>
                </div>
                <div className="rounded-md border border-line bg-paper p-3">
                  <div className="text-xs text-muted">总分</div>
                  <div className="mt-1 text-xl font-bold text-focus">{selectedResult.totalScore}/{selectedResult.maxScore}</div>
                </div>
                <div className="rounded-md border border-line bg-paper p-3">
                  <div className="text-xs text-muted">等级</div>
                  <div className="mt-1 text-xl font-bold text-focus">{selectedResult.grade}</div>
                </div>
                <div className="rounded-md border border-line bg-paper p-3">
                  <div className="text-xs text-muted">AI分析</div>
                  <div className="mt-1 text-sm font-semibold">{selectedAi ? '已生成' : '暂未生成'}</div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {selectedResult && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="panel">
            <h3 className="text-lg font-bold">能力维度</h3>
            <div className="mt-4 space-y-3">
              {Object.entries(selectedResult.dimensionScores).map(([dimension, score]) => (
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

          <div className="panel">
            <h3 className="text-lg font-bold">系统训练建议</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
              {buildTrainingPlan(selectedResult).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </section>
      )}

      {selectedAi && (
        <section className="panel">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-bold">AI分析结果</h3>
            <span className="tag">AI分析 · {selectedAi.updated_at ? new Date(selectedAi.updated_at).toLocaleString() : '已生成'}</span>
          </div>
          {stringifyAiValue(selectedAi.analysis.summary) && <p className="mt-3 text-sm leading-6 text-muted">{stringifyAiValue(selectedAi.analysis.summary)}</p>}
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <h4 className="font-semibold">AI识别优势</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                {toAiTextList(selectedAi.analysis.strengths).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">AI识别短板</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                {toAiTextList(selectedAi.analysis.weaknesses).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
          <div className="mt-5">
            <h4 className="font-semibold">AI训练计划</h4>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {toAiTrainingPlan(selectedAi.analysis.trainingPlan).map((item, index) => (
                <div key={`${item.action}-${index}`} className="rounded-md border border-line bg-paper p-3 text-sm">
                  <div className="font-semibold">{item.action || `训练动作 ${index + 1}`}</div>
                  <p className="mt-1 text-muted">{item.practice}</p>
                  <p className="mt-2 text-xs text-muted">达标标准：{item.successCriteria || '由管理者复核确认'}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
