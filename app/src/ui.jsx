// Small pieces shared by the React screens.
import { useLayoutEffect, useRef } from 'react';
import { tx } from './bridge.js';

// The gear icon on header buttons that open a page's setup (was the GEAR string in loans.js).
export const Gear = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;

// A number that counts up from what it showed last time (cu() in math.js, keyed by k), as the old screens did right
// after drawing. Starts empty, like the old markup.
export function CountUp({ as: T = 'b', k, to, fmt, ...rest }) {
  const ref = useRef(null);
  useLayoutEffect(() => { cu(ref.current, k, to, fmt); }, [k, to, fmt]);
  return <T ref={ref} {...rest}></T>;
}

// Progress ring with the percent in the middle (was ring() in math.js).
export function Ring({ pct, c, sz = 118 }) {
  const R = sz / 2 - 10, L = 2 * Math.PI * R, p = Math.max(0, Math.min(1, pct));
  return <svg className="ring" viewBox={`0 0 ${sz} ${sz}`} aria-hidden="true"><circle cx={sz / 2} cy={sz / 2} r={R} fill="none" stroke="var(--s3)" strokeWidth="12" /><circle cx={sz / 2} cy={sz / 2} r={R} fill="none" stroke={`${c}`} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${p * L} ${L}`} transform={`rotate(-90 ${sz / 2} ${sz / 2})`} opacity={p > 0.004 ? 1 : 0} /><text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle" fill="var(--text)" fontFamily="Inter Display,Inter" fontWeight="800" fontSize="24" letterSpacing="-.5">{Math.round(p * 100)}%</text></svg>;
}

// Header of a collapsible card (was clh() in math.js); click/Enter handled by the bcol action.
export function Clh({ k, shut, title, sum, tag: T = 'h2' }) {
  return <T className="clh" data-act="bcol" data-v={k} role="button" tabIndex="0" aria-expanded={`${!shut}`}>{title}<small className="bsm">{sum || ''}</small><i className="chev" aria-hidden="true"></i></T>;
}

// "Bank · Account ••1234" (was nmA() in wealth.js).
export const NmA = ({ a }) => <>{tx(a.institution)} · {tx(a.official || a.name)}{a.mask ? ' ••' + tx(a.mask) : ''}</>;
