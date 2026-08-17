'use client';

/**
 * Carte de l'écran de MJ : une **fiche de personnage condensée** — plus qu'un
 * aperçu, moins qu'une fiche complète. Assemble, dans un `Paper`, le nom du joueur
 * qui incarne le personnage + un petit bouton d'ouverture de la fiche complète,
 * l'aperçu (`CharacterPreviewCard`, caractéristiques colorées fort/faible) et la
 * grille compacte des statistiques dérivées (`CompactDerivedStats`, avec puces
 * immunités / RD / critiques). Un bandeau de jauges condensées PV / mana / chance
 * (`CompactGauges`) est plaqué contre le bord supérieur, HORS du flux : son nombre de
 * pistes varie d'un personnage à l'autre (pas de mana sans sort) sans jamais décaler le
 * contenu des cartes entre elles.
 *
 * Depuis PER-258, **la carte entière est cliquable** et ouvre le panneau latéral de
 * fiche (`panelHref`) — cela renverse le choix d'origine (« la carte elle-même n'est
 * pas cliquable »), qui obligeait à viser le petit bouton d'ouverture. Elle reste une
 * VRAIE ancre, en superposition plutôt qu'en `Paper` cliquable : une ancre ne peut pas
 * en contenir une autre, et le bouton « fiche complète » en est une. Le contenu est
 * donc transparent aux clics (`pointerEvents: none`), sauf les zones réellement
 * interactives (ligne du joueur, statistiques dérivées et leurs infobulles), qui les
 * réactivent — d'où deux zones où le clic n'ouvre pas le panneau, en échange des
 * infobulles préservées.
 *
 * La vue dérivée (entrée moteur + badges) est calculée ici via le helper partagé
 * avec la fiche (`buildCharacterDerivedView`) : mêmes valeurs, aucune dérive.
 */
import Link from 'next/link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { AppTooltip } from '@/components/AppTooltip';
import { CharacterPreviewCard } from '@/components/CharacterPreviewCard';
import { CompactDerivedStats } from '@/components/sheet/CompactDerivedStats';
import { CompactGauges, COMPACT_GAUGES_STRIP_HEIGHT } from '@/components/sheet/CompactGauges';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import { ArmorPenaltyReminder } from '@/components/campaign/ArmorPenaltyReminder';
import { PlayerBadgeTooltip } from '@/components/campaign/PlayerBadgeTooltip';
import { deriveStats } from '@/lib/engine';
import { armorEncumbrancePenalty, wornArmorItemLabel } from '@/lib/character/equipment';
import { armorPenaltyDivisor } from '@/lib/character/effects';
import { profileAccentGradient } from '@/lib/ui/classColors';
import type { Character } from '@/lib/character/types';
import type { Player } from '@/lib/player/types';

export interface GmScreenCardProps {
  character: Character;
  /** Joueur qui incarne le personnage (badge, survol = présence + lien magique), ou `null`. */
  player: Player | null;
  /** Destination de la fiche complète (bouton dédié, rendu en vraie ancre). */
  href: string;
  /** Destination du panneau latéral de fiche — ancre couvrant toute la carte (PER-258). */
  panelHref: string;
  /** Cible du tour guidé de l'écran de MJ (PER-425), posée sur cette carte précise. */
  dataTour?: string;
}

export function GmScreenCard({ character, player, href, panelHref, dataTour }: GmScreenCardProps) {
  // Vue dérivée partagée avec la fiche (mêmes stats + puces). `null` si profil
  // incomplet : on n'affiche alors que l'aperçu.
  const view = buildCharacterDerivedView(character);
  // Maxima des jauges condensées, avec la surcharge manuelle prioritaire — mêmes
  // expressions que `useCharacterGameState` pour la fiche et le panneau latéral.
  const stats = view.derivedInput ? deriveStats(view.derivedInput) : null;
  const gaugeMaxHp = stats ? character.overrides.maxHp ?? stats.maxHp : null;
  const gaugeManaMax = stats ? character.overrides.manaPoints ?? stats.manaPoints : null;
  const gaugeLuckMax = stats ? character.overrides.luckPoints ?? stats.luckPoints : 0;
  // Malus d'armure (PER-210), calculé avec la MÊME fonction que la fiche : `armorEncumbrancePenalty`
  // + diviseur d'Armure sur mesure (`modFeatureIds` déjà résolu par la vue partagée). Le MJ garde ce
  // rappel d'application sous les yeux sans ouvrir la fiche ; 0 = aucune armure gênante → pas de rappel.
  const armorPenalty = armorEncumbrancePenalty(character.equipment, armorPenaltyDivisor(view.modFeatureIds));
  const armorLabel = wornArmorItemLabel(character.equipment);
  return (
    <Paper
      data-tour={dataTour}
      sx={{
        position: 'relative',
        p: 2,
        // Réserve FIXE en haut pour le bandeau de jauges (hors du flux) : sa hauteur ne
        // dépend pas du nombre de pistes réellement rendues, donc toutes les cartes
        // démarrent leur contenu à la même ordonnée — pas de décalage entre un
        // personnage avec mana et un sans.
        pt: `${COMPACT_GAUGES_STRIP_HEIGHT + 12}px`,
        bgcolor: 'rgba(20, 20, 23, 0.72)',
        // Léger dégradé teinté au profil (bas droite → haut gauche), posé sur toute la
        // carte condensée. L'aperçu interne est donc rendu SANS sa propre teinte
        // (`tinted={false}`) pour ne pas doubler le dégradé.
        backgroundImage: profileAccentGradient(character.classId, 'to top left'),
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 3,
        // Liseré éclairci au survol de la carte : signale qu'elle est cliquable.
        '&:hover': { borderColor: 'rgba(255, 255, 255, 0.22)' },
      }}
    >
      {/* Ancre de la carte entière, DERRIÈRE le contenu (qui est transparent aux clics) :
          le survol comme le clic la traversent, donc curseur « main » sur toute la carte
          et Ctrl/⌘+Clic ou clic-molette ouvrent l'écran de MJ déjà déplié. */}
      <Box
        component={Link}
        href={panelHref}
        scroll={false}
        aria-label={`Consulter la fiche de ${character.name || 'ce personnage'} dans le panneau`}
        sx={{ position: 'absolute', inset: 0, zIndex: 0, borderRadius: 'inherit' }}
      />
      {/* Bandeau de jauges plaqué contre le bord SUPÉRIEUR, hors du flux : il ne pousse
          rien vers le bas (la réserve `pt` de la carte lui garde la place) et suit
          l'arrondi de la carte, qui l'écrête. Transparent aux clics comme le reste du
          contenu, pour ne pas trouer la zone cliquable de la carte. */}
      {gaugeMaxHp !== null && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1,
            overflow: 'hidden',
            pointerEvents: 'none',
            borderTopLeftRadius: 'inherit',
            borderTopRightRadius: 'inherit',
          }}
        >
          <CompactGauges
            depletion={character.depletion}
            maxHp={gaugeMaxHp}
            manaMax={gaugeManaMax}
            luckMax={gaugeLuckMax}
          />
        </Box>
      )}
      <Stack spacing={1.5} sx={{ position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
        {/* Ligne du joueur : badge à gauche, petit bouton d'ouverture poussé à droite. */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', pointerEvents: 'auto' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <PlayerBadgeTooltip player={player} />
          </Box>
          <AppTooltip title="Ouvrir la fiche complète">
            <IconButton
              size="small"
              component={Link}
              href={href}
              aria-label={`Ouvrir la fiche de ${character.name || 'ce personnage'}`}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
        </Stack>
        <CharacterPreviewCard character={character} tinted={false} />
        {view.derivedInput && (
          // Infobulles des stats et des puces (immunités / RD / critiques) : on réactive
          // les événements de pointeur sur ce seul bloc pour ne pas les perdre.
          <Box sx={{ pointerEvents: 'auto' }}>
            <CompactDerivedStats
              input={view.derivedInput}
              overrides={character.overrides}
              defenseBadges={view.defenseBadges}
              meleeCriticalRanges={view.meleeCriticalRanges}
              rangedCriticalRanges={view.rangedCriticalRanges}
            />
          </Box>
        )}
        {/* Rappel MJ du malus d'armure (PER-210) : bloc interactif (infobulle) réactivé, comme les
            statistiques dérivées, pour que le survol donne le verbatim + la source sans ouvrir la fiche. */}
        {armorPenalty > 0 && (
          <Box sx={{ pointerEvents: 'auto' }}>
            <ArmorPenaltyReminder penalty={armorPenalty} armorLabel={armorLabel} />
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
