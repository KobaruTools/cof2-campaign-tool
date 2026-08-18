'use client';

import { useState, type ReactNode } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, lighten } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import type { Feature } from '@/data/schema';
import type { Abilities } from '@/lib/engine';
import { AncestryIcon } from '@/components/AncestryIcon';
import { ClassIcon } from '@/components/ClassIcon';
import { FeatureMarkerHexes } from '@/components/FeatureMarkerHex';
import { FeatureText } from '@/components/sheet/FeatureRichText';
import { SourceRef } from '@/components/SourceRef';
import { DeclinedFeatureName } from '@/components/sheet/FeatureDeclension';
import { featureCodexHref } from '@/lib/ui/codex';
import { prestigeStaticBorderSx } from '@/lib/ui/prestigeStyle';

export interface PathCardProps {
  /** Nom affiché en tête (chaîne simple, ou nœud enrichi — ex. `FeatureLabel`). */
  name: ReactNode;
  /**
   * Terme à cibler dans le visualiseur pour la sourceRef (PER-59/61). Requis quand `name`
   * n'est pas une chaîne simple ; sinon replié sur `name`.
   */
  term?: string;
  color?: string;
  classId?: string;
  /** Voie de peuple : id pour l'icône neutre (à défaut de `classId`/teinte de profil). */
  ancestryId?: string;
  checked: boolean;
  disabled?: boolean;
  /** Capacité concernée par la carte : affichée dans le détail repliable. */
  feature?: Feature;
  /** Caractéristiques du personnage : pour l'enrichissement de la description de `feature` (dés/formules). */
  abilities?: Abilities;
  /** Niveau du personnage : pour l'enrichissement de la description de `feature`. */
  level?: number;
  /** Page de la VOIE elle-même (pas du rang affiché) : renvoi affiché en tête du bloc. */
  sourcePage?: number | string;
  /** Libellé au-dessus de la capacité (ex. « Rang 1 — acquis gratuitement »). */
  rankLabel?: string;
  /** Précision en italique sous le libellé de rang (ex. règle de remplacement). */
  note?: ReactNode;
  /**
   * Répète le nom de `feature` (via `FeatureLabel`) en tête du détail (défaut) — utile quand
   * `name` porte le nom de la VOIE, pas de la capacité. À couper (`false`) quand `name` porte
   * DÉJÀ le nom de la capacité (évite la répétition).
   */
  repeatFeatureName?: boolean;
  /**
   * Détail repliable GÉNÉRIQUE, à la place du bloc `feature` (ex. une précision de règle
   * qui n'est pas une capacité). Prioritaire sur `feature` si les deux sont fournis. Ni
   * l'un ni l'autre → pas de chevron/collapse : la carte reste un simple sélecteur.
   */
  detail?: ReactNode;
  control?: 'checkbox' | 'radio';
  /**
   * Carte sélectionnable (défaut) : indicateur visible, le clic (dé)sélectionne.
   * `false` → affichage seul (pas d'indicateur) : le clic plie/déplie le détail,
   * utile pour présenter une capacité figée (ex. capacité divine du prêtre).
   */
  selectable?: boolean;
  /** Détail déplié dès le montage (ex. pour aider à décider). */
  defaultExpanded?: boolean;
  onToggle?: () => void;
  /**
   * Contenu additionnel juste après le nom, avant le renvoi de page — ex. une pastille
   * d'avertissement avec sa propre infobulle.
   */
  nameAdornment?: ReactNode;
  /**
   * Contenu additionnel en bout d'en-tête, après le chevron (ou à sa place si la carte n'a
   * pas de détail) — ex. une pastille d'avertissement avec sa propre infobulle.
   */
  endAdornment?: ReactNode;
  /**
   * Carte de voie de PRESTIGE : remplace le contour/fond plein habituel par l'habillage
   * « précieux » (liseré en dégradé métal + fond en dégradé assombri) réutilisé de
   * `FeaturesByPath`/`prestigeStyle.ts` — visible même non cochée (contrairement au style
   * plein, qui ne se colore qu'à la sélection). `prestigeTint` = teinte de FAMILLE
   * (`prestigeCategoryColor`, absente pour les génériques → repli or tuné par défaut).
   */
  prestige?: boolean;
  prestigeTint?: string;
  /** Épaisseur de la bordure (non-prestige) en px. Défaut 2. */
  borderWidth?: number;
  /**
   * Style additionnel fusionné PAR-DESSUS le style par défaut de la racine (dont `height:
   * '100%'`, pensé pour les grilles de sélection à hauteur de ligne stretchée). À utiliser
   * pour neutraliser ce `height` quand la carte est nichée dans un conteneur flex/grid dont
   * la hauteur définie remonte par percentage jusqu'ici (déborde sinon — Codex des dieux,
   * PER-420 retours).
   */
  sx?: SxProps<Theme>;
  /**
   * Position de l'icône de profil/peuple (`classId`/`ancestryId`) dans l'en-tête. `'end'`
   * (défaut, inchangé) : après le renvoi de page, en fin d'en-tête — adapté à une carte de
   * SÉLECTION où l'œil lit d'abord le nom. `'start'` : avant le nom — plus lisible pour une
   * carte figée qui ne présente qu'UNE capacité déjà connue (ex. Codex des familiers, PER-421).
   */
  iconPosition?: 'start' | 'end';
}

/**
 * Carte de sélection d'une voie/capacité (case à cocher ou radio), avec en-tête coloré
 * (nom + icône de profil/peuple + renvoi de page) et détail repliable optionnel (texte
 * verbatim d'une capacité, ou tout autre contenu via `detail`). Née dans le créateur de
 * personnage (choix de voies), réutilisée partout où ce même patron de carte s'applique
 * (ex. montée de niveau).
 */
export function PathCard({
  name,
  term,
  color = '#90a4ae',
  classId,
  ancestryId,
  checked,
  disabled = false,
  feature,
  abilities,
  level,
  sourcePage,
  rankLabel = 'Rang 1 — acquis gratuitement',
  note,
  repeatFeatureName = true,
  detail,
  control = 'checkbox',
  selectable = true,
  defaultExpanded = false,
  onToggle,
  nameAdornment,
  endAdornment,
  prestige = false,
  prestigeTint,
  borderWidth = 2,
  sx,
  iconPosition = 'end',
}: PathCardProps) {
  const ControlComp = control === 'radio' ? Radio : Checkbox;
  const GhostIcon = control === 'radio' ? FiberManualRecordIcon : CheckIcon;
  // Détail repliable, replié par défaut — pas de persistance, confort de lecture seulement.
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasDetail = detail != null || !!feature;
  // Case + nom (dé)sélectionnent ; le reste du bloc (dé)plie le détail. Sans détail, tout le
  // bloc (dé)sélectionne, comme avant (ex. « Profil hybride », sans collapse).
  const checkZoneSelects = selectable && !disabled;
  const ghostHoverSx = checkZoneSelects
    ? { '&:hover .PathCard-ghostCheck': { opacity: 0.5 } }
    : undefined;
  return (
    <Box
      onClick={() => {
        if (disabled) return;
        if (hasDetail) setExpanded((v) => !v);
        else if (selectable) onToggle?.();
      }}
      sx={[{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color .15s, background-color .15s, filter .15s',
        ...(prestige
          ? {
              ...prestigeStaticBorderSx(checked ? 2 : 1, 'inherit', prestigeTint),
              border: 0,
              background: `linear-gradient(45deg, ${alpha(prestigeTint ? lighten(prestigeTint, 0.55) : '#f5e7a0', checked ? 0.34 : 0.2)} 0%, ${alpha('#d0d0d0', checked ? 0.14 : 0.08)} 85%)`,
            }
          : {
              border: borderWidth,
              borderColor: checked ? color : 'divider',
              bgcolor: checked ? alpha(color, 0.06) : 'transparent',
            }),
        '&:hover': disabled
          ? undefined
          : {
              ...(prestige
                ? { filter: 'brightness(1.12)' }
                : {
                    borderColor: checked ? color : alpha(color, 0.5),
                    bgcolor: checked ? alpha(color, 0.1) : alpha(color, 0.03),
                  }),
              ...(!hasDetail ? ghostHoverSx : undefined),
            },
      }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {/* En-tête : indicateur + nom (coloré quand sélectionné) + renvoi de page + icône de
          profil/peuple + chevron (si un détail existe). */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', p: 1 }}>
        {iconPosition === 'start' &&
          (classId ? (
            <ClassIcon classId={classId} size={20} sx={{ color, flexShrink: 0 }} />
          ) : (
            ancestryId && (
              <AncestryIcon ancestryId={ancestryId} size={20} sx={{ color: 'text.secondary', flexShrink: 0 }} />
            )
          ))}
        {selectable ? (
          // Case + nom regroupés dans une même zone de clic : c'est elle qui (dé)sélectionne,
          // que la carte ait un détail repliable ou non (le clic ne remonte jamais au bloc
          // englobant — `stopPropagation` — pour ne jamais déclencher AUSSI son repli/dépli).
          <Box
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onToggle?.();
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              // Pas de `flexGrow` : la zone de clic reste au plus près du contenu (case + nom),
              // pour laisser le reste du bloc (l'espace vide) au repli/dépli — cf. le spacer
              // `flexGrow` juste après, qui n'appartient PAS à cette zone.
              flexShrink: 1,
              minWidth: 0,
              gap: 0.5,
              cursor: disabled ? 'not-allowed' : 'pointer',
              ...ghostHoverSx,
            }}
          >
            <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
              <ControlComp
                checked={checked}
                disabled={disabled}
                size="small"
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggle?.()}
                sx={{ p: 0.5, color, '&.Mui-checked': { color } }}
              />
              {!checked && (
                <GhostIcon
                  className="PathCard-ghostCheck"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    m: 'auto',
                    fontSize: control === 'radio' ? 12 : 18,
                    color,
                    opacity: 0,
                    pointerEvents: 'none',
                    transition: 'opacity .1s',
                  }}
                />
              )}
            </Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: checked ? color : 'text.primary',
                lineHeight: 1.2,
                wordBreak: 'break-word',
                minWidth: 0,
              }}
            >
              {name}
            </Typography>
          </Box>
        ) : (
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: checked ? color : 'text.primary',
              flexGrow: 1,
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}
          >
            {name}
          </Typography>
        )}
        {nameAdornment}
        {/* Espaceur : appartient au « reste du bloc » (repli/dépli), jamais à la zone de
            sélection ci-dessus — c'est lui qui pousse renvoi de page/icône/chevron à droite. */}
        {selectable && <Box sx={{ flexGrow: 1, minWidth: 8 }} />}
        {sourcePage != null && (
          <SourceRef page={sourcePage} term={term ?? (typeof name === 'string' ? name : undefined)} />
        )}
        {iconPosition !== 'start' && classId ? (
          <ClassIcon classId={classId} size={20} sx={{ color, flexShrink: 0 }} />
        ) : (
          iconPosition !== 'start' &&
          ancestryId && (
            <AncestryIcon ancestryId={ancestryId} size={20} sx={{ color: 'text.secondary', flexShrink: 0 }} />
          )
        )}
        {/* Chevron de repli (indépendant de la sélection) : ouvre/ferme le détail. Absent
            quand la carte n'a rien à déplier (ni `feature` ni `detail`). */}
        {hasDetail && (
          <IconButton
            size="small"
            aria-label={expanded ? 'Replier le détail' : 'Déplier le détail'}
            aria-expanded={expanded}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            sx={{ flexShrink: 0 }}
          >
            <ExpandMoreIcon
              fontSize="small"
              sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
            />
          </IconButton>
        )}
        {endAdornment}
      </Stack>

      {/* Corps repliable : `detail` générique s'il est fourni, sinon la capacité + son texte
          verbatim. Absent si la carte n'a ni l'un ni l'autre. */}
      {hasDetail && (
        <Collapse in={expanded} unmountOnExit>
          <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }} onClick={(e) => e.stopPropagation()}>
            {detail ?? (feature ? (
              <>
                {rankLabel && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: note ? 0 : 0.25 }}
                  >
                    {rankLabel}
                  </Typography>
                )}
                {note && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.25, fontStyle: 'italic' }}
                  >
                    {note}
                  </Typography>
                )}
                {repeatFeatureName && (
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      <DeclinedFeatureName feature={feature} />
                    </Typography>
                    <FeatureMarkerHexes feature={feature} color={color} size={18} pathRank={feature.rank} />
                  </Stack>
                )}
                <FeatureText feature={feature} abilities={abilities} level={level} pathRank={feature.rank} />
                {/* Renvoi cliquable vers la page du rang dans le livre (PER-246). Le nom de la
                    capacité sert de terme à cibler/surligner dans le visualiseur (PER-59/61). */}
                <Box sx={{ mt: 1 }}>
                  <SourceRef page={feature.sourcePage} term={feature.name} codexHref={featureCodexHref(feature)} />
                </Box>
              </>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Capacité indisponible.
              </Typography>
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
}
