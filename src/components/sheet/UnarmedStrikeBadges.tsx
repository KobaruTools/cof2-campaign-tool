'use client';

import CasinoIcon from '@mui/icons-material/Casino';
import SportsMartialArtsIcon from '@mui/icons-material/SportsMartialArts';
import TuneIcon from '@mui/icons-material/Tune';
import Box from '@mui/material/Box';
import { DamageValue } from '@/components/DamageValue';
import {
  AttackQualifierBadge as QualifierBadge,
  attackBadgeTooltip as badgeTooltip,
  MagicalAttackBadge,
} from '@/components/sheet/AttackQualifierBadge';
import type { UnarmedStrikeView } from '@/lib/character/unarmedStrike';

/** Verbatim de la règle des DM temporaires (arme `mains-nues`, p. 183/219). */
const NON_LETHAL_RULE =
  'Dans le cas du combat à mains nues, les DM sont généralement temporaires (voir DM temporaires, p. 219).';
/** Verbatim du trait de profil du moine (p. 119). */
const MONK_LETHAL_CHOICE =
  'Tous les moines infligent des DM létaux avec les attaques à mains nues lorsqu’ils le souhaitent (p. 119).';

/**
 * Rangée de badges custom qualifiant l'attaque à MAINS NUES (PER-141) : létalité (non
 * létal / létal / au choix), attaques magiques, « 1 au dé → max », choix du type de DM, et
 * plage de critique (Morsure du serpent). Verbatim + source en info-bulle, jamais de `Chip`
 * MUI. Rendue sous la carte « Attaque au contact » quand la bascule est en mode mains nues.
 */
export function UnarmedStrikeBadges({ view }: { view: UnarmedStrikeView }) {
  /** Capacité source (si acquise) d'un qualificatif, pour la puce de voie et son verbatim. */
  const sourceOf = (featureId: string) =>
    view.sources.some((s) => s.featureId === featureId) ? featureId : undefined;
  const energyHands = sourceOf('energie-vitale-r1');
  const tigerClaws = sourceOf('maitrise-r2');

  // Létalité : un moine choisit toujours (jamais forcé) ; sinon non létal (DM temporaires, p. 219).
  const lethalityBadge =
    view.lethality === 'choice' ? (
      <QualifierBadge
        color="warning"
        icon={<SportsMartialArtsIcon sx={{ fontSize: 18 }} />}
        label="Létal au choix"
        tooltip={badgeTooltip(MONK_LETHAL_CHOICE)}
      />
    ) : (
      <QualifierBadge
        color="info"
        icon={<SportsMartialArtsIcon sx={{ fontSize: 18 }} />}
        label="Non létal"
        tooltip={badgeTooltip(NON_LETHAL_RULE)}
      />
    );

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {lethalityBadge}
      {view.magical && (
        <MagicalAttackBadge
          verbatim="Attaques à mains nues toujours considérées comme magiques, même sans utiliser l’action Mains d’énergie."
          featureId={energyHands}
        />
      )}
      {view.minRollBecomesMax && (
        <QualifierBadge
          color="success"
          icon={<CasinoIcon sx={{ fontSize: 18 }} />}
          label="1 = max"
          tooltip={badgeTooltip(
            'Un résultat de 1 au dé de DM à mains nues est remplacé par le résultat maximal du dé.',
            tigerClaws,
          )}
        />
      )}
      {view.damageTypeChoice && (
        <QualifierBadge
          color="success"
          icon={<TuneIcon sx={{ fontSize: 18 }} />}
          label="Tranch./perf."
          tooltip={badgeTooltip(
            'Le moine peut infliger des DM tranchants ou perforants à mains nues, au lieu de contondants.',
            tigerClaws,
          )}
        />
      )}
      {/* DM bonus situationnels (ambre). Le dé est rendu en ICÔNE via <DamageValue> (comme la
          flèche élémentaire), pas en texte brut : « +1d4° » devient une vraie icône de dé. */}
      {view.bonusDamage.map((b) => (
        <QualifierBadge
          key={b.featureId}
          color="warning"
          icon={
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
              <DamageValue damage={b.amount} size={16} sx={{ color: 'text.primary' }} />
            </Box>
          }
          label="DM"
          tooltip={badgeTooltip(
            b.label ? `DM bonus à mains nues : ${b.label}.` : 'DM bonus à mains nues.',
            b.featureId,
          )}
        />
      ))}
    </Box>
  );
}
