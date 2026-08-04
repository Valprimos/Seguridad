import { useState } from 'react';
import { AppSettings } from '../types';

interface SettingsPageProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => Promise<void>;
}

export function SettingsPage({ settings, onSave }: SettingsPageProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

      <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saved && <span style={{ color: 'var(--green)', fontSize: 13 }}>✓ Guardado</span>}
      </div>
    </div>
  );
}
