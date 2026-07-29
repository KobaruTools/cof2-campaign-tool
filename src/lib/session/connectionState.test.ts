import { describe, expect, it } from 'vitest';

import {
  sessionConnectionLabel,
  sessionConnectionState,
  type SessionConnectionState,
} from './connectionState';
import type { SessionChannelStatus } from './useSessionChannel';

describe('sessionConnectionState', () => {
  it('hors ligne prime sur tout état du canal', () => {
    const statuses: SessionChannelStatus[] = ['idle', 'connecting', 'joined', 'error'];
    for (const status of statuses) {
      expect(sessionConnectionState(status, false)).toBe('offline');
    }
  });

  it('canal joined + en ligne = connecté', () => {
    expect(sessionConnectionState('joined', true)).toBe('connected');
  });

  it('en ligne mais canal pas encore joined = reconnexion (le socket tente de rejoindre)', () => {
    expect(sessionConnectionState('connecting', true)).toBe('reconnecting');
    expect(sessionConnectionState('error', true)).toBe('reconnecting');
    expect(sessionConnectionState('idle', true)).toBe('reconnecting');
  });
});

describe('sessionConnectionLabel', () => {
  it('rend un libellé français par état', () => {
    const labels: Record<SessionConnectionState, string> = {
      connected: 'Connecté',
      reconnecting: 'Reconnexion…',
      offline: 'Hors ligne',
    };
    for (const [state, label] of Object.entries(labels)) {
      expect(sessionConnectionLabel(state as SessionConnectionState)).toBe(label);
    }
  });
});
