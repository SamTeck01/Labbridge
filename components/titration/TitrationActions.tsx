'use client';

import React from 'react';
import ArcActions, { Icons, type ArcAction } from '@/components/ArcActions';
import { useTitration } from '@/lib/titration/sim';
import { runAction, useRunningAction, type ActionId } from '@/lib/titration/actions';

/** The titration as one-press steps: setting up first, then the run itself. */
export default function TitrationActions({ onOpenSheet }: { onOpenSheet: () => void }) {
  const t = useTitration((s) => s);
  const running = useRunningAction();
  const prep: { id: ActionId; label: string; icon: React.ReactNode; done: boolean }[] = [
    { id: 'fill', label: 'Fill the burette', icon: Icons.fill, done: t.hasLiquid && (t.reading <= 1 || !t.funnelIn) },
    { id: 'funnel', label: 'Take the funnel out', icon: Icons.funnel, done: !t.funnelIn },
    { id: 'jet', label: 'Clear the air bubble', icon: Icons.bubble, done: t.hasLiquid && !t.bubble },
    { id: 'pipette', label: 'Pipette 25 cm³ of acid', icon: Icons.pipette, done: t.acidMmol >= 2.3 },
    { id: 'indicator', label: 'Add 3 drops of indicator', icon: Icons.dropper, done: t.indicatorDrops > 0 },
    { id: 'tile', label: 'Flask under the burette', icon: Icons.flask, done: t.indicatorDrops > 0 && t.flaskAt === 'tile' },
  ];
  const setUp = prep.every((p) => p.done);
  const next = prep.find((p) => !p.done)?.id;
  const go = (id: ActionId) => () => void runAction(id, onOpenSheet);

  const actions: ArcAction[] = setUp
    ? [
        { id: 'read', label: 'Read the burette', icon: Icons.eye, onClick: go('read') },
        { id: 'fast', label: 'Open the tap: run', icon: Icons.stream, state: t.valve > 0.3 ? 'active' : 'idle', onClick: go('fast') },
        { id: 'drops', label: 'Drop by drop', icon: Icons.drop, state: t.valve > 0 && t.valve <= 0.3 ? 'active' : 'idle', onClick: go('drops') },
        { id: 'close', label: 'Close the tap', icon: Icons.stop, state: t.valve > 0 ? 'next' : 'idle', onClick: go('close') },
        { id: 'swirl', label: t.swirl > 0.1 ? 'Stop swirling' : 'Swirl the flask', icon: Icons.swirl, state: t.swirl > 0.1 ? 'active' : 'idle', onClick: go('swirl') },
        { id: 'sheet', label: 'Lab sheet', icon: Icons.sheet, onClick: go('sheet') },
      ]
    : prep.map((p) => ({
        id: p.id,
        label: p.label,
        icon: p.icon,
        state: running === p.id ? 'running' : p.done ? 'done' : p.id === next ? 'next' : 'idle',
        disabled: !!running && running !== p.id,
        onClick: go(p.id),
      }));
  return <ArcActions key={setUp ? 'run' : 'prep'} title={setUp ? 'Titrate' : 'Set up'} actions={actions} />;
}
