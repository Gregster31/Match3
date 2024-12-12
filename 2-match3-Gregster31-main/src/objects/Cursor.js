import { roundedRectangle } from '../../lib/Drawing.js';
import { SoundName } from '../enums.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH, context, input, sounds } from '../globals.js';
import Board from './Board.js';
import Tile from './Tile.js';
import Input from '../../lib/Input.js';

export default class Cursor {
	/**
	 * The rectangle that shows the player which
	 * tile they are currently hovering over.
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {string} colour
	 * @param {number} lineWidth
	 */
	constructor(x, y, colour = 'white', lineWidth = 4) {
		// Board position.
		this.boardX = 0;
		this.boardY = 0;

		// Canvas position.
		this.x = x;
		this.y = y;

		this.colour = colour;
		this.lineWidth = lineWidth;
	}

	update(dt) {
		this.move();
	}

	render() {
		context.save();
		context.strokeStyle = this.colour;
		context.lineWidth = this.lineWidth;

		roundedRectangle(
			context,
			this.boardX * Tile.SIZE + this.x,
			this.boardY * Tile.SIZE + this.y,
			Tile.SIZE,
			Tile.SIZE
		);
		context.restore();
	}

	move() {
		if (input.isKeyPressed(Input.KEYS.W)) {
			this.boardY = Math.max(0, this.boardY - 1);
		} else if (input.isKeyPressed(Input.KEYS.S)) {
			this.boardY = Math.min(Board.SIZE - 1, this.boardY + 1);
		} else if (input.isKeyPressed(Input.KEYS.A)) {
			this.boardX = Math.max(0, this.boardX - 1);
		} else if (input.isKeyPressed(Input.KEYS.D)) {
			this.boardX = Math.min(Board.SIZE - 1, this.boardX + 1);
		}
		else {
			// Allows the user to play with mouse
			let mouse = input.getMousePosition();		// Gets the position of the mouse
			let boardEnding = Board.SIZE * Tile.SIZE; 		// Gets where the board ends
		
			// Check if the mouse is within the board
			if (mouse.x >= this.x && mouse.x <= this.x + boardEnding 
				&& mouse.y >= this.y && mouse.y <= this.y + boardEnding) {
				
				// Gets the current highlighed tile
				this.boardX = Math.floor((mouse.x - this.x) / Tile.SIZE);
				this.boardY = Math.floor((mouse.y - this.y) / Tile.SIZE);
			}
		}

		sounds.play(SoundName.Select);
	}
}
