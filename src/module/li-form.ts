export class LIForm extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "Lancer Intiative",
      id: "lancer-initiative-settings",
      template: "modules/lancer-initiative/templates/lancer-initiative-settings.html",
      width: 350,
    });
  }

  /** @override */
  getData(_: any) {
    return mergeObject(
      CONFIG.LancerInitiative.def_appearance,
      game.settings.get(CONFIG.LancerInitiative.module, "appearance"),
      { inplace: false }
    );
  }

  /** @override */
  activateListeners(html: JQuery<HTMLElement>) {
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
  async _updateObject(_: Event | JQuery.Event, data: any) {
    game.settings.set(
      CONFIG.LancerInitiative.module,
      "appearance",
      diffObject(CONFIG.LancerInitiative.def_appearance, data, { inner: true })
    );
  }

  /**
   * Sets all settings handled by the form to undefined in order to revert to
   * their default values.
   */
  async resetSettings() {
    await game.settings.set(CONFIG.LancerInitiative.module, "appearance", {});
    return this.render();
  }
}
