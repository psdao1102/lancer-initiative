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
    if (!data.hasCombat) return data;
    let turns = Array.from(data.turns).filter(t => !t.flags.dummy);
    if (sort) {
      turns = turns.sort(function (a, b) {
        const aa = a.css.indexOf("active") !== -1;
        const ba = b.css.indexOf("active") !== -1;
        if (ba - aa !== 0) return ba - aa;
        const ad = a.flags.activations.value === 0;
        const bd = b.flags.activations.value === 0;
        return ad - bd;
      });
    }
    return mergeObject(data, {
      turns: turns,
    });
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

  /**
   * Helper function to modify the combat tracker. Must be hooked to the
   * renderCombatTracker event
   * @static
   */
  static handleRender(app, html, data) {
    const options = {
      friendly: game.settings.get("lancer-initiative", "pc-col"),
      neutral: game.settings.get("lancer-initiative", "nu-col"),
      hostile: game.settings.get("lancer-initiative", "en-col"),
      inactive: game.settings.get("lancer-initiative", "xx-col"),
      icon: game.settings.get("lancer-initiative", "icon"),
      icon_size: game.settings.get("lancer-initiative", "icon-size").toString() + "rem",
      enable_initiative: game.settings.get("lancer-initiative", "enable-initiative"),
    };
    html.find(".combatant").each((_, element) => {
      const c_id = element.dataset.combatantId;
      const combatant = data.combat.getCombatant(c_id);

      if (combatant.flags?.dummy === true) return;

      const init_div = element.getElementsByClassName("token-initiative")[0];

      // Retrieve settings
      let color = "";
      let done_color = options.inactive;
      switch (combatant.token?.disposition) {
        case 1: // Player
          color = options.friendly;
          break;
        case 0: // Neutral
          color = options.neutral;
          break;
        case -1: // Hostile
          color = options.hostile;
          break;
        default:
      }
      let icon = options.icon;
      let icon_size = options.icon_size;

      //get activations
      let pending = combatant.flags.activations?.value;
      if (pending === undefined) pending = 0;
      let finished = combatant.flags.activations?.max - pending;

      init_div.innerHTML = `<a class='${icon}' title='Activate' style='color: ${color}; font-size: ${icon_size}'></a>`.repeat(
        pending
      );
      init_div.innerHTML += `<a class='${icon}' title='Activate' style='color: ${done_color}; font-size: ${icon_size}'></a>`.repeat(
        finished
      );

      element.style.borderColor = color;

      // Create click action
      init_div.addEventListener("click", async _ => {
        await data.combat.activateCombatant(c_id);
      });

      // This may be removed in a future update. It definitely needs a
      // clean-up.
      if (
        options.enable_initiative &&
        combatant.permission === ENTITY_PERMISSIONS.OWNER &&
        combatant.initiative === null
      ) {
        let init_button = document.createElement("a");
        init_button.classList.add("combatant-control");
        init_button.setAttribute("title", game.i18n.localize("COMBAT.InitiativeRoll"));
        init_button.setAttribute("data-control", "rollInitiative");
        init_button.innerHTML = `<i class="fas fa-dice-d20"></i>`;
        init_button.addEventListener("click", async e => app._onCombatantControl(e));
        const controls = element.getElementsByClassName("combatant-controls")[0];
        controls.insertAdjacentElement("afterbegin", init_button);
      }
    });
  }
}
