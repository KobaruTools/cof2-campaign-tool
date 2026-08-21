'use client';

/**
 * AIDE-MÉMOIRE JOUEUR — MANŒUVRES DE COMBAT (PER-296).
 *
 * Surface les 8 manœuvres nommées (p. 217-218) directement sur la fiche de personnage, en LECTURE
 * SEULE : le joueur a sous les yeux, en jeu, quelle manœuvre choisir, quel test elle demande (avec
 * son modificateur) et quel effet elle produit — SANS aucune résolution automatique ni application
 * d'état (les dés sont lancés en vrai à la table ; les manœuvres ne sont PAS des capacités du moteur).
 *
 * DONNÉES : le catalogue `MANEUVERS` (`@/data/reference`, verbatim du livre). L'encadré d'aperçu
 * `maneuvers-overview` (règle générale, modificateur de taille, rendements décroissants) est
 * VOLONTAIREMENT écarté ici : on ne garde que les 8 manœuvres, plus compactes. Le renvoi vers la
 * règle générale et le détail canonique est porté par le chip `SourceRef` (p. 217-218) placé dans
 * l'en-tête de la `SheetSection` hôte (coin haut-droit), pas par ce panneau.
 *
 * RENDU : `<RichInline>` (le rendu enrichi PARTAGÉ avec les cartes de capacités), alimenté par les
 * caractéristiques et le niveau du personnage courant. Il balise D'OFFICE les notions de règle
 * (caractéristiques, DEF, états préjudiciables, marqueurs d'action…, comme `GlossaryText`) ET résout
 * les tokens de formule/quantité sur les stats du personnage : Repousser affiche ainsi « recule de
 * [=FOR + 3] » CALCULÉ (chip bleu, ex. « 5 »). Les variantes balisées `richShortEffect`/`richBody`
 * priment sur le verbatim `shortEffect`/`body` quand elles existent (cf. schéma) ; sinon `RichInline`
 * rend le verbatim tel quel. Les manœuvres n'ont pas de terme `rang`/`niveau` de voie → `rank = 0`.
 * `SourceRef` porte le renvoi de page cliquable.
 */

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { MANEUVERS } from '@/data/reference';
import type { ReferenceTextEntry } from '@/data/reference';
import type { Abilities } from '@/lib/engine';
import { SourceRef } from '@/components/SourceRef';
import { RichInline } from '@/components/sheet/FeatureRichText';

/** Les 8 manœuvres nommées, dans l'ordre du livre (l'aperçu `maneuvers-overview` est écarté). */
const NAMED_MANEUVERS = MANEUVERS.filter((m) => m.id !== 'maneuvers-overview');

/** Cadre commun d'un accordion de manœuvre (verre dépoli discret, aligné sur les cartes de la fiche). */
const cardSx = {
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  bgcolor: 'rgba(0, 0, 0, 0.25)',
  '&:before': { display: 'none' },
  overflow: 'hidden',
} as const;

/** Contexte de personnage passé au rendu enrichi (formules/quantités calculées sur ces stats). */
interface CharacterContext {
  abilities: Abilities;
  level: number;
}

/** En-tête d'une manœuvre : titre + renvoi de page à droite, effet court (balisé) en dessous. */
function ManeuverHeader({ entry, ctx }: { entry: ReferenceTextEntry; ctx: CharacterContext }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1, pr: 1, width: '100%' }}>
      <Typography sx={{ fontWeight: 700 }}>{entry.title}</Typography>
      <Box sx={{ flexGrow: 1 }} />
      <SourceRef page={entry.sourcePage} term={entry.title} />
      <Typography
        variant="body2"
        color="text.secondary"
        component="div"
        sx={{ flexBasis: '100%', mt: 0.25 }}
      >
        <RichInline
          text={entry.richShortEffect ?? entry.shortEffect}
          abilities={ctx.abilities}
          level={ctx.level}
          rank={0}
        />
      </Typography>
    </Box>
  );
}

/** Puce « Résolution » distincte, sous le verbatim : le test opposé et son modificateur. */
function ResolutionBullet({ children, ctx }: { children: string; ctx: CharacterContext }) {
  return (
    <Box
      sx={{
        mt: 1.5,
        px: 1.25,
        py: 0.75,
        borderRadius: 1,
        borderLeft: '3px solid',
        borderLeftColor: 'primary.main',
        bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.light', display: 'block' }}>
        Résolution
      </Typography>
      <Typography variant="body2" component="div">
        <RichInline text={children} abilities={ctx.abilities} level={ctx.level} rank={0} />
      </Typography>
    </Box>
  );
}

/** Un accordion de manœuvre : résumé (titre + effet court + page), détail (verbatim + résolution). */
function ManeuverCard({ entry, ctx }: { entry: ReferenceTextEntry; ctx: CharacterContext }) {
  const shortText = entry.richShortEffect ?? entry.shortEffect;
  const bodyText = entry.richBody ?? entry.body;
  // Le verbatim n'est déplié que s'il apporte plus que l'effet court déjà lu dans le résumé.
  const bodyAddsInfo = bodyText.trim() !== shortText.trim();

  return (
    <Accordion disableGutters elevation={0} sx={cardSx}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <ManeuverHeader entry={entry} ctx={ctx} />
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        {bodyAddsInfo && (
          <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line', color: 'text.primary' }}>
            <RichInline text={bodyText} abilities={ctx.abilities} level={ctx.level} rank={0} />
          </Typography>
        )}
        {entry.test && <ResolutionBullet ctx={ctx}>{entry.test}</ResolutionBullet>}
      </AccordionDetails>
    </Accordion>
  );
}

/**
 * Panneau d'aide-mémoire des manœuvres de combat, destiné à une `SheetSection` repliable de la fiche.
 * Reçoit les caractéristiques et le niveau du personnage pour CALCULER les formules/quantités des
 * manœuvres (ex. la distance de recul de Repousser = FOR + 3).
 */
export function ManeuversPanel({ abilities, level }: { abilities: Abilities; level: number }) {
  const ctx: CharacterContext = { abilities, level };
  return (
    <Stack spacing={1.5} data-glossary-shot="ManeuversPanel">
      {/* Contexte minimal : ce qu'est une manœuvre, en une ligne. La règle générale complète
          (modificateur de taille, rendements décroissants) reste sur la page d'aide-mémoire. */}
      <Typography variant="body2" color="text.secondary" component="div">
        <RichInline
          text="Action limitée : un test opposé d’attaque au contact (modificateur entre parenthèses), sans dégâts, pour un avantage tactique."
          abilities={abilities}
          level={level}
          rank={0}
        />
      </Typography>

      {/* Deux colonnes dès `sm` (une seule sur mobile). `alignItems: start` : un accordion déplié
          grandit sans étirer son voisin de la même rangée. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.5,
          alignItems: 'start',
        }}
      >
        {NAMED_MANEUVERS.map((entry) => (
          <ManeuverCard key={entry.id} entry={entry} ctx={ctx} />
        ))}
      </Box>
    </Stack>
  );
}
