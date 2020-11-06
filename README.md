LANCER Initiative
=================

A very hacky implementation of LANCER's initiative system for Foundry VTT. LANCER Initiative makes the following changes to the Foundry VTT turn tracker:

 * Sorts the initiative tracker by token disposition and then token name. The order is players, then neutrals, then hostiles. Setting the initiative for an entry can change the sort order from within the category. Sorting is from high to low.
 * Replaces the Roll Initiative button and initiative display with an activation button. Clicking the button will set the current initiative to that token. Buttons are color coded by faction and greyed out for tokens that have already acted.
 * Adds an Add Activation button to the right-click menu to support tokens with multiple activations such as Ultra templated NPCs.
 * Optionally moves activated units to the bottom of the tracker.

![Screenshot](https://github.com/BoltsJ/lancer-initiative/blob/default/screenshot.png?raw=true)

Installation
------------

Paste the following url into the install module dialog in Foundry VTT: https://github.com/BoltsJ/lancer-initiative/releases/latest/download/module.json

Known issues
------------

 * Not all initiative modules handle the empty combatant this module adds correctly.
 * Duplicates aren't all simultaneously marked defeated.

<!-- TODO: Remaining actions instead of multiple entries -->
