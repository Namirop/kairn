/** Indépendante du SDK Anthropic, qui ne s'importe que dans `fournisseurs/anthropic.ts`. */

export type PartieTexte = {
  type: "text";
  text: string;
};

export type PartieImage = {
  type: "image";
  /** Type MIME vérifié côté serveur avant d'arriver ici. */
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  /** Image déjà redimensionnée, encodée en base64 sans préfixe de données. */
  base64: string;
};

export type PartieDeMessage = PartieTexte | PartieImage;

export type MessageIa = {
  role: "user" | "assistant";
  content: string | PartieDeMessage[];
};

/** Décrite sans importer le SDK ; la compilation du pont vérifie qu'elle coïncide. */
export type MessageDuSdk = {
  role: "user" | "assistant";
  content:
    | string
    | (
        | { type: "text"; text: string }
        | {
            type: "image";
            source: { type: "base64"; media_type: PartieImage["mediaType"]; data: string };
          }
      )[];
};

export function versMessageDuSdk(message: MessageIa): MessageDuSdk {
  if (typeof message.content === "string") {
    return { role: message.role, content: message.content };
  }

  return {
    role: message.role,
    content: message.content.map((partie) =>
      partie.type === "text"
        ? { type: "text", text: partie.text }
        : {
            type: "image",
            source: { type: "base64", media_type: partie.mediaType, data: partie.base64 },
          },
    ),
  };
}

/** Le mode mock y choisit sa fixture. */
export function texteMisBoutABout(messages: MessageIa[]): string {
  return messages
    .map((message) =>
      typeof message.content === "string"
        ? message.content
        : message.content
            .filter((partie): partie is PartieTexte => partie.type === "text")
            .map((partie) => partie.text)
            .join("\n"),
    )
    .join("\n");
}
