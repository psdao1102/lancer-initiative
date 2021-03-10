import { LancerCombatTracker } from "./lancer-combat-tracker.js";
type Appearance = typeof LancerCombatTracker.config['def_appearance']

/**
 * Settings form for customizing the icon appearance of the icon used in the
 * tracker
 */
export class LIForm extends FormApplication<Appearance> {
  /** @override */
  static get defaultOptions(): FormApplication.Options {
    return {
      ...super.defaultOptions,
      title: "Lancer Intiative",
      id: "lancer-initiative-settings",
      template: "modules/lancer-initiative/templates/lancer-initiative-settings.html",
      width: 350,
    }
  }

  /** @override */
  getData(): Appearance {
    const LI = LancerCombatTracker.config;
    return {
      ...LI.def_appearance,
      ...game.settings.get(LI.module, "appearance") as Appearance,
    };
  }

  /** @override */
  activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);

    //update the preview icon
    html.find('input[name="icon"]').on("change", e => {
      html
        .find("a.preview")
        .removeClass()
        .addClass($(e.target).val() + " preview");
    });

    // Update the preview icon size
    html.find('input[name="icon_size"]').on("change", e => {
      html.find("a.preview").css("font-size", $(e.target).val() + "rem");
    });

    // Set the preview icon color to the last hovered color picker
    html.find('input[type="color"]').on("mouseenter mouseleave", e => {
      html.find("a.preview").css("color", $(e.target).val() as string);
      if ($(e.target).attr("name") === "done_selector") return;
      html.find("li.combatant").css("border-color", $(e.target).val() as string);
    });

    html.find('button[name="reset"]').on("click", this.resetSettings.bind(this));
  }

  /** @override */
  async _updateObject(_: Event, data: Record<string, unknown>): Promise<void> {
    const LI = LancerCombatTracker.config;
    game.settings.set(
      LI.module,
      "appearance",
      diffObject(LI.def_appearance, data, { inner: true })
    );
  }

  /**
   * Sets all settings handled by the form to undefined in order to revert to
   * their default values.
   */
  async resetSettings(): Promise<unknown> {
    const LI = LancerCombatTracker.config;
    await game.settings.set(LI.module, "appearance", {});
    return this.render();
  }
}
