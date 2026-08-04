import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Calculator } from './pages/Calculator';
import { History } from './pages/History';
import { Statistics } from './pages/Statistics';
import { SettingsPage } from './pages/Settings';
import { useSettings } from './hooks/useSettings';
import { api } from './services/api';

export default function App() {
  const { settings, loaded, save } = useSettings();
  const [mode, setMode] = useState<'demo' | 'real' | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    api
      .getHealth()
      .then((res) => setMode(res.mode))
      .catch(() => setMode('demo'));
  }, []);

  if (!loaded) {
    return (
      <div className="empty-state" style={{ paddingTop: 100 }}>
        <span className="spinner" /> Cargando configuración...
      </div>
    );
  }

  return (
    <HashRouter>
      {mode === 'demo' && (
        <div className="demo-banner">
          ⚠️ MODO DEMO — Todas las cuotas y surebets mostradas son datos simulados,
          claramente marcados como "DEMO". Define <code>ODDS_API_KEY</code> en el
          backend para usar datos reales.
        </div>
      )}
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard settings={settings} />} />
            <Route path="/calculadora" element={<Calculator settings={settings} />} />
            <Route path="/historial" element={<History settings={settings} />} />
            <Route path="/estadisticas" element={<Statistics settings={settings} />} />
            <Route
              path="/configuracion"
              element={<SettingsPage settings={settings} onSave={save} />}
            />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
