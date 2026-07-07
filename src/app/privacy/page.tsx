'use client';

/**
 * Page « Politique de vie privée » — page d’information publique (accessible sans
 * session, cf. `PUBLIC_PATH_PREFIXES` dans `updateSession`). Liée depuis le pied
 * de page global (`AppFooter`), présent sur toutes les routes y compris déconnecté.
 *
 * Document juridique orienté RGPD (l’application peut avoir des utilisateurs dans
 * l’UE). Responsable du traitement : KobaruTools (projet de fans, à titre privé).
 * Contenu 100 % statique : aucune donnée chargée, aucune dépendance au cloud.
 *
 * Le contenu décrit fidèlement les traitements réels de l’application :
 *  - authentification et espace privé via Supabase (email, nom d’affichage,
 *    identités OAuth Google/Discord ou lien magique) ;
 *  - sauvegarde cloud des campagnes, joueurs et personnages (RLS par compte) ;
 *  - stockage local du navigateur (brouillons, cache, préférences) ;
 *  - hébergement Vercel + Supabase, aucun traqueur marketing, aucune publicité.
 * En cas d'évolution de ces traitements, mettre à jour cette page ET la date de
 * dernière révision ci-dessous.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import DownloadIcon from '@mui/icons-material/Download';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppHeader } from '@/components/AppHeader';
import { HomeBackground } from '@/components/HomeBackground';
import { exportMyData } from './actions';
import { EXPORT_ERRORS } from './exportTypes';

/** Adresse de contact pour l’exercice des droits et toute question vie privée. */
const CONTACT_EMAIL = 'kobaru@borntofight.fr';

/** Date de dernière révision (statique, à mettre à jour à chaque modification). */
const LAST_UPDATED = '6 juillet 2026';

/**
 * L'export self-service n'a de sens que si le cloud est provisionné (sinon il n'y a
 * pas de compte). Variable `NEXT_PUBLIC_…` inlinée au build (comme sur `/account`).
 */
const IS_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

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

/** Lien courriel (mailto) homogène. */
function MailLink() {
  return (
    <Link
      href={`mailto:${CONTACT_EMAIL}`}
      color="inherit"
      sx={{ textDecorationColor: 'rgba(255, 255, 255, 0.4)' }}
    >
      {CONTACT_EMAIL}
    </Link>
  );
}

export default function PrivacyPage() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /**
   * Droit d'accès + portabilité (RGPD art. 15 & 20) en self-service : appelle la
   * Server Action, puis déclenche le téléchargement du JSON côté navigateur.
   * - Non connecté → redirection vers la connexion (retour sur `/privacy`) ;
   * - session joueur → message dédié (pas de compte à exporter) ;
   * - autre erreur → message générique.
   */
  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mes-donnees-cof2-${data.exportedAt.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code === EXPORT_ERRORS.NOT_AUTHENTICATED) {
        router.push('/login?next=/privacy');
        return;
      }
      if (code === EXPORT_ERRORS.PLAYER_SESSION) {
        setToast('Une session joueur ne dispose pas de données de compte à exporter.');
      } else {
        setToast('Le téléchargement a échoué. Réessaie dans un instant.');
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <title>Politique de vie privée — Éditeur de personnage CO2</title>
      <HomeBackground />
      <AppHeader title="Politique de vie privée" onBack={() => router.push('/')} />

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          {/* Préambule + date de révision */}
          <Section title="En bref">
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Cet outil est un <strong>projet de fans</strong>, gratuit et non commercial, conçu
              pour suivre des personnages du jeu de rôle Chroniques Oubliées Fantasy. Nous
              collectons le <strong>strict nécessaire</strong> à son fonctionnement : de quoi vous
              connecter et sauvegarder vos personnages. Il n’y a{' '}
              <strong>ni publicité, ni traqueurs marketing, ni revente de données</strong>.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Cette politique explique quelles données sont traitées, pourquoi, avec qui, combien
              de temps, et quels sont vos droits au titre du{' '}
              <strong>Règlement général sur la protection des données (RGPD)</strong>.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Dernière mise à jour : <strong>{LAST_UPDATED}</strong>.
            </Typography>
          </Section>

          {/* 1. Responsable du traitement */}
          <Section title="1. Qui est responsable de vos données ?">
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Le responsable du traitement au sens du RGPD est <strong>KobaruTools</strong>, qui
              édite cet outil à titre privé, dans le cadre d’un projet de passionné·es. Ce n’est
              pas une société commerciale et l’outil n’a pas de but lucratif.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Pour toute question relative à cette politique ou à vos données, vous pouvez nous
              écrire à l’adresse <MailLink />.
            </Typography>
          </Section>

          {/* 2. Données collectées */}
          <Section title="2. Quelles données sont collectées ?">
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Nous ne collectons que les données que vous nous fournissez en utilisant l’outil.
              Concrètement :
            </Typography>
            <Stack spacing={2}>
              <Item title="Données de compte (si vous vous connectez)">
                Lorsque vous créez un compte, nous conservons votre{' '}
                <strong>adresse e-mail</strong>, un <strong>identifiant unique</strong> attribué à
                votre compte, éventuellement un <strong>nom d’affichage</strong> que vous
                choisissez, et le <strong>fournisseur d’identité utilisé</strong> (par exemple
                Google, Discord, ou un lien magique par e-mail). Si vous vous connectez via un
                fournisseur externe, nous recevons de sa part votre e-mail et un identifiant, mais
                jamais votre mot de passe.
              </Item>
              <Item title="Le contenu que vous créez">
                Les <strong>personnages</strong> que vous créez (nom du personnage, peuple,
                profil, caractéristiques, équipement, notes, etc.), les{' '}
                <strong>campagnes</strong> (nom, description, réglages de règles) et, le cas
                échéant, les <strong>joueuses et joueurs</strong> que vous ajoutez à une campagne
                (le nom que vous leur donnez et un lien d’invitation privé). Ces données sont
                celles que vous saisissez volontairement pour faire fonctionner votre table de
                jeu.
              </Item>
              <Item title="Données techniques minimales">
                Pour maintenir votre session ouverte, un <strong>cookie de connexion</strong> est
                déposé après authentification. Votre navigateur conserve aussi localement (voir la
                section « Stockage local ») des brouillons, un cache de vos personnages et vos
                préférences d’affichage.
              </Item>
            </Stack>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              Nous <strong>ne collectons pas</strong> de données à des fins publicitaires, ni de
              profil comportemental, ni de statistiques de fréquentation via des traqueurs tiers.
              Le site n’est pas référencé par les moteurs de recherche.
            </Typography>
          </Section>

          {/* 3. Finalités et bases légales */}
          <Section title="3. Pourquoi, et sur quelle base légale ?">
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Chaque traitement répond à une finalité précise et s’appuie sur une base légale
              prévue par le RGPD (article 6) :
            </Typography>
            <Stack spacing={2}>
              <Item title="Vous fournir le service">
                Créer votre compte, vous connecter, et sauvegarder vos personnages et campagnes
                dans un espace privé accessible d’un appareil à l’autre.{' '}
                <em>Base légale : l’exécution du service que vous demandez (mesures
                (pré)contractuelles) et notre intérêt légitime à fournir un outil fonctionnel.</em>
              </Item>
              <Item title="Sécurité et bon fonctionnement">
                Garder chaque compte cloisonné, prévenir les accès non autorisés et les abus.{' '}
                <em>Base légale : notre intérêt légitime à protéger le service et ses
                utilisateurs.</em>
              </Item>
              <Item title="Connexion via un fournisseur externe">
                Si vous choisissez Google ou Discord pour vous connecter.{' '}
                <em>Base légale : votre consentement, matérialisé par ce choix, que vous pouvez
                retirer en déliant l’identité concernée dans vos réglages de compte.</em>
              </Item>
            </Stack>
          </Section>

          {/* 4. Cookies et stockage local */}
          <Section title="4. Cookies et stockage local">
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              L’outil n’utilise <strong>aucun cookie publicitaire ni traqueur tiers</strong>. Il
              n’y a donc pas de bannière de consentement aux cookies, car seuls des cookies{' '}
              <strong>strictement nécessaires</strong> à votre connexion sont utilisés.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              En complément, votre navigateur enregistre localement (technologie{' '}
              <em>localStorage</em>, sur votre appareil uniquement) :
            </Typography>
            <Bullets
              items={[
                'un brouillon de création de personnage, pour ne pas perdre votre travail en cours ;',
                'une copie de travail de vos personnages, pour un affichage rapide et un usage hors ligne ;',
                'vos préférences d’affichage (sections repliées, etc.) ;',
                'le dernier mode de connexion utilisé, pour vous le proposer en premier.',
              ]}
            />
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              Ces informations restent sur votre appareil. Vous pouvez les effacer à tout moment
              en vidant les données du site dans votre navigateur ; elles sont également purgées
              lors de la suppression de votre compte.
            </Typography>
          </Section>

          {/* 5. Destinataires / sous-traitants */}
          <Section title="5. Avec qui vos données sont-elles partagées ?">
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Nous ne vendons ni ne louons vos données. Elles ne sont partagées qu’avec les
              prestataires techniques strictement nécessaires au fonctionnement de l’outil, qui
              agissent en tant que <strong>sous-traitants</strong> pour notre compte :
            </Typography>
            <Stack spacing={2}>
              <Item title="Supabase — base de données et authentification">
                Héberge votre compte et le contenu que vous sauvegardez (personnages, campagnes,
                joueurs). Voir la{' '}
                <ExternalLink href="https://supabase.com/privacy">
                  politique de confidentialité de Supabase
                </ExternalLink>
                .
              </Item>
              <Item title="Vercel — hébergement de l’application">
                Sert les pages du site et achemine les requêtes. Voir la{' '}
                <ExternalLink href="https://vercel.com/legal/privacy-policy">
                  politique de confidentialité de Vercel
                </ExternalLink>
                .
              </Item>
              <Item title="Google et Discord — connexion (au choix)">
                Uniquement si vous décidez de vous connecter via l’un d’eux : ils vous
                authentifient et nous transmettent votre e-mail et un identifiant. Consultez leurs
                politiques respectives (
                <ExternalLink href="https://policies.google.com/privacy">Google</ExternalLink>,{' '}
                <ExternalLink href="https://discord.com/privacy">Discord</ExternalLink>).
              </Item>
            </Stack>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              Nous pouvons également être amenés à divulguer des données si la loi l’exige
              (obligation légale ou demande d’une autorité compétente).
            </Typography>
          </Section>

          {/* 6. Transferts hors UE. Supabase héberge la base au Royaume-Uni
              (région eu-west-2, Londres) : hors EEE, mais couvert par la décision
              d'adéquation UE→RU. Les autres prestataires (Vercel, OAuth) peuvent,
              eux, traiter des données hors EEE sous clauses contractuelles types. */}
          <Section title="6. Hébergement et transferts hors de l’Union européenne">
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Votre compte et le contenu que vous sauvegardez (personnages, campagnes, joueurs)
              sont hébergés par Supabase dans un centre de données situé{' '}
              <strong>au Royaume-Uni</strong> (région de Londres). Bien que hors de l’Espace
              économique européen, le Royaume-Uni bénéficie d’une{' '}
              <strong>décision d’adéquation</strong> de la Commission européenne, qui reconnaît un
              niveau de protection des données équivalent à celui de l’Union européenne : les
              transferts vers ce pays sont donc autorisés sans formalité particulière.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              D’autres prestataires — notamment Vercel pour l’hébergement de l’application, ou
              Google et Discord si vous les utilisez pour vous connecter — peuvent traiter
              certaines données <strong>en dehors de l’Espace économique européen</strong>, par
              exemple aux États-Unis. Ces transferts sont alors encadrés par les garanties prévues
              par le RGPD, telles que les <strong>clauses contractuelles types</strong> de la
              Commission européenne, afin d’assurer un niveau de protection adéquat de vos données.
            </Typography>
          </Section>

          {/* 7. Durée de conservation */}
          <Section title="7. Combien de temps vos données sont-elles conservées ?">
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Votre compte et le contenu associé (personnages, campagnes, joueurs) sont conservés{' '}
              <strong>tant que votre compte existe</strong>. Vous gardez la main à tout moment :
            </Typography>
            <Bullets
              items={[
                'vous pouvez supprimer un personnage ou une campagne individuellement ;',
                'vous pouvez supprimer votre compte depuis vos réglages : cette action efface, en cascade et de façon définitive, vos campagnes, leurs joueurs et vos personnages sauvegardés ;',
                'les données conservées dans votre navigateur sont effacées lors de la suppression du compte, ou lorsque vous videz les données du site.',
              ]}
            />
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              La suppression du compte se fait depuis la page{' '}
              <Link
                component={NextLink}
                href="/account"
                color="inherit"
                sx={{ textDecorationColor: 'rgba(255, 255, 255, 0.4)' }}
              >
                Réglages du compte
              </Link>
              .
            </Typography>
          </Section>

          {/* 8. Vos droits */}
          <Section title="8. Vos droits">
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Conformément au RGPD, vous disposez des droits suivants sur vos données
              personnelles :
            </Typography>
            <Bullets
              items={[
                'droit d’accès : savoir quelles données vous concernant sont traitées ;',
                'droit de rectification : corriger des données inexactes (par exemple votre nom d’affichage) ;',
                'droit à l’effacement : demander la suppression de vos données ;',
                'droit à la limitation et droit d’opposition au traitement ;',
                'droit à la portabilité : récupérer vos données dans un format réutilisable ;',
                'droit de retirer votre consentement à tout moment, sans que cela remette en cause les traitements déjà effectués.',
              ]}
            />
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
              Vous pouvez exercer une grande partie de ces droits directement dans l’application :
              modifier votre nom d’affichage, délier un fournisseur de connexion et supprimer votre
              compte depuis vos{' '}
              <Link
                component={NextLink}
                href="/account"
                color="inherit"
                sx={{ textDecorationColor: 'rgba(255, 255, 255, 0.4)' }}
              >
                réglages de compte
              </Link>{' '}
              ; et exporter chacun de vos personnages au format JSON depuis la liste des
              personnages.
            </Typography>

            {/* Export self-service : droit d'accès + portabilité en un clic (compte
                connecté requis). Masqué si le cloud n'est pas provisionné. */}
            {IS_CONFIGURED && (
              <Box
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.10)',
                }}
              >
                <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                  Télécharger toutes mes données
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Exercez vos droits d’accès et de portabilité en un clic : ce bouton génère un
                  fichier JSON regroupant vos données de compte, vos campagnes, vos joueurs et vos
                  personnages. Vous devez être connecté ; sinon nous vous invitons à vous
                  connecter d’abord.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={
                    exporting ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <DownloadIcon fontSize="small" />
                    )
                  }
                  disabled={exporting}
                  onClick={() => void handleExport()}
                >
                  Télécharger mes données (JSON)
                </Button>
              </Box>
            )}

            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Pour toute autre demande, écrivez-nous à <MailLink />. Nous nous efforçons de
              répondre dans les meilleurs délais, et au plus tard dans le mois prévu par le RGPD.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Enfin, si vous estimez que vos droits ne sont pas respectés, vous avez le droit
              d’introduire une réclamation auprès d’une autorité de contrôle, comme la{' '}
              <ExternalLink href="https://www.cnil.fr">CNIL</ExternalLink> en France, ou l’autorité
              compétente de votre pays de résidence.
            </Typography>
          </Section>

          {/* 9. Sécurité */}
          <Section title="9. Sécurité de vos données">
            <Typography variant="body1" color="text.secondary">
              Les échanges avec le site sont chiffrés (HTTPS). Chaque compte est{' '}
              <strong>cloisonné</strong> : des règles de sécurité au niveau de la base de données
              garantissent que vous ne pouvez accéder qu’à vos propres campagnes et personnages.
              Aucun système n’étant infaillible, nous ne pouvons toutefois pas garantir une
              sécurité absolue ; en cas d’incident affectant vos données, nous prendrions les
              mesures requises par la réglementation.
            </Typography>
          </Section>

          {/* 10. Mineurs */}
          <Section title="10. Mineurs">
            <Typography variant="body1" color="text.secondary">
              Cet outil s’adresse à un public de joueuses et joueurs de jeu de rôle et n’est pas
              destiné à être utilisé par des enfants sans l’accord et la supervision d’un adulte
              responsable. Si vous êtes le parent ou le tuteur d’un mineur et pensez qu’il nous a
              communiqué des données, contactez-nous à <MailLink /> pour que nous les supprimions.
            </Typography>
          </Section>

          {/* 11. Modifications */}
          <Section title="11. Modifications de cette politique">
            <Typography variant="body1" color="text.secondary">
              Cette politique peut évoluer si l’outil change (nouvelle fonctionnalité, nouveau
              prestataire, etc.). En cas de modification importante, la date de « dernière mise à
              jour » indiquée en haut de page sera actualisée. Nous vous invitons à la consulter
              de temps à autre.
            </Typography>
          </Section>

          {/* 12. Contact */}
          <Section title="12. Nous contacter">
            <Typography variant="body1" color="text.secondary">
              Pour toute question concernant cette politique ou le traitement de vos données,
              écrivez-nous à <MailLink />.
            </Typography>
          </Section>
        </Stack>
      </Container>

      <Snackbar
        open={toast !== null}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity="error" variant="filled" onClose={() => setToast(null)}>
            {toast}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

/** Bloc de section « verre dépoli », cohérent avec le reste de l’application. */
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

/** Un point détaillé « intitulé + explication », pour les listes structurées. */
function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </Box>
  );
}

/** Liste à puces simple, stylée pour rester lisible sur le fond sombre. */
function Bullets({ items }: { items: string[] }) {
  return (
    <Box
      component="ul"
      sx={{ m: 0, pl: 3, color: 'text.secondary', '& li': { mb: 0.75 } }}
    >
      {items.map((item, i) => (
        <li key={i}>
          <Typography variant="body2" color="text.secondary" component="span">
            {item}
          </Typography>
        </li>
      ))}
    </Box>
  );
}
