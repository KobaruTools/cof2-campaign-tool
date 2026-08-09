import { describe, expect, it } from 'vitest';

import { PortraitValidationError, validatePortraitFile } from './characterPortrait';

describe('validatePortraitFile', () => {
  it('accepte png/jpeg/webp sous la limite de taille', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
      expect(() => validatePortraitFile({ size: 1024, type })).not.toThrow();
    }
  });

  it('refuse un format non pris en charge (ex. svg)', () => {
    expect(() => validatePortraitFile({ size: 1024, type: 'image/svg+xml' })).toThrow(
      PortraitValidationError,
    );
  });

  it('refuse un fichier trop volumineux', () => {
    expect(() =>
      validatePortraitFile({ size: 16 * 1024 * 1024, type: 'image/png' }),
    ).toThrow(PortraitValidationError);
  });
});
