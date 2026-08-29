import { useEffect, useState } from 'react';
import { RoleSelect } from './views/RoleSelect';
import { AdminPortal } from './views/AdminPortal';
import { GateScanner } from './views/GateScanner';

type View = 'home' | 'admin' | 'gate';

function viewFromHash(): View {
  const h = window.location.hash.replace('#', '');
  return h === 'admin' || h === 'gate' ? h : 'home';
}

export default function App() {
  const [view, setView] = useState<View>(viewFromHash());

  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const go = (next: View) => {
    window.location.hash = next === 'home' ? '' : next;
    setView(next);
  };

  if (view === 'admin') return <AdminPortal onBack={() => go('home')} />;
  if (view === 'gate') return <GateScanner onBack={() => go('home')} />;
  return <RoleSelect onPick={(v) => go(v)} />;
}
