import { LancerCombat } from "./module/lancer-combat.js";
import { LancerCombatTracker } from "./module/lancer-combat-tracker.js";
import { LIForm } from "./module/li-form.js";

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

async function migrateSettings() {
  if (game.settings.get(CONFIG.LancerInitiative.module, "migrated") > 0) return;
  console.log("lancer-initiative | Settings Migration");

  const appearance = {
    icon: game.settings.get(CONFIG.LancerInitiative.module, "icon"),
    icon_size: game.settings.get(CONFIG.LancerInitiative.module, "icon-size"),
    player_color: game.settings.get(CONFIG.LancerInitiative.module, "pc-col"),
    neutral_color: game.settings.get(CONFIG.LancerInitiative.module, "nu-col"),
    enemy_color: game.settings.get(CONFIG.LancerInitiative.module, "en-col"),
    done_color: game.settings.get(CONFIG.LancerInitiative.module, "xx-col"),
  };

  await game.settings.set(
    CONFIG.LancerInitiative.module,
    "appearance",
    diffObject(CONFIG.LancerInitiative.def_appearance, appearance)
  );

  ui.notifications.info("Migrated Lancer Initiative settings");

  game.settings.set(CONFIG.LancerInitiative.module, "migrated", 1);
}

function registerSettings() {
  console.log("lancer-initiative | Initializing Lancer Initiative Module");

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

  game.settings.register(CONFIG.LancerInitiative.module, "migrated", {
    scope: "world",
    config: false,
    type: Number,
    default: 0,
  });
  let def_icon = "";
  let def_icon_size = 0;
  switch (game.system.id) {
    case "lancer":
      def_icon = "cci cci-activate";
      CONFIG.LancerInitiative.def_appearance.icon = def_icon;
      def_icon_size = 2;
      CONFIG.LancerInitiative.def_appearance.icon_size = def_icon_size;
      break;
    default:
      def_icon = "fas fa-chevron-circle-right";
      def_icon_size = 1.5;
  }
  game.settings.register(CONFIG.LancerInitiative.module, "icon", {
    scope: "world",
    config: false,
    type: String,
    default: def_icon,
  });
  game.settings.register(CONFIG.LancerInitiative.module, "icon-size", {
    scope: "world",
    config: false,
    type: Number,
    default: def_icon_size,
  });
  game.settings.register(CONFIG.LancerInitiative.module, "pc-col", {
    scope: "world",
    config: false,
    type: String,
    default: "#44abe0",
  });
  game.settings.register(CONFIG.LancerInitiative.module, "nu-col", {
    scope: "world",
    config: false,
    type: String,
    default: "#146464",
  });
  game.settings.register(CONFIG.LancerInitiative.module, "en-col", {
    scope: "world",
    config: false,
    type: String,
    default: "#d98f30",
  });
  game.settings.register(CONFIG.LancerInitiative.module, "xx-col", {
    scope: "world",
    config: false,
    type: String,
    default: "#444444",
  });

  // Override classes
  CONFIG.Combat.entityClass = LancerCombat;
  CONFIG.ui.combat = LancerCombatTracker;
}

Hooks.once("init", registerSettings);
Hooks.once("ready", migrateSettings);
