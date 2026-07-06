import { describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { displayNameOf } from './displayName';

/** Utilisateur minimal (les champs non testés n'importent pas au helper). */
const user = (over: Partial<Pick<User, 'email' | 'user_metadata'>>): Pick<
  User,
  'email' | 'user_metadata'
> => ({ email: undefined, user_metadata: {}, ...over });

describe('displayNameOf', () => {
  it('préfère le nom d’affichage explicite', () => {
    expect(displayNameOf(user({ user_metadata: { display_name: 'Pierre (MJ)' } }))).toBe(
      'Pierre (MJ)',
    );
  });

  it('rogne les espaces du nom d’affichage', () => {
    expect(displayNameOf(user({ user_metadata: { display_name: '  Aria  ' } }))).toBe('Aria');
  });

  it('replie sur l’email si le nom est vide ou absent', () => {
    expect(displayNameOf(user({ email: 'mj@example.com', user_metadata: { display_name: '   ' } }))).toBe(
      'mj@example.com',
    );
    expect(displayNameOf(user({ email: 'mj@example.com' }))).toBe('mj@example.com');
  });

  it('replie sur un libellé générique sans nom ni email', () => {
    expect(displayNameOf(user({}))).toBe('Compte');
  });
})
