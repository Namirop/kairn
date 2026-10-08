import type { Messages } from "../../fr";

export const commentCaMarche: Messages["tableau"]["commentCaMarche"] = {
  titre: "How it works",
  intro:
    "You don't need this page to use Kairn. It's here for those who'd rather know what happens behind the scenes.",
  retour: "Back to Settings",
  sections: {
    oubli: {
      titre: "You review just before you forget",
      un: "Rereading ten times in a row doesn't make anything stick. What makes it stick is getting something back just as it's about to fade — the effort of recall is what sets it back in place.",
      deux: "Each concept you get back moves further away: two days, then a week, then a month. Each concept you miss moves closer. That's why a session stops, and why it doesn't bring back what you just saw.",
    },
    decoupage: {
      titre: "A drop gives concepts, a concept gives questions",
      un: "What you drop in is never changed. It's split into concepts — one idea per concept — and each concept gets four questions.",
      deux: "The four aren't alike: recognize what it is, explain why it works, say what it isn't, use it somewhere else. It's the angle that changes, not the wording.",
    },
    rotation: {
      titre: "The question rotates, the schedule follows only the concept",
      un: "You never review the same angle twice in a row. Without that, you end up memorizing a phrasing rather than an idea, and the next question no longer measures anything.",
      deux: "The due date belongs to the concept. Switching questions brings nothing closer and pushes nothing back.",
    },
    maitrise: {
      titre: "“I know this” postpones, it doesn't delete",
      un: "The button takes the concept out of the cycle and brings it back in three months. It doesn't erase it: the whole premise of the product is that we think we know and then forget, and taking you at your word would contradict it.",
      deux: "You can put it back in the cycle at any time from its drop.",
    },
    entrainement: {
      titre: "Practice doesn't count",
      un: "It asks other questions on the same concepts, as many as you want. It doesn't move any due date, doesn't give any points, and doesn't keep your streak.",
      deux: "That's on purpose: five passes within the hour on the same concept is working memory. Letting them stretch the interval would be exactly what this product exists to prevent.",
    },
    compte: {
      titre: "What gets counted",
      un: "One point per question answered in a session, one more when you get back a concept you missed the time before. Being right doesn't factor in.",
      deux: "That's deliberate: running into what you miss is the moment learning happens. A score that punishes failure pushes you to avoid hard topics and to grade yourself generously.",
    },
  },
};
