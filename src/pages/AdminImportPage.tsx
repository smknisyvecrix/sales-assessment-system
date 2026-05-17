import { useEffect, useMemo, useState } from 'react';
import { calculateDimensionAverage, calculateLevelDistribution, exportResultsToCsv, parseAssessmentFiles } from '../lib/csv';
import { downloadText } from '../lib/export';
import type { AssessmentResult } from '../lib/scoring';
import { fetchCloudResults, supabase } from '../lib/supabase';

const mergeResults = (current: AssessmentResult[], incoming: AssessmentResult[]) => {
  const map = new Map<string, AssessmentResult>();
  [...current, ...incoming].forEach((result) => {
    map.set(result.id, result);
  });
  return [...map.values()].sort(
    (left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
  );
};

export default function AdminImportPage() {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('未登录。登录后可读取云端全部员工提交结果。');

  const dimensionAverage = useMemo(() => calculateDimensionAverage(results), [results]);
  const levelDistribution = useMemo(() => calculateLevelDistribution(results), [results]);
  const weakestDimension = dimensionAverage[0];

  const loadCloudResults = async () => {
    setIsLoading(true);
    setError('');
    try {
      const cloudResults = await fetchCloudResults();
      setResults((current) => mergeResults(current, cloudResults));
      setStatus(`已从云端读取 ${cloudResults.length} 份提交结果。`);
    } catch {
      setError('读取云端结果失败：请确认当前账号已加入 admin_users，并且 Supabase RLS 策略已成功创建。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsAuthed(true);
        setEmail(data.session.user.email ?? '');
        loadCloudResults();
      }
    });
  }, []);

  const signIn = async () => {
    if (!email.trim() || !password) {
      setError('请输入管理员邮箱和密码。');
      return;
    }

    setIsLoading(true);
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsLoading(false);

    if (signInError) {
      setError('登录失败：请确认邮箱、密码正确，并且已在 Supabase Authentication 里创建该用户。');
      return;
    }

    setIsAuthed(true);
    setPassword('');
    await loadCloudResults();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAuthed(false);
    setResults([]);
    setStatus('已退出登录。');
  };

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');

    try {
      const imported = await parseAssessmentFiles([...files]);
      setResults((current) => mergeResults(current, imported));
      setStatus(`已导入 ${imported.length} 个本地 JSON 文件。`);
    } catch {
      setError('导入失败：请确认选择的是员工导出的 JSON 文件。');
    }
  };

  const exportCsv = () => {
    downloadText('销售测评成绩汇总.csv', `\uFEFF${exportResultsToCsv(results)}`, 'text/csv');
  };

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">管理端成绩中心</h2>
            <p className="mt-2 text-sm text-muted">登录后自动读取云端提交结果；也可以继续手动导入员工 JSON 文件做补充统计。</p>
            <p className="mt-2 text-xs text-muted">{status}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAuthed && (
              <>
                <button className="btn-secondary" disabled={isLoading} onClick={loadCloudResults}>
                  {isLoading ? '读取中' : '刷新云端结果'}
                </button>
                <button className="btn-secondary" onClick={signOut}>退出登录</button>
              </>
            )}
            <label className="btn-primary cursor-pointer">
              导入 JSON
              <input className="hidden" type="file" accept="application/json,.json" multiple onChange={(event) => importFiles(event.target.files)} />
            </label>
            <button className="btn-secondary" disabled={!results.length} onClick={exportCsv}>导出 Excel CSV</button>
            <button className="btn-secondary" disabled={!results.length} onClick={() => setResults([])}>清空</button>
          </div>
        </div>
        {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>

      {!isAuthed && (
        <section className="panel">
          <h3 className="text-lg font-bold">管理员登录</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="block text-sm font-medium text-ink">
              邮箱
              <input className="field mt-1" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="管理员邮箱" />
            </label>
            <label className="block text-sm font-medium text-ink">
              密码
              <input
                className="field mt-1"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="管理员密码"
              />
            </label>
            <button className="btn-primary self-end" disabled={isLoading} onClick={signIn}>
              {isLoading ? '登录中' : '登录并读取'}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">
            这个账号需要先在 Supabase 的 Authentication 里创建，并且邮箱已加入 admin_users 表。
          </p>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel">
          <div className="text-sm text-muted">统计人数</div>
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
