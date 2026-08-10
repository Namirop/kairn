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

/** Le texte soumis, mis bout à bout. Le mode mock y choisit sa fixture. */
export function flattenText(messages: AiMessage[]): string {
  return messages
    .map((message) =>
      typeof message.content === "string"
        ? message.content
        : message.content
            .filter((part): part is AiTextPart => part.type === "text")
            .map((part) => part.text)
            .join("\n"),
    )
    .join("\n");
}
