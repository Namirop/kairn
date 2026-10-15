/**
 * La part d'une adresse IP qui désigne un abonné, pour compter les visites par
 * personne et non par adresse.
 *
 * Une IPv4 se compte entière. Une IPv6 se compte par son préfixe /64 : un
 * abonné ou un téléphone reçoit tout le /64 et peut sortir sur une adresse
 * neuve à chaque requête, ce qui ouvrirait autant de visites qu'il le veut.
 */

const GROUPES_IPV6 = 8;
const GROUPES_DU_PREFIXE = 4;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const GROUPE = /^[0-9a-f]{1,4}$/;

/** Les huit groupes d'une IPv6, développés, ou `null` si elle ne se lit pas. */
function groupesIpv6(adresse: string): string[] | null {
  const morceaux = adresse.split("::");

  if (morceaux.length > 2) return null;

  const lire = (partie: string | undefined): string[] | null => {
    if (!partie) return [];

    const groupes = partie.split(":");
    const dernier = groupes.at(-1) ?? "";

    // Une IPv4 en queue (`64:ff9b::1.2.3.4`) occupe les deux derniers groupes.
    if (IPV4.test(dernier)) groupes.splice(-1, 1, "0", "0");

    return groupes.every((groupe) => GROUPE.test(groupe)) ? groupes : null;
  };

  const gauche = lire(morceaux[0]);
  const droite = lire(morceaux[1]);

  if (!gauche || !droite) return null;

  if (morceaux.length === 1) return gauche.length === GROUPES_IPV6 ? gauche : null;

  const manquants = GROUPES_IPV6 - gauche.length - droite.length;

  if (manquants < 1) return null;

  return [...gauche, ...Array.from({ length: manquants }, () => "0"), ...droite];
}

/** L'adresse à compter : l'IPv4 entière, le /64 d'une IPv6, l'entrée telle quelle sinon. */
export function prefixeDeLAdresse(adresse: string): string {
  const nette = adresse.trim().toLowerCase().replace(/%.*$/, "");
  const ipv4Encapsulee = /^::ffff:(\d{1,3}(\.\d{1,3}){3})$/.exec(nette);

  if (ipv4Encapsulee?.[1]) return ipv4Encapsulee[1];
  if (IPV4.test(nette) || !nette.includes(":")) return nette;

  const groupes = groupesIpv6(nette);

  if (!groupes) return nette;

  const prefixe = groupes
    .slice(0, GROUPES_DU_PREFIXE)
    .map((groupe) => groupe.replace(/^0+(?=.)/, ""));

  return `${prefixe.join(":")}::/64`;
}
