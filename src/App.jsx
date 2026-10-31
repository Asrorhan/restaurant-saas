import React, { useEffect, useState } from 'react';
import Kitchen from './components/Kitchen';
import Menu from './components/Menu';
import Admin from './components/Admin';
import RemoteOrder from './components/RemoteOrder'; // Import qilindi

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (currentPath === '/kitchen') {
    return <Kitchen />;
  }

  if (currentPath === '/admin') {
    return <Admin />;
  }

  if (currentPath === '/order') {
    return <RemoteOrder />;
  }

  return <Menu />;
}