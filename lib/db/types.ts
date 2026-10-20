/**
 * Sortie unique des types du schéma : le client généré ne s'importe que dans
 * `lib/db/` (règle ESLint), et les types restent dérivés plutôt que redéclarés.
 */
export {
  AtomState,
  CompteurDeQuota,
  FsrsState,
  GenerationKind,
  InputNature,
  InputSourceType,
  InputStatus,
  JobStatus,
  Langue,
  MotifDeSignalement,
  NotificationType,
  ReviewRating,
  SujetDeRetour,
  VariantFacet,
  VariantFormat,
} from "@/lib/db/generated/enums";

// Prisma 7 suffixe les types de ligne par `Model` ; le code parle le vocabulaire du domaine.
export type {
  AiCallModel as AiCall,
  AtomModel as Atom,
  DailyUsageModel as DailyUsage,
  EmailDeliveryModel as EmailDelivery,
  GenerationJobModel as GenerationJob,
  InputModel as Input,
  RetourModel as Retour,
  ReviewModel as Review,
  SignalementModel as Signalement,
  UserModel as User,
  UserSettingsModel as UserSettings,
  UserStatsModel as UserStats,
  VariantModel as Variant,
  WaitlistEntryModel as WaitlistEntry,
} from "@/lib/db/generated/models";
