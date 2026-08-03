import { useEffect, useState } from 'react';
import { StatCard } from '../components/StatCard';
import { api } from '../services/api';
import { AppSettings, SPORT_LABELS, Stats } from '../types';
import { formatCurrency, formatPercent } from '../utils/format';

interface StatisticsProps {
  settings: AppSettings;
}

export function Statistics({ settings }: StatisticsProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.getStats().then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="empty-state">
        <span className="spinner" /> Cargando estadísticas...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Estadísticas</h1>
          <p>Métricas agregadas de todas las surebets detectadas hasta ahora.</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Surebets encontradas" value={String(stats.totalSurebets)} />
        <StatCard
          label="Beneficio medio"
          value={formatPercent(stats.averageProfitPercent)}
          highlight
        />
        <StatCard
          label="Beneficio potencial hoy"
          value={formatCurrency(stats.potentialDailyProfit, settings.currency)}
          highlight
        />
        <StatCard
          label="Mejor oportunidad"
          value={
            stats.bestOpportunity ? formatPercent(stats.bestOpportunity.profitPercent) : '—'
          }
          sub={stats.bestOpportunity?.eventName}
        />
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
          Distribución por deporte
        </h3>
        <table className="surebets-table">
          <thead>
            <tr>
              <th>Deporte</th>
              <th>Surebets detectadas</th>
            </tr>
          </thead>
          <tbody>
            {stats.bySport.map((row) => (
              <tr key={row.sport}>
                <td>{SPORT_LABELS[row.sport]}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
