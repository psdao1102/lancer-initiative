/**
 * Overrides and extends the Combat class to use an activation model instead of
 * the standard ordered list of turns. {@link LancerCombat#activateCombatant}
 * is added to the interface.
 */
export class LancerCombat extends Combat {
  /** @override */
  _prepareCombatant(
    c: Combat.Combatant,
    scene: Scene,
    players: User[],
    settings: unknown = {}
  ): Combat.Combatant {
    super._prepareCombatant(c, scene, players, settings);
    c = super._prepareCombatant(c, scene, players, settings);

    // Populate activation data
    c.flags.activations = c.flags.activations ?? {};
    if (!isActivations(c.flags.activations))
      throw new Error("Assertion failed for c.flags.activations");
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
  protected _sortCombatants(a: Combat.Combatant, b: Combat.Combatant): number {
    if (a.flags.dummy) return -1;
    if (b.flags.dummy) return 1;
    // Sort by Players then Neutrals then Hostiles
    const dc = (b.token?.disposition ?? -2) - (a.token?.disposition ?? -2);
    if (dc !== 0) return dc;
    return super._sortCombatants(a, b);
  }

  /** @override */
  protected _onCreate(data: Combat.Data, options: Entity.CreateOptions, userId: string): void {
    if (this.owner)
      this.createCombatant({
        flags: { dummy: true },
        hidden: true,
      });
    super._onCreate(data, options, userId);
  }

  /**
   * Set all combatants to their max activations
   */
  async resetActivations(): Promise<void> {
    const updates = this.combatants.map(c => {
      if (!isActivations(c.flags?.activations))
        throw new Error("Assertion failed for c.flags.activations");
      return {
        _id: c._id,
        flags: {
          activations: {
            value: c.defeated ? 0 : c.flags?.activations.max ?? 0,
            max: c.flags?.activations.max ?? 0,
          },
        },
      };
    });
    // @ts-ignore
    await this.updateCombatant(updates);
  }

  /** @override */
  async startCombat(): Promise<this> {
    await this.resetActivations();
    return super.startCombat();
  }

  /** @override */
  async nextRound(): Promise<void> {
    await this.resetActivations();
    return super.nextRound();
  }

  /** @override */
  async previousRound(): Promise<this> {
    await this.resetActivations();
    const round = Math.max(this.round - 1, 0);
    let advanceTime = 0;
    if (round > 0) advanceTime -= CONFIG.time.roundTime;
    return this.update({ round, turn: 0 }, { advanceTime });
  }

  /** @override */
  async resetAll(): Promise<this> {
    await this.resetActivations();
    return super.resetAll();
  }

  /**
   * Sets the active turn to the combatant passed by id or calls
   * {@link LancerCombat#requestActivation()} if the user does not have
   * permission to modify the combat
   */
  async activateCombatant(id: string): Promise<this> {
    if (!game.user?.isGM) return this.requestActivation(id);
    const c = this.getCombatant(id);
    if (!isActivations(c.flags.activations))
      throw new Error("Assertion failed for c.flags.activations");
    const val = c.flags.activations.value;
    if (val === 0 || val === undefined) return this;
    await this.updateCombatant({
      _id: id,
      flags: { "activations.value": val - 1 },
    });
    const turn = this.turns.findIndex(t => t._id === id);
    return this.update({ turn });
  }

  /**
   * Calls any Hooks registered for "LancerCombatRequestActivate".
   */
  protected async requestActivation(id: string): Promise<this> {
    Hooks.callAll("LancerCombatRequestActivate", this, id);
    return this;
  }
}

/**
 * Interface for the activations object
 */
export interface Activations {
  max?: number;
  value?: number;
}

/**
 * Typeguard for activations flag of combatants
 */
export function isActivations(
  v: any // eslint-disable-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
  // eslint hates typeguards
): v is Activations {
  return (
    typeof v === "object" &&
    (typeof v.max === "undefined" || typeof v.max === "number") &&
    (typeof v.value === "undefined" || typeof v.value === "number")
  );
}
