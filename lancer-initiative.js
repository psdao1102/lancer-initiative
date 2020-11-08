class LancerInitiative {
    static async setup() {
        console.log(
            "lancer-initiative | Initializing LANCER Initiative Module"
        );

        await LancerInitiative.registerSettings();

        Combat.prototype._sortCombatants = LancerInitiative.sortCombatants;
        CombatTracker.prototype._getEntryContextOptions =
            LancerInitiative.getEntryContextOptions;

        CONFIG.Combat.initiative = { formula: null };
    }

    static registerSettings() {
        game.settings.register("lancer-initiative", "pc-col", {
            name: "Player button color",
            hint: "Default: $44abe0",
            scope: "world",
            config: true,
            type: String,
            default: "#44abe0"
        });
        game.settings.register("lancer-initiative", "nu-col", {
            name: "Neutral button color",
            hint: "Default: #146464",
            scope: "world",
            config: true,
            type: String,
            default: "#146464"
        });
        game.settings.register("lancer-initiative", "en-col", {
            name: "Enemy button color",
            hint: "Default: #d98f30",
            scope: "world",
            config: true,
            type: String,
            default: "#d98f30"
        });
        game.settings.register("lancer-initiative", "xx-col", {
            name: "Inactive button color",
            hint: "Default: #444444",
            scope: "world",
            config: true,
            type: String,
            default: "#444444"
        });
        game.settings.register("lancer-initiative", "act-sort-last", {
            name: "Activated units last",
            hint: "Moves units that have activated to the end of the tracker",
            scope: "world",
            config: true,
            type: Boolean,
            default: false
        });
    }

    static sortCombatants(a, b) {
        //DUMMYs first ;)
        if ( a.flags?.dummy === true ) return -1;
        if ( b.flags?.dummy === true ) return 1;

        // Move inactive to the bottom
        if ( game.settings.get("lancer-initiative", "act-sort-last") ) {
            const act_a = a.flags.activations?.value === 0;
            const act_b = b.flags.activations?.value === 0;
            const act_c = act_a - act_b;
            if ( act_c !==0 ) return act_c;
        }
        // Sort by Players then Neutrals then Hostiles
        const dc = b.token.disposition - a.token.disposition;
        if ( dc !== 0 ) return dc;
        // Reverse initiative sorting; the rest is default foundry
        const ia = Number.isNumeric(a.initiative) ? a.initiative : 9999;
        const ib = Number.isNumeric(b.initiative) ? b.initiative : 9999;
        let ci = ia - ib;
        if ( ci !== 0 ) return ci;
        let [an, bn] = [a.token?.name || "", b.token?.name || ""];
        let cn = an.localeCompare(bn);
        if ( cn !== 0 ) return cn;
        return a.tokenId - b.tokenId;
    }

    static getEntryContextOptions() {
        return [ // TODO: Fix these to work for the new data setting
            {
                name: "Add Activation",
                icon: '<i class="cci cci-activate"></i>',
                callback:  async (li) => {
                    const combatant = this.combat.getCombatant(li.data('combatant-id'));
                    await this.combat.createCombatant(combatant);
                }
            },
            {
                name: "Undo Activation",
                icon: '<i class="fas fa-undo"></i>',
                callback: li => this.combat.setFlag("lancer-initiative", li.data('combatant-id'), { acted: false })
            },
            {
                name: "COMBAT.CombatantUpdate",
                icon: '<i class="fas fa-edit"></i>',
                callback: this._onConfigureCombatant.bind(this)
            },
            {
                name: "COMBAT.CombatantRemove",
                icon: '<i class="fas fa-skull"></i>',
                callback: li => this.combat.deleteCombatant(li.data('combatant-id'))
            }
        ];
    }

    static handleCreateCombat(combat, options, userId) {
        if (game.user.isGM) combat.createCombatant({
            name: "DUMMY",
            flags: { dummy: true }
        });
    }

    static handleUpdateCombat(combat, changed, options, userId) {
        if (! game.user.isGM ) return;
        if ("round" in changed) {
            combat.combatants.map(c =>
                combat.updateCombatant({
                    _id: c._id,
                    "flags.activations.value": c.flags.activations?.max
                })
            );
        }
    }

    static handleCreateCombatant(combat, combatant, options, userId) {
        if (combatant.tokenId === undefined) return;
        // AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
        let a = canvas.tokens.get(combatant.tokenId).actor.data.data?.activations;
        combat.updateCombatant({
            _id: combatant._id,
            flags: {
                activations: {
                    value: 0,
                    max: a === undefined ? 1 : a
                }
            }
        });
    }
}

Hooks.on("init", LancerInitiative.setup);

Hooks.on("createCombat", LancerInitiative.handleCreateCombat);
Hooks.on("updateCombat", LancerInitiative.handleUpdateCombat);
Hooks.on("createCombatant", LancerInitiative.handleCreateCombatant);

Hooks.on("renderCombatTracker", async (app, html, data) => {
    html.find(".combatant").each((i, element) => {
        const c_id = element.dataset.combatantId;
        const combatant = data.combat.combatants.find(c => c._id === c_id);

        if ( combatant.flags?.dummy === true) {
            element.style.display = "none";
            return;
        }

        const init_div = element.getElementsByClassName("token-initiative")[0];

        let color = "#00000000"
        let done_color = game.settings.get("lancer-initiative", "xx-col");
        switch (combatant.token?.disposition) {
            case 1: // Player
                color = game.settings.get("lancer-initiative", "pc-col");
                break;
            case 0: // Neutral
                color = game.settings.get("lancer-initiative", "nu-col");
                break;
            case -1: // Hostile
                color = game.settings.get("lancer-initiative", "en-col");
                break;
            default:
        }
        let pending = combatant.flags.activations?.value;
        if ( pending === undefined ) return;
        let finished = combatant.flags.activations.max - pending;
        // TODO: Configurable icon
        init_div.innerHTML = `<a class='cci cci-activate' title='Activate' style='color: ${color}; font-size: x-large;'></a>`.repeat(pending);
        init_div.innerHTML += `<a class='cci cci-activate' title='Activate' style='color: ${done_color}; font-size: x-large;'></a>`.repeat(finished);

        init_div.addEventListener("click", async e => {
            let val = combatant.flags.activations.value
            if (val === 0) return;
            await data.combat.updateCombatant({
                _id: combatant._id,
                "flags.activations.value": val-1
            });
            const turn = data.combat.turns.findIndex(t => t._id === c_id);
            await data.combat.update({ turn: turn });
        });
    });

    html.find(".combat-control").each((i, e) => {
        if (e.dataset.control === "previousTurn" || e.dataset.control === "nextTurn") {
            e.style.display = "none";
        }
    });
});

