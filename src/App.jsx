import React, { useEffect, useState } from 'react';
import Kitchen from './components/Kitchen';
import Menu from './components/Menu';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  if (currentPath === '/kitchen') {
    return (
      <div>
        <div className="bg-slate-950 p-2 border-b border-slate-800 text-right pr-6">
          <button
            onClick={() => navigateTo('/')}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg font-bold"
          >
            ← Back to Menu
          </button>
        </div>
        <Kitchen />
      </div>
    );
  }

  return (
    <Menu />
  );
}