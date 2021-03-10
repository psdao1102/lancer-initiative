import { LancerCombat, isActivations } from "./lancer-combat.js";

/**
 * Overrides the display of the combat and turn order tab to add activation
 * buttons and either move or remove the initiative button
 */
export class LancerCombatTracker extends CombatTracker {
  combat!: LancerCombat;
  /**
   * Intercepts the data being sent to the combat tracker window and
   * optionally sorts the the turn data that gets displayed. This allows the
   * units that have already gone to be moved to the bottom without the risk of
   * updateCombat events being eaten.
   * @override
   */
  async getData(options: Application.RenderOptions): Promise<CombatTracker.Data> {
    const LI = (this.constructor as typeof LancerCombatTracker).config;
    const data = await super.getData(options);
    const sort = game.settings.get(LI.module, "sort") as boolean;
    if (sort) {
      data.turns.sort(function (a: any, b: any) {
        const aa = a.css.indexOf("active") !== -1 ? 1 : 0;
        const ba = b.css.indexOf("active") !== -1 ? 1 : 0;
        if (ba - aa !== 0) return ba - aa;
        const ad = a.flags.activations.value === 0 ? 1 : 0;
        const bd = b.flags.activations.value === 0 ? 1 : 0;
        return ad - bd;
      });
    }
    return data;
  }

  /**
   * Make all the changes to the combat tracker before setting up event
   * handlers.
   * @override
   */
  protected async _renderInner(data: CombatTracker.Data): Promise<JQuery<HTMLElement>> {
    const LI = (this.constructor as typeof LancerCombatTracker).config;
    const html = await super._renderInner(data);
    const settings = {
      ...LI.def_appearance,
      ...(game.settings.get(LI.module, "appearance") as typeof LI["def_appearance"]),
      enable_initiative: game.settings.get(LI.module, "enable-initiative") as boolean,
    };
    html.find(".combatant").each(function () {
      console.log($(this));
      const combatantId = $(this).data("combatantId") as string;
      const combatant = data.combat!.getCombatant(combatantId);
      if (!isActivations(combatant.flags.activations)) return;

      // Retrieve settings
      let color = "";
      switch (combatant.token?.disposition) {
        case 1: // Player
          color = settings.player_color;
          break;
        case 0: // Neutral
          color = settings.neutral_color;
          break;
        case -1: // Hostile
          color = settings.enemy_color;
          break;
        default:
      }

      $(this).css("border-color", color);

      // render icons
      const n = combatant.flags.activations.value ?? 0;
      const d = (combatant.flags.activations.max ?? 1) - n;
      $(this)
        .find(".token-initiative")
        .attr("data-control", "activate")
        .html(
          `<a class="${settings.icon}"
            style="color: ${color}; font-size: ${settings.icon_size}rem"
            ></a>`.repeat(n) +
            `<i class="${settings.icon}"
              style="color: ${settings.done_color}; font-size: ${settings.icon_size}rem"
              ></i>`.repeat(d)
        );

      if (
        settings.enable_initiative &&
        combatant.permission === 3 &&
        combatant.initiative === null
      ) {
        const init_button = document.createElement("a");
        $(this).find(".combatant-controls").prepend($(init_button));
        $(init_button)
          .addClass("combatant-control")
          .attr("data-control", "rollInitiative")
          .prop("title", game.i18n.localize("COMBAT.InitiativeRoll"))
          .html('<i class="fas fa-dice-d20"></i>');
      } else if (settings.enable_initiative && combatant.initiative !== null) {
        const init_val = document.createElement("span");
        $(this).find(".combatant-controls").prepend($(init_val));
        $(init_val).addClass("initiative").css("flex", "0 0 1.5em").text(combatant.initiative);
      }
    });
    return html;
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
    await this.combat.activateCombatant(id);
  }

  /** @override */
  protected _getEntryContextOptions(): ContextMenu.Item[] {
    const m = [
      {
        name: game.i18n.localize("LANCERINITIATIVE.AddActivation"),
        icon: '<i class="fas fa-plus"></i>',
        callback: async (li: JQuery<HTMLElement>) => {
          const combatant = this.combat.getCombatant(li.data("combatant-id"));
          if (!isActivations(combatant.flags.activations))
            throw new Error("Assertion failed for combatant.flags.activations");
          const max = (combatant.flags.activations.max ?? 0) + 1;
          await this.combat.updateCombatant({
            _id: combatant._id,
            flags: { "activations.max": max },
          });
        },
      },
      {
        name: game.i18n.localize("LANCERINITIATIVE.RemoveActivation"),
        icon: '<i class="fas fa-minus"></i>',
        callback: async (li: JQuery<HTMLElement>) => {
          const combatant = this.combat.getCombatant(li.data("combatant-id"));
          if (!isActivations(combatant.flags.activations))
            throw new Error("Assertion failed for combatant.flags.activations");
          const max = (combatant.flags.activations.max ?? 0) - 1;
          const cur = Math.clamped(combatant.flags.activations.value ?? 0, 0, max > 0 ? max : 1);
          await this.combat.updateCombatant({
            _id: combatant._id,
            flags: { "activations.max": max > 0 ? max : 1, "activations.value": cur },
          });
        },
      },
      {
        name: game.i18n.localize("LANCERINITIATIVE.UndoActivation"),
        icon: '<i class="fas fa-undo"></i>',
        callback: (li: JQuery<HTMLElement>) => {
          const combatant = this.combat.getCombatant(li.data("combatant-id"));
          if (!isActivations(combatant.flags.activations))
            throw new Error("Assertion failed for combatant.flags.activations");
          const max = combatant.flags.activations.max ?? 0;
          const cur = Math.clamped(
            combatant.flags.activations.value ?? 0 + 1,
            0,
            max > 0 ? max : 1
          );
          this.combat.updateCombatant({
            _id: combatant._id,
            flags: { "activations.value": cur },
          });
        },
      },
    ];
    m.push(...super._getEntryContextOptions().filter(i => i.name !== "COMBAT.CombatantReroll"));
    return m;
  }

  /**
   * Holds the default configuration of the module
   */
  static config: LIConfig = {
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
}

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
