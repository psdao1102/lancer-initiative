import { LancerCombatTracker } from "./lancer-combat-tracker.js";

declare global {
  interface FlagConfig {
    Combatant: {
      "lancer-initiative": {
        activations?: Activations;
        disposition?: number;
        dummy?: boolean;
      };
    };
  }
}

/**
 * Overrides and extends the Combat class to use an activation model instead of
 * the standard ordered list of turns. {@link LancerCombat#activateCombatant}
 * is added to the interface.
 */
export class LancerCombat extends Combat {
  /** @override */
  protected _sortCombatants(a: LancerCombatant, b: LancerCombatant): number {
    const module = LancerCombatTracker.trackerConfig.module;
    if (a.getFlag(<"lancer-initiative">module, "dummy") ?? false) return -1;
    if (b.getFlag(<"lancer-initiative">module, "dummy") ?? false) return 1;
    // Sort by Players then Neutrals then Hostiles
    const dc = b.disposition - a.disposition;
    if (dc !== 0) return dc;
    return super._sortCombatants(a, b);
  }

  /** @override */
  protected async _preCreate(
    data: Parameters<Combat["_preCreate"]>[0],
    options: Parameters<Combat["_preCreate"]>[1],
    user: foundry.documents.BaseUser
  ): Promise<void> {
    const module = LancerCombatTracker.trackerConfig.module;
    const dummy = new CONFIG.Combatant.documentClass(
      {
        flags: { [<"lancer-initiative">module]: { dummy: true, activations: { max: 0 } } },
        hidden: true,
      },
      { parent: this }
    );
    const combatants = this.combatants.map(c => c.toObject());
    combatants.push(dummy.toObject());
    this.data.update({ combatants });
    return super._preCreate(data, options, user);
  }

  /**
   * Set all combatants to their max activations
   */
  async resetActivations(): Promise<LancerCombatant[]> {
    const module = LancerCombatTracker.trackerConfig.module;
    const updates = this.combatants.map(c => {
      return {
        _id: c.id,
        [`flags.${module}.activations.value`]:
          this.settings.skipDefeated &&
          (c.data.defeated ||
            !!c.actor?.effects.find(
              e => e.getFlag("core", "statusId") === CONFIG.Combat.defeatedStatusId
            ))
            ? 0
            : c.activations.max ?? 0,
      };
    });
    return <Promise<LancerCombatant[]>>this.updateEmbeddedDocuments("Combatant", updates);
  }

  /** @override */
  async startCombat(): Promise<this | undefined> {
    await this.resetActivations();
    return super.startCombat();
  }

  /** @override */
  async nextRound(): Promise<this | undefined> {
    await this.resetActivations();
    return super.nextRound();
  }

  /** @override */
  async previousRound(): Promise<this | undefined> {
    await this.resetActivations();
    const round = Math.max(this.round - 1, 0);
    let advanceTime = 0;
    if (round > 0) advanceTime -= CONFIG.time.roundTime;
    // @ts-ignore jtfc advanceTime is fucking used in foundry.js
    return this.update({ round, turn: 0 }, { advanceTime });
  }

  /** @override */
  async resetAll(): Promise<this | undefined> {
    await this.resetActivations();
    return super.resetAll();
  }

  /**
   * Sets the active turn to the combatant passed by id or calls
   * {@link LancerCombat#requestActivation()} if the user does not have
   * permission to modify the combat
   */
  async activateCombatant(id: string): Promise<this | undefined> {
    if (!game.user?.isGM) return this.requestActivation(id);
    const combatant: LancerCombatant | undefined = <LancerCombatant | undefined>(
      this.getEmbeddedDocument("Combatant", id)
    );
    if (!combatant?.activations.value) return this;
    await combatant?.modifyCurrentActivations(-1);
    const turn = this.turns.findIndex(t => t.id === id);
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

export class LancerCombatant extends Combatant {
  /**
   * This just fixes a bug in foundry 0.8.x that prevents Combatants with no
   * associated token or actor from being modified, even by the GM
   * @override
   */
  testUserPermission(
    user: User,
    permission: keyof typeof foundry.CONST.ENTITY_PERMISSIONS | foundry.CONST.EntityPermission,
    options?: { exact?: boolean }
  ): boolean {
    return this.actor?.testUserPermission(user, permission, options) ?? user.isGM;
  }

  /** @override */
  prepareDerivedData(): void {
    super.prepareDerivedData();
    const module = LancerCombatTracker.trackerConfig.module;
    if (this.data.flags?.[<"lancer-initiative">module]?.activations?.max === undefined) {
      this.data.update({
        [`flags.${module}.activations`]: {
          max:
            foundry.utils.getProperty(
              this.actor?.getRollData() ?? {},
              <string>game.settings.get(module, "combat-tracker-activation-path")
            ) ?? 1,
        },
      });
    }
  }

  /** @override */
  get isVisible(): boolean {
    const module = LancerCombatTracker.trackerConfig.module;
    if (this.getFlag(module, "dummy") ?? false) return false;
    return super.isVisible;
  }

  /**
   * The current activation data for the combatant.
   */
  get activations(): Activations {
    const module = LancerCombatTracker.trackerConfig.module;
    return <Activations | undefined>this.getFlag(module, "activations") ?? {};
  }

  /**
   * The disposition for this combatant. In order, manually specified for this
   * combatant, token dispostion, token disposition for the associated actor,
   * -2.
   */
  get disposition(): number {
    const module = LancerCombatTracker.trackerConfig.module;
    return (
      <number | undefined>this.getFlag(module, "disposition") ??
      (this.actor?.hasPlayerOwner ?? false
        ? 2
        : this.token?.data.disposition ?? this.actor?.data.token.disposition ?? -2)
    );
  }

  /**
   * Adjusts the number of activations that a combatant can take
   * @param num - The number of maximum activations to add (can be negative)
   */
  async addActivations(num: number): Promise<this | undefined> {
    const module = LancerCombatTracker.trackerConfig.module;
    if (num === 0) return this;
    return this.update({
      [`flags.${module}.activations`]: {
        max: Math.max((this.activations.max ?? 1) + num, 1),
        value: Math.max((this.activations.value ?? 0) + num, 0),
      },
    });
  }

  /**
   * Adjusts the number of current activations that a combatant has
   * @param num - The number of current activations to add (can be negative)
   */
  async modifyCurrentActivations(num: number): Promise<this | undefined> {
    const module = LancerCombatTracker.trackerConfig.module;
    if (num === 0) return this;
    return this.update({
      [`flags.${module}.activations`]: {
        value: Math.clamped((this.activations?.value ?? 0) + num, 0, this.activations?.max ?? 1),
      },
    });
  }
}

/**
 * Interface for the activations object
 */
export interface Activations {
  max?: number;
  value?: number;
}
