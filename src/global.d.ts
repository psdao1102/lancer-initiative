import { LancerCombatTracker } from "./module/lancer-combat-tracker";

declare global {
 interface LenientGlobalVariableTypes {
   game: never;
 }

  namespace ClientSettings {
    interface Values {
      "lancer-initiative.combat-tracker-appearance": Partial<
        typeof LancerCombatTracker.trackerAppearance
      >;
      "lancer-initiative.combat-tracker-sort": boolean;
      "lancer-initiative.combat-tracker-enable-initiative": boolean;
    }
  }
}
