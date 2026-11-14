import ScorerScreen from './scorer/ScorerScreen.jsx';
import SyncTest from './SyncTest.jsx';

// Scorer screen at "/". The bare sync test page (round switcher, timer) stays at "/sync-test".
export default function App() {
  return window.location.pathname.startsWith('/sync-test') ? <SyncTest /> : <ScorerScreen />;
}
