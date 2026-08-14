import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLASS_PORTRAIT_EXTRAS, classPortraitExtras } from './classPortraitOptions';
import { classPortraitPath } from '@/lib/storage/useCharacterPortraitSrc';

const PUBLIC_ROOT = join(__dirname, '..', '..', 'public');

describe('classPortraitOptions', () => {
  it('chaque illustration supplémentaire référencée existe dans public/classes', () => {
    for (const [classId, extras] of Object.entries(CLASS_PORTRAIT_EXTRAS)) {
      for (const extra of extras) {
        const path = classPortraitPath(classId, extra.variant);
        expect(existsSync(join(PUBLIC_ROOT, path))).toBe(true);
      }
    }
  });

  it('classPortraitExtras renvoie un tableau vide pour un profil sans extra', () => {
    expect(classPortraitExtras('profil-inexistant')).toEqual([]);
  });
});
