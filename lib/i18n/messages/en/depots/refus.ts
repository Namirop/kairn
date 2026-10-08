import type { Messages } from "../../fr";

export const refus: Messages["depots"]["refus"] = {
  longueurEnClair: "{caracteres, number} characters, about {mots, number} words",
  consigneTropLongue:
    "Your instruction is {caracteres, number} characters long, and it takes {maximum}. Say it in a sentence or two.",
  imageTropLourde:
    "This image is too heavy to send. Crop it to the part you care about, or shrink it before dropping it in.",
  imageIllisible:
    "This file isn't an image we can read. Drop in a screenshot as JPEG, PNG, WebP or GIF.",
  texteTropLong:
    "That's {caracteres, number} characters, and a drop takes {maximum, number}. Keep the part that matters.",
  depotTropLong: "This drop is over {longueur}. Split it in two: two drops beat one cut short.",
  cleIllisible: "This drop couldn't be identified. Reload the page and try again.",
  nonRecevable: "This drop can't be accepted.",
  rienADeposer: "There's nothing to drop in: paste some text, or attach a screenshot.",
  quota: {
    concepts: "You've reached this month's limit, around {plafond} concepts.",
    depots: "You've used all of this month's drops.",
    debit: "Too many drops in a row. Give it a minute.",
  },
  introuvable: "This drop can't be found.",
  rienARedecouper: "There's nothing to split again in this drop.",
  pasDeTexteARedecouper: "This drop has no text to split again.",
  essai: {
    rienADecouper: "There's nothing to break down. Paste a sentence, a paragraph, an article.",
    tropCourt: "Paste a little more: a sentence or two, at least.",
    tropLong:
      "This text is over {limiteEssai}, the limit for a try without an account. An account takes {limiteCompte}, and it's free.",
    tropDeDepots:
      "A lot of tries have come from here recently. Create an account to keep going — it's free.",
    duJourFaits:
      "You've used today's tries. Create an account to keep your concepts and drop in more, or come back tomorrow.",
    epuises:
      "You've used today's tries. An account lifts the limit, takes {limiteCompte}, and it's free.",
    decoupageIndisponible:
      "Finding concepts isn't working right now, and it's not because of your text. Create an account: you'll be able to pick up as soon as it's back.",
  },
};
