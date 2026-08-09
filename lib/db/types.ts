/**
 * Point de sortie unique des types du schéma vers le reste du projet.
 *
 * Le client généré ne s'importe que dans `lib/db/` (règle ESLint). Les écrans et
 * les composants passent par ce fichier, ce qui garde les types dérivés du
 * schéma Prisma plutôt que redéclarés à la main.
 */
export {
  AtomState,
  FsrsState,
  GenerationKind,
  InputSourceType,
  InputStatus,
  JobStatus,
  NotificationType,
  ReviewRating,
  VariantFormat,
} from "@/lib/db/generated/enums";

// Prisma 7 suffixe les types de ligne par `Model`. On les réexporte sous le nom
// du modèle : c'est le vocabulaire du domaine qui doit apparaître dans le code.
export type {
  AiCallModel as AiCall,
  AtomModel as Atom,
  DailyUsageModel as DailyUsage,
  EmailDeliveryModel as EmailDelivery,
  GenerationJobModel as GenerationJob,
  InputModel as Input,
  ReviewModel as Review,
  UserModel as User,
  UserSettingsModel as UserSettings,
  UserStatsModel as UserStats,
  VariantModel as Variant,
} from "@/lib/db/generated/models";
