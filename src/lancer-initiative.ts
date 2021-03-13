import { LancerCombat } from "./module/lancer-combat.js";
import { LancerCombatTracker } from "./module/lancer-combat-tracker.js";
import { LIForm } from "./module/li-form.js";

function registerSettings(): void {
  console.log("lancer-initiative | Initializing Lancer Initiative Module");
  const config = LancerCombatTracker.config;

  switch (game.system.id) {
    case "lancer":
      config.def_appearance.icon = "cci cci-activate";
      config.def_appearance.icon_size = 2;
      break;
    default:
  }

  game.settings.registerMenu(config.module, "lancerInitiative", {
    name: game.i18n.localize("LANCERINITIATIVE.IconSettingsMenu"),
    label: game.i18n.localize("LANCERINITIATIVE.IconSettingsMenu"),
    type: LIForm,
    restricted: true,
  });
  game.settings.register(config.module, "appearance", {
    scope: "world",
    config: false,
    type: Object,
    onChange: setAppearance,
  });
  game.settings.register(config.module, "sort", {
    name: game.i18n.localize("LANCERINITIATIVE.SortTracker"),
    hint: game.i18n.localize("LANCERINITIATIVE.SortTrackerDesc"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
  game.settings.register(config.module, "enable-initiative", {
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

  // Set the css vars
  setAppearance(LancerCombatTracker.appearance);
}

function setAppearance(val: Partial<typeof LancerCombatTracker['appearance']>): void {
  const defaults = LancerCombatTracker.config.def_appearance;
  document.documentElement.style.setProperty(
    "--lancer-initiative-icon-size",
    `${val.icon_size ?? defaults.icon_size}rem`
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-player-color",
    val.player_color ?? defaults.player_color
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-neutral-color",
    val.neutral_color ?? defaults.neutral_color
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-enemy-color",
    val.enemy_color ?? defaults.enemy_color
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-done-color",
    val.done_color ?? defaults.done_color
  );
  game.combats?.render();
}

Hooks.once("init", registerSettings);
