'use client';

/**
 * Page « À propos » — page d'information publique (accessible sans session, cf.
 * `PUBLIC_PATH_PREFIXES` dans `updateSession`). Liée depuis le pied de page global
 * (`AppFooter`), elle répond aux questions qu'un visiteur pourrait se poser sur
 * l'outil : ce que c'est, qui l'a fait, l'absence de lien avec l'éditeur, la source
 * des règles, et le traitement des données.
 *
 * Contenu 100 % statique : aucune donnée chargée, aucune dépendance au cloud.
 */
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppHeader } from '@/components/AppHeader';
import { HomeBackground } from '@/components/HomeBackground';

/** Lien externe stylé de façon homogène (discret, ouverture dans un nouvel onglet). */
function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      color="inherit"
      sx={{ textDecorationColor: 'rgba(255, 255, 255, 0.4)' }}
    >
      {children}
    </Link>
  );
}

export default function AboutPage() {

  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <title>À propos — Éditeur de personnage CO2</title>
      <HomeBackground />
      <AppHeader breadcrumbs={[{ label: 'À propos' }]} />

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          {/* Présentation */}
          <Section title="Qu'est-ce que ce site ?">
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Cet outil est un <strong>éditeur et simulateur de personnage</strong> pour le jeu de
              rôle <strong>Chroniques Oubliées Fantasy</strong> (2ᵉ édition). Il aide à créer un
              personnage, à le faire monter en niveau et à suivre son état en cours de partie
              (points de vie, mana, rage, bourse…), en appliquant les règles à votre place.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              C'est un <strong>projet de fans</strong>, conçu au départ pour une table de jeu
              privée. Il ne remplace pas le livre de règles : il facilite le suivi des
              personnages pour les joueuses, les joueurs et la meneuse ou le meneur de jeu.
            </Typography>
          </Section>

          {/* Disclaimer : non affilié à BBE */}
          <Section title="Un outil non officiel, sans lien avec l'éditeur">
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Ce site n'est <strong>ni officiel, ni affilié à Black Book Éditions</strong>{' '}
              (l'éditeur du jeu), ni approuvé ou soutenu par ses auteurs. Il s'agit d'une
              initiative indépendante et bénévole, réalisée par des passionné·es du jeu.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              <strong>Chroniques Oubliées</strong> est une marque de Black Book Éditions ; tous
              les droits sur l'univers, les règles et les illustrations d'origine restent la
              propriété de leurs ayants droit respectifs. Si vous aimez le jeu, le meilleur
              soutien reste d'acheter les ouvrages officiels chez l'éditeur.
            </Typography>
          </Section>

          {/* Source des règles */}
          <Section title="D'où viennent les règles ?">
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Les règles utilisées par l'outil proviennent du{' '}
              <ExternalLink href="https://www.co-drs.org/fr">
                DRS (Document de Référence du Système)
              </ExternalLink>{' '}
              de Chroniques Oubliées, mis en accès libre et gratuit par{' '}
              <ExternalLink href="https://black-book-editions.fr">
                Black Book Éditions
              </ExternalLink>{' '}
              pour permettre à la communauté de créer et de partager du contenu.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Nous nous efforçons de respecter fidèlement ces règles. Si vous constatez une
              différence avec le livre officiel, c'est une erreur de notre part, pas une règle
              maison : n'hésitez pas à nous la signaler.
            </Typography>
          </Section>

          {/* Données / confidentialité */}
          <Section title="Et mes données ?">
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Vos personnages sont d'abord enregistrés <strong>dans votre navigateur</strong>. Si
              vous vous connectez, ils sont également sauvegardés dans un{' '}
              <strong>espace privé</strong> qui vous est réservé, afin de les retrouver d'un
              appareil à l'autre.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Il n'y a <strong>ni publicité, ni revente de données, ni traqueurs</strong>{' '}
              marketing. Le site est privé et n'est pas référencé par les moteurs de recherche.
            </Typography>
          </Section>

          {/* FAQ */}
          <Section title="Questions fréquentes">
            <Stack spacing={2.5}>
              <Faq question="Est-ce un outil officiel de Chroniques Oubliées ?">
                Non. C'est un projet indépendant réalisé par des fans, sans lien avec Black Book
                Éditions.
              </Faq>
              <Faq question="Est-ce gratuit ?">
                Oui. L'outil est gratuit et non commercial. Il est proposé tel quel, sans
                garantie.
              </Faq>
              <Faq question="Puis-je m'en servir pour ma propre table ?">
                L'outil a été pensé pour un usage privé à la table de jeu. Vous restez responsable
                de la manière dont vous l'utilisez et du respect des droits de l'éditeur.
              </Faq>
              <Faq question="J'ai trouvé un bug ou une règle mal interprétée. Que faire ?">
                Merci de nous le signaler pour que nous puissions le corriger. Comme l'outil
                calcule beaucoup de choses automatiquement, un retour précis (personnage, niveau,
                situation) nous aide énormément. Le plus simple est de nous contacter sur Discord
                (voir ci-dessous).
              </Faq>
              <Faq question="Qui est derrière ce site ?">
                L'outil est développé par KobaruTools, par passion pour Chroniques Oubliées et
                pour le jeu de rôle sur table.
              </Faq>
              <Faq question="Comment vous contacter ?">
                Sur Discord, écrivez à <strong>kobaru</strong> : c'est le meilleur moyen de poser
                une question, de signaler un bug ou de proposer une amélioration.
              </Faq>
            </Stack>
          </Section>
        </Stack>
      </Container>
    </Box>
  );
}

/** Bloc de section « verre dépoli », cohérent avec le reste de l'application. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        bgcolor: 'rgba(20, 20, 23, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 2,
      }}
    >
      <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

/** Une entrée « question / réponse » de la FAQ. */
function Faq({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
        {question}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </Box>
  );
}
