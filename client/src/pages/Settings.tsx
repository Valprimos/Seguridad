import { useEffect, useState } from 'react';
import { AppSettings } from '../types';
import { api } from '../services/api';
import { KNOWN_BOOKMAKERS } from '../utils/knownBookmakers';

interface SettingsPageProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => Promise<void>;
}

export function SettingsPage({ settings, onSave }: SettingsPageProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [allBookmakers, setAllBookmakers] = useState<string[]>([]);
  const [loadingBookmakers, setLoadingBookmakers] = useState(true);
  const [webhookTestState, setWebhookTestState] = useState<'idle' | 'sending' | 'ok' | 'error'>(
    'idle'
  );

  useEffect(() => {
    api
      .getBookmakers()
      .then((res) => setAllBookmakers(res.data))
      // Si ni siquiera se puede contactar con el backend, se usa el
      // catálogo conocido como último recurso: el listado de veto no
      // debe quedarse vacío por un fallo de red puntual.
      .catch(() => setAllBookmakers(KNOWN_BOOKMAKERS))
      .finally(() => setLoadingBookmakers(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await onSave(draft);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function requestNotificationPermission() {
    if (typeof Notification === 'undefined') return;
    await Notification.requestPermission();
  }

  function toggleBookmaker(bookmaker: string) {
    setDraft((prev) => {
      const blocked = new Set(prev.blockedBookmakers);
      if (blocked.has(bookmaker)) {
        blocked.delete(bookmaker);
      } else {
        blocked.add(bookmaker);
      }
      return { ...prev, blockedBookmakers: Array.from(blocked) };
    });
  }

  async function handleTestWebhook() {
    if (!draft.webhookUrl) return;
    setWebhookTestState('sending');
    try {
      await api.testWebhook(draft.webhookUrl);
      setWebhookTestState('ok');
    } catch {
      setWebhookTestState('error');
    } finally {
      setTimeout(() => setWebhookTestState('idle'), 3000);
    }
  }

  // Une las casas conocidas por el backend con las que ya estuvieran
  // vetadas anteriormente (por si una casa deja de aparecer en las
  // cuotas actuales, no perdemos el registro de que estaba vetada).
  const bookmakersToShow = Array.from(
    new Set([...allBookmakers, ...draft.blockedBookmakers])
  ).sort();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Configuración</h1>
          <p>Ajustes generales de la aplicación y de las alertas.</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="form-grid">
          <div className="field">
            <label>Bankroll por defecto</label>
            <input
              type="number"
              min={0}
              value={draft.defaultBankroll}
              onChange={(e) => setDraft({ ...draft, defaultBankroll: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label>Moneda</label>
            <select
              value={draft.currency}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="MXN">MXN ($)</option>
              <option value="ARS">ARS ($)</option>
            </select>
          </div>
          <div className="field">
            <label>Idioma</label>
            <select
              value={draft.language}
              onChange={(e) => setDraft({ ...draft, language: e.target.value })}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="field">
            <label>Tema</label>
            <select
              value={draft.theme}
              onChange={(e) => setDraft({ ...draft, theme: e.target.value as 'dark' | 'light' })}
            >
              <option value="dark">Oscuro</option>
              <option value="light">Claro</option>
            </select>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0, fontSize: 14, color: 'var(--text-secondary)' }}>Alertas</h3>

        <div className="settings-row">
          <div>
            <div className="settings-label">Beneficio mínimo para avisar</div>
            <div className="settings-desc">
              Solo se generarán alertas para surebets con beneficio igual o superior a este %.
            </div>
          </div>
          <input
            type="number"
            min={0}
            step={0.1}
            style={{ width: 90 }}
            value={draft.minProfitAlert}
            onChange={(e) => setDraft({ ...draft, minProfitAlert: Number(e.target.value) })}
          />
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-label">Sonido al detectar surebet</div>
            <div className="settings-desc">Reproduce un aviso sonoro en el navegador.</div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={draft.soundAlertsEnabled}
              onChange={(e) => setDraft({ ...draft, soundAlertsEnabled: e.target.checked })}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-label">Notificaciones del navegador</div>
            <div className="settings-desc">
              Requiere permiso del navegador.{' '}
              <button
                className="btn"
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={requestNotificationPermission}
              >
                Conceder permiso
              </button>
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={draft.browserNotificationsEnabled}
              onChange={(e) =>
                setDraft({ ...draft, browserNotificationsEnabled: e.target.checked })
              }
            />
            <span className="slider" />
          </label>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
          Modo discreto
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: -6 }}>
          Redondea los importes a apostar en cada resultado para que no parezcan un
          cálculo exacto de arbitraje. Reduce (pero no elimina) el riesgo de que una
          casa te limite la cuenta.{' '}
          <strong>El beneficio deja de ser idéntico en todos los resultados</strong> —
          verás un beneficio "peor caso" y "mejor caso" en vez de una única cifra.
        </p>

        <div className="settings-row">
          <div>
            <div className="settings-label">Activar modo discreto</div>
            <div className="settings-desc">
              Se aplica en la Calculadora, el Dashboard y el Historial.
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={draft.discreetModeEnabled}
              onChange={(e) => setDraft({ ...draft, discreetModeEnabled: e.target.checked })}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-label">Redondear importes a múltiplos de</div>
            <div className="settings-desc">
              Cuanto mayor sea, más "normales" parecerán las apuestas, pero más se
              alejan del reparto matemáticamente óptimo.
            </div>
          </div>
          <input
            type="number"
            min={1}
            step={1}
            style={{ width: 90 }}
            value={draft.discreetRoundingUnit}
            onChange={(e) => setDraft({ ...draft, discreetRoundingUnit: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
          Cuotas de alto valor
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: -6 }}>
          Además de las surebets (arbitraje entre varias casas), la app calcula "cuotas de
          valor": apuestas individuales cuyo precio supera la probabilidad de consenso del
          mercado (des-margenando las cuotas de todas las casas que cubren el evento).
        </p>

        <div className="settings-row">
          <div>
            <div className="settings-label">Activar cuotas de alto valor</div>
            <div className="settings-desc">Se muestran en la página "Cuotas de valor".</div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={draft.valueBetsEnabled}
              onChange={(e) => setDraft({ ...draft, valueBetsEnabled: e.target.checked })}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-label">EV mínimo para considerarla "de valor"</div>
            <div className="settings-desc">
              Valor esperado mínimo (%) que debe superar una cuota frente al consenso del
              mercado.
            </div>
          </div>
          <input
            type="number"
            min={0}
            step={0.5}
            style={{ width: 90 }}
            value={draft.minEvPercent}
            onChange={(e) => setDraft({ ...draft, minEvPercent: Number(e.target.value) })}
          />
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-label">Fracción de Kelly para el stake sugerido</div>
            <div className="settings-desc">
              1 = Kelly completo (máxima varianza), 0.25 = Kelly ¼ (recomendado, más
              conservador). Se usa para calcular la apuesta sugerida en cada cuota de valor.
            </div>
          </div>
          <input
            type="number"
            min={0.05}
            max={1}
            step={0.05}
            style={{ width: 90 }}
            value={draft.kellyFraction}
            onChange={(e) => setDraft({ ...draft, kellyFraction: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
          Vetar casas de apuestas
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: -6 }}>
          Desmarca una casa para excluirla de TODOS los cálculos (surebets y cuotas de
          valor) — por ejemplo, si esa cuenta ya está limitada, o simplemente no operas ahí.
          Las casas marcadas (✓) se tienen en cuenta con normalidad.
        </p>

        {loadingBookmakers ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <span className="spinner" /> Cargando casas de apuestas...
          </div>
        ) : bookmakersToShow.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            Aún no hay casas de apuestas disponibles (vuelve a intentarlo cuando haya cuotas
            cargadas).
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button className="btn" onClick={() => setDraft({ ...draft, blockedBookmakers: [] })}>
                Marcar todas
              </button>
              <button
                className="btn"
                onClick={() => setDraft({ ...draft, blockedBookmakers: [...bookmakersToShow] })}
              >
                Desmarcar todas
              </button>
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', alignSelf: 'center' }}>
                {bookmakersToShow.length - draft.blockedBookmakers.length} de{' '}
                {bookmakersToShow.length} activas
              </span>
            </div>

            <div className="bookmaker-grid">
              {bookmakersToShow.map((bookmaker) => {
                const blocked = draft.blockedBookmakers.includes(bookmaker);
                return (
                  <label
                    key={bookmaker}
                    className={`bookmaker-chip${blocked ? ' blocked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={!blocked}
                      onChange={() => toggleBookmaker(bookmaker)}
                    />
                    {bookmaker}
                  </label>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
          Alertas por webhook / móvil
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: -6 }}>
          El sonido y las notificaciones del navegador solo funcionan con la pestaña abierta.
          Configura una URL de webhook para recibir un aviso en el móvil aunque tengas la app
          cerrada — funciona con{' '}
          <a href="https://ntfy.sh" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>
            ntfy.sh
          </a>{' '}
          (gratis, sin cuenta: crea un tema y usa{' '}
          <code>https://ntfy.sh/tu-tema-secreto</code>), y también con webhooks de Discord o
          Slack.
        </p>

        <div className="settings-row">
          <div>
            <div className="settings-label">Activar alertas por webhook</div>
            <div className="settings-desc">
              Avisa de nuevas surebets (según el beneficio mínimo de arriba) y cuotas de
              valor.
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={draft.webhookAlertsEnabled}
              onChange={(e) => setDraft({ ...draft, webhookAlertsEnabled: e.target.checked })}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="settings-row">
          <div style={{ flex: 1 }}>
            <div className="settings-label">URL del webhook</div>
            <input
              type="text"
              placeholder="https://ntfy.sh/tu-tema-secreto"
              style={{ width: '100%', marginTop: 8 }}
              value={draft.webhookUrl}
              onChange={(e) => setDraft({ ...draft, webhookUrl: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
          <button className="btn" onClick={handleTestWebhook} disabled={!draft.webhookUrl || webhookTestState === 'sending'}>
            {webhookTestState === 'sending' ? 'Enviando...' : 'Enviar prueba'}
          </button>
          {webhookTestState === 'ok' && (
            <span style={{ color: 'var(--green)', fontSize: 13 }}>✓ Enviada</span>
          )}
          {webhookTestState === 'error' && (
            <span style={{ color: 'var(--red)', fontSize: 13 }}>✕ Error al enviar</span>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saved && <span style={{ color: 'var(--green)', fontSize: 13 }}>✓ Guardado</span>}
      </div>
    </div>
  );
}
