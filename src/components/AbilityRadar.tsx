'use client';

/**
 * Toile (radar) compacte des 7 caractéristiques, pour la micro-fiche récapitulative
 * (`CharacterPreviewCard`). Préoccupation purement UI (aucune règle CO2), rendue en
 * SVG maison — cohérent avec les autres visualisations custom (badges, micro-grille
 * des voies), léger et theme-aware sans dépendance externe.
 *
 * Deux niveaux de lecture superposés :
 *  — polygone REMPLI (filet blanc translucide) = valeur de base (celle des badges) ;
 *  — contour TIRETÉ (accent) = valeur EFFECTIVE (base + modificateurs permanents de
 *    capacités, et bonus d'équipement magique le cas échéant). Là où l'effectif dépasse
 *    la base, le contour sort du polygone plein → le bonus se LIT comme un débordement.
 *
 * Des filets concentriques (un par point de score, de −3 à +5) servent de graduation.
 * L'anneau +5 (plafond de la carac de base) est accentué. Une valeur effective au-delà
 * de +5 repousse le bord du domaine (`domainMax`) et sort donc de cet anneau : le
 * dépassement devient une information.
 */
import Box from '@mui/material/Box';
import { ABILITY_IDS } from '@/data/schema';
import type { Character } from '@/lib/character/types';
import { effectiveAbilities } from '@/lib/character/effects';
import { ABILITY_ICON_PATHS } from '@/lib/ui/abilityIcons';
import { ABILITY_COLORS, ABILITY_NAMES } from '@/lib/ui/ability';

/** Côté du viewBox SVG (carré). */
const SIZE = 148;
const CENTER = SIZE / 2;
/** Rayon du sommet du domaine (bord extérieur de la toile). */
const R = 42;
/** Rayon d'ancrage des icônes de carac (au-delà de l'anneau). */
const LABEL_R = R + 15;
/** Côté (viewBox) d'une icône de carac aux sommets. */
const ICON = 15;
/** Plancher de caractéristique (livre de base). */
const AXIS_MIN = -3;
/** Plafond de la caractéristique de BASE (livre) → anneau de référence. */
const BASE_CAP = 5;

/** Angle (degrés) du i-ème axe : premier sommet en haut, sens horaire. */
function angleOf(index: number): number {
  return -90 + (index * 360) / ABILITY_IDS.length;
}

/** Coordonnées d'un point à `value` sur l'axe `index`, pour un domaine `[AXIS_MIN, domainMax]`. */
function pointAt(value: number, index: number, domainMax: number): { x: number; y: number } {
  // `frac` borné à ≥ 0 : la fiche est permissive, une valeur < −3 ne rentre pas « sous » le centre.
  const frac = Math.max(0, (value - AXIS_MIN) / (domainMax - AXIS_MIN));
  const r = frac * R;
  const rad = (angleOf(index) * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

/** Points (attribut SVG `points`) du heptagone de niveau constant `value`. */
function ringPoints(value: number, domainMax: number): string {
  return ABILITY_IDS.map((_, i) => {
    const p = pointAt(value, i, domainMax);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
}

export function AbilityRadar({ character }: { character: Character }) {
  const base = character.abilities;
  const effective = effectiveAbilities(character);
  // Le domaine s'étend au-delà de +5 uniquement si un bonus externe pousse une carac plus haut.
  const domainMax = Math.max(
    BASE_CAP,
    ...ABILITY_IDS.map((id) => Math.max(base[id] ?? 0, effective[id] ?? 0)),
  );
  const hasBoost = ABILITY_IDS.some((id) => (effective[id] ?? 0) !== (base[id] ?? 0));

  // Filets internes : un heptagone par point de score, du premier cran au-dessus du
  // plancher jusqu'au bord du domaine (le cran = −3 est le centre, inutile à tracer).
  const gridLevels: number[] = [];
  for (let v = AXIS_MIN + 1; v <= domainMax; v += 1) gridLevels.push(v);

  const baseShape = ABILITY_IDS.map((id, i) => {
    const p = pointAt(base[id] ?? 0, i, domainMax);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
  const effectiveShape = ABILITY_IDS.map((id, i) => {
    const p = pointAt(effective[id] ?? 0, i, domainMax);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label="Toile des caractéristiques"
      sx={{ width: '100%', maxWidth: 132, height: 'auto', display: 'block', mx: 'auto' }}
    >
      {/* Rayons (un par axe). */}
      {ABILITY_IDS.map((id, i) => {
        const outer = pointAt(domainMax, i, domainMax);
        return (
          <line
            key={id}
            x1={CENTER}
            y1={CENTER}
            x2={outer.x.toFixed(1)}
            y2={outer.y.toFixed(1)}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Filets concentriques, un par point de score. Les crans 0 et +5 sont accentués. */}
      {gridLevels.map((v) => {
        const isCap = v === BASE_CAP;
        const isZero = v === 0;
        return (
          <polygon
            key={v}
            points={ringPoints(v, domainMax)}
            fill="none"
            stroke={isCap ? 'rgba(255,255,255,0.5)' : isZero ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)'}
            strokeWidth={isCap ? 0.75 : 0.5}
            strokeDasharray={isCap ? '2 2' : undefined}
          >
            {isCap && <title>Plafond de la caractéristique de base (+5)</title>}
          </polygon>
        );
      })}

      {/* Polygone EFFECTIF (tireté, accent) — rendu seulement s'il diffère de la base. */}
      {hasBoost && (
        <polygon
          points={effectiveShape}
          fill="none"
          stroke="#ffd166"
          strokeOpacity={0.85}
          strokeWidth={1.25}
          strokeDasharray="3 2"
          strokeLinejoin="round"
        />
      )}

      {/* Polygone de BASE : filet blanc translucide + fond blanc plus translucide encore. */}
      <polygon
        points={baseShape}
        fill="rgba(255,255,255,0.1)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={1.25}
        strokeLinejoin="round"
      />

      {/* Sommets de base, teintés de la couleur d'identité de chaque carac. */}
      {ABILITY_IDS.map((id, i) => {
        const b = base[id] ?? 0;
        const e = effective[id] ?? 0;
        const p = pointAt(b, i, domainMax);
        return (
          <circle key={id} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={1.8} fill={ABILITY_COLORS[id]}>
            <title>{`${ABILITY_NAMES[id]} : ${b >= 0 ? '+' : ''}${b}${e !== b ? ` → ${e >= 0 ? '+' : ''}${e} (bonus)` : ''}`}</title>
          </circle>
        );
      })}

      {/* Icônes de carac aux sommets (à la place des codes), teintées d'identité. */}
      {ABILITY_IDS.map((id, i) => {
        const rad = (angleOf(i) * Math.PI) / 180;
        const x = CENTER + LABEL_R * Math.cos(rad) - ICON / 2;
        const y = CENTER + LABEL_R * Math.sin(rad) - ICON / 2;
        return (
          <g key={id}>
            <title>{ABILITY_NAMES[id]}</title>
            <svg
              x={x.toFixed(1)}
              y={y.toFixed(1)}
              width={ICON}
              height={ICON}
              viewBox="0 0 512 512"
              fill={ABILITY_COLORS[id]}
              dangerouslySetInnerHTML={{ __html: ABILITY_ICON_PATHS[id] ?? '' }}
            />
          </g>
        );
      })}
    </Box>
  );
}
