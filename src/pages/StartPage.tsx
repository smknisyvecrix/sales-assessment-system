import { useEffect, useMemo, useState } from 'react';
import type { Navigate } from '../App';
import { saveExamSession } from '../lib/storage';
import { defaultExamSet, fetchExamSets, type ExamSet } from '../lib/examSets';

interface StartPageProps {
  navigate: Navigate;
}

export default function StartPage({ navigate }: StartPageProps) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [examSets, setExamSets] = useState<ExamSet[]>([defaultExamSet]);
  const [selectedExamId, setSelectedExamId] = useState(defaultExamSet.id);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const selectedExam = useMemo(
    () => examSets.find((exam) => exam.id === selectedExamId) ?? examSets[0] ?? defaultExamSet,
    [examSets, selectedExamId],
  );
  const canStart = name.trim() && department.trim() && selectedExam;

  useEffect(() => {
    setIsLoadingExams(true);
    fetchExamSets()
      .then((exams) => {
        setExamSets(exams);
        setSelectedExamId((current) => exams.some((exam) => exam.id === current) ? current : exams[0]?.id ?? defaultExamSet.id);
      })
      .finally(() => setIsLoadingExams(false));
  }, []);

  const startExam = () => {
    if (!canStart) return;

    saveExamSession({
      participant: {
        name: name.trim(),
        department: department.trim(),
      },
      exam: selectedExam,
      startedAt: new Date().toISOString(),
      expiresAt: Date.now() + selectedExam.durationMinutes * 60 * 1000,
      answers: [],
    });

    navigate('/exam');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="panel">
        <p className="tag mb-4">可选考试</p>
        <h2 className="text-2xl font-bold text-ink">{selectedExam.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          {selectedExam.description || '请选择一套考试题后开始答题。系统会自动保存答题进度，到时自动提交。开放题采用关键词半自动评分，并会标记为需要人工复核。'}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-line bg-paper p-4">
            <div className="text-2xl font-bold text-focus">{selectedExam.questions.length}</div>
            <div className="text-sm text-muted">题目数量</div>
          </div>
          <div className="rounded-md border border-line bg-paper p-4">
            <div className="text-2xl font-bold text-focus">{selectedExam.totalScore}</div>
            <div className="text-sm text-muted">总分</div>
          </div>
          <div className="rounded-md border border-line bg-paper p-4">
            <div className="text-2xl font-bold text-focus">{selectedExam.durationMinutes}</div>
            <div className="text-sm text-muted">分钟</div>
          </div>
        </div>
        <div className="mt-6">
          <label className="block text-sm font-medium text-ink">
            选择考试题
            <select className="field mt-1" value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)}>
              {examSets.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </label>
          {isLoadingExams && <p className="mt-2 text-xs text-muted">正在读取云端试卷...</p>}
        </div>
      </section>

      <section className="panel">
        <h2 className="text-lg font-bold">开始考试</h2>
        <label className="mt-4 block text-sm font-medium text-ink">
          姓名
          <input className="field mt-1" value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入姓名" />
        </label>
        <label className="mt-4 block text-sm font-medium text-ink">
          部门
          <input
            className="field mt-1"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            placeholder="请输入部门"
          />
        </label>
        <button className="btn-primary mt-6 w-full" disabled={!canStart} onClick={startExam}>
          开始考试
        </button>
      </section>
    </div>
  );
}
