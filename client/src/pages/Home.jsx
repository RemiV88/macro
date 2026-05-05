import { useEffect, useState } from 'react';
import api from '../api';

export default function Home() {
  const [health, setHealth] = useState({ state: 'loading', data: null, error: null });

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setHealth({ state: 'ok', data: res.data, error: null }))
      .catch((err) => setHealth({ state: 'error', data: null, error: err.message }));
  }, []);

  return (
    <div>
      <h1>Macro</h1>
      <p>Calorie and macro tracker.</p>

      <h2>Backend health check</h2>
      {health.state === 'loading' && <p>Checking…</p>}
      {health.state === 'ok' && (
        <pre>{JSON.stringify(health.data, null, 2)}</pre>
      )}
      {health.state === 'error' && (
        <p style={{ color: 'crimson' }}>Could not reach backend: {health.error}</p>
      )}
    </div>
  );
}
