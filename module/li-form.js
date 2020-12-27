export class LIForm extends FormApplication {
  /* @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "Lancer Intiative",
      id: "lancer-initiative-settings",
      template: "modules/lancer-initiative/templates/lancer-initiative-settings.html",
      width: 350,
    });
  }

  /* override */
  getData(_) {
    return mergeObject(
      CONFIG.LancerInitiative.def_appearance,
      game.settings.get(CONFIG.LancerInitiative.module, "appearance"),
      { inplace: false }
    );
  }

  /* @override */
  activateListeners(html) {
    super.activateListeners(html);

    //update the preview icon
    html.find('input[name="icon"]').change(e => {
      html.find("a.preview").each((_, i) => (i.classList = e.target.value + " preview"));
    });

    // Update the preview icon size
    html.find('input[name="icon_size"]').change(e => {
      html.find("a.preview").each((_, i) => {
        i.style.fontSize = e.target.value + "rem";
      });
    });

    // Set the preview icon color to the last hovered color picker
    html.find('input[type="color"]').hover(e => {
      html.find("a.preview").each((_, i) => {
        i.style.color = e.target.value;
      });
      if (e.target.name === "done_selector") return;
      html.find("li.combatant").each((_, i) => {
        i.style.borderColor = e.target.value;
      });
    });

    html.find('button[name="reset"]').click(this.resetSettings.bind(this));
  }

  /* @override */
  _updateObject(_, data) {
    game.settings.set(
      CONFIG.LancerInitiative.module,
      "appearance",
      diffObject(CONFIG.LancerInitiative.def_appearance, data, { inner: true })
    );
  }

  /**
   * Sets all settings handled by the form to undefined in order to revert to
   * their default values.
   * @return {Promise.<HTMLElement>} the promise returned by super.render();
   */
  async resetSettings() {
    await game.settings.set(CONFIG.LancerInitiative.module, "appearance", {});
    return this.render();
  }
}
