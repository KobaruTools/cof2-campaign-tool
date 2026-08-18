'use client';

/**
 * Sous-page « Objets magiques » du Codex (PER-419) — consultation en LECTURE SEULE, SANS
 * personnage, des deux catalogues qui composent ce chapitre du livre :
 *  - les 14 CRISTAUX de la Voie des cristaux (prestige mage, p. 156) ;
 *  - les PROPRIÉTÉS D'ENCHANTEMENT (arme p. 251-252, défense p. 253-254) — pas des objets nommés,
 *    des RÈGLES paramétriques (fléau, élément, résistance...) qui donnent leur niveau de magie à
 *    un objet. Cadré avec le propriétaire avant code : deux sections distinctes plutôt qu'une
 *    liste plate, ces deux contenus étant de nature différente.
 *
 * Contenu FREE (livre de base, `src/data/crystals.ts` + `magicItem.ts`) : aucun gating payant à
 * appliquer ici, contrairement aux voies du Compagnon listées par `CodexPathBrowser`.
 */
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { CRYSTALS, crystalLabel } from '@/data/crystals';
import {
  MAGIC_DEFENSE_PROPERTY_KINDS,
  MAGIC_PROPERTY_RULES,
  MAGIC_WEAPON_PROPERTY_KINDS,
} from '@/lib/character/magicItem';
import type { MagicPropertyKind } from '@/lib/character/types';
import { ItemIcon } from '@/components/ItemIcon';
import { SourceRef } from '@/components/SourceRef';

/** Page de la table des cristaux dans le livre de base (`Crystal` ne porte pas ce champ : une seule table). */
const CRYSTAL_PAGE = 156;

const panelSx = {
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  bgcolor: 'rgba(0, 0, 0, 0.35)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
} as const;

/** Fiche imbriquée DANS une section (`panelSx`) : fond plus clair pour rester distincte du fond du conteneur. */
const cardSx = {
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  bgcolor: 'rgba(255, 255, 255, 0.04)',
} as const;

/**
 * Niveau de magie que la propriété AJOUTE, en texte court pour le Codex — reprend les règles déjà
 * chiffrées par `basePropertyMagicLevel` (`magicItem.ts`), sans les paramètres qui ne se fixent
 * qu'à la pose sur un objet précis (catégorie de fléau, substance, bonus de parade choisi...).
 */
const MAGIC_LEVEL_LABEL: Record<MagicPropertyKind, string> = {
  sharp: '+1',
  bane: '+1',
  elemental: '+2',
  parry: '= bonus de DEF accordé',
  'free-action': '+1',
  defense: '+1 (RD 2) ou +2 (Défense supérieure, RD 4)',
  mobile: '+1',
  swimming: '+1',
  shadow: '+1',
  protection: '+1',
  'magic-resistance': '+1',
  resistance: '+1',
};

/** Kinds où la RÈGLE MAISON des dés personnalisés (`customDice`) s'applique. */
const CUSTOM_DICE_KINDS: readonly MagicPropertyKind[] = ['bane', 'elemental'];

function PropertyCard({ kind }: { kind: MagicPropertyKind }) {
  const rule = MAGIC_PROPERTY_RULES[kind];
  return (
    <Box sx={{ ...cardSx, p: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.75 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {rule.name}
        </Typography>
        <SourceRef page={rule.sourcePage} term={rule.name} />
      </Stack>
      <Typography variant="body2">
        <strong>Niveau de magie :</strong> {MAGIC_LEVEL_LABEL[kind]}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {rule.verbatim}
      </Typography>
      {CUSTOM_DICE_KINDS.includes(kind) && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
          Règle maison : la table peut remplacer le +1d4° fixe du livre par des dés personnalisés — le
          niveau de magie suit alors le total de dégâts attendu de ces dés plutôt que la valeur fixe.
        </Typography>
      )}
    </Box>
  );
}

function PropertyGroup({ title, kinds }: { title: string; kinds: readonly MagicPropertyKind[] }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 700 }}>
        {title}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(280px, 1fr))' },
        }}
      >
        {kinds.map((kind) => (
          <PropertyCard key={kind} kind={kind} />
        ))}
      </Box>
    </Box>
  );
}

export function CodexMagicItemsBrowser() {
  // Défilement direct sur un CRISTAL précis (suite bouton codex, `?id=<crystalId>`, cf.
  // `crystalCodexHref`) — même patron que `CodexPathBrowser` (ancre + compensation de l'`AppBar`
  // sticky, `#app-header`), seule sous-page du Codex à en avoir besoin pour l'instant : les
  // propriétés d'enchantement n'ont pas d'id de catalogue propre, rien ne pointe encore dessus.
  const requestedId = useSearchParams().get('id');
  useEffect(() => {
    if (!requestedId) return;
    const el = document.getElementById(`codex-crystal-${requestedId}`);
    if (!el) return;
    const headerHeight = document.getElementById('app-header')?.getBoundingClientRect().height ?? 0;
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
    window.scrollTo({ top, behavior: 'smooth' });
  }, [requestedId]);

  return (
    <Stack spacing={4}>
      <Box sx={{ ...panelSx, p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Propriétés d&apos;enchantement
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Ce ne sont pas des objets nommés : chaque propriété est une règle qui s&apos;ajoute à une
          arme ou un équipement défensif et détermine son niveau de magie. Une propriété peut être
          DOUBLÉE (effet ET niveau de magie doublés, p. 251/254).
        </Typography>
        <PropertyGroup title="Armes" kinds={MAGIC_WEAPON_PROPERTY_KINDS} />
        <PropertyGroup title="Défense" kinds={MAGIC_DEFENSE_PROPERTY_KINDS} />
      </Box>

      <Box sx={{ ...panelSx, p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
            Cristaux
          </Typography>
          <SourceRef page={CRYSTAL_PAGE} term="Voie des cristaux" />
        </Stack>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Les 14 cristaux de la Voie des cristaux (prestige mage). Un personnage doit apprendre puis
          ACTIVER un cristal pour bénéficier de son effet.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(260px, 1fr))' },
          }}
        >
          {CRYSTALS.map((crystal) => (
            <Box
              key={crystal.id}
              id={`codex-crystal-${crystal.id}`}
              sx={{
                ...cardSx,
                p: 2,
                ...(requestedId === crystal.id && {
                  borderColor: (theme) => alpha(theme.palette.primary.main, 0.6),
                  boxShadow: (theme) => `0 0 0 1px ${alpha(theme.palette.primary.main, 0.6)}`,
                }),
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5 }}>
                <ItemIcon id="gems" size={16} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {crystalLabel(crystal)}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {crystal.effectText}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Stack>
  );
}
