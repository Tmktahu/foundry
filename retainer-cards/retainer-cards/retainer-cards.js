// Retainer Card
// @author Fryke#0746
// @version 1.0.0
import { DND5E } from "../../systems/dnd5e/module/config.js";
import { Dice5e } from "../../systems/dnd5e/module/dice.js";
import { Actor5e } from "../../systems/dnd5e/module/actor/entity.js";
import { ActorSheet5eCharacter } from "../../systems/dnd5e/module/actor/sheets/character.js";
import { Item5e } from "../../systems/dnd5e/module/item/entity.js";
import { ItemSheet5e } from "../../systems/dnd5e/module/item/sheet.js";

/* Currently disabled so as not to break Better Rolls, Magic Items, etc
import { BetterRollsHooks } from "../../modules/betterrolls5e/scripts/hooks.js";
BetterRollsHooks.addItemSheet("AltItemSheet5e");
export class AltItemSheet5e extends ItemSheet5e {
	static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
			classes: ["alt5e", "dnd5e", "sheet", "item"],
      resizable: true
    });
  }

	setPosition (...args) {
		return Application.prototype.setPosition.call(this, ...args);
	}
}
*/

export class RetainerCard extends ActorSheet5eCharacter {
	get template() {
		if ( !game.user.isGM && this.actor.limited && game.settings.get("alt5e", "useExpandedSheet")) return "modules/alt5e/templates/expanded-limited-sheet.html";
		if ( !game.user.isGM && this.actor.limited ) return "modules/alt5e/templates/limited-sheet.html";
		return "modules/alt5e/templates/alt5e-sheet.html";
	}

	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
			classes: ["retainer-cards", "dnd5e", "sheet", "actor", "character"],
			blockFavTab: true,
			width: 800
		});
	}

	async _render(force = false, options = {}) {
		this.saveScrollPos();
		await super._render(force, options);
		this.setScrollPos();
	}

	saveScrollPos() {
		if (this.form === null) return;
		const html = $(this.form);
		this.scrollPos = {
			top: html.scrollTop(),
			left: html.scrollLeft()
		}
	}

	setScrollPos() {
		if (this.form === null || this.scrollPos === undefined) return;
		const html = $(this.form);
		html.scrollTop(this.scrollPos.top);
		html.scrollLeft(this.scrollPos.left);
	}

	_createEditor(target, editorOptions, initialContent) {
		editorOptions.min_height = 200;
		super._createEditor(target, editorOptions, initialContent);
	}

	activateListeners(html) {
		super.activateListeners(html);

		// Add Rollable CSS Class to Languages
		html.find('[for="data.traits.languages"]').addClass("rollable");

		// Send Languages to Chat onClick
		html.find('[for="data.traits.languages"]').click(event => {
			event.preventDefault();
			let langs = this.actor.data.data.traits.languages.value.map(l => DND5E.languages[l] || l).join(", ");
			let custom = this.actor.data.data.traits.languages.custom;
			if (custom) langs += ", " + custom.replace(/;/g, ",");
			let content = `
				<div class="dnd5e chat-card item-card" data-acor-id="${this.actor._id}">
					<header class="card-header flexrow">
						<img src="${this.actor.data.token.img}" title="" width="36" height="36" style="border: none;"/>
						<h3>Known Languages</h3>
					</header>
					<div class="card-content">${langs}</div>
				</div>
			`;

			// Send to Chat
			let rollWhisper = null;
			let rollBlind = false;
			let rollMode = game.settings.get("core", "rollMode");
			if (["gmroll", "blindroll"].includes(rollMode)) rollWhisper = ChatMessage.getWhisperIDs("GM");
			if (rollMode === "blindroll") rollBlind = true;
			ChatMessage.create({
				user: game.user._id,
				content: content,
				speaker: {
					actor: this.actor._id,
					token: this.actor.token,
					alias: this.actor.name
				},
				type: CONST.CHAT_MESSAGE_TYPES.OTHER
			});
		});

		// Item Delete Confirmation
		html.find('.item-delete').off("click");
		html.find('.item-delete').click(event => {
			let li = $(event.currentTarget).parents('.item');
			let itemId = li.attr("data-item-id");
			let item = this.actor.getOwnedItem(itemId);
			new Dialog({
				title: `Deleting ${item.data.name}`,
				content: `<p>Are you sure you want to delete ${item.data.name}?</p>`,
				buttons: {
					Yes: {
						icon: '<i class="fa fa-check"></i>',
						label: 'Yes',
						callback: dlg => {
							this.actor.deleteOwnedItem(itemId);
						}
					},
					cancel: {
						icon: '<i class="fas fa-times"></i>',
						label: 'No'
					},
				},
				default: 'cancel'
			}).render(true);
		});
	}
}

async function injectPassives(app, html, data) {
	// let observant = (data.actor.items.some( i => i.name.toLowerCase() === "observant")) ? 5 : 0;
	let sentinel_shield = (data.actor.items.some( i => i.name.toLowerCase() === "sentinel shield" && i.data.equipped)) ? 5 : 0;
	let passivesTarget = html.find('input[name="data.traits.senses"]').parent();
	let passives = "";
	let tagStyle = "text-align: center; min-width: unset; font-size: 13px;";
	if (game.settings.get("alt5e", "showPassiveInsight")) {
		let passiveInsight = data.data.skills.ins.passive;
		passives += `
			<div class="form-group">
				<label>Passive Insight</label>
				<ul class="traits-list">
					<li class="tag" style="${tagStyle}">${passiveInsight}</li>
				</ul>
			</div>
		`;
	};
	if (game.settings.get("alt5e", "showPassiveInvestigation")) {
		let passiveInvestigation = data.data.skills.inv.passive;
		passives += `
			<div class="form-group">
				<label>Passive Investigation</label>
				<ul class="traits-list">
					<li class="tag" style="${tagStyle}">${passiveInvestigation}</li>
				</ul>
			</div>
		`;
	};
	if (game.settings.get("alt5e", "showPassivePerception")) {
		let actor = game.actors.entities.find(a => a.data._id === data.actor._id);
		let observant = (actor.data.flags.dnd5e.observantFeat) ? 5 : 0;
		let passivePerception = 10 + data.data.skills.prc.mod + observant + sentinel_shield;
		mergeObject(actor, { "data.data.skills.prc.passive": passivePerception });
		passives += `
			<div class="form-group">
				<label>Passive Perception</label>
				<ul class="traits-list">
					<li class="tag" style="${tagStyle}">${passivePerception}</li>
				</ul>
			</div>
		`;
	};
	if (game.settings.get("alt5e", "showPassiveStealth")) {
		let passiveStealth = data.data.skills.ste.passive;
		passives += `
			<div class="form-group">
				<label>Passive Stealth</label>
				<ul class="traits-list">
					<li class="tag" style="${tagStyle}">${passiveStealth}</li>
				</ul>
			</div>
		`;
	};
	passivesTarget.after(passives);
}

Actors.registerSheet("dnd5e", RetainerCard, {
	types: ["character"],
	makeDefault: false
});

//Items.registerSheet("dnd5e", AltItemSheet5e, {
//	makeDefault: false
//});

Hooks.on("renderRetainerCard", (app, html, data) => {
	//injectPassives(app, html, data);
	console.log("Hook triggered on renderRetainerCard:", {app, html, data})
});

Hooks.once("ready", () => {
	/*game.settings.register("alt5e", "showPassiveStealth", {
		name: "Show Passive Stealth",
		hint: "Show the passive stealth score in Traits.",
		scope: "world",
		config: true,
		default: false,
		type: Boolean
	});*/
});
