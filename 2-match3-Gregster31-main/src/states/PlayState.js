import { SoundName, StateName, TilePattern } from '../enums.js';
import { context, input, sounds, stateMachine, timer } from '../globals.js';
import { roundedRectangle } from '../../lib/Drawing.js';
import State from '../../lib/State.js';
import Board from '../objects/Board.js';
import Tile from '../objects/Tile.js';
import Cursor from '../objects/Cursor.js';
import Input from '../../lib/Input.js';

export default class PlayState extends State {
	constructor() {
		super();

		// Position in the grid which we're currently highlighting.
		this.cursor = new Cursor(0, 0);

		// Tile we're currently highlighting (preparing to swap).
		this.selectedTile = null;

		this.level = 1;

		// Increases as the player makes matches.
		this.score = 0;

		// Score we have to reach to get to the next level.
		this.scoreGoal = 250;

		// How much score will be incremented by per match tile.
		this.baseScore = 5;
		this.StarScore = 30;

		// How much scoreGoal will be scaled by per level.
		this.scoreGoalScale = 1.25;

		// How many hints can you have during each level
		this.hints = 3;

		this.hintTiles = []

		/**
		 * The timer will countdown and the player must try and
		 * reach the scoreGoal before time runs out. The timer
		 * is reset when entering a new level.
		 */
		this.maxTimer = 60;
		this.timer = this.maxTimer;
	}

	enter(parameters) {
		this.board = parameters.board;
		this.score = parameters.score;
		this.level = parameters.level;
		this.scene = parameters.scene;
		this.timer = this.maxTimer;
		this.scoreGoal *= Math.floor(this.level * this.scoreGoalScale);
		this.cursor = new Cursor(this.board.x, this.board.y);

		this.startTimer();
	}

	exit() {
		timer.clear();
		sounds.pause(SoundName.Music3);
	}
	
	
	update(dt) {
		this.scene.update(dt);
		this.checkGameOver();
		this.checkVictory();
		this.cursor.update(dt);
		
		// Hints implementation
		if (input.isKeyPressed(Input.KEYS.H) && this.hints > 0) {
			this.hints--;
			this.hintTiles = this.board.hints();
		}
		
		// If we've pressed enter, select or deselect the currently highlighted tile.
		if ((input.isKeyPressed(Input.KEYS.ENTER) || input.isMouseButtonPressed(Input.MOUSE.LEFT)) && !this.board.isSwapping) {
			this.selectTile();
		}
		
		timer.update(dt);
	}
			
	renderHighlighTile(tile1, tile2) {
		context.save();
		context.strokeStyle = "white";
		context.lineWidth = 4;

		roundedRectangle(
			context,
			tile1.boardX * Tile.SIZE + this.cursor.x,
			tile1.boardY * Tile.SIZE + this.cursor.y,
			Tile.SIZE,
			Tile.SIZE
		);

		roundedRectangle(
			context,
			tile2.boardX * Tile.SIZE + this.cursor.x,
			tile2.boardY * Tile.SIZE + this.cursor.y,
			Tile.SIZE,
			Tile.SIZE
		);
		context.restore();
	}
	
	
	render() {
		this.scene.render();
		this.board.render();
		
		if (this.selectedTile) {
			this.renderSelectedTile();
		}

		// Renders the hint tiles on the board
		if(this.hintTiles.length !== 0) {
			this.renderHighlighTile(this.hintTiles[0], this.hintTiles[1]);
		}
		
		this.cursor.render();
		this.renderUserInterface();
	}
	
	selectTile() {
		const highlightedTile =
		this.board.tiles[this.cursor.boardY][this.cursor.boardX];

		/**
		 * The `?.` syntax is called "optional chaining" which allows you to check
		 * a property on an object even if that object is `null` at the time.
		 *
		 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
		 */
		const tileDistance =
			Math.abs(this.selectedTile?.boardX - highlightedTile.boardX) +
			Math.abs(this.selectedTile?.boardY - highlightedTile.boardY);

		// If nothing is selected, select current tile.
		if (!this.selectedTile) {
			this.selectedTile = highlightedTile;
		}
		// Remove highlight if already selected.
		else if (this.selectedTile === highlightedTile) {
			this.selectedTile = null;
		} else if (tileDistance > 1) {
			/**
			 * If the difference between X and Y combined of this selected
			 * tile vs the previous is not equal to 1, also remove highlight.
			 */
			sounds.play(SoundName.Error);
			this.selectedTile = null;
		}
		// Otherwise, do the swap, and check for matches.
		else {
			this.swapTiles(highlightedTile);
		}
	}

	async swapTiles(highlightedTile) {
		await this.board.swapTiles(this.selectedTile, highlightedTile);
		this.selectedTile = null;
		await this.calculateMatches();

		setTimeout(() => {
			this.hintTiles = [];
		}, 100); 
	}

	renderSelectedTile() {
		context.save();
		context.fillStyle = 'rgb(255, 255, 255, 0.5)';
		roundedRectangle(
			context,
			this.selectedTile.x + this.board.x,
			this.selectedTile.y + this.board.y,
			Tile.SIZE,
			Tile.SIZE,
			10,
			true,
			false
		);
		context.restore();
	}

	renderUserInterface() {
		context.fillStyle = 'rgb(56, 56, 56, 0.9)';
		roundedRectangle(
			context,
			50,
			this.board.y,
			225,
			Board.SIZE * Tile.SIZE,
			5,
			true,
			false
		);

		context.fillStyle = 'white';
		context.font = '25px Joystix';
		context.textAlign = 'left';
		// Increment by 45 to have space for text
		context.fillText(`Level:`, 70, this.board.y + 40);
		context.fillText(`Score:`, 70, this.board.y + 85);
		context.fillText(`Goal:`, 70, this.board.y + 130);
		context.fillText(`Timer:`, 70, this.board.y + 175);
		context.fillText(`Hints:`, 70, this.board.y + 220);
		context.textAlign = 'right';
		context.fillText(`${this.level}`, 250, this.board.y + 40);
		context.fillText(`${this.score}`, 250, this.board.y + 85);
		context.fillText(`${this.scoreGoal}`, 250, this.board.y + 130);
		context.fillText(`${this.timer}`, 250, this.board.y + 175);
		context.fillText(`${this.hints}`, 250, this.board.y + 220);
	}

	/**
	 * Calculates whether any matches were found on the board and tweens the needed
	 * tiles to their new destinations if so. Also removes tiles from the board that
	 * have matched and replaces them with new randomized tiles, deferring most of this
	 * to the Board class.
	 */
	async calculateMatches() {
		// Get all matches for the current board.
		this.board.calculateMatches();

		// If no matches, then no need to proceed with the function.
		if (this.board.matches.length === 0) {
			return;
		}

		this.calculateScoreAndTime();

		// Remove any matches from the board to create empty spaces.
		this.board.removeMatches();

		await this.placeNewTiles();

		/**
		 * Recursively call function in case new matches have been created
		 * as a result of falling blocks once new blocks have finished falling.
		 */
		await this.calculateMatches();
	}

	calculateScoreAndTime() {
		this.board.matches.forEach((match) => {
			match.forEach(tile => {
				if (tile.pattern == TilePattern.Star) {
					this.score += this.StarScore; 
				} else {
					this.score += this.baseScore; 
				}
			});
			
			this.timer++;
		});
	}
	

	async placeNewTiles() {
		// Get an array with tween values for tiles that should now fall as a result of the removal.
		const tilesToFall = this.board.getFallingTiles();

		// Tween all the falling blocks simultaneously.
		await Promise.all(
			tilesToFall.map((tile) => {
				timer.tweenAsync(tile.tile, tile.endValues, 0.25);
			})
		);

		// Get an array with tween values for tiles that should replace the removed tiles.
		const newTiles = this.board.getNewTiles();

		// Tween the new tiles falling one by one for a more interesting animation.
		for (const tile of newTiles) {
			await timer.tweenAsync(tile.tile, tile.endValues, 0.1);
		}
	}

	startTimer() {
		// Decrement the timer every second.
		timer.addTask(() => {
			this.timer--;

			if (this.timer <= 5) {
				sounds.play(SoundName.Clock);
			}
		}, 1);
	}

	checkVictory() {
		if (this.score < this.scoreGoal) {
			return;
		}

		sounds.play(SoundName.NextLevel);

		stateMachine.change(StateName.LevelTransition, {
			level: this.level + 1,
			score: this.scoreGoal,
			scene: this.scene,
		});
	}

	checkGameOver() {
		if (this.timer > 0) {
			return;
		}

		sounds.play(SoundName.GameOver);

		stateMachine.change(StateName.GameOver, {
			score: this.score,
			scene: this.scene,
		});
	}
}
