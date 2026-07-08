/**
 * Éditeur des **règles de table** d'une campagne (`CampaignRules`) — composant de
 * saisie contrôlé, partagé (PER-198) entre la page de réglages
 * (`/campaign/[cid]/settings`) et l'assistant de création (`/campaigns/new`).
 * Chaque règle occupe son propre `RuleBlock` (titre, description, renvoi au livre,
 * contrôle). Ajouter une règle ici la fait apparaître sur les deux surfaces à la
 * fois — pas de duplication.
 *
 * Contrôlé de bout en bout : reçoit les `rules` courantes et remonte chaque
 * modification via `onChange` (l'appelant décide quand persister).
 */
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import type { CampaignRules } from '@/lib/campaign';
import { RuleBlock } from './RuleBlock';

export interface CampaignRulesFieldsProps {
  rules: CampaignRules;
  onChange: (rules: CampaignRules) => void;
}

export function CampaignRulesFields({ rules, onChange }: CampaignRulesFieldsProps) {
  return (
    <Stack spacing={2}>
      <RuleBlock
        title="Armes à feu autorisées"
        description="Autorise la poudre dans l’univers de la campagne. Désactivée, l’arquebusier combat à l’arbalète et devient « Arbalétrier »."
        section="Poudre ou pas poudre ?"
        page={62}
        control={
          <Switch
            checked={rules.firearmsAllowed}
            onChange={(e) => onChange({ ...rules, firearmsAllowed: e.target.checked })}
            slotProps={{ input: { 'aria-label': 'Armes à feu autorisées' } }}
          />
        }
      />
      {/* Règle maison (PER-87) : aucune page du livre à citer. */}
      <RuleBlock
        title="Dé de vie à la montée de niveau (règle maison)"
        description="À chaque montée de niveau, le joueur peut choisir entre les PV fixes habituels et lancer son dé de vie (le dé de récupération de sa famille), à saisir librement. Le jet remplace la part « famille » du gain ; la Constitution s’ajoute par-dessus, si bien que la moyenne équivaut aux PV fixes — avec la chance en plus."
        control={
          <Switch
            checked={rules.hitDieOnLevelUp}
            onChange={(e) => onChange({ ...rules, hitDieOnLevelUp: e.target.checked })}
            slotProps={{ input: { 'aria-label': 'Dé de vie à la montée de niveau' } }}
          />
        }
      />
    </Stack>
  );
}
