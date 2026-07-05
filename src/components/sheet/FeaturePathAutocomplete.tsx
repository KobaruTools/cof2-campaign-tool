'use client';

/**
 * Sélecteur unifié de capacité GROUPÉE PAR VOIE (PER-177). Autocomplete dont les
 * en-têtes de groupe portent la COULEUR et l'ICÔNE du profil de la voie, pour une
 * lecture immédiate. Point de passage unique de tous les « select » qui listent des
 * capacités par voie de profil : emprunt d'une capacité (`feature-from-path`, p. 41),
 * remplacement du changement d'orientation (p. 43), choix d'une capacité à oublier…
 *
 * Le libellé long (« Voie — Rang N — Nom ») sert à l'affichage de la valeur retenue et
 * au filtrage texte ; les items de la liste n'affichent que « Rang N — Nom » (la voie
 * étant déjà portée par l'en-tête de groupe coloré).
 */
import { type ReactNode } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import { featureById, pathById } from '@/data';
import { classColor } from '@/lib/ui/classColors';
import { ClassIcon } from '@/components/ClassIcon';

/** Nom + profil (classId → couleur/icône) d'une voie ; couleur absente hors voie de profil. */
function pathProfile(pathId: string): { name: string; classId?: string; color?: string } {
  const path = pathById.get(pathId);
  if (!path) return { name: pathId };
  if (path.type === 'class') {
    const classId = path.classIds[0];
    return { name: path.name, classId, color: classColor(classId) };
  }
  return { name: path.name };
}

/** Libellé long d'une capacité : « Voie — Rang N — Nom(*) » (le `*` marque un sort). */
export function featurePathLabel(id: string): string {
  const f = featureById.get(id);
  if (!f) return id;
  const name = pathById.get(f.pathId)?.name ?? f.pathId;
  return `${name} — Rang ${f.rank} — ${f.name}${f.isSpell ? '*' : ''}`;
}

export interface FeaturePathAutocompleteProps {
  /** Ids de capacités ; le composant les regroupe et les trie par voie puis rang. */
  options: string[];
  /** Id retenu (`null` = aucun). */
  value: string | null;
  /** Notifie la sélection (`null` si effacée). */
  onChange: (id: string | null) => void;
  label: string;
  /** Ids grisés (non sélectionnables), ex. capacités « emprunteuses » (poupées russes, p. 41). */
  disabledIds?: ReadonlySet<string>;
  /** Suffixe explicatif accolé au libellé d'une option (ex. raison du grisage). */
  optionSuffix?: (id: string) => string | undefined;
  error?: boolean;
  helperText?: ReactNode;
  disabled?: boolean;
  /**
   * Input « déclencheur » (ex. « Oublier une capacité ») : referme la liste après un
   * choix. La valeur restant pilotée par le parent (souvent `null`), l'input se vide.
   */
  clearOnSelect?: boolean;
  sx?: SxProps<Theme>;
}

export function FeaturePathAutocomplete({
  options,
  value,
  onChange,
  label,
  disabledIds,
  optionSuffix,
  error,
  helperText,
  disabled,
  clearOnSelect = false,
  sx,
}: FeaturePathAutocompleteProps) {
  // Tri par voie puis rang → groupes contigus (exigence de `groupBy` côté MUI).
  const sorted = [...options].sort((a, b) => {
    const fa = featureById.get(a);
    const fb = featureById.get(b);
    return (fa?.pathId ?? '').localeCompare(fb?.pathId ?? '') || (fa?.rank ?? 0) - (fb?.rank ?? 0);
  });

  return (
    <Autocomplete
      size="small"
      fullWidth
      sx={sx}
      disabled={disabled}
      options={sorted}
      value={value}
      blurOnSelect={clearOnSelect}
      groupBy={(id) => featureById.get(id)?.pathId ?? ''}
      getOptionLabel={(id) => {
        const base = featurePathLabel(id);
        const suffix = optionSuffix?.(id);
        return suffix ? `${base}${suffix}` : base;
      }}
      getOptionDisabled={(id) => !!disabledIds?.has(id)}
      isOptionEqualToValue={(opt, val) => opt === val}
      onChange={(_, v) => onChange(v ?? null)}
      renderGroup={(params) => {
        const { name, classId, color } = pathProfile(params.group);
        return (
          <li key={params.key}>
            <Box
              sx={(theme) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.25,
                py: 0.5,
                position: 'sticky',
                top: -8,
                zIndex: 1,
                bgcolor: color ? alpha(color, 0.14) : theme.palette.action.hover,
                borderLeft: `3px solid ${color ?? theme.palette.divider}`,
                color: color ?? theme.palette.text.secondary,
                fontWeight: 700,
                fontSize: '0.75rem',
              })}
            >
              {classId ? <ClassIcon classId={classId} size={18} color={color} /> : null}
              <span>{name}</span>
            </Box>
            <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
          </li>
        );
      }}
      renderOption={(props, id) => {
        const { key, ...optionProps } = props as typeof props & { key?: string };
        const f = featureById.get(id);
        const grayed = !!disabledIds?.has(id);
        const suffix = optionSuffix?.(id);
        return (
          <Box component="li" key={key} {...optionProps} sx={{ opacity: grayed ? 0.55 : 1 }}>
            <Typography variant="body2" sx={{ whiteSpace: 'normal' }}>
              <Box component="span" sx={{ color: 'text.secondary', mr: 0.5 }}>
                Rang {f?.rank} —
              </Box>
              {f?.name}
              {f?.isSpell ? '*' : ''}
              {suffix ? (
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  {suffix}
                </Box>
              ) : null}
            </Typography>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} error={error} helperText={helperText} />
      )}
    />
  );
}
