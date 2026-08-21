'use client';

import { useState, type ReactElement, type ReactNode } from 'react';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import FrontHandIcon from '@mui/icons-material/FrontHand';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { Abilities } from '@/lib/engine';
import type { UnarmedStrikeView } from '@/lib/character/unarmedStrike';
import { DERIVED_STAT_ICON_PATHS } from '@/lib/ui/derivedStatIcons';
import { AppTooltip } from '@/components/AppTooltip';
import { BonusDieBadge } from '@/components/BonusDieBadge';
import { MalusDieBadge } from '@/components/MalusDieBadge';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { DefenseBadge, type DefenseBadgeData } from '@/components/sheet/DefenseBadge';
import { UnarmedStrikeBadges } from '@/components/sheet/UnarmedStrikeBadges';
import { WeaponDamageExpr, NoWeaponHint } from '@/components/sheet/WeaponDamageExpr';
import { WeaponDamageBonusBadge } from '@/components/sheet/WeaponDamageBonusBadge';
import ButtonBase from '@mui/material/ButtonBase';
import { ItemTypeIcon } from '@/components/ItemTypeIcon';
import { PageRefText, SourceRef } from '@/components/SourceRef';
import { GlossaryText } from '@/components/sheet/FeatureRichText';
import { ActionMarkerHex } from '@/components/FeatureMarkerHex';
import { AttackQualifierBadge } from '@/components/sheet/AttackQualifierBadge';
import { FeatureEffectBadge, type FeatureEffectNote } from '@/components/sheet/FeatureEffectBadge';
import { referenceById } from '@/data/reference';
import { WEAPON_KIND_ICON_PATHS } from '@/lib/ui/weaponKindIcons';
import type { MeleeWeaponDamageView } from '@/components/sheet/characterDerivedView';
import type { WeaponIconKind } from '@/lib/ui/weaponKind';
import type { SituationalDamageBonus } from '@/lib/character/weaponDamageBonus';

type MeleeMode = 'weapon' | 'unarmed';

/** Source d'un dé bonus aux attaques (nom de la capacité, pour l'info-bulle du badge). */
export interface AttackBonusDie {
  name: string;
}

/** Une main qui attaque : sa valeur de touche, ses DM, et le nom de son arme (mode deux armes). */
interface AttackRow {
  key: string;
  /** Nom de l'arme, affiché SEULEMENT en combat à deux armes (sinon la carte reste telle quelle). */
  weaponName: string | null;
  /** Libellé de la main, pour l'info-bulle du nom d'arme (« main principale » / « main secondaire »). */
  handLabel: string | null;
  /** DM de cette main. `null` = aucune arme (le mode « arme » affiche alors son invite). */
  damage: MeleeWeaponDamageView | null;
  /** La touche porte-t-elle le détail du calcul au survol ? Seule la 1ʳᵉ ligne l'ouvre. */
  wrap: boolean;
  /** Écart de touche par rapport à la valeur de la fiche (0 sauf main secondaire privée de finesse). */
  touchDelta: number;
  /** Explication de l'écart de touche, en info-bulle. `null` si aucun écart. */
  touchNote: string | null;
  /** PER-116 — main portant cette ligne, pour « aller à l'arme » dans l'inventaire. `null` hors combat à deux armes. */
  slot: 'mainHand' | 'offHand' | null;
  /** PER-116 — sous-type d'icône de l'arme (remplace son nom verbatim). `null` hors combat à deux armes. */
  weaponKind: WeaponIconKind | null;
}

/**
 * Icône « mains nues » cerclée, MÊME gabarit que `<DerivedStatIcon>` (cercle + bordure + SVG à 58%) :
 * remplace l'épée de l'en-tête « Attaque au contact » quand la bascule est sur les mains nues. Réutilise
 * le poing ganté du sous-type d'arme `unarmed` (`weaponKindIcons.ts`) — même famille d'icônes
 * (game-icons.net) que l'épée qu'elle remplace, pour un rendu cohérent.
 */
function UnarmedAttackIcon({ size = 40 }: { size?: number }) {
  return (
    <Box
      role="img"
      aria-label="Attaque à mains nues"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid',
        borderColor: 'currentColor',
        color: 'currentColor',
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 512 512"
        sx={{ width: '58%', height: '58%', fill: 'currentColor' }}
        dangerouslySetInnerHTML={{ __html: WEAPON_KIND_ICON_PATHS.unarmed }}
      />
    </Box>
  );
}

/** PER-116 — contenu de l'info-bulle de l'icône d'une arme (propriétés FIGÉES, indépendantes du personnage). */
function WeaponIconTooltip({
  name,
  handLabel,
  info,
}: {
  name: string;
  handLabel: string | null;
  info: MeleeWeaponDamageView['weaponInfo'];
}) {
  return (
    <Box sx={{ maxWidth: 260 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {name}
        {handLabel && (
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            ({handLabel})
          </Typography>
        )}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block' }}>
        Arme {info.category}
        {info.criticalRange && ` · Critique ${info.criticalRange}`}
        {info.range && ` · Portée ${info.range}`}
      </Typography>
      {info.properties && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>
          <GlossaryText>{info.properties}</GlossaryText>
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
        <PageRefText>{`(p. ${info.sourcePage})`}</PageRefText>
      </Typography>
    </Box>
  );
}

/**
 * PER-116 — badge « Combat à deux armes » (teinte `info`, comme les autres qualificatifs d'attaque) :
 * rappelle qu'attaquer avec une arme dans chaque main est une ACTION LIMITÉE, avec ses restrictions
 * (dé malus, main faible ≤ 1d6 DM), dans l'espace resté libre entre le titre de la carte et les deux
 * lignes d'attaque. Verbatim SOURCÉ SUR L'AIDE-MÉMOIRE (`combat-a-deux-armes`, PER-39/40) — une seule
 * saisie du texte, jamais dupliquée. `penaltyDie` false → l'exemption Combattant héroïque (p. 73) est
 * mentionnée en plus, car elle change RÉELLEMENT la mécanique pour CE personnage.
 */
function TwoWeaponCombatBadge({ penaltyDie }: { penaltyDie: boolean }) {
  const entry = referenceById.get('combat-a-deux-armes');
  // Garde-fou pur (jamais atteint en usage normal) : l'entrée d'aide-mémoire pourrait être renommée
  // sans que ce fichier, distant, s'en aperçoive — mieux vaut un badge absent qu'une erreur de rendu.
  if (!entry || entry.kind !== 'text') return null;
  return (
    <AttackQualifierBadge
      color="info"
      icon={<ActionMarkerHex marker="L" size={18} />}
      label="Combat à deux armes"
      tooltip={
        <Box sx={{ minWidth: 220, maxWidth: 280 }}>
          <Typography
            variant="body2"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75, fontWeight: 600 }}
          >
            <ActionMarkerHex marker="L" size={18} />
            Action limitée
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.75 }}>
            <GlossaryText>{entry.body}</GlossaryText>
          </Typography>
          {!penaltyDie && (
            <Typography variant="body2" sx={{ mb: 0.75 }}>
              <GlossaryText>
                Combattant héroïque (option FOR) : attaquer avec la même arme dans la main secondaire
                ne subit pas de dé malus.
              </GlossaryText>
            </Typography>
          )}
          <SourceRef page={entry.sourcePage} />
        </Box>
      }
    />
  );
}

/** Contenu d'un cadre (arme ou mains nues) : titre, valeur(s) de touche, DM, badges. */
function Face({
  mode,
  touch,
  forced,
  wrapTouch,
  abilities,
  unarmed,
  meleeWeaponDamage,
  offHandMeleeWeaponDamage,
  weaponCriticalRanges,
  offHandCriticalRanges,
  offHandTouchDelta,
  unarmedCriticalRanges,
  situationalBonuses,
  offHandSituationalBonuses,
  attackBonusDie,
  attackMalusDie,
  twoWeaponPenaltyDie,
  onScrollToWeapon,
  meleeAttackNotes,
  level,
}: {
  mode: MeleeMode;
  touch: number | null;
  forced: boolean;
  wrapTouch: (child: ReactElement) => ReactNode;
  abilities: Abilities;
  unarmed: UnarmedStrikeView;
  meleeWeaponDamage: MeleeWeaponDamageView | null;
  offHandMeleeWeaponDamage: MeleeWeaponDamageView | null;
  weaponCriticalRanges: DefenseBadgeData[];
  offHandCriticalRanges: DefenseBadgeData[];
  offHandTouchDelta: number;
  unarmedCriticalRanges: DefenseBadgeData[];
  situationalBonuses: SituationalDamageBonus[];
  offHandSituationalBonuses: SituationalDamageBonus[];
  attackBonusDie: AttackBonusDie[];
  attackMalusDie: string[];
  twoWeaponPenaltyDie: boolean;
  onScrollToWeapon?: (slot: 'mainHand' | 'offHand') => void;
  meleeAttackNotes: FeatureEffectNote[];
  /** Niveau du personnage : requis pour résoudre les dés ÉVOLUTIFS des notes d'effet (PER-74). */
  level: number;
}) {
  const title = mode === 'weapon' ? 'Attaque au contact (arme)' : 'Attaque au contact (mains)';
  const unarmedDice = `${unarmed.damage.count}${unarmed.damage.die}${unarmed.evolving ? '°' : ''}`;
  // Chips d'indication supplémentaires (létalité, magie, 1=max, type) — mode mains nues uniquement
  // (il y a toujours au moins la létalité). Le séparateur ne s'affiche que si ces chips existent.
  const hasExtraChips = mode === 'unarmed';

  // PER-116 — COMBAT À DEUX ARMES : une ligne touche | DM PAR MAIN, chacune préfixée du nom de son
  // arme. La seconde ligne n'existe que si une arme est réellement tenue en main secondaire → un
  // personnage à une seule arme (ou à mains nues) garde EXACTEMENT l'affichage d'avant.
  const dualWielding = mode === 'weapon' && offHandMeleeWeaponDamage !== null;
  const rows: AttackRow[] = dualWielding
    ? [
        {
          key: 'mainHand',
          weaponName: meleeWeaponDamage?.name ?? null,
          handLabel: 'main principale',
          damage: meleeWeaponDamage,
          wrap: true,
          touchDelta: 0,
          touchNote: null,
          slot: 'mainHand',
          weaponKind: meleeWeaponDamage?.weaponKind ?? null,
        },
        {
          key: 'offHand',
          weaponName: offHandMeleeWeaponDamage.name ?? null,
          handLabel: 'main secondaire',
          damage: offHandMeleeWeaponDamage,
          // PER-116 — la main secondaire ouvre AUSSI le détail du calcul de touche (`wrapTouch`), comme
          // la principale : la valeur est la MÊME sur les deux mains (aucune pénalité chiffrée, p. 215).
          // Un `touchNote` (finesse réservée à la main principale) reste prioritaire quand il existe.
          wrap: true,
          touchDelta: offHandTouchDelta,
          touchNote:
            offHandTouchDelta !== 0
              ? "Attaque en finesse réservée à la main principale : cette main garde sa caractéristique d'origine."
              : null,
          slot: 'offHand',
          weaponKind: offHandMeleeWeaponDamage.weaponKind,
        },
      ]
    : [
        {
          key: 'single',
          weaponName: null,
          handLabel: null,
          damage: meleeWeaponDamage,
          wrap: true,
          touchDelta: 0,
          touchNote: null,
          slot: null,
          weaponKind: null,
        },
      ];

  // Plages de critique : celle de l'arme principale, plus celle de la main secondaire UNIQUEMENT si
  // elle diffère (une rapière 19-20 et une dague 20 ne peuvent pas partager un badge unique ; deux
  // armes de même plage n'en méritent qu'un).
  const mainCriticalText = weaponCriticalRanges.map((b) => b.text).join('|');
  const offHandDiffers =
    dualWielding && offHandCriticalRanges.length > 0 && offHandCriticalRanges.map((b) => b.text).join('|') !== mainCriticalText;
  const criticalRanges =
    mode === 'weapon'
      ? [...weaponCriticalRanges, ...(offHandDiffers ? offHandCriticalRanges : [])]
      : unarmedCriticalRanges;

  /** Valeur de touche d'une ligne + ses badges de dé (bonus, malus d'état, malus deux armes). */
  const touchCell = (row: AttackRow) => {
    const shown = touch === null ? null : touch + row.touchDelta;
    const value = (
      <Typography
        variant="h5"
        sx={{
          fontWeight: 600,
          color: forced ? 'warning.main' : undefined,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'help',
          // Chiffre de la TOUCHE agrandi sur mobile — jamais le DM (bloc séparé, `damageCell`).
          fontSize: { xs: '1.75rem', sm: 'inherit' },
        }}
      >
        {shown === null ? '—' : shown}
        {forced && (
          <AppTooltip title="Valeur forcée (calcul automatique remplacé)">
            <PushPinOutlinedIcon sx={{ fontSize: 16 }} color="warning" />
          </AppTooltip>
        )}
      </Typography>
    );
    return (
      <>
        {/* La touche porte le détail du calcul au survol (curseur « ? »), via `wrapTouch`. En combat à
            deux armes, LES DEUX lignes l'ouvrent (même valeur sur les deux mains : le livre n'impose
            aucune pénalité chiffrée, seulement un dé malus) — SAUF si l'attaque en finesse substitue la
            caractéristique de TOUCHE, réservée à la main principale, d'où le `touchNote` prioritaire. */}
        {row.touchNote ? <AppTooltip title={row.touchNote}>{value}</AppTooltip> : row.wrap ? wrapTouch(value) : value}
        {/* Dé bonus à toutes les attaques (flibustier r8 « Pas de quartier », PV bas) — badge double-d20. */}
        {attackBonusDie.length > 0 && (
          <BonusDieBadge
            ability="attaque"
            size={18}
            tooltipTitle={`Dé bonus à cette attaque — ${attackBonusDie.map((s) => s.name).join(', ')}`}
          />
        )}
        {/* Dé MALUS aux tests d'attaque (état de combat : Affaibli/Immobilisé, PER-281). */}
        {attackMalusDie.length > 0 && (
          <MalusDieBadge label={`aux attaques (${attackMalusDie.join(', ')})`} size={18} />
        )}
        {/* PER-116 — dé MALUS du combat à deux armes (p. 215), sur CHACUNE des deux lignes : « chacune
            des deux attaques subit un dé malus ». Muet si « Combattant héroïque » exempte (p. 73). */}
        {dualWielding && twoWeaponPenaltyDie && (
          <MalusDieBadge label="aux attaques (combat à deux armes)" size={18} />
        )}
      </>
    );
  };

  /** Bloc « DM <expression> » d'une ligne. */
  const damageCell = (row: AttackRow) => (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="caption" color="text.secondary">
        DM
      </Typography>
      {mode === 'weapon' ? (
        row.damage ? (
          <WeaponDamageExpr
            dice={row.damage.dice}
            diceNote={row.damage.diceNote}
            abilities={row.damage.abilities}
            flatBonuses={row.damage.flatBonuses}
            charAbilities={abilities}
          />
        ) : (
          <NoWeaponHint />
        )
      ) : (
        <WeaponDamageExpr
          dice={unarmedDice}
          abilities={unarmed.damageAbilities}
          flatBonuses={unarmed.flatBonuses}
          charAbilities={abilities}
        />
      )}
    </Box>
  );

  return (
    <CardContent
      sx={{ py: 1, height: '100%', display: 'flex', flexDirection: 'column', '&:last-child': { pb: 1 } }}
    >
      {/* Ligne d'arme : nom (si deux armes) + touche + séparateur vertical + DM, TOUJOURS sur UNE
          seule ligne — comme l'affichage historique à une arme, jamais de retour à la ligne après
          la touche. */}
      {(() => {
        const weaponLine = (row: AttackRow) => (
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            {/* PER-116 — icône du sous-type d'arme À LA PLACE du nom verbatim (illisible en combat à
                deux armes) : survol → infos figées de l'arme ; clic → défile jusqu'à sa ligne
                d'inventaire (déplie la section si repliée). Sans `onScrollToWeapon` (récap du
                wizard, écran de MJ), l'icône reste affichée mais non cliquable. */}
            {row.weaponName && row.weaponKind && row.damage && (
              <AppTooltip
                title={
                  <WeaponIconTooltip name={row.weaponName} handLabel={row.handLabel} info={row.damage.weaponInfo} />
                }
              >
                {onScrollToWeapon && row.slot ? (
                  <ButtonBase
                    onClick={() => onScrollToWeapon(row.slot!)}
                    aria-label={`Aller à ${row.weaponName} dans l'inventaire`}
                    sx={{ borderRadius: '50%', p: 0.25, color: 'text.secondary' }}
                  >
                    <ItemTypeIcon type="weapon" weaponKind={row.weaponKind} size={20} />
                  </ButtonBase>
                ) : (
                  <Box sx={{ display: 'inline-flex', color: 'text.secondary', cursor: 'help' }}>
                    <ItemTypeIcon type="weapon" weaponKind={row.weaponKind} size={20} />
                  </Box>
                )}
              </AppTooltip>
            )}
            {touchCell(row)}
            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
            {damageCell(row)}
          </Box>
        );
        // PER-116/307 — en combat à deux armes, les badges LIÉS À L'ARME (plage de critique, riders de DM
        // situationnels : Affûtée, Fléau, Élément…) sont rendus SOUS la ligne de LEUR main — jamais dans un
        // pied commun qui, visuellement, les collerait sous l'autre arme. Chaque main lit SES sources.
        const rowExtras = (row: AttackRow) => {
          const crit = row.slot === 'offHand' ? offHandCriticalRanges : weaponCriticalRanges;
          const sit = row.slot === 'offHand' ? offHandSituationalBonuses : situationalBonuses;
          if (crit.length === 0 && sit.length === 0) return null;
          return (
            <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {crit.map(({ key, ...rest }) => (
                <DefenseBadge key={key} {...rest} fullWidth={false} />
              ))}
              {sit.map((b, i) => (
                <WeaponDamageBonusBadge key={`${b.featureId}-${i}`} bonus={b} />
              ))}
            </Box>
          );
        };
        return (
          <>
            {/* En-tête : icône ANCRÉE EN HAUT + titre SEUL. Hors combat à deux armes, la ligne unique
                reste juste en dessous, à côté de l'icône (affichage historique inchangé). */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, width: '100%' }}>
              {mode === 'weapon' ? (
                <DerivedStatIcon statId="meleeAttack" title size={40} />
              ) : (
                <UnarmedAttackIcon />
              )}
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                  {title}
                </Typography>
                {/* PER-116 — badge dans l'espace resté libre entre le titre et les deux lignes d'arme
                    (l'icône ne descend que sur 40px). */}
                {dualWielding && (
                  <Box sx={{ mt: 0.5 }}>
                    <TwoWeaponCombatBadge penaltyDie={twoWeaponPenaltyDie} />
                  </Box>
                )}
                {!dualWielding && weaponLine(rows[0])}
              </Box>
            </Box>
            {/* PER-116 — COMBAT À DEUX ARMES : les DEUX lignes (une par main, chacune sur une seule
                ligne touche | DM) descendent SOUS l'icône, à pleine largeur — l'icône ne fait que
                40px de haut, ce qui laisse la place à gauche en dessous. */}
            {dualWielding && (
              <Box sx={{ mt: 0.75 }}>
                {rows.map((row, idx) => (
                  <Box key={row.key} sx={{ mt: idx > 0 ? 0.5 : 0 }}>
                    {weaponLine(row)}
                    {rowExtras(row)}
                  </Box>
                ))}
              </Box>
            )}
          </>
        );
      })()}

      {/* Plage de critique — pied COMMUN hors combat à deux armes (une seule arme, ou mains nues). En
          combat à deux armes, la plage est rendue PAR MAIN via `rowExtras` (attribution correcte). */}
      {!dualWielding && criticalRanges.length > 0 && (
        <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {criticalRanges.map(({ key, ...rest }) => (
            <DefenseBadge key={key} {...rest} fullWidth={false} />
          ))}
        </Box>
      )}

      {/* Séparateur entre critique et chips supplémentaires — uniquement si les DEUX existent. */}
      {criticalRanges.length > 0 && hasExtraChips && <Divider sx={{ my: 0.75 }} />}

      {/* Chips d'indication mains nues (létalité, magie, 1=max, type). */}
      {hasExtraChips && (
        <Box sx={{ mt: criticalRanges.length > 0 ? 0 : 0.75 }}>
          <UnarmedStrikeBadges view={unarmed} />
        </Box>
      )}

      {/* Bonus de DM SITUATIONNELS au contact (Attaque éclair +AGI, Chasseur émérite +1d4°…) — PER-115.
          Communs aux deux modes (contact armé / mains nues) : une attaque au contact rapide, un ennemi
          désigné… s'appliquent quelle que soit l'arme. Pied COMMUN hors combat à deux armes ; en combat à
          deux armes ils sont rendus PAR MAIN via `rowExtras`. Clé indicée : un objet magique porte
          plusieurs riders de même source (`featureId` partagé, PER-307). */}
      {!dualWielding && situationalBonuses.length > 0 && (
        <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {situationalBonuses.map((b, i) => (
            <WeaponDamageBonusBadge key={`${b.featureId}-${i}`} bonus={b} />
          ))}
        </Box>
      )}

      {/* PER-74 — notes d'effet de la voie de l'écorcheur (saignement, blessures affreuses,
          impitoyable) : DM/malus subis par l'ADVERSAIRE, jamais chiffrés sur cette fiche (patron
          « Riposte »). Le saignement (`weaponOnly`) ne s'affiche qu'en mode ARME ; les deux autres
          valent pour les deux modes (arme et mains nues). */}
      {(() => {
        const attackNotes = meleeAttackNotes.filter((n) => mode === 'weapon' || !n.weaponOnly);
        if (attackNotes.length === 0) return null;
        return (
          <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {attackNotes.map((n) => (
              <FeatureEffectBadge key={n.featureId} note={n} abilities={abilities} level={level} />
            ))}
          </Box>
        );
      })()}
    </CardContent>
  );
}

export interface MeleeAttackCardProps {
  /** Valeur de touche (base + FOR, éventuellement forcée) — identique dans les deux modes. */
  touch: number | null;
  /** La valeur de touche est-elle forcée (surcharge épinglée) ? */
  forced: boolean;
  /** Enrobe la touche pour ouvrir le détail du calcul à son survol (curseur « ? »). */
  wrapTouch: (child: ReactElement) => ReactNode;
  /** Caractéristiques effectives du personnage (résolution dynamique des DM). */
  abilities: Abilities;
  /** Vue « mains nues » (moteur `unarmedStrike`). */
  unarmed: UnarmedStrikeView;
  /** DM de l'arme de contact équipée (mode « arme »). `null` = aucune arme portée. */
  meleeWeaponDamage: MeleeWeaponDamageView | null;
  /**
   * PER-116 — DM de l'arme de la MAIN SECONDAIRE. Non nul = combat à deux armes → la carte affiche
   * DEUX lignes touche | DM, chacune préfixée du nom de son arme. `null` = affichage historique.
   */
  offHandMeleeWeaponDamage?: MeleeWeaponDamageView | null;
  /** Badges de plage de critique de l'ARME (mode « arme »). */
  weaponCriticalRanges: DefenseBadgeData[];
  /** PER-116 — plage de critique de l'arme de la MAIN SECONDAIRE, affichée seulement si elle diffère. */
  offHandCriticalRanges?: DefenseBadgeData[];
  /**
   * PER-116 — écart de touche de la ligne de la MAIN SECONDAIRE (0 = même touche). Non nul seulement
   * quand l'attaque en finesse substitue la caractéristique de TOUCHE : réservée à la main principale
   * (p. 140/150), la main secondaire garde la sienne.
   */
  offHandTouchDelta?: number;
  /** Badges de plage de critique À MAINS NUES (mode mains nues). */
  unarmedCriticalRanges: DefenseBadgeData[];
  /** PER-115 — bonus de DM SITUATIONNELS au contact (Attaque éclair, Chasseur émérite…), en badges. */
  situationalBonuses: SituationalDamageBonus[];
  /** PER-116/307 — bonus de DM situationnels de la MAIN SECONDAIRE (combat à deux armes) : affichés SOUS
   *  sa ligne, jamais confondus avec ceux de la main principale (arme différente). Défaut `[]`. */
  offHandSituationalBonuses?: SituationalDamageBonus[];
  /** PER-74 — dé bonus à toutes les attaques (flibustier r8, PV bas), en badge double-d20. */
  attackBonusDie?: AttackBonusDie[];
  /** PER-281 — libellés des états imposant un dé MALUS aux tests d'attaque (Affaibli/Immobilisé). */
  attackMalusDie?: string[];
  /**
   * PER-116 — le combat à deux armes impose-t-il un dé malus (p. 215) ? Rendu sur CHACUNE des deux
   * lignes. Faux quand « Combattant héroïque » exempte (même arme dans les deux mains, p. 73).
   */
  twoWeaponPenaltyDie?: boolean;
  /**
   * PER-116 — clic sur l'icône d'une arme (combat à deux armes) : fait défiler la fiche jusqu'à SA
   * ligne d'inventaire (et déplie la section Inventaire si repliée). Absent = icônes non cliquables
   * (récap du wizard, écran de MJ).
   */
  onScrollToWeapon?: (slot: 'mainHand' | 'offHand') => void;
  /**
   * PER-74 — notes d'effet de capacité (voie de l'écorcheur : saignement, blessures affreuses,
   * impitoyable), en badge sous la carte. Vide ou absent = aucune.
   */
  meleeAttackNotes?: FeatureEffectNote[];
  /** Niveau du personnage : requis pour résoudre les dés ÉVOLUTIFS des notes d'effet (PER-74). */
  level: number;
}

/**
 * Carte « Attaque au contact » avec bascule arme ⇄ mains nues (PER-141) : DEUX cadres superposés
 * (arme / mains nues) qui s'ÉCHANGENT leur place avec une animation quand on clique sur le bouton
 * rond en haut à gauche (paume au repos → flèches circulaires au survol). État d'UI LOCAL non
 * persisté (cf. autres états de jeu hors mode édition). Par défaut on montre l'arme équipée, ou
 * directement les mains nues si aucune arme de contact n'est portée.
 */
/** Icône d'épée (même dessin que la carte Attaque au contact), pour l'état « arme » du bouton. */
function SwordGlyph() {
  return (
    <Box
      component="svg"
      viewBox="0 0 512 512"
      sx={{ width: 18, height: 18, fill: 'currentColor' }}
      dangerouslySetInnerHTML={{ __html: DERIVED_STAT_ICON_PATHS.meleeAttack }}
    />
  );
}

export function MeleeAttackCard({
  touch,
  forced,
  wrapTouch,
  abilities,
  unarmed,
  meleeWeaponDamage,
  offHandMeleeWeaponDamage = null,
  weaponCriticalRanges,
  offHandCriticalRanges = [],
  offHandTouchDelta = 0,
  unarmedCriticalRanges,
  situationalBonuses,
  offHandSituationalBonuses = [],
  attackBonusDie = [],
  attackMalusDie = [],
  twoWeaponPenaltyDie = false,
  onScrollToWeapon,
  meleeAttackNotes = [],
  level,
}: MeleeAttackCardProps) {
  const [mode, setMode] = useState<MeleeMode>(meleeWeaponDamage ? 'weapon' : 'unarmed');
  const swap = () => setMode((m) => (m === 'weapon' ? 'unarmed' : 'weapon'));

  const faceProps = {
    touch,
    forced,
    wrapTouch,
    abilities,
    unarmed,
    meleeWeaponDamage,
    offHandMeleeWeaponDamage,
    weaponCriticalRanges,
    offHandCriticalRanges,
    offHandTouchDelta,
    unarmedCriticalRanges,
    situationalBonuses,
    offHandSituationalBonuses,
    attackBonusDie,
    attackMalusDie,
    twoWeaponPenaltyDie,
    onScrollToWeapon,
    meleeAttackNotes,
    level,
  };

  // Chaque cadre est en position ABSOLUE : il ne contribue PAS à la hauteur de la pile. C'est un
  // « sizer » invisible (le cadre ACTIF, rendu en flux mais masqué) qui donne sa hauteur au bloc →
  // la hauteur SUIT le cadre actif (et non le plus grand des deux), et le cadre arrière décalé
  // vient « en plus » sans agrandir le cadre actif.
  const layerSx = (layer: MeleeMode) => {
    const front = layer === mode;
    return {
      position: 'absolute',
      inset: 0,
      transition: 'transform 260ms ease, opacity 260ms ease, filter 260ms ease',
      transform: front ? 'none' : 'translate(9px, 11px) scale(0.97)',
      // Le cadre arrière est nettement flouté : on ne devine plus que sa silhouette derrière
      // le cadre actif (au lieu d'éléments nets tronqués, peu lisibles).
      filter: front ? 'none' : 'blur(4px)',
      opacity: front ? 1 : 0.45,
      zIndex: front ? 2 : 1,
      pointerEvents: front ? 'auto' : 'none',
    } as const;
  };

  return (
    <Box
      data-glossary-shot="MeleeAttackCard"
      sx={{
        position: 'relative',
        // Comme les cartes génériques : s'étire à la hauteur de la ligne de grille (toutes les cartes
        // de stats dérivées à la même hauteur). Le sizer donne la hauteur MINIMALE (cadre actif).
        height: '100%',
        // Le cadre arrière décalé dépasse hors du bloc (aucune marge réservée).
        overflow: 'visible',
      }}
    >
      {/* Bouton d'échange, en haut à gauche : icône de la DESTINATION (épée = passer en arme / main =
          passer aux mains nues) — le gros cercle montre déjà l'état courant —, remplacée par des
          flèches circulaires qui tournent au survol. */}
      <AppTooltip title={mode === 'weapon' ? 'Voir l’attaque à mains nues' : 'Voir l’attaque avec l’arme'}>
        <IconButton
          size="small"
          onClick={swap}
          aria-label="Échanger arme / mains nues"
          sx={{
            position: 'absolute',
            top: 2,
            left: 2,
            zIndex: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            '&:hover': { bgcolor: 'background.paper' },
            '&:hover .mn-rest': { opacity: 0 },
            '&:hover .mn-swap': { opacity: 1, transform: 'rotate(180deg)' },
          }}
        >
          <Box sx={{ position: 'relative', width: 20, height: 20, display: 'inline-flex' }}>
            <Box
              className="mn-rest"
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 180ms ease',
              }}
            >
              {/* Icône de la DESTINATION (pas l'état courant, déjà montré par le gros cercle) : cohérent
                  avec le tooltip, qui annonce déjà « voir X » — cliquer montre ce qu'on va VOIR. */}
              {mode === 'weapon' ? <FrontHandIcon sx={{ fontSize: 20 }} /> : <SwordGlyph />}
            </Box>
            <AutorenewIcon
              className="mn-swap"
              sx={{
                position: 'absolute',
                inset: 0,
                fontSize: 20,
                opacity: 0,
                transition: 'opacity 180ms ease, transform 400ms ease',
              }}
            />
          </Box>
        </IconButton>
      </AppTooltip>

      {/* Pile de cadres. Le SIZER (cadre actif, masqué) impose la hauteur MINIMALE ; les deux cadres
          réels sont superposés en absolu et s'échangent avec animation. `height: 100%` pour que les
          cadres (inset: 0) remplissent la carte quand la ligne de grille l'étire au-delà du sizer. */}
      <Box sx={{ position: 'relative', height: '100%' }}>
        <Card variant="outlined" aria-hidden sx={{ visibility: 'hidden' }}>
          <Face mode={mode} {...faceProps} />
        </Card>
        {(['weapon', 'unarmed'] as const).map((layer) => (
          <Card key={layer} variant="outlined" aria-hidden={layer !== mode} sx={layerSx(layer)}>
            <Face mode={layer} {...faceProps} />
          </Card>
        ))}
      </Box>
    </Box>
  );
}
