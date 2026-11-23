'use client';

import { labStore, titrationPH } from '@/lib/labStore';

let started = false;

/**
 * Time-based parts of the simulation that run whether or not anything is being rendered:
 * the burette dispensing while its tap is open, and the balance reading drifting while the
 * draft shield is open. Started once by the lab scene.
 */
export function startLabSimulation() {
  if (started || typeof window === 'undefined') return;
  started = true;

  // Balance reading: settles when the shield is closed, drifts with air currents when open
  setInterval(() => {
    const r = labStore.get().research;
    const drift = r.doorsOpen ? (Math.random() - 0.5) * 0.0008 : 0;
    const reading = Math.round((r.massOnPan - r.tareOffset + drift) * 10000) / 10000;
    if (reading !== r.balanceWeight) labStore.update('research', { balanceWeight: reading });
  }, 400);

  // Burette: 0.1 mL every 200 ms (0.5 mL/s) while the tap is open
  setInterval(() => {
    const c = labStore.get().chemistry;
    if (!c.buretteOpen || c.buretteML <= 0) return;
    const step = Math.min(0.1, c.buretteML);
    const dispensedML = Math.round((c.dispensedML + step) * 100) / 100;
    labStore.update('chemistry', { dispensedML, buretteML: c.buretteML - step, phValue: titrationPH(dispensedML, c.flaskAcidML) });
  }, 200);
}
