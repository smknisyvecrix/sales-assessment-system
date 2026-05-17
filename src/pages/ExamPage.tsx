import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Navigate } from '../App';
import { calculateScore, type UserAnswer } from '../lib/scoring';
import { clearExamSession, loadExamSession, saveExamSession, saveLatestResult, type ExamSession } from '../lib/storage';
import { saveResultToCloud } from '../lib/supabase';
import { buildExamSections, defaultExamSet } from '../lib/examSets';

interface ExamPageProps {
  navigate: Navigate;
}

const formatRemaining = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function ExamPage({ navigate }: ExamPageProps) {
  const [session, setSession] = useState<ExamSession | null>(() => loadExamSession());
  const [remaining, setRemaining] = useState(() => Math.max(0, (loadExamSession()?.expiresAt ?? Date.now()) - Date.now()));
  const activeExam = session?.exam ?? defaultExamSet;
  const examSections = useMemo(() => buildExamSections(activeExam.questions), [activeExam.questions]);

  useEffect(() => {
    if (!session) {
      navigate('/');
      return;
    }

    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, session.expiresAt - Date.now()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [navigate, session]);

  const submitExam = useCallback(async () => {
    const latest = loadExamSession();
    if (!latest) return;
    const result = calculateScore(latest.participant, latest.answers, latest.exam ?? defaultExamSet);
    saveLatestResult(result);
    try {
      await saveResultToCloud(result);
    } catch (error) {
      console.error('Failed to save result to Supabase', error);
    }
    clearExamSession();
    navigate('/result');
  }, [navigate]);

  useEffect(() => {
    if (session && remaining <= 0) {
      submitExam();
    }
  }, [remaining, session, submitExam]);

  const answerMap = useMemo(() => new Map(session?.answers.map((answer) => [answer.questionId, answer])), [session]);

  const updateAnswer = (questionId: string, patch: Partial<UserAnswer>) => {
    if (!session) return;

    const existing = answerMap.get(questionId) ?? { questionId };
    const nextAnswer = { ...existing, ...patch };
    const nextAnswers = [
      ...session.answers.filter((answer) => answer.questionId !== questionId),
      nextAnswer,
    ];
    const nextSession = { ...session, answers: nextAnswers };
    setSession(nextSession);
    saveExamSession(nextSession);
  };

  if (!session) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="panel h-fit lg:sticky lg:top-4">
        <div className="text-sm text-muted">考生</div>
        <div className="mt-1 font-bold">{session.participant.name}</div>
        <div className="text-sm text-muted">{session.participant.department}</div>
        <div className="mt-4 rounded-md border border-line bg-paper p-3">
          <div className="text-xs text-muted">当前考试</div>
          <div className="mt-1 text-sm font-semibold text-ink">{activeExam.title}</div>
        </div>
        <div className="mt-5 rounded-md border border-line bg-paper p-4 text-center">
          <div className="text-sm text-muted">剩余时间</div>
          <div className="mt-1 text-3xl font-bold text-accent">{formatRemaining(remaining)}</div>
        </div>
        <button className="btn-primary mt-5 w-full" onClick={submitExam}>提交试卷</button>
        <p className="mt-3 text-xs leading-5 text-muted">系统会自动保存答案，倒计时结束后自动提交。</p>
      </aside>

      <section className="space-y-6">
        {examSections.map((section) => (
          <div key={section} className="space-y-4">
            <h2 className="text-xl font-bold text-ink">{section}</h2>
            {activeExam.questions
              .filter((question) => question.section === section)
              .map((question) => {
                const answer = answerMap.get(question.id);
                return (
                  <article key={question.id} className="panel">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-focus">{question.id} · {question.title}</p>
                        <h3 className="mt-2 text-base font-semibold text-ink">{question.prompt}</h3>
                      </div>
                      <span className="tag">{question.maxScore} 分</span>
                    </div>

                    {question.type === 'path' ? (
                      <div className="mt-4 space-y-3">
                        {question.options.map((option) => (
                          <label key={option} className="flex cursor-pointer gap-3 rounded-md border border-line bg-white p-3 text-sm hover:bg-paper">
                            <input
                              type="radio"
                              name={question.id}
                              checked={answer?.selected?.[0] === option}
                              onChange={() => updateAnswer(question.id, { selected: [option] })}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                        <textarea
                          className="field min-h-24"
                          value={answer?.reason ?? ''}
                          onChange={(event) => updateAnswer(question.id, { reason: event.target.value })}
                          placeholder="请说明你的判断理由"
                        />
                      </div>
                    ) : (
                      <textarea
                        className="field mt-4 min-h-40"
                        value={answer?.text ?? ''}
                        onChange={(event) => updateAnswer(question.id, { text: event.target.value })}
                        placeholder="请输入你的答案"
                      />
                    )}
                  </article>
                );
              })}
          </div>
        ))}
      </section>
    </div>
  );
}
