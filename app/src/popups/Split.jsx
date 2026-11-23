// The split form in a Move panel (Split between categories…; was spRows + the spOpen/spAdd handlers). spForm draws it
// into the panel's .spf box; spAddPart adds an empty part by drawing again into the same root, so what's already
// typed or chosen stays (the inputs keep their own values). spLeft (the "left to assign" text) and spSave still read
// the boxes by class, as before.
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { tx, onAct } from '../bridge.js';
import { TxOpts } from '../ui.jsx';

function SpForm({ id, n }) {
  const r = S.txd[id], dir = r.amt < 0 ? 'in' : 'out', rows = [[r.v, Math.abs(r.amt)], ...Array.from({ length: n - 1 }, () => ['', ''])];
  return <>{rows.map(([v, a], i) => <div className="spr" key={i}><select className="in" aria-label="Category" defaultValue={v}><TxOpts k={r.k} dir={dir} /></select><input className="in a" data-live="sp" inputMode="decimal" defaultValue={tx(a)} placeholder="$0" aria-label="Amount" /></div>)}
    <div className="spa"><button className="lnk" data-act="spAdd" onClick={onAct('spAdd')}>Add a part</button><span className="spl dim"></span><button className="btn sm" data-act="spSave" onClick={onAct('spSave')}>Save split</button></div></>;
}
const show = (box, id, n) => { flushSync(() => box._sp.root.render(<SpForm id={id} n={n} />)); box._sp.n = n; spLeft(box); };
export function spFormR(box, id) { box.textContent = ''; box._sp = { root: createRoot(box), id }; show(box, id, 2); }
export function spAddPartR(box) { const s = box._sp; if (!s || s.id !== box.dataset.spf) return spFormR(box, box.dataset.spf); show(box, s.id, s.n + 1); }
