import { LancerCombat, LancerCombatant, isActivations } from "./lancer-combat.js";

/**
 * Overrides the display of the combat and turn order tab to add activation
 * buttons and either move or remove the initiative button
 */
export class LancerCombatTracker extends CombatTracker {
  viewed!: LancerCombat | null;

  /** @override */
  static get defaultOptions(): object {
    const module = this.trackerConfig?.module;
    return {
      ...super.defaultOptions,
      template: `modules/${module}/templates/lancer-combat-tracker.html`,
    };
  }

  /**
   * Intercepts the data being sent to the combat tracker window and
   * optionally sorts the the turn data that gets displayed. This allows the
   * units that have already gone to be moved to the bottom without the risk of
   * updateCombat events being eaten.
   * @override
   */
  async getData(options?: unknown): Promise<object> {
    const config = (this.constructor as typeof LancerCombatTracker).trackerConfig;
    const appearance = (this.constructor as typeof LancerCombatTracker).trackerAppearance;
    const data = (await super.getData(options)) as {
      turns: {
        id: string;
        css: string;
        pending: number;
        finished: number;
      }[];
      [x: string]: unknown;
    };
    const sort = game.settings.get(config.module, "combat-tracker-sort") as boolean;
    const disp: Record<number, string> = {
      [-1]: "enemy",
      [0]: "neutral",
      [1]: "player",
    };
    data.turns = data.turns.map(t => {
      const combatant = this.viewed!.getEmbeddedDocument("Combatant", t.id);
      const activations = combatant.getFlag(config.module, "activations");
      if (!isActivations(activations)) return t;
      return {
        ...t,
        css: t.css + " " + disp[combatant.token?.data.disposition ?? 0],
        pending: activations.value ?? 0,
        finished: (activations.max ?? 1) - (activations.value ?? 0),
      };
    });
    if (sort) {
      // Not sure why these need to be annotated
      data.turns.sort(function (a, b) {
        const aa = a.css.indexOf("active") !== -1 ? 1 : 0;
        const ba = b.css.indexOf("active") !== -1 ? 1 : 0;
        if (ba - aa !== 0) return ba - aa;
        const ad = a.pending === 0 ? 1 : 0;
        const bd = b.pending === 0 ? 1 : 0;
        return ad - bd;
      });
    }
    data.icon_class = appearance.icon;
    data.enable_initiative = game.settings.get(
      config.module,
      "combat-tracker-enable-initiative"
    ) as boolean;
    return data;
  }

  /** @override */
  activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    html.find(".token-initiative").on("click", this._onActivateCombatant.bind(this));
  }

  /**
   * Activate the selected combatant
   */
  protected async _onActivateCombatant(
    event: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    const id = btn.closest<HTMLElement>(".combatant")?.dataset.combatantId;
    if (!id) return;
    await this.viewed!.activateCombatant(id);
  }

  protected async _onAddActivation(li: JQuery<HTMLElement>): Promise<void> {
    const combatant: LancerCombatant = this.viewed!.getEmbeddedDocument(
      "Combatant",
      li.data("combatant-id")
    );
    await combatant.addActivations(1);
  }

  protected async _onRemoveActivation(li: JQuery<HTMLElement>): Promise<void> {
    const combatant: LancerCombatant = this.viewed!.getEmbeddedDocument(
      "Combatant",
      li.data("combatant-id")
    );
    await combatant.addActivations(-1);
  }

  protected async _onUndoActivation(li: JQuery<HTMLElement>): Promise<void> {
    const combatant: LancerCombatant = this.viewed!.getEmbeddedDocument(
      "Combatant",
      li.data("combatant-id")
    );
    await combatant.modifyCurrentActivations(1);
  }

  /** @override */
  protected _getEntryContextOptions(): {
    name: string;
    icon: string;
    callback: (...args: any) => unknown;
  }[] {
    const m: {
      name: string;
      icon: string;
      callback: (...args: any) => unknown;
    }[] = [
      {
        name: game.i18n.localize("LANCERINITIATIVE.AddActivation"),
        icon: '<i class="fas fa-plus"></i>',
        callback: this._onAddActivation.bind(this),
      },
      {
        name: game.i18n.localize("LANCERINITIATIVE.RemoveActivation"),
        icon: '<i class="fas fa-minus"></i>',
        callback: this._onRemoveActivation.bind(this),
      },
      {
        name: game.i18n.localize("LANCERINITIATIVE.UndoActivation"),
        icon: '<i class="fas fa-undo"></i>',
        callback: this._onUndoActivation.bind(this),
      },
    ];
    m.push(...super._getEntryContextOptions().filter(i => i.name !== "COMBAT.CombatantReroll"));
    return m;
  }

  /**
   * Get the current appearance data from settings
   */
  static get trackerAppearance(): LIConfig["def_appearance"] {
    const config = (this.prototype.constructor as typeof LancerCombatTracker).trackerConfig;
    return {
      ...config.def_appearance,
      ...(game.settings.get(config.module, "combat-tracker-appearance") as Partial<
        LIConfig["def_appearance"]
      >),
    };
  }

  /**
   * Holds the default configuration of the module
   */
  static trackerConfig: LIConfig = {
    module: "",
    def_appearance: {
      icon: "fas fa-chevron-circle-right",
      icon_size: 1.5,
      player_color: "#44abe0",
      neutral_color: "#146464",
      enemy_color: "#d98f30",
      done_color: "#444444",
    },
  };
}

// @ts-ignore fuck the police
Handlebars.registerHelper("lancerinitiative-repeat", function (n, block) {
  let accum = "";
  for (let i = 0; i < n; i++) accum += block.fn(i);
  return accum;
});

interface LIConfig {
  module: string;
  def_appearance: {
    icon: string;
    icon_size: number;
    player_color: string;
    neutral_color: string;
    enemy_color: string;
    done_color: string;
  };
}
