'use client';

/**
 * Navigateur « Dieux » du Codex (PER-420) — consultation en LECTURE SEULE du panthéon
 * d'Osgild (`priest-gods.ts`, p. 126-127), SANS personnage. Grille de blocs (retour propriétaire :
 * un sélecteur maître-détail façon Voies était superflu ici — 32 dieux avec peu de champs chacun,
 * pas de progression par rang, une grille scannable en 3-4 colonnes suffit), sur le modèle de
 * `CodexMagicItemsBrowser` (pas de sélection, tout affiché d'un coup).
 *
 * Pas de gating payant à prévoir : `priestGods` est un tableau statique du livre de base,
 * jamais fusionné par `contentRegistry.ts` (contrairement à `paths`/`ancestries`/`classes`).
 *
 * Rythme visuel (retours propriétaire) : le nom du dieu ET l'icône reprennent la couleur/icône de
 * la VOIE d'origine de sa capacité divine (plutôt qu'un texte neutre + `holy-symbol` répété 32
 * fois). Plusieurs dieux partagent le même PROFIL (`classColor()` identique même si leurs voies
 * diffèrent, ex. Orbis/artefacts et Tyriolth/elixirs sont tous deux forgesort) — `shadeForIndex`
 * dédie une teinte par dieu du même groupe (`GodOrigin.colorKey`, cf. `godTheme.ts`) pour
 * rester distinguables sans changer de famille de couleur. UNIQUEMENT plus clair (jamais plus
 * sombre, retour propriétaire) : sur le fond noir des cartes, une teinte assombrie perd trop de
 * contraste.
 */
import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import { equipmentById, featureById } from '@/data';
import { priestGods } from '@/data/priest-gods';
import type { PriestGod } from '@/data/schema';
import { godColor, godOrigin, type GodOrigin } from '@/lib/ui/godTheme';
import { godBackgroundSymbol } from '@/lib/ui/godSymbolBackgrounds';
import { AncestryIcon } from '@/components/AncestryIcon';
import { ClassIcon } from '@/components/ClassIcon';
import { GodIcon } from '@/components/GodIcon';
import { PathCard } from '@/components/PathCard';
import { RankBadge } from '@/components/RankBadge';
import { SourceRef } from '@/components/SourceRef';

const cardSx = {
  position: 'relative',
  zIndex: 0,
  overflow: 'hidden',
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  bgcolor: 'rgba(0, 0, 0, 0.35)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  p: 2.5,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  // Révèle le crédit d'auteur (`.god-author-badge`) au survol de la carte entière, pas seulement
  // du symbole en filigrane — repli propre sur les cartes sans filigrane (le badge n'existe
  // simplement pas dans le DOM, cf. `GodAuthorBadge` plus bas).
  '&:hover .god-author-badge': { opacity: 1 },
} as const;

/** Symbole du dieu en filigrane blanc semi-transparent, plaqué en haut à droite de la carte via un
 * masque CSS (le SVG source est un aplat noir sur fond transparent — le masque en reprend l'alpha,
 * pas la couleur, donc `background-color: white` ressort tel quel à travers la silhouette).
 * `zIndex: -1` + `zIndex: 0` sur `cardSx` (retour au point ci-dessus) : le filigrane doit peindre
 * SOUS le contenu de la carte sans sortir de son propre contexte d'empilement. Décalé de 30px
 * hors du coin (retour propriétaire) pour que le symbole morde le bord plutôt que de rester
 * cantonné à l'intérieur — `overflow: hidden` sur `cardSx` l'écrête au bord de la carte. */
function GodCardBackground({ url }: { url: string }) {
  const maskImage = `url("${url}")`;
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        top: -30,
        right: -30,
        width: 250,
        height: 250,
        zIndex: -1,
        pointerEvents: 'none',
        opacity: 0.08,
        bgcolor: '#fff',
        WebkitMaskImage: maskImage,
        maskImage,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  );
}

/** Nom de l'auteur du symbole fan-made, révélé au survol de la carte (retour propriétaire) —
 * masqué par défaut (`opacity: 0`) plutôt qu'affiché en permanence, pour ne pas alourdir la
 * grille avec 10 mentions visibles alors que le filigrane suffit à l'œil. Détail complet
 * (source, notes d'incertitude) dans `godSymbolCredits.ts` ; ici juste le nom, au clic sur la
 * source du filigrane on n'a de toute façon qu'une seule information utile à donner tout de
 * suite. Icône palette + tooltip (retour propriétaire) : signale que le nom N'EST PAS l'artiste
 * officiel du livre (contrairement aux illustrations BBE créditées ailleurs) sans avoir à écrire
 * « illustration fan-made » en toutes lettres sur chaque carte. */
function GodAuthorBadge({ author }: { author: string }) {
  return (
    <Tooltip title="Illustration de la communauté" arrow>
      <Stack
        className="god-author-badge"
        direction="row"
        spacing={0.5}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 2,
          alignItems: 'center',
          px: 0.75,
          py: 0.25,
          borderRadius: 1,
          bgcolor: 'rgba(0, 0, 0, 0.6)',
          opacity: 0,
          transition: 'opacity 0.15s ease',
          cursor: 'default',
        }}
      >
        <PaletteOutlinedIcon sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' }} />
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
          {author}
        </Typography>
      </Stack>
    </Tooltip>
  );
}

/** Nombre max de lignes avant troncature (`domain`, texte libre du livre de longueur variable) —
 * borne la hauteur du bloc replié pour que la grille reste homogène (retour propriétaire). */
const domainClampSx = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
} as const;

/** Nom(s) d'arme(s) sacrée(s), résolus depuis `equipment.ts` — jointure « ou » quand plusieurs
 * ids notent un choix du joueur (ex. arc long ou court, cf. notes de `priest-gods.ts`). */
function sacredWeaponNames(ids: readonly string[]): string {
  return ids.map((id) => equipmentById.get(id)?.name ?? id).join(' ou ');
}

/** Icône du profil/de la voie du mage d'origine de la capacité divine (repli neutre `null`,
 * cf. `GodOrigin.kind`) — DIFFÉRENTE de l'icône de tête de carte (`GodIcon`, priorité au thème
 * de domaine) : ici c'est l'identité du PROFIL qui doit ressortir, à côté de son nom. */
function GodOriginIcon({ origin, color, size }: { origin: GodOrigin; color: string; size: number }) {
  if (origin.kind === 'class' && origin.classId) return <ClassIcon classId={origin.classId} size={size} color={color} />;
  if (origin.kind === 'mage') return <AncestryIcon ancestryId="mage" size={size} color={color} />;
  return null;
}

function GodCard({ god, color, origin }: { god: PriestGod; color: string; origin: GodOrigin | undefined }) {
  const divineFeature = featureById.get(god.divineFeatureId);
  const backgroundSymbol = godBackgroundSymbol(god.id);

  return (
    <Box sx={cardSx}>
      {backgroundSymbol && (
        <>
          <GodCardBackground url={backgroundSymbol.url} />
          <GodAuthorBadge author={backgroundSymbol.author} />
        </>
      )}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <GodIcon godId={god.id} color={color} size={26} />
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color }}>
          {god.name}
        </Typography>
        <SourceRef page={god.sourcePage} term={god.name} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic', ...domainClampSx }}>
        {god.domain}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1.5 }}>
        <strong>Symbole sacré :</strong> {god.symbol}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        <strong>Arme sacrée :</strong> {sacredWeaponNames(god.sacredWeaponIds)}
      </Typography>

      {/* `mt: 'auto'` (retour propriétaire) : ancre ce bloc + son séparateur en BAS de la carte,
          quelle que soit la longueur du domaine/de l'arme sacrée au-dessus — les cartes de la
          même ligne de grille (hauteur stretchée) alignent alors toutes leur « CAPACITÉ DIVINE »
          à la même hauteur au lieu de suivre la fin naturelle, variable, du texte. `pt` sur ce
          conteneur (PAS sur la ligne elle-même, qui vit sur l'enfant `borderTop`) : espace garanti
          AU-DESSUS du séparateur — `mt: 'auto'` seul ne le garantit pas quand une carte tassée
          laisse peu d'espace disponible à répartir. */}
      {divineFeature && origin && (
        <Box sx={{ mt: 'auto', pt: 2 }}>
          <Box sx={{ pt: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}
            >
              Capacité divine
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.5, mb: 0.75, color }}>
              <RankBadge rank={divineFeature.rank} color={color} />
              {/* Icône du profil d'origine (retour propriétaire) — même teinte VARIÉE que la carte
                  (`color`, `shadeForIndex`), pas la couleur de base du profil : deux dieux du même
                  profil (ex. forgesort) restent distinguables jusque dans cette icône. */}
              <GodOriginIcon origin={origin} color={color} size={18} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {origin.pathName}
              </Typography>
            </Stack>
            {/* Carte de capacité repliée par défaut (retour propriétaire) : même patron que
                « Capacités sélectionnées » du wizard de level up (`PathCard`), sans case à
                cocher (`selectable={false}`) — la capacité divine n'est pas un choix ici, juste
                une consultation. `repeatFeatureName={false}` : `name` porte déjà le nom de la
                capacité (pas celui de la voie), pas de répétition à faire dans le détail. */}
            <PathCard
              name={divineFeature.name}
              color={color}
              checked
              selectable={false}
              repeatFeatureName={false}
              rankLabel=""
              borderWidth={1}
              feature={divineFeature}
              sx={{ height: 'auto' }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

export function CodexGodsBrowser() {
  const sortedGods = useMemo(() => [...priestGods].sort((a, b) => a.name.localeCompare(b.name, 'fr')), []);

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          alignItems: 'stretch',
        }}
      >
        {sortedGods.map((god) => (
          <GodCard key={god.id} god={god} color={godColor(god.id) ?? 'text.primary'} origin={godOrigin(god.id)} />
        ))}
      </Box>

      {/* Source des symboles fan-made utilisés en filigrane — répétée ici (déjà présente dans
          `AppFooter.tsx`, générique à tout le site) car spécifique au contenu de CETTE page,
          juste sous la grille qu'elle concerne plutôt que noyée dans le pied de page global. */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
        Symboles divins en filigrane : créations de joueurs partagées sur le{' '}
        <Link
          href="https://black-book-editions.fr/forums.php?topic_id=24891"
          target="_blank"
          rel="noopener noreferrer"
          color="inherit"
          sx={{ textDecorationColor: 'rgba(255, 255, 255, 0.4)' }}
        >
          forum de Black Book Éditions
        </Link>
        .
      </Typography>
    </>
  );
}
