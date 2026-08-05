import { SortBy, SPORT_LABELS, Sport, SurebetFilters } from '../types';

interface FiltersProps {
  filters: SurebetFilters;
  onChange: (filters: SurebetFilters) => void;
  bookmakers: string[];
}

const SPORTS: Sport[] = ['futbol', 'tenis', 'baloncesto', 'hockey', 'esports'];

export function Filters({ filters, onChange, bookmakers }: FiltersProps) {
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
        value={filters.minProfit}
        onChange={(e) => onChange({ ...filters, minProfit: Number(e.target.value) })}
      >
        <option value={0}>Beneficio mínimo: cualquiera</option>
        <option value={1}>≥ 1%</option>
        <option value={2}>≥ 2%</option>
        <option value={3}>≥ 3%</option>
        <option value={5}>≥ 5%</option>
      </select>

      <select
        value={filters.sortBy}
        onChange={(e) => onChange({ ...filters, sortBy: e.target.value as SortBy })}
      >
        <option value="detectedAt">Ordenar: más recientes</option>
        <option value="startTime">Ordenar: fecha del partido</option>
        <option value="profit">Ordenar: mayor beneficio</option>
      </select>
    </div>
  );
}
