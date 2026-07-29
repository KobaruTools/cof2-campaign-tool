import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerSessionChannel, sessionSendFor } from './sessionBridge';

// Chaque test nettoie ses enregistrements (le module est un singleton de process).
afterEach(() => {
  // Désenregistre tout ce qui pourrait rester via un register/unregister propre.
});

describe('sessionBridge', () => {
  it('sessionSendFor renvoie null hors campagne / sans session branchée', () => {
    expect(sessionSendFor(null)).toBeNull();
    expect(sessionSendFor(undefined)).toBeNull();
    expect(sessionSendFor('inconnue')).toBeNull();
  });

  it('register expose l’émetteur, unregister le retire', () => {
    const send = vi.fn();
    const off = registerSessionChannel('c1', send);
    const got = sessionSendFor('c1');
    expect(got).toBe(send);
    got?.('game-state', { x: 1 });
    expect(send).toHaveBeenCalledWith('game-state', { x: 1 });
    off();
    expect(sessionSendFor('c1')).toBeNull();
  });

  it('un cleanup TARDIF ne retire pas un abonnement plus récent (garde par identité)', () => {
    const sendA = vi.fn();
    const sendB = vi.fn();
    const offA = registerSessionChannel('c2', sendA);
    const offB = registerSessionChannel('c2', sendB); // remontage rapide : B remplace A
    expect(sessionSendFor('c2')).toBe(sendB);
    offA(); // cleanup tardif de l'ancien abonnement → ne doit PAS effacer B
    expect(sessionSendFor('c2')).toBe(sendB);
    offB();
    expect(sessionSendFor('c2')).toBeNull();
  });
});
