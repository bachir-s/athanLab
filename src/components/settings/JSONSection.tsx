import type { AppAction } from '../../types';
import { NAMES_AR, NAMES_FR } from '../../lib/prayerCalc';
import { storageSet, storageRemove } from '../../lib/storage';

interface Props {
  customJSON: Record<string, unknown> | null;
  dispatch:   React.Dispatch<AppAction>;
  onClose:    () => void;
}

export function JSONSection({ customJSON, dispatch, onClose }: Props) {
  function loadJSON(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as Record<string, unknown>;
        const years  = Object.keys(parsed).filter(k => /^20\d{2}$/.test(k));
        const cityName = (parsed.ville as string)
          ? `${parsed.ville} (${(parsed.methode as string) || 'personnalisé'})`
          : years.length ? `Horaires ${years.join('–')}` : file.name.replace('.json', '');

        dispatch({ type: 'SET_CUSTOM_JSON', json: parsed, cityName });
        storageSet('customJSON',     e.target?.result as string);
        storageSet('customJSONName', file.name);
        onClose();
      } catch { alert('JSON invalide — vérifiez le format'); }
    };
    reader.readAsText(file);
  }

  function clearJSON() {
    dispatch({ type: 'SET_CUSTOM_JSON', json: null });
    storageRemove('customJSON');
    storageRemove('customJSONName');
  }

  // Build status label
  let statusText = 'Aucun fichier — calcul automatique actif';
  let statusColor = 'rgba(255,255,255,0.3)';
  if (customJSON) {
    const now = new Date();
    const y   = now.getFullYear();
    const m   = now.getMonth() + 1;
    const d   = now.getDate();
    const data = customJSON as Record<string, Record<string, Record<string, Record<string, string>>>>;
    const dayData = data[y]?.[m]?.[d];
    if (dayData) {
      statusText  = `✓ ${d}/${m}/${y} : ${dayData.fajr} → ${dayData.isha}`;
    } else {
      statusText  = '✓ Fichier chargé (jour non trouvé → calcul auto)';
    }
    statusColor = 'rgba(46,204,113,0.8)';
  }

  return (
    <div className="setting-section">
      <div className="setting-title">Importer horaires personnalisés (JSON)</div>
      <label className="file-label" htmlFor="json-input">
        📂 Charger mon fichier d'horaires
      </label>
      <input
        type="file"
        id="json-input"
        accept=".json"
        style={{ display: 'none' }}
        onChange={loadJSON}
      />
      <div className="location-info" style={{ color: statusColor }}>{statusText}</div>
      {customJSON && (
        <button className="s-btn" onClick={clearJSON}>✕ Effacer le fichier</button>
      )}
    </div>
  );
}

// Re-export name constants so they are used
export { NAMES_AR, NAMES_FR };
