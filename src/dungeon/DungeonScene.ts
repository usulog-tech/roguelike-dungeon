import {Hero, HeroStateView} from "../characters";
import {DungeonMap, DungeonTitle} from "./DungeonMap";
import {Scene, SceneController} from "../scene";
import {BeltInventoryView} from "../inventory";

export class DungeonScene extends Scene {
  private readonly _dungeon: DungeonMap;
  private readonly _hero: Hero;

  constructor(controller: SceneController, hero: Hero, dungeon: DungeonMap) {
    super(controller);
    this._dungeon = dungeon;
    this._hero = hero;
  }

  init(): void {
    const screen = this._controller.screen;

    const titleView = new DungeonTitle(this._dungeon.level);
    titleView.position.set(screen.width >> 1, 16);
    titleView.zIndex = 10;
    this.addChild(titleView);

    const inventoryView = new BeltInventoryView(this._controller.resources, this._hero.inventory.belt);
    const invWidth = inventoryView.width;
    inventoryView.position.set((screen.width >> 1) - (invWidth >> 1), screen.height - (32 + 4 + 16));
    inventoryView.zIndex = 11;
    this.addChild(inventoryView);

    const healthView = new HeroStateView(this._hero, {fixedHPSize: false});
    healthView.position.set(16, 16);
    healthView.zIndex = 12;
    this.addChild(healthView);

    this._dungeon.container.zIndex = 0;
    this.addChild(this._dungeon.container);

    this._dungeon.light.layer.zIndex = 1;
    this.addChild(this._dungeon.light.layer);

    this._dungeon.lighting.zIndex = 2;
    this._dungeon.lighting.alpha = 0.8;
    this.addChild(this._dungeon.lighting);

    this.sortChildren();

    this._dungeon.ticker.start();
  }

  destroy(): void {
    this._dungeon.destroy();
    super.destroy({children: true});
  }

  pause(): void {
    this._dungeon.ticker.stop();
  }

  resume(): void {
    this._dungeon.ticker.start();
  }
}