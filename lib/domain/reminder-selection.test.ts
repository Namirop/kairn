import { describe, expect, it } from "vitest";
import { selectDueForReminder, type ReminderTarget } from "./reminder-selection";

const utc = (iso: string) => new Date(`${iso}Z`);

const cible = (timezone: string, dailyReminderHour: number, nom = timezone) => ({
  timezone,
  dailyReminderHour,
  nom,
});

describe("selectDueForReminder", () => {
  it("retient le candidat qui est pile à son heure locale", () => {
    // 17 h UTC = 19 h à Paris en été.
    const maintenant = utc("2026-06-15T17:00:00");
    const candidats = [cible("Europe/Paris", 19)];

    const retenus = selectDueForReminder(candidats, maintenant);

    expect(retenus).toHaveLength(1);
    expect(retenus[0]?.target.nom).toBe("Europe/Paris");
    expect(retenus[0]?.day).toBe("2026-06-15");
  });

  it("écarte le candidat une heure trop tôt et celui une heure trop tard", () => {
    const candidats = [cible("Europe/Paris", 19)];

    expect(selectDueForReminder(candidats, utc("2026-06-15T16:00:00"))).toHaveLength(0);
    expect(selectDueForReminder(candidats, utc("2026-06-15T18:00:00"))).toHaveLength(0);
  });

  it("sélectionne des fuseaux opposés au même instant UTC, chacun à son heure", () => {
    // 07 h UTC : 19 h à Auckland (UTC+12), 00 h à Los Angeles (UTC−7).
    const maintenant = utc("2026-06-15T07:00:00");
    const candidats: (ReminderTarget & { nom: string })[] = [
      cible("Pacific/Auckland", 19),
      cible("America/Los_Angeles", 0),
      cible("Europe/Paris", 19),
    ];

    const noms = selectDueForReminder(candidats, maintenant).map((r) => r.target.nom);

    expect(noms).toContain("Pacific/Auckland");
    expect(noms).toContain("America/Los_Angeles");
    expect(noms).not.toContain("Europe/Paris");
  });

  it("attache à chacun son propre jour civil, qui peut différer", () => {
    const maintenant = utc("2026-06-15T07:00:00");
    const retenus = selectDueForReminder(
      [cible("Pacific/Auckland", 19), cible("America/Los_Angeles", 0)],
      maintenant,
    );

    const parNom = new Map(retenus.map((r) => [r.target.nom, r.day]));

    expect(parNom.get("Pacific/Auckland")).toBe("2026-06-15");
    expect(parNom.get("America/Los_Angeles")).toBe("2026-06-15");
  });

  it("suit le passage à l'heure : la même heure locale se déplace en UTC", () => {
    const candidats = [cible("Europe/Paris", 19)];

    // En hiver, 19 h à Paris tombe à 18 h UTC ; en été, à 17 h UTC.
    expect(selectDueForReminder(candidats, utc("2026-01-15T18:00:00"))).toHaveLength(1);
    expect(selectDueForReminder(candidats, utc("2026-01-15T17:00:00"))).toHaveLength(0);
    expect(selectDueForReminder(candidats, utc("2026-06-15T17:00:00"))).toHaveLength(1);
  });

  it("tient un fuseau à décalage d'une demi-heure", () => {
    // Kolkata est à UTC+05:30 : la fenêtre « 19 h locales » s'étend de 13 h 30
    // à 14 h 29 UTC, à cheval sur deux heures UTC. Un cron horaire qui passe à
    // l'heure pile la manquerait une fois sur deux si le calcul était fait en
    // UTC plutôt qu'en heure locale.
    const candidats = [cible("Asia/Kolkata", 19)];

    expect(selectDueForReminder(candidats, utc("2026-06-15T13:29:00"))).toHaveLength(0);
    expect(selectDueForReminder(candidats, utc("2026-06-15T13:30:00"))).toHaveLength(1);
    expect(selectDueForReminder(candidats, utc("2026-06-15T14:29:00"))).toHaveLength(1);
    expect(selectDueForReminder(candidats, utc("2026-06-15T14:30:00"))).toHaveLength(0);
  });

  it("rend une liste vide pour une liste vide", () => {
    expect(selectDueForReminder([], utc("2026-06-15T17:00:00"))).toEqual([]);
  });
});
