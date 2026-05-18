import { useEffect, useMemo, useState } from 'react';
import { calculateDimensionAverage, calculateLevelDistribution, exportResultsToCsv, parseAssessmentFiles } from '../lib/csv';
import { downloadText } from '../lib/export';
import type { AssessmentResult } from '../lib/scoring';
import { fetchCloudResults, supabase } from '../lib/supabase';
import { defaultExamSet, fetchExamSets, normalizeUploadedExam, uploadExamSet, type ExamSet } from '../lib/examSets';
import { buildEmployeeAnalysis, buildTargetedExamForResult } from '../lib/employeeAnalysis';

const mergeResults = (current: AssessmentResult[], incoming: AssessmentResult[]) => {
  const map = new Map<string, AssessmentResult>();
  [...current, ...incoming].forEach((result) => {
    map.set(result.id, result);
  });
  return [...map.values()].sort(
    (left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
  );
};

const getExamKey = (result: AssessmentResult) => result.examId || 'sales-v3';

const summarizeExamResults = (results: AssessmentResult[]) => {
  const grouped = new Map<string, AssessmentResult[]>();
  results.forEach((result) => {
    const key = getExamKey(result);
    grouped.set(key, [...(grouped.get(key) ?? []), result]);
  });

  return [...grouped.entries()].map(([examId, examResults]) => {
    const dimensionAverage = calculateDimensionAverage(examResults);
    const levelDistribution = calculateLevelDistribution(examResults);
    return {
      examId,
      examTitle: examResults[0]?.examTitle ?? '销售能力综合笔试 V3版',
      count: examResults.length,
      averageScore: Math.round(examResults.reduce((sum, result) => sum + result.totalScore, 0) / examResults.length),
      weakestDimension: dimensionAverage[0]?.dimension ?? '暂无数据',
      levelDistribution,
    };
  });
};

export default function AdminImportPage() {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [examSets, setExamSets] = useState<ExamSet[]>([defaultExamSet]);
  const [selectedExamId, setSelectedExamId] = useState('all');
  const [selectedResultId, setSelectedResultId] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('未登录。登录后可读取云端全部员工提交结果。');

  const filteredResults = useMemo(
    () => selectedExamId === 'all' ? results : results.filter((result) => getExamKey(result) === selectedExamId),
    [results, selectedExamId],
  );
  const dimensionAverage = useMemo(() => calculateDimensionAverage(filteredResults), [filteredResults]);
  const levelDistribution = useMemo(() => calculateLevelDistribution(filteredResults), [filteredResults]);
  const weakestDimension = dimensionAverage[0];
  const examSummaries = useMemo(() => summarizeExamResults(results), [results]);
  const selectedResult = useMemo(
    () => filteredResults.find((result) => result.id === selectedResultId) ?? filteredResults[0],
    [filteredResults, selectedResultId],
  );
  const selectedAnalysis = useMemo(
    () => selectedResult ? buildEmployeeAnalysis(selectedResult) : null,
    [selectedResult],
  );
  const averageScore = filteredResults.length
    ? Math.round(filteredResults.reduce((sum, item) => sum + item.totalScore, 0) / filteredResults.length)
    : 0;

  const loadExamSets = async () => {
    const exams = await fetchExamSets();
    setExamSets(exams);
  };

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
    loadExamSets();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsAuthed(true);
        setEmail(data.session.user.email ?? '');
        loadCloudResults();
      }
    });
  }, []);

  const uploadExamFile = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    setIsLoading(true);

    try {
      const text = await files[0].text();
      const exam = normalizeUploadedExam(JSON.parse(text));
      await uploadExamSet(exam);
      await loadExamSets();
      setStatus(`已上传考试题：${exam.title}`);
    } catch {
      setError('上传考试题失败：请确认 JSON 格式正确，并且当前管理员账号有上传权限。');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadExamTemplate = () => {
    const template = {
      ...defaultExamSet,
      id: 'new-sales-exam',
      title: '新销售能力测评',
      description: '这里填写考试说明。',
      isActive: true,
    };
    downloadText('考试题模板.json', JSON.stringify(template, null, 2), 'application/json');
  };

  const buildTargetedExam = () => {
    if (!selectedResult) return null;
    return buildTargetedExamForResult(selectedResult, examSets);
  };

  const downloadTargetedExam = () => {
    const exam = buildTargetedExam();
    if (!exam) return;
    downloadText(`${exam.title}.json`, JSON.stringify(exam, null, 2), 'application/json');
  };

  const uploadTargetedExam = async () => {
    const exam = buildTargetedExam();
    if (!exam) return;
    setIsLoading(true);
    setError('');

    try {
      await uploadExamSet(exam);
      await loadExamSets();
      setStatus(`已生成并上传针对性补考：${exam.title}`);
    } catch {
      setError('上传针对性补考失败：请确认 exam_sets 表和管理员权限已配置。');
    } finally {
      setIsLoading(false);
    }
  };

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
    downloadText('销售测评成绩汇总.csv', `\uFEFF${exportResultsToCsv(filteredResults)}`, 'text/csv');
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
            <button className="btn-secondary" disabled={!filteredResults.length} onClick={exportCsv}>导出 Excel CSV</button>
            <button className="btn-secondary" disabled={!results.length} onClick={() => setResults([])}>清空</button>
          </div>
        </div>
        <div className="mt-5 max-w-md">
          <label className="block text-sm font-medium text-ink">
            统计范围
            <select className="field mt-1" value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)}>
              <option value="all">全部考试总体统计</option>
              {examSummaries.map((summary) => (
                <option key={summary.examId} value={summary.examId}>
                  {summary.examTitle}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selectedResult && (
          <div className="mt-4 rounded-md border border-line bg-paper p-3 text-sm text-muted">
            当前分析对象：{selectedResult.participant.department} · {selectedResult.participant.name} · {selectedResult.examTitle ?? '销售能力综合笔试 V3版'}
          </div>
        )}
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

      {isAuthed && (
        <section className="panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-bold">考试题管理</h3>
              <p className="mt-2 text-sm text-muted">
                上传 JSON 后，员工入口会出现这套考试题。题目结构需包含 title、durationMinutes、totalScore 和 questions。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={downloadExamTemplate}>下载试卷模板</button>
              <label className="btn-primary cursor-pointer">
                上传考试题 JSON
                <input className="hidden" type="file" accept="application/json,.json" onChange={(event) => uploadExamFile(event.target.files)} />
              </label>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {examSets.map((exam) => (
              <span key={exam.id} className="tag">
                {exam.title} · {exam.questions.length}题 · {exam.totalScore}分
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel">
          <div className="text-sm text-muted">统计人数</div>
          <div className="mt-1 text-3xl font-bold text-focus">{filteredResults.length}</div>
        </div>
        <div className="panel">
          <div className="text-sm text-muted">平均分</div>
          <div className="mt-1 text-3xl font-bold text-focus">{averageScore}</div>
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

      <section className="panel overflow-x-auto">
        <h3 className="text-lg font-bold">各考试总体统计</h3>
        <table className="mt-4 w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="bg-paper text-left">
              <th className="border border-line p-2">考试</th>
              <th className="border border-line p-2">人数</th>
              <th className="border border-line p-2">平均分</th>
              <th className="border border-line p-2">最弱能力维度</th>
              <th className="border border-line p-2">等级分布</th>
            </tr>
          </thead>
          <tbody>
            {examSummaries.map((summary) => (
              <tr key={summary.examId}>
                <td className="border border-line p-2">{summary.examTitle}</td>
                <td className="border border-line p-2">{summary.count}</td>
                <td className="border border-line p-2">{summary.averageScore}</td>
                <td className="border border-line p-2">{summary.weakestDimension}</td>
                <td className="border border-line p-2">
                  {['A', 'B+', 'B', 'C', 'D'].map((grade) => `${grade}:${summary.levelDistribution[grade] ?? 0}`).join(' / ')}
                </td>
              </tr>
            ))}
            {!examSummaries.length && (
              <tr>
                <td className="border border-line p-3 text-center text-muted" colSpan={5}>暂无云端或导入成绩</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {selectedResult && selectedAnalysis && (
        <section className="panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-bold">员工个人分析</h3>
              <p className="mt-2 text-sm text-muted">
                {selectedResult.participant.department} · {selectedResult.participant.name} · {selectedResult.examTitle ?? '销售能力综合笔试 V3版'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={downloadTargetedExam}>下载针对性补考 JSON</button>
              {isAuthed && (
                <button className="btn-primary" disabled={isLoading} onClick={uploadTargetedExam}>
                  {isLoading ? '上传中' : '生成并上传补考'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div>
              <h4 className="font-semibold">诊断结论</h4>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
                {selectedAnalysis.keyFindings.map((finding) => (
                  <li key={finding}>{finding}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">优势能力</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedAnalysis.strengths.map((item) => (
                  <span className="tag" key={item.dimension}>{item.dimension}：{item.percent}%</span>
                ))}
              </div>
              <h4 className="mt-5 font-semibold">待补强能力</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedAnalysis.weakDimensions.length ? selectedAnalysis.weakDimensions.map((item) => (
                  <span className="tag" key={item.dimension}>{item.dimension}：{item.percent}%</span>
                )) : <span className="tag">暂无明显短板</span>}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h4 className="font-semibold">训练计划</h4>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
                {selectedAnalysis.trainingPlan.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="overflow-x-auto">
              <h4 className="font-semibold">重点复盘题</h4>
              <table className="mt-3 w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="bg-paper text-left">
                    <th className="border border-line p-2">题号</th>
                    <th className="border border-line p-2">题目</th>
                    <th className="border border-line p-2">得分</th>
                    <th className="border border-line p-2">缺失点</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAnalysis.lowScoreQuestions.map((question) => (
                    <tr key={question.questionId}>
                      <td className="border border-line p-2">{question.questionId}</td>
                      <td className="border border-line p-2">{question.title}</td>
                      <td className="border border-line p-2">{question.score}/{question.maxScore}</td>
                      <td className="border border-line p-2">{question.missingPoints.join('、') || '无'}</td>
                    </tr>
                  ))}
                  {!selectedAnalysis.lowScoreQuestions.length && (
                    <tr>
                      <td className="border border-line p-3 text-center text-muted" colSpan={4}>暂无明显低分题</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

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
            )) : <p className="text-sm text-muted">读取云端或导入 JSON 后显示统计。</p>}
          </div>
        </div>

        <div className="panel overflow-x-auto">
          <h3 className="text-lg font-bold">成绩列表</h3>
          <table className="mt-4 w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="bg-paper text-left">
                <th className="border border-line p-2">考试</th>
                <th className="border border-line p-2">姓名</th>
                <th className="border border-line p-2">部门</th>
                <th className="border border-line p-2">总分</th>
                <th className="border border-line p-2">等级</th>
                <th className="border border-line p-2">提交时间</th>
                <th className="border border-line p-2">分析</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result) => (
                <tr key={result.id}>
                  <td className="border border-line p-2">{result.examTitle ?? '销售能力综合笔试 V3版'}</td>
                  <td className="border border-line p-2">{result.participant.name}</td>
                  <td className="border border-line p-2">{result.participant.department}</td>
                  <td className="border border-line p-2">{result.totalScore}</td>
                  <td className="border border-line p-2">{result.grade}</td>
                  <td className="border border-line p-2">{new Date(result.submittedAt).toLocaleString()}</td>
                  <td className="border border-line p-2">
                    <button className="btn-secondary px-3 py-1" onClick={() => setSelectedResultId(result.id)}>查看</button>
                  </td>
                </tr>
              ))}
              {!results.length && (
                <tr>
                  <td className="border border-line p-3 text-center text-muted" colSpan={7}>暂无成绩数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
