import { useMemo, useState } from 'react';
import { calculateDimensionAverage, calculateLevelDistribution, exportResultsToCsv, parseAssessmentFiles } from '../lib/csv';
import { downloadText } from '../lib/export';
import type { AssessmentResult } from '../lib/scoring';

export default function AdminImportPage() {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [error, setError] = useState('');

  const dimensionAverage = useMemo(() => calculateDimensionAverage(results), [results]);
  const levelDistribution = useMemo(() => calculateLevelDistribution(results), [results]);
  const weakestDimension = dimensionAverage[0];

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');

    try {
      const imported = await parseAssessmentFiles([...files]);
      setResults((current) => [...current, ...imported]);
    } catch {
      setError('导入失败：请确认选择的是员工导出的 JSON 文件。');
    }
  };

  const exportCsv = () => {
    downloadText('销售测评成绩汇总.csv', exportResultsToCsv(results), 'text/csv');
  };

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">管理端成绩导入</h2>
            <p className="mt-2 text-sm text-muted">选择多个员工导出的 JSON 文件，系统会在本地浏览器中完成统计，不上传任何数据。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="btn-primary cursor-pointer">
              导入 JSON
              <input className="hidden" type="file" accept="application/json,.json" multiple onChange={(event) => importFiles(event.target.files)} />
            </label>
            <button className="btn-secondary" disabled={!results.length} onClick={exportCsv}>导出 CSV</button>
            <button className="btn-secondary" disabled={!results.length} onClick={() => setResults([])}>清空</button>
          </div>
        </div>
        {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel">
          <div className="text-sm text-muted">导入人数</div>
          <div className="mt-1 text-3xl font-bold text-focus">{results.length}</div>
        </div>
        <div className="panel">
          <div className="text-sm text-muted">平均分</div>
          <div className="mt-1 text-3xl font-bold text-focus">
            {results.length ? Math.round(results.reduce((sum, item) => sum + item.totalScore, 0) / results.length) : 0}
          </div>
        </div>
        <div className="panel">
          <div className="text-sm text-muted">最弱能力维度</div>
          <div className="mt-2 text-lg font-bold text-accent">{weakestDimension ? weakestDimension.dimension : '暂无数据'}</div>
        </div>
        <div className="panel">
          <div className="text-sm text-muted">等级分布</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {['A', 'B+', 'B', 'C', 'D'].map((grade) => (
              <span key={grade} className="tag">{grade}：{levelDistribution[grade] ?? 0}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="panel">
          <h3 className="text-lg font-bold">能力维度统计</h3>
          <div className="mt-4 space-y-3">
            {dimensionAverage.length ? dimensionAverage.map((item) => (
              <div key={item.dimension}>
                <div className="flex justify-between text-sm">
                  <span>{item.dimension}</span>
                  <span>{item.average}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-paper">
                  <div className="h-2 rounded-full bg-focus" style={{ width: `${item.average}%` }} />
                </div>
              </div>
            )) : <p className="text-sm text-muted">导入 JSON 后显示统计。</p>}
          </div>
        </div>

        <div className="panel overflow-x-auto">
          <h3 className="text-lg font-bold">成绩列表</h3>
          <table className="mt-4 w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-paper text-left">
                <th className="border border-line p-2">姓名</th>
                <th className="border border-line p-2">部门</th>
                <th className="border border-line p-2">总分</th>
                <th className="border border-line p-2">等级</th>
                <th className="border border-line p-2">提交时间</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id}>
                  <td className="border border-line p-2">{result.participant.name}</td>
                  <td className="border border-line p-2">{result.participant.department}</td>
                  <td className="border border-line p-2">{result.totalScore}</td>
                  <td className="border border-line p-2">{result.grade}</td>
                  <td className="border border-line p-2">{new Date(result.submittedAt).toLocaleString()}</td>
                </tr>
              ))}
              {!results.length && (
                <tr>
                  <td className="border border-line p-3 text-center text-muted" colSpan={5}>暂无导入数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
