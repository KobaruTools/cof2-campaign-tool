'use client';

/**
 * Champ « lien ou code d'invitation » de la vitrine : un joueur y colle ce que son MJ
 * lui a distribué depuis la campagne (section « Joueurs » → copie du lien) et arrive
 * dans son espace sans avoir de compte.
 *
 * L'invitation EST le lien `/join/<uuid>` (cf. `PlayersSection` côté MJ) : on accepte
 * donc aussi bien le lien complet — collé depuis un message — que le code seul, en en
 * extrayant l'UUID. Rien n'est validé ici : seule la FORME est vérifiée, la validité du
 * secret est tranchée par `redeemJoinSecret` côté serveur, qui renvoie un message
 * générique en cas d'échec (aucune fuite sur l'existence d'un secret).
 *
 * Navigation en **dur** (`window.location`) et non via le routeur : `/join/[secret]`
 * est un Route Handler qui OUVRE une session (pose des cookies), ce qu'une navigation
 * douce côté client ne saurait consommer.
 */
import { useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

/** UUID du secret d'invitation, où qu'il se trouve dans ce qui a été collé. */
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function JoinCodeField() {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const match = UUID_RE.exec(value);
    if (!match) {
      setError("Ce lien ne ressemble pas à une invitation. Recopie-le en entier, ou demande-le à ton MJ.");
      return;
    }
    setError(null);
    window.location.href = `/join/${match[0].toLowerCase()}`;
  };

  return (
    <Stack
      component="form"
      onSubmit={submit}
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { sm: 'flex-start' } }}
    >
      <TextField
        fullWidth
        size="small"
        label="Lien ou code d'invitation"
        placeholder="https://…/join/… ou le code seul"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        error={error !== null}
        helperText={error ?? ' '}
      />
      <Button
        type="submit"
        variant="contained"
        disabled={value.trim() === ''}
        sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
      >
        Rejoindre
      </Button>
    </Stack>
  );
}
