'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UploadIcon from '@mui/icons-material/Upload';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { AppTooltip } from '@/components/AppTooltip';
import { ClassIcon } from '@/components/ClassIcon';
import { HomeBackground } from '@/components/home/HomeBackground';
import { fileSlug, formatDate, summarize } from '@/lib/character/summary';
import { classColor } from '@/lib/ui/classColors';
import { useCharactersStore } from '@/stores/characters';
import { useWizardStore } from '@/stores/wizard';

export default function HomePage() {
  const router = useRouter();
  const hasHydrated = useCharactersStore((s) => s.hasHydrated);
  const characters = useCharactersStore((s) => s.characters);
  const duplicate = useCharactersStore((s) => s.duplicate);
  const remove = useCharactersStore((s) => s.remove);
  const importCharacter = useCharactersStore((s) => s.importCharacter);
  const draft = useWizardStore((s) => s.draft);
  const clearDraft = useWizardStore((s) => s.clear);

  const fileInput = useRef<HTMLInputElement>(null);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setToast({ message, severity });

  const handleCreate = () => {
    router.push('/create');
  };

  const handleExport = (id: string) => {
    const character = useCharactersStore.getState().getById(id);
    if (!character) return;
    const blob = new Blob([JSON.stringify(character, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileSlug(character.name)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`« ${character.name || 'Sans nom'} » exporté en JSON.`);
  };

  const handleDuplicate = (id: string) => {
    const copy = duplicate(id);
    if (copy) notify(`« ${copy.name || 'Sans nom'} » dupliqué.`);
  };

  const handleImportFile = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text());
      const c = importCharacter(raw);
      notify(`« ${c.name || 'Sans nom'} » importé.`);
    } catch (e) {
      // On ne laisse jamais remonter de message technique brut : l'erreur de
      // parsing JSON (SyntaxError, libellé en anglais) est reformulée ; les
      // erreurs de migration/validation portent déjà un message français clair.
      const message =
        e instanceof SyntaxError
          ? "Ce fichier n'est pas un JSON valide."
          : e instanceof Error
            ? e.message
            : 'Fichier illisible.';
      notify(`Import impossible : ${message}`, 'error');
    }
  };

  const confirmDelete = () => {
    if (toDelete) {
      remove(toDelete.id);
      notify(`« ${toDelete.name || 'Sans nom'} » supprimé.`);
    }
    setToDelete(null);
  };

  const rows = characters.map(summarize).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // Actions d'une ligne, partagées par le tableau (desktop) et les cartes (mobile).
  const rowActions = (r: (typeof rows)[number]) => (
    <>
      <AppTooltip title="Ouvrir">
        <IconButton onClick={() => router.push(`/character/${r.id}`)}>
          <OpenInNewIcon fontSize="small" />
        </IconButton>
      </AppTooltip>
      <AppTooltip title="Dupliquer">
        <IconButton onClick={() => handleDuplicate(r.id)}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </AppTooltip>
      <AppTooltip title="Exporter en JSON">
        <IconButton onClick={() => handleExport(r.id)}>
          <DownloadIcon fontSize="small" />
        </IconButton>
      </AppTooltip>
      <AppTooltip title="Supprimer">
        <IconButton color="error" onClick={() => setToDelete({ id: r.id, name: r.name })}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </AppTooltip>
    </>
  );

  return (
    <>
      <title>Personnages — Éditeur de personnage CO2</title>
      <HomeBackground />
      <AppBar
        position="static"
        // Légèrement translucide + flou : la barre laisse deviner l'illustration
        // qui défile derrière, sans nuire à la lisibilité du titre.
        sx={{
          bgcolor: 'rgba(18, 18, 18, 0.55)',
          backgroundImage: 'none',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Personnages — Chroniques Oubliées Fantasy 2
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Nouveau personnage
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => fileInput.current?.click()}
          >
            Importer un JSON
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = '';
            }}
          />
        </Stack>

        {draft && (
          <Alert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <>
                <Button color="inherit" size="small" onClick={() => router.push('/create')}>
                  Reprendre
                </Button>
                <Button color="inherit" size="small" onClick={() => clearDraft()}>
                  Abandonner
                </Button>
              </>
            }
          >
            Un brouillon de création est en cours.
          </Alert>
        )}

        {!hasHydrated ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : rows.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: 'rgba(30, 30, 34, 0.55)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              borderColor: 'rgba(255, 255, 255, 0.10)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              Rassemblez votre compagnie
            </Typography>
            <Typography color="text.secondary">
              Aucun personnage pour l’instant. Créez-en un ou importez un fichier JSON.
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Desktop : tableau classique. Masqué sous md (illisible sur mobile). */}
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{
                display: { xs: 'none', md: 'block' },
                bgcolor: 'rgba(30, 30, 34, 0.62)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                borderColor: 'rgba(255, 255, 255, 0.10)',
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Peuple</TableCell>
                    <TableCell>Profil</TableCell>
                    <TableCell align="center">Niveau</TableCell>
                    <TableCell>Modifié</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.ancestry}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <ClassIcon classId={r.classId} size={20} />
                          <Box component="span" sx={{ color: classColor(r.classId), fontWeight: 600 }}>
                            {r.characterClass}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">{r.level}</TableCell>
                      <TableCell>{formatDate(r.updatedAt)}</TableCell>
                      <TableCell align="right">{rowActions(r)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Mobile : une carte empilée par personnage (PER-51). */}
            <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
              {rows.map((r) => (
                <Paper
                  key={r.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: 'rgba(30, 30, 34, 0.62)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    borderColor: 'rgba(255, 255, 255, 0.10)',
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
                  >
                    <Box
                      sx={{ minWidth: 0, cursor: 'pointer' }}
                      onClick={() => router.push(`/character/${r.id}`)}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {r.name}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                      >
                        <ClassIcon classId={r.classId} size={16} />
                        <Typography variant="body2" color="text.secondary">
                          {r.ancestry} ·{' '}
                          <Box component="span" sx={{ color: classColor(r.classId), fontWeight: 600 }}>
                            {r.characterClass}
                          </Box>{' '}
                          · niveau {r.level}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Modifié {formatDate(r.updatedAt)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 0.5 }}>
                    {rowActions(r)}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </>
        )}
      </Container>

      <Dialog open={toDelete !== null} onClose={() => setToDelete(null)}>
        <DialogTitle>Supprimer le personnage ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            « {toDelete?.name} » sera définitivement supprimé. Cette action est irréversible
            (pensez à exporter en JSON si besoin).
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)}>Annuler</Button>
          <Button color="error" onClick={confirmDelete}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast !== null}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert
            severity={toast.severity}
            variant="filled"
            onClose={() => setToast(null)}
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
