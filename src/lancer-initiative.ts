import {
  LancerCombat,
  LancerCombatant,
  LancerInitiativeConfig,
  getTrackerAppearance,
} from "lancer-initiative";
import { LancerCombatTracker } from "./lancer-combat-tracker";
import { LancerInitiativeConfigForm } from "./li-form";

const module = "lancer-initiative";
const templatePath = "modules/lancer-initiative/templates/lancer-combat-tracker.hbs";

export function setAppearance(val: Partial<LancerInitiativeConfig["def_appearance"]>): void {
  const defaults = CONFIG.LancerInitiative.def_appearance!;
  document.documentElement.style.setProperty(
    "--lancer-initiative-icon-size",
    `${val?.icon_size ?? defaults.icon_size}rem`
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-player-color",
    val?.player_color ?? defaults.player_color
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-friendly-color",
    val?.friendly_color ?? defaults.friendly_color
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-neutral-color",
    val?.neutral_color ?? defaults.neutral_color
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-enemy-color",
    val?.enemy_color ?? defaults.enemy_color
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-secret-color",
    // @ts-ignore
    val?.secret_color ?? defaults.secret_color
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-done-color",
    val?.done_color ?? defaults.done_color
  );
  game.combats?.render();
}

function registerSettings(): void {
  console.log(`${module} | Initializing Lancer Initiative Module`);
  if (!!CONFIG.LancerInitiative?.module) {
    Hooks.once("ready", () =>
      ui.notifications!.warn(
        "The system you are using implements lancer initiative natively. You can disable the module",
        { permanent: true }
      )
    );
    throw new Error(
      `${module} | Lancer Intitiative already initiatilized, does your system implement it?`
    );
  }
  CONFIG.LancerInitiative = {
    module,
    templatePath,
    def_appearance: {
      icon: "fas fa-chevron-circle-right",
      icon_size: 1.5,
      player_color: "#44abe0",
      friendly_color: "#44abe0",
      neutral_color: "#146464",
      enemy_color: "#d98f30",
      // @ts-ignore
      secret_color: "#552f8c",
      done_color: "#444444",
    },
  };
  Object.defineProperty(CONFIG.LancerInitiative, "module", { writable: false });

  // const old_combat = CONFIG.Combat.documentClass;

  // Override classes
  CONFIG.Combat.documentClass = LancerCombat;
  CONFIG.Combatant.documentClass = LancerCombatant;
  CONFIG.ui.combat = LancerCombatTracker;

  game.settings.registerMenu(module, "lancerInitiative", {
    name: "LANCERINITIATIVE.IconSettingsMenu",
    label: "LANCERINITIATIVE.IconSettingsMenu",
    type: LancerInitiativeConfigForm,
    restricted: true,
  });
  game.settings.register(module, "combat-tracker-appearance", {
    scope: "world",
    config: false,
    type: Object,
    onChange: setAppearance,
    default: {},
  });
  // Allows combat tracker sorting to be toggled. Optional for downstreams.
  game.settings.register(module, "combat-tracker-sort", {
    name: "LANCERINITIATIVE.SortTracker",
    hint: "LANCERINITIATIVE.SortTrackerDesc",
    scope: "world",
    config: true,
    type: Boolean,
    onChange: v => {
      CONFIG.LancerInitiative.sort = v;
      game.combats?.render();
    },
    default: true,
  });
  CONFIG.LancerInitiative.sort = game.settings.get(module, "combat-tracker-sort");
  // Allows initiative rolling to be toggled. Optional for downstreams.
  game.settings.register(module, "combat-tracker-enable-initiative", {
    name: "LANCERINITIATIVE.EnableInitiative",
    hint: "LANCERINITIATIVE.EnableInitiativeDesc",
    scope: "world",
    config: !!CONFIG.Combat.initiative.formula,
    type: Boolean,
    onChange: v => {
      CONFIG.LancerInitiative.enable_initiative = v;
      game.combats?.render();
    },
    default: false,
  });
  CONFIG.LancerInitiative.enable_initiative = game.settings.get(
    module,
    "combat-tracker-enable-initiative"
  );

  // Call hooks to signal other modules of the initialization
  Hooks.callAll("LancerInitiativeInit");

  // Set the css vars
  setAppearance(getTrackerAppearance());
}

Hooks.once("init", registerSettings);
