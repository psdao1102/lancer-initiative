export class LancerCombatTracker extends CombatTracker {
  /**
   * Intercepts the data being sent to the combat tracker window and
   * optionally sorts the the turn data that gets displayed. This allows the
   * units that have already gone to be moved to the bottom without the risk of
   * updateCombat events being eaten.
   * @override
   */
  async getData(options: any) {
    let data = await super.getData(options);
    const sort = game.settings.get(CONFIG.LancerInitiative.module, "sort");
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
  async _renderInner(data: any, options: any) {
    let html = await super._renderInner(data, options) as JQuery<HTMLElement>;
    const settings = mergeObject(
      CONFIG.LancerInitiative.def_appearance,
      game.settings.get(CONFIG.LancerInitiative.module, "appearance"),
      { inplace: false }
    );
    settings.enable_initiative = game.settings.get(
      CONFIG.LancerInitiative.module,
      "enable-initiative"
    );
    html.find(".combatant").each((_: number , li: HTMLElement) => {
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
      let n = combatant.flags.activations.value;
      let d = combatant.flags.activations.max - n;
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
        let init_button = document.createElement("a");
        $(li).find(".combatant-controls").prepend($(init_button));
        $(init_button)
          .addClass("combatant-control")
          .attr("data-control", "rollInitiative")
          .prop("title", game.i18n.localize("COMBAT.InitiativeRoll"))
          .html('<i class="fas fa-dice-d20"></i>');
      } else if (settings.enable_initiative && combatant.initiative !== null) {
        let init_val = document.createElement("span");
        $(li).find(".combatant-controls").prepend($(init_val));
        $(init_val).addClass("initiative").css("flex", "0 0 1.5em").text(combatant.initiative);
      }
    });
    return html;
  }

  /** @override */
  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);
    html.find(".token-initiative").on("click", this._onActivateCombatant.bind(this));
  }

  /**
   * Activate the selected combatant
   */
  async _onActivateCombatant(event: any) {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    const id = btn.closest(".combatant").dataset.combatantId;
    await this.combat.activateCombatant(id);
  }

  /**
   * @override
   */
  _getEntryContextOptions() {
    let m = [
      {
        name: game.i18n.localize("LANCERINITIATIVE.AddActivation"),
        icon: '<i class="fas fa-plus"></i>',
        callback: async (li: JQuery<HTMLElement>) => {
          const combatant = this.combat.getCombatant(li.data("combatant-id"));
          let max = combatant.flags.activations.max + 1;
          await this.combat.updateCombatant({
            _id: combatant._id,
            "flags.activations.max": max,
          });
        },
      },
      {
        name: game.i18n.localize("LANCERINITIATIVE.RemoveActivation"),
        icon: '<i class="fas fa-minus"></i>',
        callback: async (li: JQuery<HTMLElement>) => {
          const combatant = this.combat.getCombatant(li.data("combatant-id"));
          let max = combatant.flags.activations.max - 1;
          let cur = Math.clamped(combatant.flags.activations.value, 0, max > 0 ? max : 1);
          await this.combat.updateCombatant({
            _id: combatant._id,
            "flags.activations.max": max > 0 ? max : 1,
            "flags.activations.value": cur,
          });
        },
      },
      {
        name: game.i18n.localize("LANCERINITIATIVE.UndoActivation"),
        icon: '<i class="fas fa-undo"></i>',
        callback: (li: JQuery<HTMLElement>) => {
          const combatant = this.combat.getCombatant(li.data("combatant-id"));
          let max = combatant.flags.activations.max;
          let cur = Math.clamped(combatant.flags.activations.value + 1, 0, max > 0 ? max : 1);
          this.combat.updateCombatant({
            _id: combatant._id,
            "flags.activations.value": cur,
          });
        },
      },
    ];
    m.push(...super._getEntryContextOptions().filter((i: any) => i.name !== "COMBAT.CombatantReroll"));
    return m;
  }
}
