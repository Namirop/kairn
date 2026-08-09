/**
 * Forme des messages passés à `callAI()`.
 *
 * Volontairement indépendante du SDK Anthropic : le SDK ne s'importe que dans
 * `client.ts`, donc son type `MessageParam` ne peut pas circuler dans le reste
 * du projet. `client.ts` traduit ces messages au moment d'émettre.
 */

export type AiTextPart = {
  type: "text";
  text: string;
};

export type AiImagePart = {
  type: "image";
  /** Type MIME vérifié côté serveur avant d'arriver ici. */
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  /** Image déjà redimensionnée, encodée en base64 sans préfixe de données. */
  base64: string;
};

export type AiContentPart = AiTextPart | AiImagePart;

export type AiMessage = {
  role: "user" | "assistant";
  content: string | AiContentPart[];
};

/** Longueur du texte soumis, utilisée par le mode mock pour choisir sa fixture. */
export function textLength(messages: AiMessage[]): number {
  return messages.reduce((total, message) => {
    if (typeof message.content === "string") return total + message.content.length;

    return (
      total +
      message.content.reduce(
        (subtotal, part) => subtotal + (part.type === "text" ? part.text.length : 0),
        0,
      )
    );
  }, 0);
}
