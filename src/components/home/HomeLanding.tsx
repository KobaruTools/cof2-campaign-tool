'use client';

/**
 * Corps de la **vitrine** (`/`) — vraie page d'accueil, consultable SANS session
 * (cf. `decideRouteAccess`). Elle a remplacé la liste des personnages, qui vit
 * désormais sur `/characters`.
 *
 * Composant CLIENT : les appels à l'action sont de vraies ancres
 * (`component={Link}`), et un composant de Next ne peut pas être passé en prop
 * depuis un Server Component. Le `role`, lui, est résolu côté serveur par la page
 * et arrive ici en simple chaîne : la navigation ne clignote donc pas au montage,
 * ce qui compte sur la seule page où un visiteur sans session atterrit vraiment.
 *
 * Trois publics, une seule page :
 *  - **visiteur** : ce que fait l'outil, création de compte, et le champ « lien ou
 *    code d'invitation » pour les joueurs à qui leur MJ a distribué un lien ;
 *  - **joueur** invité : raccourci vers son espace + tout le contenu de règles ;
 *  - **propriétaire** : raccourcis vers ses personnages, ses campagnes, la création.
 */
import type { ReactNode } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppHeader } from '@/components/AppHeader';
import { HomeBackground } from '@/components/HomeBackground';
import { AppShowcase } from '@/components/home/AppShowcase';
import { FeatureShowcase } from '@/components/home/FeatureShowcase';
import { HeroBackdrop, HeroScene } from '@/components/home/HeroScene';
import { JoinCodeField } from '@/components/home/JoinCodeField';
import { RevealOnScroll } from '@/components/home/RevealOnScroll';
import { SectionIcon } from '@/components/SectionIcon';
import type { SectionIconName } from '@/lib/ui/sectionIcons';
import { BOOKS, DEFAULT_BOOK_ID, rulesHref } from '@/lib/ui/books';
import type { SessionRole } from '@/lib/auth/sessionRole';

/** Verre dépoli commun aux blocs de la vitrine (aligné sur le reste de l'app). */
const GLASS = {
  bgcolor: 'rgba(20, 20, 23, 0.72)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 3,
} as const;

/**
 * Une carte d'accès au contenu de règles (bestiaire, aide-mémoire, livre). Ouverte à
 * tous : aucun état « verrouillé » à afficher, le contenu servi est celui du DRS en
 * accès libre (les sources payantes restent invisibles, gating porté par la base).
 */
function ContentCard({
  href,
  icon,
  title,
  children,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Paper
      component={Link}
      href={href}
      elevation={0}
      sx={{
        ...GLASS,
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 120ms, background-color 120ms, transform 120ms',
        '&:hover': {
          borderColor: 'rgba(255, 255, 255, 0.24)',
          bgcolor: 'rgba(30, 30, 34, 0.78)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        {icon}
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </Paper>
  );
}

/**
 * Fondu du bloc d'illustration de l'encart d'invitation : la découpe s'efface vers le
 * texte, à gauche, pour ne pas lui opposer un bord franc.
 *
 * Un SEUL dégradé, volontairement : empiler deux couches de masque ne les intersecte
 * pas — `mask-composite` vaut `add` par défaut, donc deux fondus se cumuleraient en
 * opacité au lieu de se restreindre.
 */
const INVITE_ART_FADE = 'linear-gradient(to right, transparent 0%, #000 55%)';

/**
 * De combien le halo remonte AU-DESSUS du bloc du héros (px), et hauteur totale qui en
 * résulte. Même valeur que le `BACKDROP_RISE` du décor : le halo passe donc lui aussi
 * derrière la barre de navigation.
 *
 * **C'est la correction d'un défaut visible** : le halo s'arrêtait 48 px au-dessus du
 * bloc, soit quelques pixels sous la barre de nav. Or son dégradé radial n'est PAS
 * transparent au bord haut de sa boîte (l'ellipse y valait encore ~30 % d'opacité) — le
 * bord de boîte coupait donc le dégradé en pleine course et se lisait comme un trait
 * horizontal, juste sous le header. Faire remonter la boîte hors de l'écran met cette
 * coupure hors de vue.
 */
const HERO_SCRIM_RISE = 220;
const HERO_SCRIM_HEIGHT = 420 + HERO_SCRIM_RISE;

/**
 * Halo de LISIBILITÉ du texte : une **ellipse** centrée sur la colonne de texte. La plus
 * grande figure de la scène (le chevalier, rendu à 1,7 fois la hauteur de bande) monte
 * jusqu'au titre et sa bannière est BLANCHE : sans ce voile, du texte blanc s'y posait
 * sans contraste. Ellipse et non rectangle, pour que les côtés — où les figures doivent
 * rester pleinement visibles — ne soient pas assombris.
 *
 * Les pourcentages sont exprimés dans la boîte AGRANDIE (`HERO_SCRIM_HEIGHT`) : l'ellipse
 * garde la même position et le même rayon EN PIXELS qu'avant l'agrandissement. Elle est
 * désormais franchement transparente au bord haut de sa boîte (54 % de distance pour un
 * rayon de 39 %), ce qui supprime la coupure nette décrite ci-dessus.
 */
const HERO_TEXT_SCRIM =
  'radial-gradient(ellipse 58% 39% at 50% 54%, rgba(18, 18, 18, 0.92) 0%, rgba(18, 18, 18, 0.7) 52%, rgba(18, 18, 18, 0) 84%)';

/**
 * Voile du HAUT de page : dense derrière la barre de nav, il s'efface vers le bas. Il
 * soude visuellement le bloc d'intro au header, au lieu de laisser le décor apparaître
 * d'un coup sous la barre.
 *
 * Élément SÉPARÉ du halo, et en pleine largeur de fenêtre : posé dans la boîte du halo
 * (large de 1000 px au plus), un voile aussi dense aurait créé deux bords VERTICAUX nets
 * de part et d'autre du haut de la page. En couvrant toute la largeur, il n'a plus de
 * bord latéral à trahir.
 */
const HERO_TOP_VEIL =
  'linear-gradient(to bottom, rgba(18, 18, 18, 0.9) 0%, rgba(18, 18, 18, 0.72) 34%, rgba(18, 18, 18, 0) 66%)';

/** Appels à l'action du héros, propres au rôle de la session. */
function HeroActions({ role }: { role: SessionRole }) {
  if (role === 'player') {
    return (
      <>
        <Button variant="contained" size="large" component={Link} href="/play">
          Ma campagne
        </Button>
        <Button variant="outlined" size="large" component={Link} href="/create">
          Nouveau personnage
        </Button>
      </>
    );
  }
  if (role === 'owner') {
    return (
      <>
        <Button variant="contained" size="large" component={Link} href="/characters">
          Mes personnages
        </Button>
        <Button variant="outlined" size="large" component={Link} href="/create">
          Nouveau personnage
        </Button>
        <Button variant="text" size="large" component={Link} href="/campaigns">
          Mes campagnes
        </Button>
      </>
    );
  }
  // Visiteur : l'atelier de personnage ne demande AUCUN compte (l'app est locale
  // d'abord), donc l'action première est de créer un personnage, pas de s'inscrire.
  // La connexion reste offerte en dernier — elle porte aussi bien l'inscription que
  // la connexion (sans mot de passe).
  return (
    <>
      <Button variant="contained" size="large" component={Link} href="/create">
        Créer un personnage
      </Button>
      <Button variant="outlined" size="large" component={Link} href="/characters">
        Mes personnages
      </Button>
      <Button variant="text" size="large" component={Link} href="/login">
        Créer un compte ou se connecter
      </Button>
    </>
  );
}

const sectionIcon = (name: SectionIconName) => <SectionIcon name={name} size={22} />;

export function HomeLanding({ role }: { role: SessionRole }) {
  const isAnonymous = role === 'anonymous' || role === 'projection';
  const BookIcon = BOOKS[DEFAULT_BOOK_ID].Icon;

  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      {/* Fond de PAGE : les deux moitiés de la couverture ancrées au PIED de page, comme
          sur le reste de l'app. Deux fonds distincts cohabitent sur cette page et ne
          jouent pas le même rôle — celui-ci referme le bas de la page, tandis que
          `HeroBackdrop` habille le premier écran. La variante plein écran a été essayée
          ici puis retirée (arbitrage proprio) : le haut de page revient au décor du
          héros. */}
      <HomeBackground variant="footer" />
      {/* Pas de fil d'Ariane : le logo de marque couvre déjà l'accueil. Le rôle est
          passé explicitement (résolu côté serveur) pour figer la nav dès le 1er rendu. */}
      <AppHeader sessionRole={role} />

      <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 7 } }}>
        <Stack spacing={{ xs: 5, sm: 7 }}>
          {/* ─── Héros ─────────────────────────────────────────────────────────
              `position: relative` + `zIndex: 0` crée un CONTEXTE D'EMPILEMENT propre au
              héros : la scène peut s'y placer en `zIndex: -1` (donc derrière le titre et
              les appels à l'action, que ses plus grandes figures atteignent) sans pour
              autant filer derrière l'illustration de fond de page. */}
          <Stack
            spacing={2}
            sx={{ textAlign: 'center', alignItems: 'center', position: 'relative', zIndex: 0 }}
          >
            {/* Décor du héros. Il recouvre TOUT ce bloc et remonte jusqu'au haut de la
                page (derrière la barre de navigation) : c'est ce `Stack` qui lui sert
                d'ancre, d'où sa place ici et non dans `HeroScene`. */}
            <HeroBackdrop />
            {/* Voile du haut de page, pleine largeur : il rejoint le header sans couture.
                Décoratif et transparent aux clics, comme le halo qui suit. */}
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                top: -HERO_SCRIM_RISE,
                left: 'calc(50% - 50vw)',
                width: '100vw',
                height: HERO_SCRIM_HEIGHT,
                background: HERO_TOP_VEIL,
                pointerEvents: 'none',
                zIndex: -1,
              }}
            />
            {/* Halo de lisibilité, sous le texte et au-dessus de la scène. Décoratif et
                transparent aux clics. */}
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                top: -HERO_SCRIM_RISE,
                left: '50%',
                translate: '-50% 0',
                width: 'min(1000px, 108%)',
                height: HERO_SCRIM_HEIGHT,
                background: HERO_TEXT_SCRIM,
                pointerEvents: 'none',
                zIndex: -1,
              }}
            />
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 2 }}>
              Chroniques Oubliées Fantasy — 2ᵉ édition
            </Typography>
            {/* Titre court, sans chapeau derrière lui (arbitrage proprio) : le surtitre
                situe le jeu, les cartes et les démos plus bas disent le reste. */}
            <Typography variant="h3" component="h1" sx={{ fontWeight: 700, maxWidth: '24ch' }}>
              Créez et jouez vos personnages
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ pt: 1, width: { xs: '100%', sm: 'auto' } }}
            >
              <HeroActions role={role} />
            </Stack>
            {/* Le sans-compte n'est pas un mode dégradé : c'est le fonctionnement
                d'origine de l'app (locale d'abord). On le dit franchement, avec ce
                qu'apporte la connexion — sinon « Créer un personnage » sans compte
                ressemble à un piège. */}
            {isAnonymous && (
              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: '64ch' }}>
                Aucun compte n’est nécessaire : le contenu de règles se consulte librement,
                et vos personnages sont enregistrés dans ce navigateur. Connectez-vous pour
                les synchroniser, les retrouver sur vos autres appareils et les rattacher à
                une campagne.
              </Typography>
            )}
            {/* La scène ferme le héros : décor au fond, personnages devant, parallaxe
                gradué. C'est elle qui donne au premier écran ce qu'un fond de page seul
                ne donne pas — des personnages, et de la profondeur. */}
            <HeroScene />
          </Stack>

          {/* ─── Contenu de règles ─────────────────────────────────────────────
              Sans titre de section : les trois cartes se lisent d'elles-mêmes, et un
              intertitre de plus juste sous le héros hachait la page. Le livre ouvre la
              rangée — c'est la référence, les deux autres en sont des extraits. */}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            }}
          >
            <ContentCard
              href={rulesHref(DEFAULT_BOOK_ID, 1)}
              icon={<BookIcon sx={{ fontSize: 22 }} />}
              title="Livre des règles"
            >
              Le livre lui-même, feuilletable, avec recherche plein texte — et ouvert à la
              bonne page depuis n’importe quel renvoi de la fiche.
            </ContentCard>
            <ContentCard href="/bestiary" icon={sectionIcon('companions')} title="Bestiaire">
              Les créatures du jeu, leurs caractéristiques et leurs capacités, avec recherche
              et filtres — de quoi préparer une rencontre ou l’improviser.
            </ContentCard>
            <ContentCard href="/reference" icon={sectionIcon('notes')} title="Aide-mémoire">
              États, manœuvres, modificateurs d’attaque, tables de difficulté : les règles
              qu’on cherche toujours en pleine partie, réunies au même endroit.
            </ContentCard>
          </Box>

          {/* ─── L'outil en images ─────────────────────────────────────────── */}
          <RevealOnScroll>
            <SectionHeading
              overline="En images"
              title="À quoi ça ressemble"
              lead="Des captures de l’outil en train de tourner."
            />
            <Box sx={{ mt: 2.5 }}>
              <AppShowcase />
            </Box>
          </RevealOnScroll>

          {/* ─── Ce que fait l'outil ───────────────────────────────────────── */}
          <RevealOnScroll>
            <SectionHeading
              overline="Ce que fait l’outil"
              title="Quatre choses, faites correctement"
              lead="Les démonstrations ci-dessous sont manipulables — la barre de vie est même
                celle de la fiche."
            />
            <Box sx={{ mt: 2.5 }}>
              <FeatureShowcase />
            </Box>
          </RevealOnScroll>

          {/* ─── Invitation joueur (visiteur seulement) ─────────────────────
              Deux colonnes : le texte à gauche, le champ et l'illustration à droite.
              En une seule colonne, ce bloc laissait la moitié de sa largeur vide. */}
          {isAnonymous && (
            <RevealOnScroll>
              <Paper elevation={0} sx={{ ...GLASS, p: { xs: 2.5, sm: 4 }, overflow: 'hidden' }}>
                <Box
                  sx={{
                    display: 'grid',
                    gap: { xs: 2.5, md: 5 },
                    gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
                    alignItems: 'center',
                  }}
                >
                  <Stack spacing={2}>
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
                      Ton MJ t’a envoyé une invitation ?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pas besoin de compte : le lien que ta ou ton MJ distribue depuis sa
                      campagne t’ouvre directement ton espace joueur — tes fiches, l’ordre
                      d’initiative, et tout le contenu de règles ci-dessus. Colle ici le lien
                      reçu (ou le code seul).
                    </Typography>
                    <JoinCodeField />
                  </Stack>
                  {/* Colonne d'illustration : elle n'existe que pour remplir le vide,
                      donc décorative et masquée dès qu'elle serait à l'étroit. */}
                  <Box
                    aria-hidden
                    sx={{
                      display: { xs: 'none', md: 'block' },
                      position: 'relative',
                      height: 190,
                      maskImage: INVITE_ART_FADE,
                      WebkitMaskImage: INVITE_ART_FADE,
                    }}
                  >
                    <Box
                      component="img"
                      src="/classes/barde.webp"
                      alt=""
                      sx={{
                        position: 'absolute',
                        right: 0,
                        bottom: -24,
                        height: 250,
                        width: 'auto',
                        objectFit: 'contain',
                        objectPosition: 'bottom',
                        opacity: 0.5,
                      }}
                    />
                  </Box>
                </Box>
              </Paper>
            </RevealOnScroll>
          )}

          {/* ─── Appel final ───────────────────────────────────────────────── */}
          <RevealOnScroll>
            <ClosingCallToAction role={role} />
          </RevealOnScroll>
        </Stack>
      </Container>
    </Box>
  );
}

/**
 * Titre de section homogène : surtitre discret, titre, puis chapeau. Remplace les
 * `h5` isolés — trois niveaux de gris donnent au défilement des points d'appui, là où
 * un titre seul se confondait avec le corps du texte.
 */
function SectionHeading({
  overline,
  title,
  lead,
}: {
  overline: string;
  title: string;
  lead?: string;
}) {
  return (
    <Stack spacing={0.75}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        {/* Filet d'accent : signale un début de section sans ajouter de mot. */}
        <Box sx={{ width: 26, height: 2, bgcolor: 'primary.main', opacity: 0.7 }} />
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: 1.6, lineHeight: 1 }}
        >
          {overline}
        </Typography>
      </Stack>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {lead && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '68ch' }}>
          {lead}
        </Typography>
      )}
    </Stack>
  );
}

/**
 * Bande d'appel final, juste avant le pied de page : elle referme la page sur l'action
 * attendue et comble l'espace mort qui traînait là. Le libellé suit le rôle — inutile
 * de proposer « créer un compte » à quelqu'un qui en a un.
 */
function ClosingCallToAction({ role }: { role: SessionRole }) {
  const isVisitor = role === 'anonymous' || role === 'projection';
  return (
    <Paper
      elevation={0}
      sx={{
        ...GLASS,
        p: { xs: 3, sm: 5 },
        textAlign: 'center',
        // Halo chaud très discret derrière le bloc : il détache l'appel final du fond
        // uniformément sombre du bas de page.
        backgroundImage:
          'radial-gradient(ellipse at 50% 120%, rgba(224, 175, 104, 0.14), transparent 70%)',
      }}
    >
      <Stack spacing={2} sx={{ alignItems: 'center' }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          {isVisitor ? 'Prêt à créer votre personnage ?' : 'On reprend où vous en étiez ?'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '56ch' }}>
          {isVisitor
            ? 'L’assistant vous guide de bout en bout. Rien à installer, rien à créer comme compte.'
            : 'Vos personnages, vos campagnes et l’écran de meneur vous attendent.'}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 0.5 }}>
          <Button variant="contained" size="large" component={Link} href="/create">
            Créer un personnage
          </Button>
          <Button
            variant="outlined"
            size="large"
            component={Link}
            href={isVisitor ? '/characters' : '/campaigns'}
          >
            {isVisitor ? 'Mes personnages' : 'Mes campagnes'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
