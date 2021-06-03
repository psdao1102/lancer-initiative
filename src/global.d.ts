import { LancerCombatTracker } from "./module/lancer-combat-tracker";

declare global {
  namespace ClientSettings {
    interface Values {
      "lancer-initiative.combat-tracker-appearance": Partial<typeof LancerCombatTracker.appearance>;
      "lancer-initiative.combat-tracker-sort": boolean;
      "lancer-initiative.combat-tracker-enable-initiative": boolean;
    }
  }
}
