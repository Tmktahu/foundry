// Retainer Card
// @author Fryke#0746
// @version 1.0.0
import { DND5E } from "../../systems/dnd5e/module/config.js";
import ActorSheet5eCharacter from "../../systems/dnd5e/module/actor/sheets/character.js";


Hooks.once('init', async function () {
  console.log('retainer-cards | Initializing retainer-cards');
  game.dnd5e.entities.Actor5e.prototype._prepareCharacterData = function(actorData) {
		const data = actorData.data;

	  // Determine character level and available hit dice based on owned Class items
	  const [level, hd] = actorData.items.reduce((arr, item) => {
	    if ( item.type === "class" ) {
	      const classLevels = parseInt(item.data.levels) || 1;
	      arr[0] += classLevels;
	      arr[1] += classLevels - (parseInt(item.data.hitDiceUsed) || 0);
	    }
	    return arr;
	  }, [0, 0]);
	  data.details.level = level;
	  data.attributes.hd = hd;

	  // Character proficiency bonus
	  if(!actorData.flags.core || !actorData.flags.core.sheetClass == "dnd5e.RetainerCard") {
	  	data.attributes.prof = Math.floor((level + 7) / 4);
		} else {
			data.attributes.prof = Math.floor((parseInt(data.details.retainerlevel) + 1) / 2);
		}

	  // Experience required for next level
	  const xp = data.details.xp;
	  xp.max = this.getLevelExp(level || 1);
	  const prior = this.getLevelExp(level - 1 || 0);
	  const required = xp.max - prior;
	  const pct = Math.round((xp.value - prior) * 100 / required);
	  xp.pct = Math.clamped(pct, 0, 100);
	}
});




export class RetainerCard extends ActorSheet5eCharacter {
	get template() {
		//if ( !game.user.isGM && this.actor.limited && game.settings.get("alt5e", "useExpandedSheet")) return "modules/alt5e/templates/expanded-limited-sheet.html";
		//if ( !game.user.isGM && this.actor.limited ) return "modules/alt5e/templates/limited-sheet.html";
		return "modules/retainer-cards/templates/retainer-card.html";
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

		html.find('#retainer-sigattack-roll').click(async (event) => {
			await setupSigAttackItem(this.actor);

			let attackInfo = this.actor.data.data.attributes.sigattack;
			let content = '<div class="dnd5e chat-card item-card" data-actor-id="' + this.actor.id + '" data-item-id="' + attackInfo.itemid + '">' +
						'<header class="card-header flexrow">' +
							'<img src="icons/svg/mystery-man.svg" title="Light Cannon" width="36" height="36">' +
							'<h3 class="item-name">' + attackInfo.name + '</h3>' +
						'</header>' +
						'<div class="card-content">' +
						'</div>' +
						'<div class="card-buttons">' +
							'<button data-action="attack">Attack</button>' +
							'<button data-action="damage">Damage</button>' +
						'</div>' +
						'<footer class="card-footer">' +
							'<span>Signature Attack</span>' +
							'<span>Action</span>' +
						'</footer>' +
					'</div>'

			let messageData = {
				user: "",
				type: 0,
				content: content,
				speaker: ChatMessage.getSpeaker({token: this.actor.token})
			}

			let message = await ChatMessage.create(messageData);
		})

		html.find('.retainer-special-action-button').click(event => {
			console.log("Printing special action")

			let specAction = this.actor.data.data.attributes[event.target.id];

			let content = '<div class="dnd5e chat-card item-card">' +
						'<header class="card-header flexrow">' +
							'<img src="icons/svg/mystery-man.svg" title="Light Cannon" width="36" height="36">' +
							'<h3 class="item-name">' + specAction.name + '</h3>' +
						'</header>' +
						'<div class="card-content">' +
						TextEditor.enrichHTML(specAction.description, false, true, true, true) +
						'</div>' +
						'<footer class="card-footer">' +
							'<span>Special Attack</span>' +
							'<span>' + specAction.cost + '</span>' +
						'</footer>' +
					'</div>'

			let messageData = {
				user: "",
				type: 0,
				content: content,
				speaker: ChatMessage.getSpeaker({token: this.actor.token})
			}

			let message = ChatMessage.create(messageData);
		})

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

async function updateHealthMarks(data) {
	var healthMarks = document.getElementById("health-mark-list").children;
	for (let i = 0; i < healthMarks.length; i++) {
		if(i < parseInt(data.data.details.retainerlevel)) {
			healthMarks[i].style.display = "inline-block";
		} else {
			healthMarks[i].style.display = "none";
		}
	}
}

async function setupSigAttackItem(actor) {
	var attackInfo = actor.data.data.attributes.sigattack;
	attackInfo = {
		itemid: attackInfo.itemid,
		name: attackInfo.name ? attackInfo.name : "Attack Name",
		cost: attackInfo.cost ? attackInfo.cost : "Action",
		tohit: attackInfo.tohit != null ? attackInfo.tohit : 6,
		reach: attackInfo.reach ? attackInfo.reach : "5ft",
		target: attackInfo.target ? attackInfo.target : "one target",
		damageroll: attackInfo.damageroll ? attackInfo.damageroll : "1d10+6",
		damagetype: attackInfo.damagetype ? attackInfo.damagetype : "slashing"
	}


	var itemId = attackInfo.itemid || "none";
	var actorItems = actor.items.filter(e => e._id === itemId)
	var itemData = {
		name: actor.name + " - " + attackInfo.name,
		type: "weapon",
		data: {
			actionType: "mwak",
			attackBonus: attackInfo.tohit,
			proficient: true,
			damage: {
				parts: [
					[
						attackInfo.damageroll,
						attackInfo.damagetype
					]
				],
				versatile: ""
			}
		},
		actor: actor
	}

	var item;
	if(actorItems.length > 0) {
		item = actorItems[0];
		await item.update({
			name: actor.name + " - " + attackInfo.name,
			type: "weapon",
			data: {
				actionType: "mwak",
				attackBonus: attackInfo.tohit,
				proficient: true,
				damage: {
					parts: [
						[
							attackInfo.damageroll,
							attackInfo.damagetype
						]
					],
					versatile: ""
				}
			}
		});
	} else {
		item = await actor.createOwnedItem(itemData);
	}

	await game.actors.get(actor.id).update({
		data: {attributes: {
			sigattack: {
				itemid: item._id,
				name: attackInfo.name,
				cost: attackInfo.cost,
				tohit: attackInfo.tohit,
				reach: attackInfo.reach,
				target: attackInfo.target,
				damageroll: attackInfo.damageroll,
				damagetype: attackInfo.damagetype
			}
		}
	}});
}

Actors.registerSheet("dnd5e", RetainerCard, {
	types: ["character"],
	makeDefault: false
});


Hooks.on("renderRetainerCard", (app, html, data) => {
	//injectPassives(app, html, data);
	console.log("Hook triggered on renderRetainerCard:", {app, html, data})
	updateHealthMarks(data);
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
