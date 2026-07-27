'use client';

/**
 * Rendu des VOIES d'une créature de bestiaire (`Creature.paths`, ex. aberratus :
 * « Voie des illusions rang 5 », « Voie de l'envoûteur rang 5 ») au format
 * « Voies & capacités » de la fiche de personnage : un titre de voie (icône + nom
 * canonique + rang) puis une carte par capacité des rangs 1..N.
 *
 * RÈGLE (propriétaire, 2026-07-27) : « Voie X rang N » (voie de profil de joueur) =
 * la voie ENTIÈRE jusqu'au rang indiqué, donc les capacités des rangs 1..N (cf.
 * `resolvePath`). L'aberratus au rang 5 possède ainsi les 5 rangs de la voie.
 *
 * Les voies sont disposées en GRILLE 2 colonnes (1 seule en mode `dense`, cf. le bloc
 * des capacités spéciales), sinon la colonne unique étroite est illisible.
 *
 * On RÉSOUT chaque `pathId` contre les données de voies (`pathById`/`featureById`) —
 * on ne recopie donc jamais le contenu d'une voie : le nom et les capacités viennent
 * de la source unique déjà utilisée par la fiche. Les briques de rendu (`FeatureLabel`
 * = nom + marqueurs d'action ; `FeatureText` = description enrichie) sont exactement
 * celles de la fiche, alimentées par les caractéristiques FIXES de la créature.
 *
 * Niveau (`FeatureText.level`) : une créature n'a pas de niveau ; on utilise son NC
 * comme proxy pour les rares dés ÉVOLUTIFS des sorts. Les formules non évolutives
 * (`[rang]`, `@carac`, dés fixes) se résolvent, elles, sur le rang de voie et les
 * caractéristiques — donc exactement.
 */
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { AbilityId, CreaturePathReference } from '@/data/schema';
import { resolvePath, type ResolvedPath } from '@/lib/bestiary/creaturePaths';
import { classColor } from '@/lib/ui/classColors';
import { ClassIcon } from '@/components/ClassIcon';
import { FeatureLabel } from '@/components/FeatureLabel';
import { SourceRef } from '@/components/SourceRef';
import { FeatureText } from '@/components/sheet/FeatureRichText';

export interface CreaturePathBlockProps {
  paths: CreaturePathReference[];
  /** Caractéristiques FIXES de la créature (résolution des formules `@carac`). */
  abilities?: Record<AbilityId, number>;
  /** NC de la créature — proxy de « niveau » pour les dés évolutifs (cf. en-tête). */
  nc?: number;
  /** Rendu compact (écran de MJ) : réduit un poil la typo, comme le reste du bloc. */
  dense?: boolean;
  /**
   * Dispose les voies sur 2 colonnes (sm+). En temps normal on suit `!dense` (bestiaire
   * large = 2 col, carte MJ étroite = 1 col), mais une carte MJ « large » (2 colonnes)
   * repasse ici à 2 colonnes malgré `dense`. Décidé par l'appelant.
   */
  twoColumns?: boolean;
}

export function CreaturePathBlock({ paths, abilities, nc, dense = false, twoColumns = !dense }: CreaturePathBlockProps) {
  const resolved = paths.map(resolvePath).filter((p): p is ResolvedPath => p !== null);
  if (resolved.length === 0) return null;
  // Niveau proxy pour les dés évolutifs (cf. en-tête de fichier). Entier ≥ 1.
  const level = nc != null ? Math.max(1, Math.round(nc)) : undefined;

  return (
    <Box
      sx={{
        display: 'grid',
        // 2 colonnes quand il y a la place (bestiaire large, ou carte MJ « large ») ;
        // 1 seule sur carte MJ étroite. Même modèle que le bloc des capacités spéciales.
        gridTemplateColumns: twoColumns ? { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } : '1fr',
        gap: 1.25,
      }}
    >
      {resolved.map(({ ref, name, classId, sourcePage, features }) => {
        // Couleur de profil dérivée au RENDU (le module de résolution reste sans UI).
        const color = classId ? classColor(classId) : undefined;
        return (
        <Box key={ref.pathId}>
          {/* Titre de voie : icône de profil (teintée) + nom canonique + rang, façon fiche. */}
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.25, mb: 0.75 }}
          >
            {classId && (
              <ClassIcon classId={classId} size={18} sx={{ color: color ?? undefined, flexShrink: 0 }} />
            )}
            <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: color ?? 'text.primary' }}>
              {name}
            </Typography>
            <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              rang {ref.rank}
            </Typography>
            {sourcePage != null && <SourceRef page={sourcePage} term={name} />}
          </Stack>

          {/* La carte de la capacité du rang indiqué (mêmes briques que la fiche). */}
          <Stack spacing={0.75}>
            {features.map((feature) => (
              <Box
                key={feature.id}
                sx={{
                  p: 1,
                  border: 1,
                  borderColor: color ? alpha(color, 0.4) : 'divider',
                  borderRadius: 1,
                  bgcolor: color
                    ? alpha(color, 0.06)
                    : (theme) => alpha(theme.palette.text.primary, 0.04),
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                  rang {feature.rank}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  <FeatureLabel feature={feature} pathRank={ref.rank} />
                </Typography>
                <Box sx={{ mt: 0.25 }}>
                  <FeatureText feature={feature} abilities={abilities} level={level} pathRank={ref.rank} dense={dense} />
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
        );
      })}
    </Box>
  );
}
