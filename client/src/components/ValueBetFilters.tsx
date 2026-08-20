import { SPORT_LABELS, Sport, ValueBetFilters as ValueBetFiltersType, ValueBetSortBy } from '../types';

interface ValueBetFiltersProps {
  filters: ValueBetFiltersType;
  onChange: (filters: ValueBetFiltersType) => void;
  bookmakers: string[];
}

const SPORTS: Sport[] = ['futbol', 'tenis', 'baloncesto', 'hockey', 'esports'];

export function ValueBetFilters({ filters, onChange, bookmakers }: ValueBetFiltersProps) {
  return (
    <div className="filters-bar">
      <input
        type="search"
        placeholder="Buscar evento o competición..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
      />

      <select
        value={filters.sport}
        onChange={(e) => onChange({ ...filters, sport: e.target.value as Sport | 'todos' })}
      >
        <option value="todos">Todos los deportes</option>
        {SPORTS.map((s) => (
          <option key={s} value={s}>
            {SPORT_LABELS[s]}
          </option>
        ))}
      </select>

      <select
        value={filters.bookmaker}
        onChange={(e) => onChange({ ...filters, bookmaker: e.target.value })}
      >
        <option value="todas">Todas las casas</option>
        {bookmakers.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>

      <select
        value={filters.minEv}
        onChange={(e) => onChange({ ...filters, minEv: Number(e.target.value) })}
      >
        <option value={0}>EV mínimo: cualquiera</option>
        <option value={1}>≥ 1%</option>
        <option value={2}>≥ 2%</option>
        <option value={5}>≥ 5%</option>
        <option value={10}>≥ 10%</option>
      </select>

      <select
        value={filters.sortBy}
        onChange={(e) => onChange({ ...filters, sortBy: e.target.value as ValueBetSortBy })}
      >
        <option value="ev">Ordenar: mayor EV</option>
        <option value="startTime">Ordenar: fecha del partido</option>
        <option value="detectedAt">Ordenar: más recientes</option>
      </select>
    </div>
  );
}
