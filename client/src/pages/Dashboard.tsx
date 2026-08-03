import { useMemo, useState } from 'react';
import { StatCard } from '../components/StatCard';
import { Filters } from '../components/Filters';
import { SurebetTable } from '../components/SurebetTable';
import { useSurebets } from '../hooks/useSurebets';
import { AppSettings, SurebetFilters } from '../types';
import { formatCurrency, timeAgo } from '../utils/format';

interface DashboardProps {
  settings: AppSettings;
}

const DEFAULT_FILTERS: SurebetFilters = {
  sport: 'todos',
  bookmaker: 'todas',
  minProfit: 0,
  search: '',
};

export function Dashboard({ settings }: DashboardProps) {
  const { surebets, loading, error, lastUpdated, refresh } = useSurebets(
    settings.defaultBankroll,
    settings
  );
  const [filters, setFilters] = useState<SurebetFilters>(DEFAULT_FILTERS);

  const bookmakers = useMemo(() => {
    const set = new Set<string>();
    surebets.forEach((s) => s.bookmakers.forEach((b) => set.add(b)));
    return Array.from(set).sort();
  }, [surebets]);

  const filtered = useMemo(() => {
    return surebets.filter((s) => {
      if (filters.sport !== 'todos' && s.sport !== filters.sport) return false;
      if (filters.bookmaker !== 'todas' && !s.bookmakers.includes(filters.bookmaker)) return false;
      if (s.profitPercent < filters.minProfit) return false;
      if (
        filters.search &&
        !`${s.eventName} ${s.competition}`.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [surebets, filters]);

  const totalPotentialProfit = filtered.reduce((sum, s) => sum + s.guaranteedProfit, 0);
  const bestProfit = filtered.length ? Math.max(...filtered.map((s) => s.profitPercent)) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Oportunidades de arbitraje detectadas en tiempo (casi) real. Se actualiza
            automáticamente cada 30 segundos.
          </p>
        </div>
        <button className="btn" onClick={refresh} disabled={loading}>
          {loading ? <span className="spinner" /> : '⟳'} Actualizar ahora
        </button>
      </div>

      <div className="stat-grid">
        <StatCard label="Surebets activas" value={String(filtered.length)} />
        <StatCard
          label="Mejor beneficio"
          value={`${bestProfit.toFixed(2)}%`}
          highlight
        />
        <StatCard
          label="Beneficio potencial total"
          value={formatCurrency(totalPotentialProfit, settings.currency)}
          highlight
        />
        <StatCard
          label="Última actualización"
          value={lastUpdated ? timeAgo(lastUpdated) : '—'}
          sub="Auto-refresco cada 30s"
        />
      </div>

      <div className="panel">
        <Filters filters={filters} onChange={setFilters} bookmakers={bookmakers} />
        {error && (
          <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}
        <SurebetTable surebets={filtered} currency={settings.currency} />
      </div>
    </div>
  );
}
