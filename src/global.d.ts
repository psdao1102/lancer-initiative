import { LancerCombatTracker } from "./module/lancer-combat-tracker";

declare global {
  namespace ClientSettings {
    interface Values {
      "lancer-initiative.combat-tracker-appearance": Partial<typeof LancerCombatTracker.appearance>;
      "lancer-initiative.combat-tracker-sort": boolean;
      "lancer-initiative.combat-tracker-enable-initiative": boolean;
    }
  }

  export class Combatant {
    data: object;
    get actor(): Actor | null;
    testUserPermission(user: User, permission: string, options?: unknown): boolean;

    protected _onCreate(data: Record<string, any>, options: unknown, user: User): void;
    protected _preCreate(data: Record<string, any>, options: unknown, user: User): Promise<void>;

    setFlag(scope: string, key: string, value: unknown): Promise<this>;
    getFlag(scope: string, key: string): any;

    prepareBaseData(): void;
    prepareDerivedData(): void;
  }
}
