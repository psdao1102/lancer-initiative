import { LancerCombat } from "./module/lancer-combat.js";
import { LancerCombatTracker } from "./module/lancer-combat-tracker.js";
import { LIForm } from "./module/li-form.js";

function registerSettings() {
  console.log("lancer-initiative | Initializing Lancer Initiative Module");
  const LI = LancerCombatTracker.config;

  switch (game.system.id) {
    case "lancer":
      LI.def_appearance.icon = "cci cci-activate";
      LI.def_appearance.icon_size = 2;
      break;
    default:
  }

  game.settings.registerMenu(LI.module, "lancerInitiative", {
    name: game.i18n.localize("LANCERINITIATIVE.IconSettingsMenu"),
    label: game.i18n.localize("LANCERINITIATIVE.IconSettingsMenu"),
    type: LIForm,
    restricted: true,
  });
  game.settings.register(LI.module, "appearance", {
    scope: "world",
    config: false,
    type: Object,
    onChange: () => game.combats?.render(),
  });
  game.settings.register(LI.module, "sort", {
    name: game.i18n.localize("LANCERINITIATIVE.SortTracker"),
    hint: game.i18n.localize("LANCERINITIATIVE.SortTrackerDesc"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
  game.settings.register(LI.module, "enable-initiative", {
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

  // Call hooks for initialization of Lancer Initiative
  Hooks.callAll("LancerIntitaitveInit");
}

Hooks.once("init", registerSettings);
