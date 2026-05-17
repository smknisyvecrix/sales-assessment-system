import { useState } from 'react';
import { examMeta } from '../data/examData';
import type { Navigate } from '../App';
import { saveExamSession } from '../lib/storage';

interface StartPageProps {
  navigate: Navigate;
}

export default function StartPage({ navigate }: StartPageProps) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const canStart = name.trim() && department.trim();

  const startExam = () => {
    if (!canStart) return;

    saveExamSession({
      participant: {
        name: name.trim(),
        department: department.trim(),
      },
      startedAt: new Date().toISOString(),
      expiresAt: Date.now() + examMeta.durationMinutes * 60 * 1000,
      answers: [],
    });

    navigate('/exam');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="panel">
        <p className="tag mb-4">{examMeta.title}</p>
        <h2 className="text-2xl font-bold text-ink">销售能力综合笔试</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          本测评共 19 题，总分 100 分，限时 60 分钟。系统会自动保存答题进度，到时自动提交。开放题采用关键词半自动评分，并会标记为需要人工复核。
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-line bg-paper p-4">
            <div className="text-2xl font-bold text-focus">19</div>
            <div className="text-sm text-muted">题目数量</div>
          </div>
          <div className="rounded-md border border-line bg-paper p-4">
            <div className="text-2xl font-bold text-focus">100</div>
            <div className="text-sm text-muted">总分</div>
          </div>
          <div className="rounded-md border border-line bg-paper p-4">
            <div className="text-2xl font-bold text-focus">60</div>
            <div className="text-sm text-muted">分钟</div>
          </div>
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
