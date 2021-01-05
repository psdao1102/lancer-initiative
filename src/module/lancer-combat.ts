/**
 * Overrides and extends the Combat class to use an activation model instead of
 * the standard ordered list of turns. {@link LancerCombat#activateCombatant}
 * is added to the interface.
 * @extends {Combat}
 */
export class LancerCombat extends Combat {
  /** @override */
  _prepareCombatant(c: any, scene: Scene, players: any[], settings = {}) {
    c = super._prepareCombatant(c, scene, players, settings);

    // Populate activation data
    c.flags.activations = c.flags.activations ?? {};
    c.flags.activations.max = c.flags.activations.max ?? c.actor?.data.data?.activations ?? 1;
    c.flags.activations.value = c.flags.activations.value ?? 0;

    c.flags.dummy = c.flags.dummy ?? false;
    // Set an arbitrary initiative so that attempting to roll doesn't raise an
    // exception for the dummy.
    if (c.flags.dummy) {
      c.initiative = -1;
      c.visible = false;
    }

    return c;
  }

  /** @override */
  _sortCombatants(a: any, b: any) {
    if (a.flags.dummy) return -1;
    if (b.flags.dummy) return 1;
    // Sort by Players then Neutrals then Hostiles
    const dc = (b.token?.disposition ?? -2) - (a.token?.disposition ?? -2);
    if (dc !== 0) return dc;
    return super._sortCombatants(a, b);
  }

  /** @override */
  _onCreate(data: any, options: any, userId: string) {
    if (this.owner)
      this.createCombatant({
        "flags.dummy": true,
        hidden: true,
      });
    super._onCreate(data, options, userId);
  }

  /**
   * Set all combatants to their max activations
   * @public
   */
  async resetActivations() {
    let updates = this.combatants.map(c => {
      return {
        _id: c._id,
        "flags.activations.value": c.defeated ? 0 : c.flags.activations.max,
        "flags.activations.max": c.flags.activations.max,
      };
    });
    await this.updateCombatant(updates);
  }

  /** @override */
  async startCombat() {
    await this.resetActivations();
    return super.startCombat();
  }

  /** @override */
  async nextRound() {
    await this.resetActivations();
    return super.nextRound();
  }

  /** @override */
  async previousRound(): Promise<Combat> {
    await this.resetActivations();
    let turn = 0;
    const round = Math.max(this.round - 1, 0);
    let advanceTime = -1 * this.turn * CONFIG.time.turnTime;
    if (round > 0) advanceTime -= CONFIG.time.roundTime;
    return this.update({ round, turn }, { advanceTime }) as Promise<Combat>;
  }

  /** @override */
  async resetAll() {
    await this.resetActivations();
    return super.resetAll();
  }

  /**
   * Sets the active turn to the combatant passed by id or calls
   * {@link LancerCombat#requestActivation()} if the user does not have
   * permission to modify the combat
   */
  async activateCombatant(id: string) {
    if (!game.user.isGM) return this.requestActivation(id);
    let c = this.getCombatant(id);
    let val = c.flags.activations.value;
    if (val === 0) return this;
    await this.updateCombatant({
      _id: id,
      "flags.activations.value": val - 1,
    });
    const turn = this.turns.findIndex((t: any) => t._id === id);
    return this.update({ turn }) as Promise<this>;
  }

  /**
   * Calls any Hooks registered for "LancerCombatRequestActivate".
   * @protected
   */
  async requestActivation(id: string) {
    Hooks.callAll("LancerCombatRequestActivate", this, id);
    return this;
  }
}
