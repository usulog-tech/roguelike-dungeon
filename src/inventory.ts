import {DropInfo, UsableDrop, Weapon} from "./drop";
import {Hero} from "./hero";
import {ObservableVar, Observable, EventPublisher, Publisher} from "./observable";
import {Colors, Sizes, Selectable, Button, SelectableGrid, VStack, HStack} from "./ui";
import {Npc} from "./npc";
import {Resources} from "./resources";
import {Character} from "./character";
import * as PIXI from "pixi.js";

const CELL_SIZE = 32;

const BUTTON_WIDTH = 170;
const BUTTON_HEIGHT = 32;

export class Inventory {
  readonly equipment: EquipmentInventory;
  readonly belt: BeltInventory;
  readonly backpack: BackpackInventory;

  private readonly _drop = new EventPublisher<[UsableDrop, number]>();

  get drop(): Publisher<[UsableDrop, number]> {
    return this._drop;
  }

  constructor(character: Character) {
    this.equipment = new EquipmentInventory(character, this._drop);
    this.belt = new BeltInventory(character, this._drop);
    this.backpack = new BackpackInventory(character, this._drop);
  }

  stack(item: UsableDrop): boolean {
    return this.belt.stack(item) || this.backpack.stack(item);
  }

  set(item: UsableDrop): boolean {
    return this.belt.set(item) || this.backpack.set(item);
  }

  add(item: UsableDrop) {
    return this.stack(item) || this.set(item);
  }

  hasSpace(item: UsableDrop) {
    return this.belt.hasSpace(item) || this.backpack.hasSpace(item);
  }
}

export class EquipmentInventory {
  readonly weapon: InventoryCell;

  constructor(character: Character, drop: EventPublisher<[UsableDrop, number]>) {
    this.weapon = new InventoryCell(character, 1, (item) => item instanceof Weapon, drop, this);
  }
}

export class BeltInventory {
  readonly length: number = 10;
  private readonly cells: InventoryCell[];

  constructor(character: Character, drop: EventPublisher<[UsableDrop, number]>) {
    this.cells = [];
    for (let i = 0; i < 10; i++) {
      this.cells[i] = new InventoryCell(character, 3, () => true, drop, this);
    }
  }

  cell(index: number): InventoryCell {
    return this.cells[index];
  }

  stack(item: UsableDrop): boolean {
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i].stack(item)) {
        return true;
      }
    }
    return false;
  }

  set(item: UsableDrop): boolean {
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i].set(item)) {
        return true;
      }
    }
    return false;
  }

  add(item: UsableDrop): boolean {
    return this.stack(item) || this.set(item);
  }

  hasSpace(item: UsableDrop): boolean {
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i].hasSpace(item)) {
        return true;
      }
    }
    return false;
  }
}

export class BackpackInventory {
  readonly width: number = 10;
  readonly height: number = 5;
  private readonly cells: InventoryCell[][];

  constructor(character: Character, drop: EventPublisher<[UsableDrop, number]>) {
    this.cells = [];
    for (let y = 0; y < this.height; y++) {
      this.cells.push([]);
      for (let x = 0; x < this.width; x++) {
        this.cells[y][x] = new InventoryCell(character, 3, () => true, drop, this);
      }
    }
  }

  cell(x: number, y: number): InventoryCell {
    return this.cells[y][x];
  }

  stack(item: UsableDrop): boolean {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.cells[y][x].stack(item)) {
          return true;
        }
      }
    }
    return false;
  }

  set(item: UsableDrop): boolean {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.cells[y][x].set(item)) {
          return true;
        }
      }
    }
    return false;
  }

  add(item: UsableDrop): boolean {
    return this.stack(item) || this.set(item);
  }

  hasSpace(item: UsableDrop): boolean {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.cells[y][x].hasSpace(item)) {
          return true;
        }
      }
    }
    return false;
  }
}

export class InventoryCell {
  private readonly character: Character;
  private readonly _maxInStack: number;
  private readonly _item = new ObservableVar<UsableDrop | null>(null);
  private readonly _count = new ObservableVar<number>(0);
  private readonly _predicate: (item: UsableDrop) => boolean;
  private readonly _drop: EventPublisher<[UsableDrop, number]>;

  readonly parent: EquipmentInventory | BeltInventory | BackpackInventory;

  get item(): Observable<UsableDrop | null> {
    return this._item;
  }

  get count(): Observable<number> {
    return this._count;
  }

  constructor(
    character: Character,
    maxInStack: number,
    predicate: (item: UsableDrop) => boolean,
    drop: EventPublisher<[UsableDrop, number]>,
    parent: EquipmentInventory | BeltInventory | BackpackInventory,
  ) {
    this.character = character;
    this._maxInStack = maxInStack;
    this._predicate = predicate;
    this._drop = drop;
    this.parent = parent;
  }

  hasSpace(item: UsableDrop): boolean {
    return this.supports(item) && (
      this.isEmpty || (this._item.get()!.same(item) && this._count.get() < this._maxInStack)
    );
  }

  supports(item: UsableDrop): boolean {
    return this._predicate(item);
  }

  stack(item: UsableDrop): boolean {
    if (this._item.get()?.same(item) && this._count.get() < this._maxInStack) {
      this._count.update(c => c + 1);
      return true;
    }
    return false;
  };

  clear(): void {
    if (this._item.get()) {
      this._item.set(null);
      this._count.set(0);
    }
  }

  set(item: UsableDrop, count: number = 1): boolean {
    if (!this._item.get() && this._predicate(item)) {
      this._item.set(item);
      this._count.set(count);
      return true;
    }
    return false;
  }

  decrease(): void {
    this._count.update(c => Math.max(0, c - 1));
    if (this._count.get() <= 0) {
      this._item.set(null);
      this._count.set(0);
    }
  }

  get isEmpty(): boolean {
    return this._item.get() == null;
  }

  use(): boolean {
    const item = this._item.get();
    if (item) {
      item.use(this, this.character);
      return true;
    }
    return false;
  }

  equip(): void {
    const item = this._item.get();
    const weapon = this.character.inventory.equipment.weapon;
    if (item && weapon.supports(item)) {
      const prev = weapon.item.get();
      weapon.clear();
      weapon.set(item);
      this.clear();
      if (prev) {
        this.set(prev);
      }
    }
  }

  toBelt(): void {
    const item = this._item.get();
    while (item && !this.isEmpty) {
      if (this.character.inventory.belt.add(item)) {
        this.decrease();
      } else {
        break;
      }
    }
  }

  toBackpack(): void {
    const item = this._item.get();
    while (item && !this.isEmpty) {
      if (this.character.inventory.backpack.add(item)) {
        this.decrease();
      } else {
        break;
      }
    }
  }

  drop(): void {
    const drop = this._item.get();
    const count = this._count.get();
    if (drop) {
      this._item.set(null);
      this._count.set(0);
      this._drop.send([drop, count]);
    }
  }
}

export interface InventoryController {
  readonly title: string;
  readonly inventory: Inventory;

  handleActions(view: InventoryCellActionsView, drop: UsableDrop | null): void;

  handleInfo(drop: UsableDrop): DropInfo;
}

export abstract class BaseInventoryActionsController implements InventoryController {
  readonly title: string;
  readonly inventory: Inventory;

  protected constructor(inventory: Inventory, title: string) {
    this.inventory = inventory;
    this.title = title;
  }

  handleActions(view: InventoryCellActionsView, drop: UsableDrop | null): void {
    view.removeButtons();
    if (drop) {
      this.buttons(view, drop);
    }
  }

  abstract handleInfo(drop: UsableDrop): DropInfo;

  protected abstract buttons(view: InventoryCellActionsView, drop: UsableDrop): void;
}

export abstract class BaseHeroInventoryActionsController extends BaseInventoryActionsController {
  protected constructor(inventory: Inventory, title: string) {
    super(inventory, title);
  }

  protected basicButtons(view: InventoryCellActionsView, item: UsableDrop): void {
    const cell = view.cell;
    if (cell.parent instanceof BeltInventory || cell.parent instanceof BackpackInventory) {
      if (this.inventory.equipment.weapon.supports(item)) {
        view.addButton("Equip", () => cell.equip());
      } else {
        view.addButton("Use item", () => cell.use());
      }
    }
    if (!(cell.parent instanceof BeltInventory)) view.addButton("To belt", () => cell.toBelt());
    if (!(cell.parent instanceof BackpackInventory)) view.addButton("To backpack", () => cell.toBackpack());
    view.addButton("Drop", () => cell.drop());
  }
}

export class DefaultInventoryActionsController extends BaseHeroInventoryActionsController {
  constructor(inventory: Inventory) {
    super(inventory, "Inventory");
  }

  protected buttons(view: InventoryCellActionsView, item: UsableDrop): void {
    this.basicButtons(view, item);
  }

  handleInfo(drop: UsableDrop): DropInfo {
    const info = drop.info();
    info.price = info.sellPrice;
    return info;
  }
}

export class SellingInventoryActionsController extends BaseHeroInventoryActionsController {
  private readonly hero: Hero;
  private readonly npc: Npc;

  constructor(hero: Hero, npc: Npc) {
    super(hero.inventory, "Selling");
    this.hero = hero;
    this.npc = npc;
  }

  protected buttons(view: InventoryCellActionsView, item: UsableDrop): void {
    this.basicButtons(view, item);
    this.sellingButtons(view, item);
  }

  protected sellingButtons(view: InventoryCellActionsView, item: UsableDrop): void {
    const price = item.info().sellPrice;
    if (price !== undefined && this.npc.coins.get() >= price && this.npc.inventory.backpack.hasSpace(item)) {
      view.addButton('Sell', () => {
        if (this.npc.coins.get() >= price && this.npc.inventory.backpack.hasSpace(item)) {
          this.npc.decreaseCoins(price);
          this.npc.inventory.backpack.add(item);
          this.hero.addCoins(price);
          view.cell.decrease();
        } else {
          console.warn("failed sell item");
        }
      });
    } else {
      console.warn(`price: ${price} npc coins: ${this.npc.coins.get()}`);
    }
  }

  handleInfo(drop: UsableDrop): DropInfo {
    const info = drop.info();
    info.price = info.sellPrice;
    return info;
  }
}

export class BuyingInventoryActionsController extends BaseInventoryActionsController {
  private readonly hero: Hero;
  private readonly npc: Npc;

  constructor(hero: Hero, npc: Npc) {
    super(npc.inventory, "Buying");
    this.hero = hero;
    this.npc = npc;
  }

  protected buttons(view: InventoryCellActionsView, drop: UsableDrop): void {
    if (view.cell.parent instanceof BackpackInventory) {
      this.buyingButtons(view, drop);
    }
  }

  protected buyingButtons(view: InventoryCellActionsView, drop: UsableDrop): void {
    const price = drop.info().buyPrice;
    if (price !== undefined && this.hero.coins.get() >= price && this.hero.inventory.hasSpace(drop)) {
      view.addButton('Buy', () => {
        if (this.npc.coins.get() >= price && this.hero.inventory.hasSpace(drop)) {
          this.hero.decreaseCoins(price);
          this.hero.inventory.backpack.add(drop);
          this.npc.addCoins(price);
          view.cell.decrease();
        } else {
          console.warn("failed buy item");
        }
      });
    } else {
      console.warn(`price: ${price} hero coins: ${this.hero.coins.get()}`);
    }
  }

  handleInfo(drop: UsableDrop): DropInfo {
    const info = drop.info();
    info.price = info.buyPrice;
    return info;
  }
}

export class InventoryView extends PIXI.Container {
  private readonly selectable: SelectableGrid;
  private readonly selectableOffsetX: number;
  private readonly selectableOffsetY: number;

  private readonly equipment: EquipmentInventoryView;
  private readonly belt: BeltInventoryView;
  private readonly backpack: BackpackInventoryView;
  private readonly card: InventoryCellCardView;
  private readonly actions: InventoryCellActionsView;

  constructor(
    resources: Resources,
    controller: InventoryController,
    selectable: SelectableGrid,
    selectableOffsetX: number,
    selectableOffsetY: number,
  ) {
    super();
    this.selectable = selectable;
    this.selectableOffsetX = selectableOffsetX;
    this.selectableOffsetY = selectableOffsetY;

    const inventory = controller.inventory;

    const viewStack = new HStack({padding: 0});
    this.addChild(viewStack);
    const inventoryStack = new VStack({padding: 0});
    viewStack.addChild(inventoryStack);

    this.equipment = new EquipmentInventoryView(resources, inventory.equipment);
    inventoryStack.addChild(this.equipment);
    selectable.set(selectableOffsetX, selectableOffsetY, this.equipment.weapon, () => this.show(inventory.equipment.weapon));
    selectable.merge(selectableOffsetX, selectableOffsetY, 10, 1);

    this.belt = new BeltInventoryView(resources, inventory.belt);
    inventoryStack.addChild(this.belt);
    for (let i = 0; i < this.belt.length; i++) {
      const cell = inventory.belt.cell(i);
      this.selectable.set(selectableOffsetX + i, selectableOffsetY + 1, this.belt.cell(i), () => this.show(cell));
    }

    this.backpack = new BackpackInventoryView(resources, inventory.backpack);
    inventoryStack.addChild(this.backpack);

    for (let x = 0; x < inventory.backpack.width; x++) {
      for (let y = 0; y < inventory.backpack.height; y++) {
        const cell = inventory.backpack.cell(x, y);
        this.selectable.set(selectableOffsetX + x, selectableOffsetY + y + 2, this.backpack.cell(x, y), () => this.show(cell));
      }
    }

    this.actions = new InventoryCellActionsView(this.selectable, this.selectableOffsetX, this.selectableOffsetY, controller);
    inventoryStack.addChild(this.actions);

    this.card = new InventoryCellCardView(resources, controller, {
      width: 400,
      height: 400,
    });
    viewStack.addChild(this.card);
  }

  destroy(): void {
    super.destroy();

    this.equipment.destroy();
    this.belt.destroy();
    this.backpack.destroy();
    this.card.destroy();
  }

  private show(cell: InventoryCell) {
    this.card.publisher = cell.item;
    this.actions.cell = cell;
  }
}

export class EquipmentInventoryView extends PIXI.Container {
  private readonly equipment: EquipmentInventory;

  readonly weapon: InventoryCellView;

  constructor(resources: Resources, equipment: EquipmentInventory) {
    super();

    this.equipment = equipment;

    const background = new PIXI.Graphics()
      .beginFill(Colors.uiBackground)
      .drawRect(
        0, 0,
        CELL_SIZE + (Sizes.uiBorder << 1),
        CELL_SIZE + (Sizes.uiBorder << 1)
      )
      .endFill();
    this.addChild(background);

    this.weapon = new InventoryCellView(resources, {
      item: this.equipment.weapon.item,
      count: new ObservableVar(null)
    });
    this.weapon.position.set(Sizes.uiBorder, Sizes.uiBorder);
    this.addChild(this.weapon);
  }
}

export class BeltInventoryView extends PIXI.Container {
  private readonly inventory: BeltInventory;
  private readonly cells: InventoryCellView[];

  constructor(resources: Resources, inventory: BeltInventory) {
    super();
    this.inventory = inventory;

    const background = new PIXI.Graphics()
      .beginFill(Colors.uiBackground)
      .drawRect(
        0, 0,
        Sizes.uiBorder + (CELL_SIZE + Sizes.uiBorder) * inventory.length,
        CELL_SIZE + (Sizes.uiBorder << 1)
      )
      .endFill();
    this.addChild(background);

    this.cells = [];
    for (let i = 0; i < inventory.length; i++) {
      const cell = inventory.cell(i);
      const view = new InventoryCellView(resources, {
        item: cell.item,
        count: cell.count,
      });
      view.position.set(
        Sizes.uiBorder + (CELL_SIZE + Sizes.uiBorder) * i,
        Sizes.uiBorder
      );
      this.cells.push(view);
      this.addChild(view);
    }
  }

  get length(): number {
    return this.inventory.length;
  }

  cell(index: number) {
    return this.cells[index];
  }
}

export class BackpackInventoryView extends PIXI.Container {
  private readonly cells: InventoryCellView[][];

  constructor(resources: Resources, inventory: BackpackInventory) {
    super();
    const background = new PIXI.Graphics()
      .beginFill(Colors.uiBackground)
      .drawRect(
        0, 0,
        Sizes.uiBorder + (CELL_SIZE + Sizes.uiBorder) * inventory.width,
        Sizes.uiBorder + (CELL_SIZE + Sizes.uiBorder) * inventory.height,
      )
      .endFill();
    this.addChild(background);

    this.cells = [];
    for (let y = 0; y < inventory.height; y++) {
      this.cells.push([]);
      for (let x = 0; x < inventory.width; x++) {
        const cell = inventory.cell(x, y);
        const view = new InventoryCellView(resources, {
          item: cell.item,
          count: cell.count,
        });
        view.position.set(
          Sizes.uiBorder + (CELL_SIZE + Sizes.uiBorder) * x,
          Sizes.uiBorder + (CELL_SIZE + Sizes.uiBorder) * y
        );
        this.cells[y][x] = view;
        this.addChild(view);
      }
    }
  }

  cell(x: number, y: number): InventoryCellView {
    return this.cells[y][x];
  }
}

export class InventoryCellView extends PIXI.Container implements Selectable {
  private readonly _item: Observable<UsableDrop | null>;
  private readonly _count: Observable<number | null>;

  private readonly resources: Resources;
  private readonly background: PIXI.Graphics;
  private readonly counter: PIXI.BitmapText;
  private sprite: PIXI.Sprite | null = null;

  private _selected: boolean = false;

  constructor(resources: Resources, options: {
    item: Observable<UsableDrop | null>,
    count: Observable<number | null>,
  }) {
    super();
    this._item = options.item;
    this._count = options.count;
    this.resources = resources;
    this.background = new PIXI.Graphics();
    this.selected = false;

    this.counter = new PIXI.BitmapText("0", {font: {name: "alagard", size: 16}});
    this.counter.anchor = new PIXI.Point(1, 0);
    this.counter.position.set(CELL_SIZE - Sizes.uiBorder, 0);

    this.addChild(this.background, this.counter);

    this._item.subscribe(this.updateItem, this);
    this._count.subscribe(this.updateCounter, this);
  }

  destroy(): void {
    super.destroy();
    this._item.unsubscribe(this.updateItem, this);
    this._count.unsubscribe(this.updateCounter, this);
  }

  get selected(): boolean {
    return this._selected;
  }

  set selected(selected: boolean) {
    this._selected = selected;
    this.background
      .clear()
      .beginFill(selected ? Colors.uiSelected : Colors.uiNotSelected)
      .drawRect(0, 0, CELL_SIZE, CELL_SIZE)
      .endFill();
  }

  private updateCounter(counter: number | null): void {
    if (counter === null || counter === 0) {
      this.counter.text = "";
    } else {
      this.counter.text = counter.toString();
    }
  }

  private updateItem(item: UsableDrop | null): void {
    this.sprite?.destroy();
    this.sprite = null;
    if (item) {
      this.sprite = this.resources.sprite(item.spriteName);
      const max = CELL_SIZE - (Sizes.uiBorder << 1);
      const scale = max / Math.max(this.sprite.width, this.sprite.height);
      this.sprite.scale.set(scale, scale);
      this.sprite.anchor.set(0.5, 0);
      this.sprite.position.set(CELL_SIZE >> 1, Sizes.uiBorder);
      this.addChild(this.sprite);
    }
  }
}

export class InventoryCellCardView extends PIXI.Container {
  private readonly resources: Resources;
  private readonly controller: InventoryController;
  private readonly _width: number;
  private readonly _height: number;
  private readonly _sprite_size: number;

  private _sprite: PIXI.Sprite | PIXI.AnimatedSprite | null = null;
  private readonly _title: PIXI.BitmapText;
  private readonly _description: PIXI.BitmapText;

  private _publisher: Publisher<UsableDrop | null> | null = null;

  constructor(resources: Resources, controller: InventoryController, options: {
    width?: number,
    height?: number,
  }) {
    super();
    this.resources = resources;
    this.controller = controller;
    this._width = options.width || 400;
    this._height = options.height || 400;
    this._sprite_size = 128 + (Sizes.uiMargin << 1);

    const background = new PIXI.Graphics()
      .beginFill(Colors.uiBackground)
      .drawRect(0, 0, this._width, this._height)
      .endFill()
      .beginFill(Colors.uiNotSelected)
      .drawRect(Sizes.uiMargin, Sizes.uiMargin + 32 + Sizes.uiMargin, this._sprite_size, this._sprite_size)
      .endFill();

    this._title = new PIXI.BitmapText("", {font: {name: "alagard", size: 32}});
    this._title.anchor = new PIXI.Point(0.5, 0);
    this._title.position.set(this._width >> 1, Sizes.uiMargin);

    this._description = new PIXI.BitmapText("", {font: {name: "alagard", size: 16}});
    this._description.position.set(
      Sizes.uiMargin + this._sprite_size + Sizes.uiMargin,
      Sizes.uiMargin + 32 + Sizes.uiMargin
    );

    this.addChild(background, this._title, this._description);
  }


  destroy(): void {
    super.destroy();
    this._publisher?.unsubscribe(this.handle, this);
    this._publisher = null;
  }

  set publisher(publisher: Publisher<UsableDrop | null>) {
    this._publisher?.unsubscribe(this.handle, this);
    this._publisher = null;

    this._publisher = publisher;
    this._publisher.subscribe(this.handle, this);
  }

  private handle(drop: UsableDrop | null): void {
    this._sprite?.destroy();
    this._sprite = null;
    this._title.text = "";
    this._description.text = "";

    if (drop) {
      const sprite = this._sprite = this.resources.sprite(drop.spriteName);
      sprite.anchor = new PIXI.Point(0.5, 0.5);
      sprite.position.set(
        Sizes.uiMargin + (this._sprite_size >> 1),
        Sizes.uiMargin + (this._sprite_size >> 1) + 32 + Sizes.uiMargin
      );
      const s_w = sprite.width;
      const s_h = sprite.height;
      const max_size = this._sprite_size - Sizes.uiMargin;
      if (s_w > s_h) {
        this._sprite.width = max_size;
        this._sprite.height = (max_size / s_w) * s_h;
      } else {
        this._sprite.height = max_size;
        this._sprite.width = (max_size / s_h) * s_w;
      }
      this.addChild(this._sprite);

      const info = this.controller.handleInfo(drop);

      this._title.text = info.name;

      const text: string[] = [];
      if (info.health) text.push(`health: ${info.health}`);
      if (info.speed) text.push(`speed: ${info.speed * 100}%`);
      if (info.distance) text.push(`distance: ${info.distance}`);
      if (info.damage) text.push(`damage: ${info.damage}`);
      if (info.price) text.push(`price: ${info.price}$`);
      this._description.text = text.join("\n");
    }
  }
}

export class InventoryCellActionsView extends PIXI.Container {
  private readonly selectable: SelectableGrid;
  private readonly selectableOffsetX: number;
  private readonly selectableOffsetY: number;
  private readonly controller: InventoryController;
  private readonly buttons: [Button, number, number][] = [];

  private _cell: InventoryCell | null = null;

  constructor(selectable: SelectableGrid, selectableOffsetX: number, selectableOffsetY: number, controller: InventoryController) {
    super();
    this.selectable = selectable;
    this.selectableOffsetX = selectableOffsetX;
    this.selectableOffsetY = selectableOffsetY;
    this.controller = controller;
  }

  destroy(): void {
    super.destroy();
    this._cell?.item.unsubscribe(this.handle, this);
    this._cell = null;
    this.removeButtons();
  }

  set cell(cell: InventoryCell) {
    this._cell?.item.unsubscribe(this.handle, this);
    this.removeButtons();
    this._cell = cell;
    this._cell.item.subscribe(this.handle, this);
  }

  get cell(): InventoryCell {
    return this._cell!;
  }

  private handle(item: UsableDrop | null): void {
    this.controller.handleActions(this, item);
  }

  removeButtons(): void {
    for (let [button, x, y] of this.buttons) {
      this.selectable.unmerge(x, y);
      this.selectable.remove(x, y);
      button.destroy();
    }
    this.selectable!.reset();
    this.buttons.splice(0, this.buttons.length);
  }

  addButton(label: string, action: () => void): void {
    const total = this.buttons.length;
    const row = total >> 1;
    const cell = total % 2;

    const merge_width = 5;
    const selectableX = this.selectableOffsetX + (cell * merge_width);
    const selectableY = this.selectableOffsetY + 10 + row;
    const button = new Button({
      label: label,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
    });
    button.position.set(
      cell * (BUTTON_WIDTH + Sizes.uiMargin),
      row * (BUTTON_HEIGHT + Sizes.uiMargin)
    );

    this.buttons.push([button, selectableX, selectableY]);
    this.selectable.set(selectableX, selectableY, button, action);
    this.selectable.merge(selectableX, selectableY, merge_width, 1);
    this.addChild(button);
  }
}
