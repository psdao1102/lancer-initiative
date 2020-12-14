export class LIForm extends FormApplication {
  /* @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "Lancer Intiative",
      id: "lancer-initiative-settings",
      template: "modules/lancer-initiative/templates/lancer-initiative-settings.html",
      width: 420,
    });
  }

  /* override */
  getData(_) {
    return {
      "player": game.settings.get("lancer-initiative", "pc-col"),
      "neutral": game.settings.get("lancer-initiative", "nu-col"),
      "enemy": game.settings.get("lancer-initiative", "en-col"),
      "done": game.settings.get("lancer-initiative", "xx-col"),
      icon: game.settings.get("lancer-initiative", "icon"),
      "icon-size": game.settings.get("lancer-initiative", "icon-size"),
    };
  }

  /* @override */
  activateListeners(html) {
    super.activateListeners(html);

    //update the preview icon
    html.find('input[name="icon"]').change(e => {
      html.find("a.preview").each((_, i) => (i.classList = e.target.value + " preview"));
    });

    // Update the preview icon size
    html.find('input[name="icon-size"]').change(e => {
      html.find("a.preview").each((_, i) => {
        i.style.fontSize = e.target.value + "rem";
      });
    });

    // Set the preview icon color to the last hovered color picker
    html.find('input[type="color"]').hover(e => {
      html.find("a.preview").each((_, i) => {
        i.style.color = e.target.value;
      });
    });

    html.find('button[name="reset"]').click(this.resetSettings.bind(this));
  }

  /* @override */
  _updateObject(_, data) {
    game.settings.set("lancer-initiative", "pc-col", data["player"]);
    game.settings.set("lancer-initiative", "nu-col", data["neutral"]);
    game.settings.set("lancer-initiative", "en-col", data["enemy"]);
    game.settings.set("lancer-initiative", "xx-col", data["done"]);
    game.settings.set("lancer-initiative", "icon", data["icon"]);
    game.settings.set("lancer-initiative", "icon-size", data["icon-size"]);
  }

  /**
   * Sets all settings handled by the form to undefined in order to revert to
   * their default values.
   * @return {Promise.<HTMLElement>} the promise returned by super.render();
   */
  async resetSettings() {
    await game.settings.set("lancer-initiative", "pc-col");
    await game.settings.set("lancer-initiative", "nu-col");
    await game.settings.set("lancer-initiative", "en-col");
    await game.settings.set("lancer-initiative", "xx-col");
    await game.settings.set("lancer-initiative", "icon");
    await game.settings.set("lancer-initiative", "icon-size");
    return this.render();
  }
}
