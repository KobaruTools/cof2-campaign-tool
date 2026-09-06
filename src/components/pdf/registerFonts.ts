/**
 * Police embarquée commune à tous les formats d'export PDF (PER-201/PER-202) — le rendu par
 * défaut de `@react-pdf/renderer` n'a que Helvetica/Times/Courier, sans accents français
 * fiables. `Font.register` doit être appelé avant le premier rendu ; importé (effet de bord)
 * par chaque `styles.ts` de format pour ne dépendre de l'ordre d'import d'aucun autre format.
 *
 * `fontsReady` (PER-202) : dans un navigateur, la police est chargée depuis un CDN distant
 * (réseau non déterministe). Constaté en recette : sans l'attendre explicitement, certains
 * textes en gras (bandeaux de titre) se retrouvaient mesurés/rendus avec la 1ʳᵉ lettre tronquée
 * — race condition entre le fetch de la police et la 1ʳᵉ passe de mise en page. Les fonctions
 * `download*Pdf.tsx` DOIVENT attendre `fontsReady` avant d'appeler `pdf(...).toBlob()`.
 */
import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-400-normal.ttf' },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf', fontWeight: 700 },
  ],
});

/**
 * Police d'affiche (PER-202, format « Fiche officielle BBE ») : la trame de référence utilise
 * un serif à empattements évasés pour son logo — Cinzel (Google Fonts, licence OFL) en est un
 * équivalent libre proche dans l'esprit, PAS une copie de la police propriétaire BBE.
 */
Font.register({
  family: 'Cinzel',
  fonts: [{ src: 'https://cdn.jsdelivr.net/fontsource/fonts/cinzel@latest/latin-700-normal.ttf', fontWeight: 700 }],
});

export const fontsReady: Promise<unknown> = Promise.all([
  Font.load({ fontFamily: 'Roboto', fontWeight: 400 }),
  Font.load({ fontFamily: 'Roboto', fontWeight: 700 }),
  Font.load({ fontFamily: 'Cinzel', fontWeight: 700 }),
]);
