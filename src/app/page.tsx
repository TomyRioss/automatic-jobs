'use client';

import { useState, useEffect } from 'react';

type Platform = 'zonajobs' | 'bumeran' | 'linkedin';
type View = 'apply' | 'history';

interface Job {
  platform: Platform;
  link: string;
  title: string;
  description: string;
  date: string;
}

type JobApiResponse = Pick<Job, 'link' | 'title' | 'description'>;

interface History {
  applied: Job[];
  review: Job[];
}

export default function Home() {
  const [platform, setPlatform] = useState<Platform>('zonajobs');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keywords, setKeywords] = useState('');
  const [status, setStatus] = useState('Inactivo');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    appliedJobs: JobApiResponse[];
    reviewJobs: JobApiResponse[];
  } | null>(null);
  const [view, setView] = useState<View>('apply');
  const [history, setHistory] = useState<History>({ applied: [], review: [] });
  const [historyView, setHistoryView] = useState<'applied' | 'review'>(
    'applied',
  );
  const [historyPlatformFilter, setHistoryPlatformFilter] = useState<
    Platform | 'all'
  >('all');

  useEffect(() => {
    const storedHistory = localStorage.getItem('jobHistory');
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  const saveHistory = (newHistory: History) => {
    localStorage.setItem('jobHistory', JSON.stringify(newHistory));
    setHistory(newHistory);
  };

  const handleDeleteJob = (jobToDelete: Job, type: 'applied' | 'review') => {
    if (
      !confirm(
        `¿Estás seguro de que quieres eliminar la postulación: "${jobToDelete.title}"?`,
      )
    )
      return;

    const updatedHistory = { ...history };
    updatedHistory[type] = updatedHistory[type].filter(
      job => !(job.link === jobToDelete.link && job.date === jobToDelete.date),
    );
    saveHistory(updatedHistory);
  };

  const handleClearHistory = (category: 'applied' | 'review') => {
    if (
      !confirm(
        `¿Estás seguro de que quieres eliminar TODAS las postulaciones de "${category}"? Esta acción no se puede deshacer.`,
      )
    )
      return;

    const updatedHistory = { ...history, [category]: [] };
    saveHistory(updatedHistory);
  };

  const handleStart = async () => {
    if (!email || !password || !keywords) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    setIsLoading(true);
    setStatus('Iniciando...');
    setLogs(['Enviando solicitud al servidor...']);
    setResults(null);

    try {
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          email,
          password,
          keywords,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error desconocido.');
      }

      setStatus('Proceso finalizado.');
      setLogs(prev => [...prev, `Respuesta del servidor: ${data.message}`]);
      setResults({
        appliedJobs: data.appliedJobs || [],
        reviewJobs: data.reviewJobs || [],
      });

      // Guardar en el historial
      const currentDate = new Date().toISOString();
      const newAppliedJobs: Job[] = (data.appliedJobs || []).map(
        (job: JobApiResponse) => ({
          ...job,
          platform,
          date: currentDate,
        }),
      );
      const newReviewJobs: Job[] = (data.reviewJobs || []).map(
        (job: JobApiResponse) => ({
          ...job,
          platform,
          date: currentDate,
        }),
      );

      const updatedHistory: History = {
        applied: [...history.applied, ...newAppliedJobs],
        review: [...history.review, ...newReviewJobs],
      };
      saveHistory(updatedHistory);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error de red o del servidor.';
      setStatus('Error');
      setLogs(prev => [
        ...prev,
        `Error al iniciar el proceso: ${errorMessage}`,
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderApplyView = () => (
    <>
      <div className="flex justify-center mb-6">
        <div className="flex rounded-lg bg-gray-700 p-1">
          <button
            onClick={() => setPlatform('zonajobs')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              platform === 'zonajobs'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            Zonajobs
          </button>
          <button
            onClick={() => setPlatform('bumeran')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              platform === 'bumeran'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            Bumeran
          </button>
          <button
            onClick={() => setPlatform('linkedin')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              platform === 'linkedin'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            LinkedIn
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">
              Email de {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="tu.email@ejemplo.com"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="Tu contraseña"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">
              Palabras Clave (separadas por coma)
            </label>
            <input
              type="text"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="Ej: Desarrollador, Remoto, React"
            />
          </div>

          <button
            onClick={handleStart}
            disabled={isLoading}
            className="w-full mt-4 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-lg font-semibold transition-all disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Procesando...' : 'Iniciar Postulaciones'}
          </button>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-2">Estado del Proceso</h2>
          <div className="bg-gray-900 p-4 rounded-lg h-40 overflow-y-auto mb-4">
            <p className="font-mono text-sm">
              <span className="font-bold text-yellow-400">Estado:</span>{' '}
              {status}
            </p>
            <ul className="mt-2 space-y-1">
              {logs.map((log, index) => (
                <li key={index} className="font-mono text-sm text-gray-300">
                  {log}
                </li>
              ))}
            </ul>
          </div>
          {results && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xl font-semibold text-green-400">
                  Postulaciones Exitosas
                </h3>
                <ul className="bg-gray-900 p-2 rounded-lg mt-2 h-40 overflow-y-auto">
                  {results.appliedJobs.map((job, i) => (
                    <li key={i} className="text-xs truncate">
                      <a
                        href={job.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {job.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-orange-400">
                  Requieren Revisión
                </h3>
                <ul className="bg-gray-900 p-2 rounded-lg mt-2 h-40 overflow-y-auto">
                  {results.reviewJobs.map((job, i) => (
                    <li key={i} className="text-xs truncate">
                      <a
                        href={job.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {job.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderHistoryView = () => {
    const jobsToShow =
      historyView === 'applied' ? history.applied : history.review;

    const platformsInHistory = [
      ...new Set(jobsToShow.map(job => job.platform)),
    ];

    const filteredJobs =
      historyPlatformFilter === 'all'
        ? jobsToShow
        : jobsToShow.filter(job => job.platform === historyPlatformFilter);

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex justify-center border-b border-gray-700">
            <button
              onClick={() => {
                setHistoryView('applied');
                setHistoryPlatformFilter('all');
              }}
              className={`px-6 py-3 text-md font-medium transition-colors ${
                historyView === 'applied'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Enviados ({history.applied.length})
            </button>
            <button
              onClick={() => {
                setHistoryView('review');
                setHistoryPlatformFilter('all');
              }}
              className={`px-6 py-3 text-md font-medium transition-colors ${
                historyView === 'review'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Revisión ({history.review.length})
            </button>
          </div>
          {jobsToShow.length > 0 && (
            <button
              onClick={() => handleClearHistory(historyView)}
              className="px-4 py-2 text-sm bg-red-800 hover:bg-red-700 rounded-md transition-colors flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="w-4 h-4"
                viewBox="0 0 16 16"
              >
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
              </svg>
              Limpiar Todo
            </button>
          )}
        </div>

        {platformsInHistory.length > 0 && (
          <div className="flex items-center gap-2 mb-6">
            <span className="font-semibold text-gray-400">Filtrar:</span>
            <button
              onClick={() => setHistoryPlatformFilter('all')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                historyPlatformFilter === 'all'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Todos
            </button>
            {platformsInHistory.map(p => (
              <button
                key={p}
                onClick={() => setHistoryPlatformFilter(p)}
                className={`px-3 py-1 text-sm rounded-full transition-colors capitalize ${
                  historyPlatformFilter === p
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            )
            .map((job, index) => (
              <div
                key={index}
                className="bg-gray-800 p-4 rounded-lg flex flex-col justify-between transform hover:scale-105 transition-transform duration-200 shadow-lg"
              >
                <div className="flex-grow">
                  <h3 className="font-bold text-lg text-cyan-400 mb-2">
                    {job.title}
                  </h3>
                  <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                    {job.description}...
                  </p>
                  <a
                    href={job.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-500 hover:underline break-all"
                  >
                    {job.link}
                  </a>
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-500">
                    {new Date(job.date).toLocaleString()}
                  </p>
                  <button
                    onClick={() => handleDeleteJob(job, historyView)}
                    className="text-gray-500 hover:text-red-500 transition-colors"
                    aria-label="Eliminar postulación"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      className="w-5 h-5"
                      viewBox="0 0 16 16"
                    >
                      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
                      <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
        </div>
        {filteredJobs.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p>No hay postulaciones en esta categoría.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <aside className="w-64 bg-gray-800 p-4 flex-shrink-0">
        <h1 className="text-2xl font-bold mb-8 text-center text-cyan-400">
          GetaJob
        </h1>
        <nav className="space-y-2">
          <button
            onClick={() => setView('apply')}
            className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
              view === 'apply' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'
            }`}
          >
            Postulaciones
          </button>
          <button
            onClick={() => setView('history')}
            className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
              view === 'history'
                ? 'bg-cyan-600 text-white'
                : 'hover:bg-gray-700'
            }`}
          >
            Historial
          </button>
        </nav>
      </aside>
      <main className="flex-grow p-8">
        {view === 'apply' ? renderApplyView() : renderHistoryView()}
      </main>
    </div>
  );
}
