import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { DieIcon } from '@/components/DieIcon';
import { CapabilityChip } from '@/components/sheet/FeatureRichText';
import type { BonusDieSource } from '@/lib/character/effects';

export interface BonusDieBadgeProps {
  /**
   * Caractéristique concernée (pour le libellé de l'info-bulle, ex. « CON »).
   * Une créature passe directement la carac ; le personnage la passe aussi.
   */
  ability: string;
  /**
   * Capacité(s) source(s) du dé bonus — listées dans l'info-bulle. Vide pour une créature dont la
   * source est l'option choisie (libellé générique alors). Deux formes acceptées :
   *  - `BonusDieSource` (`{ featureId, name }`, PER-378) : rendu en `CapabilityChip` cliquable (puce
   *    couleur de voie + icône) — utilisée quand l'appelant a l'id de la capacité sous la main.
   *  - `string` (nom seul) : repli en texte simple, pour les appelants qui n'ont pas encore été
   *    convertis, ou en mode `noTooltip` (attribut `title` natif, plain-text uniquement).
   */
  sources?: (string | BonusDieSource)[];
  /** Taille en pixels d'un dé (les deux dés sont légèrement décalés). Défaut 16. */
  size?: number;
  /**
   * Supprime l'info-bulle propre du badge (le libellé reste en `aria-label`/`title`
   * natif). À utiliser quand le badge est posé À L'INTÉRIEUR d'un autre déclencheur
   * d'info-bulle, pour ne pas empiler deux bulles MUI.
   */
  noTooltip?: boolean;
  /**
   * Libellé COMPLET de l'info-bulle (override). Absent → « Dé bonus aux tests de {ability} — {sources} ».
   * Utilisé quand le dé ne porte pas sur les tests d'une carac mais sur autre chose (ex. « Dé bonus à
   * toutes les attaques » du flibustier r8), où `ability` sert juste au repli d'`aria-label`.
   */
  tooltipTitle?: string;
  sx?: SxProps<Theme>;
}

/**
 * Icône « double d20 » signalant un DÉ BONUS permanent aux tests d'une caractéristique
 * (mécanique core CO2 : « lance 2d20, garde le meilleur »). Deux d20 légèrement
 * superposés, en teinte d'accent, avec une info-bulle nommant la carac et la/les
 * capacité(s) source(s). Posée à droite du chiffre de la carac (fiche + mini-fiches
 * de créatures).
 */
export function BonusDieBadge({ ability, sources = [], size = 16, noTooltip, tooltipTitle, sx }: BonusDieBadgeProps) {
  const sourceName = (s: string | BonusDieSource) => (typeof s === 'string' ? s : s.name);
  // Titre PLAIN-TEXT — seule forme possible pour `aria-label`/l'attribut `title` natif (mode
  // `noTooltip`, PER-378) : jamais de JSX ici, même quand des `BonusDieSource` sont fournies.
  const plainTitle =
    tooltipTitle ??
    (sources.length > 0
      ? `Dé bonus aux tests de ${ability} — ${sources.map(sourceName).join(', ')}`
      : `Dé bonus aux tests de ${ability}`);
  const badge = (
    <Box
      component="span"
      aria-label={plainTitle}
      title={noTooltip ? plainTitle : undefined}
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: size * 1.4,
        height: size,
        color: 'secondary.main',
        cursor: noTooltip ? 'inherit' : 'help',
        flexShrink: 0,
        ...sx,
      }}
    >
      <DieIcon die="d20" size={size} noTooltip sx={{ position: 'absolute', left: 0, opacity: 0.55 }} />
      <DieIcon die="d20" size={size} noTooltip sx={{ position: 'absolute', left: size * 0.4 }} />
    </Box>
  );
  if (noTooltip) return badge;
  // Info-bulle RICHE (PER-378) : chaque source qui porte un `featureId` devient une `CapabilityChip`
  // cliquable (puce couleur de voie + icône) plutôt qu'un nom brut — même patron que le reste de la
  // fiche (DefenseBadge, FeatureEffectBadge…) pour expliquer D'OÙ vient le dé bonus.
  const richTitle = tooltipTitle ?? (
    <>
      Dé bonus aux tests de {ability}
      {sources.length > 0 && (
        <>
          {' — '}
          {sources.map((s, i) => (
            <span key={typeof s === 'string' ? s : s.featureId}>
              {i > 0 && ', '}
              {typeof s === 'string' ? s : <CapabilityChip featureId={s.featureId} label={null} />}
            </span>
          ))}
        </>
      )}
    </>
  );
  return <AppTooltip title={richTitle}>{badge}</AppTooltip>;
}
