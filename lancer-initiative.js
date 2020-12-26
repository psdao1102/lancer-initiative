import { LancerCombat } from "./module/lancer-combat.js";
import { LancerCombatTracker } from "./module/lancer-combat-tracker.js";
import { LIForm } from "./module/li-form.js";

function registerSettings() {
  console.log("lancer-initiative | Initializing Lancer Initiative Module");

  game.settings.registerMenu("lancer-initiative", "lancerInitiative", {
    name: game.i18n.localize("LANCERINITIATIVE.IconSettingsMenu"),
    label: game.i18n.localize("LANCERINITIATIVE.IconSettingsMenu"),
    type: LIForm,
    restricted: true,
  });
  game.settings.register("lancer-initiative", "pc-col", {
    scope: "world",
    config: false,
    type: String,
    default: "#44abe0",
  });
  game.settings.register("lancer-initiative", "nu-col", {
    scope: "world",
    config: false,
    type: String,
    default: "#146464",
  });
  game.settings.register("lancer-initiative", "en-col", {
    scope: "world",
    config: false,
    type: String,
    default: "#d98f30",
  });
  game.settings.register("lancer-initiative", "xx-col", {
    scope: "world",
    config: false,
    type: String,
    default: "#444444",
  });

  let def_icon = "";
  let def_icon_size = 0;
  switch (game.system.id) {
    case "lancer":
      def_icon = "cci cci-activate";
      def_icon_size = 2;
      break;
    default:
      def_icon = "fas fa-chevron-circle-right";
      def_icon_size = 1.5;
  }
  game.settings.register("lancer-initiative", "icon", {
    scope: "world",
    config: false,
    type: String,
    default: def_icon,
  });
  game.settings.register("lancer-initiative", "icon-size", {
    scope: "world",
    config: false,
    type: Number,
    default: def_icon_size,
  });
  game.settings.register("lancer-initiative", "sort", {
    name: game.i18n.localize("LANCERINITIATIVE.SortTracker"),
    hint: game.i18n.localize("LANCERINITIATIVE.SortTrackerDesc"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
  game.settings.register("lancer-initiative", "enable-initiative", {
    name: game.i18n.localize("LANCERINITIATIVE.EnableInitiative"),
    hint: game.i18n.localize("LANCERINITIATIVE.EnableInitiativeDesc"),
    scope: "world",
    config: !!CONFIG.Combat.initiative.formula,
    type: Boolean,
    default: false,
  });

  // Override classes
  CONFIG.Combat.entityClass = LancerCombat;
  CONFIG.ui.combat = LancerCombatTracker;
}

Hooks.once("init", registerSettings);
