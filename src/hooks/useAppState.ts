import { useReducer, useEffect } from 'react';
import type { AppState, AppAction, WeatherConfig } from '../types';
import { computePrayerTimes, parseCustomJSON } from '../lib/prayerCalc';
import { resolveTheme } from '../lib/themes';
import { storageGet, storageSet } from '../lib/storage';

// ─── Initial State ────────────────────────────────────────────────
const getInitialWeatherConfig = (): WeatherConfig => ({
  service: (storageGet('weather_service') as WeatherConfig['service']) || 'none',
  apiKey:  storageGet('weather_key') || '',
});

const INITIAL_STATE: AppState = {
  lat:           48.8566,
  lng:           2.3522,
  cityName:      'Paris',
  method:        'UOIF',
  prayers:       null,
  customJSON:    null,
  debug:         true,
  fakeMinutes:   null,
  settingsOpen:  false,
  weatherConfig: { service: 'none', apiKey: '' },
  theme:         'night',
};

// ─── Reducer ──────────────────────────────────────────────────────
function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOCATION':
      return { ...state, lat: action.lat, lng: action.lng, cityName: action.cityName, customJSON: null };
    case 'SET_METHOD':
      return { ...state, method: action.method };
    case 'SET_PRAYERS':
      return { ...state, prayers: action.prayers };
    case 'SET_CUSTOM_JSON':
      return { ...state, customJSON: action.json, cityName: action.cityName ?? state.cityName };
    case 'SET_DEBUG':
      return { ...state, debug: action.debug, fakeMinutes: action.debug ? state.fakeMinutes : null };
    case 'SET_FAKE_MINUTES':
      return { ...state, fakeMinutes: action.fakeMinutes };
    case 'TOGGLE_SETTINGS':
      return { ...state, settingsOpen: !state.settingsOpen };
    case 'OPEN_SETTINGS':
      return { ...state, settingsOpen: true };
    case 'CLOSE_SETTINGS':
      return { ...state, settingsOpen: false };
    case 'SET_WEATHER_CONFIG':
      return { ...state, weatherConfig: action.config };
    case 'SET_THEME':
      return { ...state, theme: action.theme };
    default:
      return state;
  }
}

// ─── Hook ────────────────────────────────────────────────────────
export function useAppState() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (init) => {
    const theme = resolveTheme(storageGet('athanlab-theme'));
    // Apply theme synchronously before first render to avoid flash
    document.documentElement.setAttribute('data-theme', theme);
    return {
      ...init,
      weatherConfig: getInitialWeatherConfig(),
      theme,
    };
  });

  // Recompute prayers when location, method, or customJSON changes
  useEffect(() => {
    let prayers;
    if (state.customJSON) {
      prayers = parseCustomJSON(state.customJSON);
    } else {
      prayers = computePrayerTimes(state.lat, state.lng, new Date(), state.method);
    }
    dispatch({ type: 'SET_PRAYERS', prayers });
  }, [state.lat, state.lng, state.method, state.customJSON]);

  // Persist weather config
  useEffect(() => {
    storageSet('weather_service', state.weatherConfig.service);
    storageSet('weather_key', state.weatherConfig.apiKey);
  }, [state.weatherConfig]);

  // Apply and persist theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
    storageSet('athanlab-theme', state.theme);
  }, [state.theme]);

  // Restore custom JSON from localStorage on mount
  useEffect(() => {
    try {
      const saved = storageGet('customJSON');
      if (!saved) return;
      const json = JSON.parse(saved);
      const years = Object.keys(json).filter(k => /^20\d{2}$/.test(k));
      const cityName = json.ville
        ? `${json.ville} (${json.methode || 'personnalisé'})`
        : years.length ? `Horaires ${years.join('–')}` : 'Horaires JSON';
      dispatch({ type: 'SET_CUSTOM_JSON', json, cityName });
    } catch { /* ignore */ }
  }, []);

  return { state, dispatch };
}
