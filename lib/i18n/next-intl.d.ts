import type { Messages } from "./messages";

/** Une clé de traduction inexistante ou mal paramétrée ne compile pas. */
declare module "next-intl" {
  interface AppConfig {
    Locale: "fr" | "en";
    Messages: Messages;
  }
}
