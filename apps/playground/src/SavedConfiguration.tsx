import { useEffect, useState } from 'react';
import type { StudioState } from './config';
import { SAVED_CONFIG_KEY, readSavedConfig, saveConfig, deleteSavedConfig } from './saved-config';

export function SavedConfiguration({ state, onLoad }: {
  state: StudioState;
  onLoad: (state: StudioState) => void;
}) {
  const [saved, setSaved] = useState(readSavedConfig);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (event.key === SAVED_CONFIG_KEY || event.key === null) {
        setSaved(readSavedConfig());
        setMessage('');
      }
    };
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  return (
    <section className="saved-config" aria-labelledby="saved-config-title">
      <div>
        <h2 id="saved-config-title">Saved configuration</h2>
        <p>Save for your next visit. Shared links take priority. Uploaded images are not saved.</p>
      </div>
      <div className="saved-config-actions">
        <button onClick={() => {
          const error = saveConfig(state);
          if (!error) setSaved(readSavedConfig());
          setMessage(error ?? (state.background === 'custom'
            ? 'Configuration saved. The uploaded image is replaced by Spectrum when loaded.'
            : 'Configuration saved in this browser.'));
        }}>Save configuration</button>
        <button disabled={!saved.state} onClick={() => {
          const next = readSavedConfig();
          setSaved(next);
          if (next.state) onLoad(next.state);
          setMessage(next.error ?? (next.state ? 'Saved configuration loaded.' : 'No saved configuration.'));
        }}>Load saved</button>
        <button disabled={!saved.exists} onClick={() => {
          const error = deleteSavedConfig();
          if (!error) setSaved({ state: null, exists: false, error: null });
          setMessage(error ?? 'Saved configuration deleted. Your current preview is unchanged.');
        }}>Delete saved</button>
      </div>
      <p className="saved-config-status" role="status">{message || saved.error || (saved.state ? 'A saved configuration is available.' : 'No saved configuration yet.')}</p>
    </section>
  );
}
