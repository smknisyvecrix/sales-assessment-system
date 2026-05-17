import { useEffect, useMemo, useState } from 'react';
import StartPage from './pages/StartPage';
import ExamPage from './pages/ExamPage';
import ResultPage from './pages/ResultPage';
import AdminImportPage from './pages/AdminImportPage';

export type Navigate = (path: string) => void;

const getPathFromHash = () => window.location.hash.replace(/^#/, '') || '/';

export default function App() {
  const [path, setPath] = useState(getPathFromHash);

  useEffect(() => {
    const onHashChange = () => setPath(getPathFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useMemo<Navigate>(
    () => (nextPath) => {
      window.location.hash = nextPath;
      setPath(nextPath);
    },
    [],
  );

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-focus">Sales Assessment V3</p>
            <h1 className="text-xl font-bold text-ink">销售能力测评系统</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => navigate('/')}>员工入口</button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {path === '/' && <StartPage navigate={navigate} />}
        {path === '/exam' && <ExamPage navigate={navigate} />}
        {path === '/result' && <ResultPage navigate={navigate} />}
        {path === '/admin' && <AdminImportPage />}
      </main>
    </div>
  );
}
