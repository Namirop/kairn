/**
 * Forme des messages passés à `callAI()`, indépendante du SDK Anthropic : il ne
 * s'importe que dans `fournisseurs/anthropic.ts`, et chaque pont traduit ces
 * messages au moment d'émettre.
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

/**
 * Forme attendue par le SDK, décrite sans l'importer ; la compilation du pont
 * Anthropic vérifie que les deux coïncident.
 */
export type SdkMessage = {
  role: "user" | "assistant";
  content:
    | string
    | (
        | { type: "text"; text: string }
        | {
            type: "image";
            source: { type: "base64"; media_type: AiImagePart["mediaType"]; data: string };
          }
      )[];
};

export function toSdkMessage(message: AiMessage): SdkMessage {
  if (typeof message.content === "string") {
    return { role: message.role, content: message.content };
  }

  return {
    role: message.role,
    content: message.content.map((part) =>
      part.type === "text"
        ? { type: "text", text: part.text }
        : {
            type: "image",
            source: { type: "base64", media_type: part.mediaType, data: part.base64 },
          },
    ),
  };
}

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
