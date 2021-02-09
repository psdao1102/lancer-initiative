import { LancerCombat, isActivations } from "./lancer-combat.js";
import { LIConfig } from "./util.js";

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
  async getData(options: Application.RenderOptions): Promise<unknown> {
    const LI = CONFIG.LancerInitiative as LIConfig;
    const data = await (super.getData(options) as Promise<any>);
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
  protected async _renderInner(data: any, options: Application.RenderOptions): Promise<JQuery<HTMLElement>> {
    const LI = CONFIG.LancerInitiative as LIConfig;
    const html = await super._renderInner(data, options);
    const settings = mergeObject(LI.def_appearance, game.settings.get(LI.module, "appearance"), {
      inplace: false,
    });
    settings.enable_initiative = game.settings.get(LI.module, "enable-initiative");
    html.find(".combatant").each((_: number, li: HTMLElement) => {
      const combatantId = $(li).data("combatantId");
      const combatant = data.combat.getCombatant(combatantId);

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

      $(li).css("border-color", color);

      // render icons
      const n = combatant.flags.activations.value;
      const d = combatant.flags.activations.max - n;
      $(li)
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
        $(li).find(".combatant-controls").prepend($(init_button));
        $(init_button)
          .addClass("combatant-control")
          .attr("data-control", "rollInitiative")
          .prop("title", game.i18n.localize("COMBAT.InitiativeRoll"))
          .html('<i class="fas fa-dice-d20"></i>');
      } else if (settings.enable_initiative && combatant.initiative !== null) {
        const init_val = document.createElement("span");
        $(li).find(".combatant-controls").prepend($(init_val));
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
  protected async _onActivateCombatant(event: JQuery.MouseEventBase): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    const id = btn.closest(".combatant").dataset.combatantId as string;
    await this.combat.activateCombatant(id);
  }

  /** @override */
  protected _getEntryContextOptions(): {
    name: string;
    icon: string;
    callback: (li: JQuery<HTMLElement>) => void;
  }[] {
    const m = [
      {
        name: game.i18n.localize("LANCERINITIATIVE.AddActivation"),
        icon: '<i class="fas fa-plus"></i>',
        callback: async (li: JQuery<HTMLElement>) => {
          const combatant = this.combat.getCombatant(li.data("combatant-id"));
          if (!isActivations(combatant.flags.activations)) throw new Error();
          const max = combatant.flags.activations.max ?? 0 + 1;
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
          if (!isActivations(combatant.flags.activations)) throw new Error();
          const max = combatant.flags.activations.max ?? 0 - 1;
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
          if (!isActivations(combatant.flags.activations)) throw new Error();
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
    m.push(
      ...super
        ._getEntryContextOptions()
        .filter(
          (i: { name: string; icon: string; callback: (li: JQuery<HTMLElement>) => void }) =>
            i.name !== "COMBAT.CombatantReroll"
        )
    );
    return m;
  }
}
