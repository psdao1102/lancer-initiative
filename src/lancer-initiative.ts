import { LancerCombat } from "./module/lancer-combat.js";
import { LancerCombatTracker } from "./module/lancer-combat-tracker.js";
import { LIForm } from "./module/li-form.js";

function registerSettings() {
  if (game === null) throw "Game not set up";

  console.log("lancer-initiative | Initializing Lancer Initiative Module");

  CONFIG.LancerInitiative = {
    module: "lancer-initiative",
    def_appearance: {
        icon: "fas fa-chevron-circle-right",
        icon_size: 1.5,
        player_color: "#44abe0",
        neutral_color: "#146464",
        enemy_color: "#d98f30",
        done_color: "#444444",
    },
  };

  game.settings.registerMenu(CONFIG.LancerInitiative.module, "lancerInitiative", {
    name: game.i18n.localize("LANCERINITIATIVE.IconSettingsMenu"),
    label: game.i18n.localize("LANCERINITIATIVE.IconSettingsMenu"),
    type: LIForm,
    restricted: true,
  });
  game.settings.register(CONFIG.LancerInitiative.module, "appearance", {
    scope: "world",
    config: false,
    type: Object,
  });
  game.settings.register(CONFIG.LancerInitiative.module, "sort", {
    name: game.i18n.localize("LANCERINITIATIVE.SortTracker"),
    hint: game.i18n.localize("LANCERINITIATIVE.SortTrackerDesc"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
  game.settings.register(CONFIG.LancerInitiative.module, "enable-initiative", {
    name: game.i18n.localize("LANCERINITIATIVE.EnableInitiative"),
    hint: game.i18n.localize("LANCERINITIATIVE.EnableInitiativeDesc"),
    scope: "world",
    config: !!CONFIG.Combat.initiative.formula,
    type: Boolean,
    default: false,
  });

  switch (game.system.id) {
    case "lancer":
      CONFIG.LancerInitiative.def_appearance.icon = "cci cci-activate";
      CONFIG.LancerInitiative.def_appearance.icon_size = 2;
      break;
    default:
  }

  // Override classes
  CONFIG.Combat.entityClass = LancerCombat;
  CONFIG.ui.combat = LancerCombatTracker;
}

Hooks.once("init", registerSettings);
