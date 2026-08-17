import { describe, expect, it } from "vitest";
import { gesteDeReponse } from "./geste-de-reponse";

describe("gesteDeReponse", () => {
  it("range le QCM et le vrai ou faux sous le même geste", () => {
    expect(gesteDeReponse("MCQ")).toBe("CHOISIR");
    expect(gesteDeReponse("TRUE_FALSE")).toBe("CHOISIR");
  });

  it("donne son geste au texte à trou", () => {
    expect(gesteDeReponse("CLOZE")).toBe("SAISIR");
  });

  it("range sous « formuler » tout ce qui se juge soi-même", () => {
    expect(gesteDeReponse("SHORT_ANSWER")).toBe("FORMULER");
    expect(gesteDeReponse("EXPLAIN")).toBe("FORMULER");
    expect(gesteDeReponse("CODE")).toBe("FORMULER");
  });

  it("fait tomber un format inconnu là où la zone de réponse le ferait", () => {
    expect(gesteDeReponse("QUELQUE_CHOSE_DE_NEUF")).toBe("FORMULER");
    expect(gesteDeReponse("")).toBe("FORMULER");
  });
});
