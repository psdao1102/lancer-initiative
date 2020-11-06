class LancerInitiative {
    static async setup() {
        console.log(
            "lancer-initiative | Initializing LANCER Initiative Module"
        );

        await LancerInitiative.registerSettings();

        Combat.prototype._sortCombatants = LancerInitiative.sortCombatants;
        CombatTracker.prototype._getEntryContextOptions =
            LancerInitiative.getEntryContextOptions;

        CONFIG.Combat.initiative = {
            formula: null
        };
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
        if ( a.token === null ) return -1;
        if ( b.token === null ) return 1;

        // Move inactive to the bottom
        if ( game.settings.get("lancer-initiative", "act-sort-last") ) {
            const act_a = game.combat.getFlag("lancer-initiative", a._id)?.acted;
            const act_b = game.combat.getFlag("lancer-initiative", b._id)?.acted;
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
        return [
            { // TODO: Read from actor data and set the flag accordingly
                name: "Add Activation",
                icon: '<i class="cci cci-activate"></i>',
                callback:  async (li) => {
                    const combatant = this.combat.getCombatant(li.data('combatant-id'));
                    await this.combat.createCombatant(combatant);
                }
            },
            {
                name: "Undo Activation",
                icon: '<i class="fas fa-edit"></i>',
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

    static handleUpdateCombat(combat, changed, options, userId) {
        if ("round" in changed) {
            combat.combatants.map(c =>
                combat.setFlag("lancer-initiative", c._id, { acted: c?.defeated ? true : false })
            );
            if (combat.combatants?.filter(c => c.token === null).length === 0) {
                combat.createCombatant({ name: "DUMMY" });
            }
        }
    }
}

Hooks.on("init", LancerInitiative.setup);

Hooks.on("updateCombat", LancerInitiative.handleUpdateCombat);

Hooks.on("renderCombatTracker", async (app, html, data) => {
    html.find(".combatant").each((i, element) => {
        const c_id = element.dataset.combatantId;
        const combatant = data.combat.data.combatants.find(c => c._id === c_id);

        if ( combatant.token === null) {
            element.style.display = "none";
            return;
        }

        const init_div = element.getElementsByClassName("token-initiative")[0];

        let color = "#ffffff";
        if (data.combat.getFlag("lancer-initiative", c_id)?.acted) {
            color = game.settings.get("lancer-initiative", "xx-col");
        } else {
            switch (combatant.token.disposition) {
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
                    console.log("Bad disposition");
                    // error or something
            }
        }
        // TODO: Configurable icon
        init_div.innerHTML = `<a class='cci cci-activate' title='Activate' style='color: ${color}; font-size: x-large;'></a>`;

        init_div.addEventListener("click", async e => {
            if (data.combat.getFlag("lancer-initiative", c_id)?.acted) { return; }
            await data.combat.setFlag("lancer-initiative", c_id, { acted: true });
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

