'use client';

/**
 * Section « Montures & véhicules » possédés (PER-216) — rendue DANS la section « Compagnons » de la
 * fiche, sous les compagnons dérivés des voies. Contrairement à `CompanionsPanel` (piloté à 100 % par
 * les rangs de voie), les montures sont des POSSESSIONS ajoutées/retirées manuellement : un bouton
 * « Ajouter une monture » (catalogue p. 191) et une corbeille par monture, disponibles hors mode
 * « Modifier » (comme l'invocation/suppression d'instances de compagnons — état de jeu de possession).
 *
 * La carte d'une monture reprend le CADRE COMPACT des autres compagnons (`CreatureStatBlock` : grille
 * de caractéristiques + ligne de stats dérivées + barre de vie), en adaptant le `Creature` de
 * bestiaire en `CreatureProfile` (`creatureToProfile`). Un cheval de guerre peut recevoir une barde
 * (bonus de DEF + malus d'Init. répercuté sur le bloc, et sur le cavalier quand « en selle »). Les
 * bêtes de somme et véhicules (mule, poney, carriole, chariot) n'ont pas de stats : une simple ligne.
 */
import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { bardes, mounts as mountCatalog } from '@/data';
import type { Price } from '@/data/schema';
import type { Abilities, DerivedStats } from '@/lib/engine';
import { resolveCreatureAbilities } from '@/lib/ui/creature';
import type { ResolvedMount } from '@/lib/character/mounts';
import type { Depletion } from '@/lib/character/types';
import {
  CompanionSizePill,
  CreatureAbilitiesGrid,
  CreatureDerivedStats,
  CreatureDescriptionRich,
  CreatureSpecialAbilityBlocks,
} from './CreatureStatBlock';
import { HpGauge, type DamageKind } from './HpGauge';
import { storageKeys } from '@/lib/storage/keys';

/** Prix formaté « 300 pa » (ou chaîne vide si absent). */
function formatPrice(price: Price): string {
  return price ? `${price.amount} ${price.unit}` : '';
}

/**
 * Bouton « Ajouter une monture » + menu du catalogue (p. 191), groupé Montures / Véhicules. Rendu
 * dans l'action de la section « Compagnons » quand la fiche est éditable. Cliquer une entrée ajoute
 * une instance possédée.
 */
export function AddMountButton({ onAdd }: { onAdd: (catalogId: string) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  const pick = (id: string) => {
    onAdd(id);
    close();
  };
  const byKind = (kind: 'mount' | 'vehicle') => mountCatalog.filter((m) => m.kind === kind);
  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        Ajouter une monture
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
        <ListSubheader sx={{ bgcolor: 'transparent', lineHeight: 2 }}>Montures</ListSubheader>
        {byKind('mount').map((m) => (
          <MenuItem key={m.id} onClick={() => pick(m.id)}>
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', width: '100%' }}>
              <span>{m.name}</span>
              <Typography component="span" variant="caption" color="text.secondary">
                {formatPrice(m.price)}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
        <ListSubheader sx={{ bgcolor: 'transparent', lineHeight: 2 }}>Véhicules</ListSubheader>
        {byKind('vehicle').map((m) => (
          <MenuItem key={m.id} onClick={() => pick(m.id)}>
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', width: '100%' }}>
              <span>{m.name}</span>
              <Typography component="span" variant="caption" color="text.secondary">
                {formatPrice(m.price)}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

interface MountCardProps {
  resolved: ResolvedMount;
  depletion: Depletion;
  readOnly: boolean;
  /** Le personnage est-il actuellement en selle sur cette monture ? */
  mounted: boolean;
  /** Caractéristiques du maître — inertes pour un bloc de stats fixe, requises par les sous-rendus. */
  abilities: Abilities;
  /** Niveau du maître — inerte ici (stats fixes), requis par les sous-rendus. */
  level: number;
  /** Stats dérivées du maître — inutilisées (aucune stat de monture recopiée du maître). */
  masterDerived?: DerivedStats;
  onRemove: () => void;
  onSetBarde: (bardeId: string | undefined) => void;
  onSetMounted: (on: boolean) => void;
  onDamage: (amount: number, kind: DamageKind) => void;
  onHeal: (amount: number) => void;
  onReset: () => void;
}

function MountCard({
  resolved,
  depletion,
  readOnly,
  mounted,
  abilities,
  level,
  masterDerived,
  onRemove,
  onSetBarde,
  onSetMounted,
  onDamage,
  onHeal,
  onReset,
}: MountCardProps) {
  const { owned, entry, displayName, profile, barde, maxHp } = resolved;
  const kindLabel = entry?.kind === 'vehicle' ? 'Véhicule' : 'Monture';
  const canWearBarde = !!entry?.canWearBarde;
  // « En selle » n'a de sens (et n'est proposé) que pour une monture montable dotée d'un bloc de
  // combat (cheval de selle/guerre) — pas pour un véhicule ni une bête de somme sans stats.
  const rideable = !!profile && entry?.kind === 'mount';
  // Colonne DROITE (comme la carte compagnon) : caractéristiques + stats dérivées, si le profil en a.
  const hasAbilities = !!(profile && resolveCreatureAbilities(profile, abilities));
  const hasDerived = !!(
    profile &&
    (profile.defense || profile.initiative || profile.attack || (maxHp === null && profile.hitPoints) || profile.extraAttacks?.length)
  );
  const hasRight = hasAbilities || hasDerived;
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.25,
        bgcolor: (t) => alpha(t.palette.text.primary, 0.025),
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 0.75 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap', minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
            {displayName.toUpperCase()}
          </Typography>
          {profile?.size && <CompanionSizePill size={profile.size} />}
          <Typography variant="caption" color="text.secondary">
            {kindLabel}
            {entry?.price ? ` · ${formatPrice(entry.price)}` : ''}
          </Typography>
        </Stack>
        {!readOnly && (
          <AppTooltip title={`Retirer ${displayName.toLowerCase()}`}>
            <IconButton size="small" color="error" aria-label={`Retirer ${displayName.toLowerCase()}`} onClick={onRemove}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
        )}
      </Stack>

      {profile ? (
        // Deux colonnes compactes, comme la carte compagnon : gauche = PV + note + capacités ;
        // droite = caractéristiques (style bestiaire) + stats dérivées (DEF, Init., attaque).
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: hasRight ? '1fr 1fr' : '1fr' },
            gap: 1.5,
            alignItems: 'start',
          }}
        >
          <Stack spacing={0.75} sx={{ minWidth: 0 }}>
            {maxHp !== null && (
              <HpGauge
                depletion={depletion}
                maxHp={maxHp}
                onDamage={onDamage}
                onHeal={onHeal}
                onReset={onReset}
                persistKey={storageKeys.gauge.mount(owned.id)}
                iconLabel={`Points de vigueur — ${displayName}`}
              />
            )}
            <CreatureDescriptionRich profile={profile} abilities={abilities} level={level} rank={0} />
            {profile.note && (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.5 }}>
                {profile.note}
              </Typography>
            )}
            <CreatureSpecialAbilityBlocks profile={profile} abilities={abilities} level={level} rank={0} />
          </Stack>

          {hasRight && (
            <Stack spacing={0.75} sx={{ minWidth: 0 }}>
              {hasAbilities && <CreatureAbilitiesGrid profile={profile} masterAbilities={abilities} />}
              <CreatureDerivedStats
                profile={profile}
                abilities={abilities}
                level={level}
                rank={0}
                masterDerived={masterDerived}
                defenseAltActive={false}
                showHitPoints={maxHp === null}
              />
            </Stack>
          )}
        </Box>
      ) : (
        // Bête de somme / véhicule : pas de stats de combat.
        <Typography variant="body2" color="text.secondary">
          {entry?.kind === 'vehicle'
            ? 'Véhicule tracté (aucune statistique de combat).'
            : 'Bête de somme (aucune statistique de combat).'}
        </Typography>
      )}

      {/* Contrôles sur UNE ligne : « En selle » (état de jeu ; pilote le malus d'Init. de barde au
          cavalier et, pour un chevalier, les bonus « en selle » de sa voie) + sélecteur de barde. */}
      {(rideable || canWearBarde) && (
        <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {rideable && (
            <AppTooltip title="Le personnage est-il actuellement en selle sur cette monture ? Pilote le malus d'Initiative d'une barde sur le cavalier (et les capacités « en selle » d'un chevalier).">
              <span>
                <ToggleButton
                  value="mounted"
                  size="small"
                  selected={mounted}
                  disabled={readOnly}
                  onChange={() => onSetMounted(!mounted)}
                  // Hauteur alignée sur celle du champ « Barde » (input MUI `size="small"` = 40 px).
                  sx={{ textTransform: 'none', px: 1.5, py: 0, height: 40 }}
                >
                  {mounted ? 'En selle' : 'À pied'}
                </ToggleButton>
              </span>
            </AppTooltip>
          )}
          {canWearBarde &&
            (readOnly ? (
              <Typography variant="caption" color="text.secondary">
                Barde : {barde ? `${barde.name} (+${barde.defBonus} DEF)` : 'aucune'}
              </Typography>
            ) : (
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id={`barde-${owned.id}`}>Barde</InputLabel>
                <Select
                  labelId={`barde-${owned.id}`}
                  label="Barde"
                  value={barde?.id ?? ''}
                  onChange={(e) => onSetBarde(e.target.value ? String(e.target.value) : undefined)}
                >
                  <MenuItem value="">
                    <em>Aucune barde</em>
                  </MenuItem>
                  {bardes.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name} (+{b.defBonus} DEF · −{b.defBonus} Init.)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}
        </Stack>
      )}

    </Box>
  );
}

export interface OwnedMountsPanelProps {
  /** Montures possédées, déjà résolues (`listOwnedMounts`). */
  mounts: ResolvedMount[];
  /** Fiche en lecture seule (fiche d'autrui) : masque add/retrait/édition de barde. */
  readOnly: boolean;
  /** Caractéristiques EFFECTIVES du maître (requises par les sous-rendus de créature). */
  abilities: Abilities;
  /** Niveau du personnage. */
  level: number;
  /** Stats dérivées du maître. */
  masterDerived?: DerivedStats;
  /** Le personnage est-il en selle sur la monture `id` ? (état partagé avec la voie chevalier). */
  isMounted: (id: string) => boolean;
  /** Bascule l'état « en selle » de la monture `id`. */
  onSetMounted: (id: string, on: boolean) => void;
  /** Retire la monture `id`. */
  onRemove: (id: string) => void;
  /** Change (ou retire) la barde de la monture `id`. */
  onSetBarde: (id: string, bardeId: string | undefined) => void;
  /** Inflige des dégâts à la monture `id`. */
  onDamage: (id: string, amount: number, kind: DamageKind) => void;
  /** Soigne la monture `id`. */
  onHeal: (id: string, amount: number) => void;
  /** Remet la monture `id` à plein. */
  onReset: (id: string) => void;
}

/** Liste des montures/véhicules possédés (une carte chacun). L'appelant ne rend rien si la liste est vide. */
export function OwnedMountsPanel({
  mounts,
  readOnly,
  abilities,
  level,
  masterDerived,
  isMounted,
  onSetMounted,
  onRemove,
  onSetBarde,
  onDamage,
  onHeal,
  onReset,
}: OwnedMountsPanelProps) {
  return (
    <Stack spacing={1.5}>
      {mounts.map((resolved) => (
        <MountCard
          key={resolved.owned.id}
          resolved={resolved}
          depletion={resolved.owned.hp ?? {}}
          readOnly={readOnly}
          mounted={isMounted(resolved.owned.id)}
          abilities={abilities}
          level={level}
          masterDerived={masterDerived}
          onRemove={() => onRemove(resolved.owned.id)}
          onSetBarde={(bardeId) => onSetBarde(resolved.owned.id, bardeId)}
          onSetMounted={(on) => onSetMounted(resolved.owned.id, on)}
          onDamage={(amount, kind) => onDamage(resolved.owned.id, amount, kind)}
          onHeal={(amount) => onHeal(resolved.owned.id, amount)}
          onReset={() => onReset(resolved.owned.id)}
        />
      ))}
    </Stack>
  );
}
