export class LancerCombatTracker extends CombatTracker {
  /**
   * @override
   * Intercepts the data being sent to the combat tracker window and
   * optionally sorts the the turn data that gets displayed. This allows the
   * units that have already gone to be moved to the bottom without the risk of
   * updateCombat events being eaten.
   */
  async getData(options) {
    let data = await super.getData(options);
    const sort = game.settings.get("lancer-initiative", "sort");
    if (sort) {
      data.turns.sort(function (a, b) {
        const aa = a.css.indexOf("active") !== -1;
        const ba = b.css.indexOf("active") !== -1;
        if (ba - aa !== 0) return ba - aa;
        const ad = a.flags.activations.value === 0;
        const bd = b.flags.activations.value === 0;
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
  async _renderInner(data, options) {
    let html = await super._renderInner(data, options);
    const settings = {
      friendly: game.settings.get("lancer-initiative", "pc-col"),
      neutral: game.settings.get("lancer-initiative", "nu-col"),
      hostile: game.settings.get("lancer-initiative", "en-col"),
      inactive: game.settings.get("lancer-initiative", "xx-col"),
      icon: game.settings.get("lancer-initiative", "icon"),
      icon_size: game.settings.get("lancer-initiative", "icon-size").toString() + "rem",
      enable_initiative: game.settings.get("lancer-initiative", "enable-initiative"),
    };
    html.find(".combatant").each(async (_, li) => {
      const combatantId = $(li).data("combatantId");
      const combatant = data.combat.getCombatant(combatantId);

      // Retrieve settings
      let color = "";
      switch (combatant.token?.disposition) {
        case 1: // Player
          color = settings.friendly;
          break;
        case 0: // Neutral
          color = settings.neutral;
          break;
        case -1: // Hostile
          color = settings.hostile;
          break;
        default:
      }

      $(li).css("border-color", color);

      // render icons
      let n = combatant.flags.activations.value;
      let d = combatant.flags.activations.max - n;
      $(li)
        .find(".token-initiative")
        .addClass("combatant-control")
        .attr("data-control", "activate")
        .html(
          `<a class="${settings.icon}"
            style="color: ${color}; font-size: ${settings.icon_size}"
            ></a>`.repeat(n) +
            `<i class="${settings.icon}"
              style="color: ${settings.inactive}; font-size: ${settings.icon_size}"
              ></i>`.repeat(d)
        );

      if (
        settings.enable_initiative &&
        combatant.permission === ENTITY_PERMISSIONS.OWNER &&
        combatant.initiative === null
      ) {
        let init_button = document.createElement("a");
        $(li).find(".combatant-controls").prepend($(init_button));
        $(init_button)
          .addClass("combatant-control")
          .attr("data-control", "rollInitiative")
          .prop("title", game.i18n.localize("COMBAT.InitiativeRoll"))
          .html('<i class="fas fa-dice-d20"></a>');
      } else if (settings.enable_initiative && combatant.initiative !== null) {
        let init_val = document.createElement("span");
        $(li).find(".combatant-controls").prepend($(init_val));
        $(init_val).addClass("initiative").css("flex", "0 0 1.5em").text(combatant.initiative);
      }
    });
    return html;
  }

  /**
   * Adds activate to the combat control options.
   * @override
   */
  async _onCombatantControl(event) {
    const btn = event.currentTarget;
    if (btn.dataset.control !== "activate") return super._onCombatantControl(event);
    event.preventDefault();
    event.stopPropagation();
    const id = btn.closest(".combatant").dataset.combatantId;
    await this.combat.activateCombatant(id);
  }

  /**
   * @return {any[]}
   * @override
   */
  _getEntryContextOptions() {
    let m = [
      {
        name: game.i18n.localize("LANCERINITIATIVE.AddActivation"),
        icon: '<i class="fas fa-plus"></i>',
        callback: async li => {
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
        callback: async li => {
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
        callback: li => {
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
    m.push(...super._getEntryContextOptions().filter(i => i.name !== "COMBAT.CombatantReroll"));
    return m;
  }
}
