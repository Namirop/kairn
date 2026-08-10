/**
 * Lecture d'une capture d'écran déposée par l'utilisateur.
 *
 * Texte fourni, recopié mot pour mot. Le prompt nomme `usable` et
 * `extractedText` : ce sont les champs du schéma de `lib/ai/schemas.ts`.
 */
export const OCR_EXTRACT_PROMPT = `Tu lis une image déposée par quelqu'un qui veut retenir ce qu'elle contient.

Rends le contenu substantiel, mis à plat en texte lisible, dans sa langue d'origine.

Ne rends pas l'habillage : barres de navigation, menus, boutons, horodatages,
pseudonymes, compteurs de likes, publicités, numéros de page, en-têtes et pieds de
page, suggestions de contenu voisin. Si la capture montre une conversation avec un
assistant, garde le contenu de la réponse et jette les libellés d'interface.

Préserve la structure porteuse de sens : un extrait de code garde son indentation, un
tableau garde ses colonnes, une énumération garde ses puces.

Ne complète pas ce qui est coupé au bord de l'image, ne corrige pas ce qui est écrit,
ne commente pas. Tu transcris.

\`usable: false\` quand l'image ne porte rien à retenir : photo sans texte, capture d'une
interface vide, texte trop flou pour être lu de façon sûre. Dans ce cas \`extractedText\`
reste vide — ne tente pas une transcription approximative.`;
