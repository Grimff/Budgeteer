// The amount dialog (Log a loan payment, Save toward a goal; was openD in js/flow.js). payDialog / depDialog build
// its options and call openD by name. The loan/goal choice (#dsel) and the quick amounts (#dc) are drawn here; the
// line under the amount (#dp) is still the HTML string DLG.prev returns (dprev), until that logic returns data.
// The #dsel change, #dc click, #da input and Save listeners stay in flow.js.
import { draw, tx } from '../bridge.js';

const DSel = ({ o }) => <label className="f" style={{ marginBottom: '12px' }}>{tx(o.selLab || 'Choose')}<select className="in" id="dsl2" defaultValue={o.selV}>{o.sel.map(x => <option key={x.v} value={`${x.v}`}>{tx(x.l)}</option>)}</select></label>;
const DChips = ({ chips }) => chips.map((c, i) => <button key={i} type="button" data-v={`${c.v}`}>{tx(c.l)}</button>);

export function openDR(o) {
  DLG = o; $('#dt').textContent = o.title; $('#ds').textContent = o.sub || '';
  draw($('#dsel'), o.sel ? <DSel o={o} /> : null);
  $('#da').value = o.amt != null ? fmtAmt(r2(o.amt)) : ''; draw($('#dc'), <DChips chips={o.chips || []} />);
  $('#ddel').hidden = !o.del; $('#dok').textContent = o.ok || 'Save'; dprev(); $('#dlg').showModal(); setTimeout(() => { $('#da').focus(); $('#da').select(); }, 30);
}
