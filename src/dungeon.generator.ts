import {TinyMonster, tinyMonsterNames} from "./tiny.monster";
import {RNG} from "./rng";
import {TileRegistry} from "./tilemap";
import {HeroState} from "./hero";
import {BossMonster, mossMonsterNames} from "./boss.monster";
import {DungeonScene} from "./dungeon";
import {SceneController} from "./scene";
import {Rect} from "./geometry";
import {DungeonLevel} from "./dungeon.level";
import {TunnelingAlgorithm} from "./tunneling";

const level_size = 200;

export class DungeonGenerator {
  private readonly rng: RNG;
  private readonly registry: TileRegistry;
  private readonly controller: SceneController;
  private readonly scene: DungeonScene;
  private readonly heroState: HeroState;

  constructor(scene: DungeonScene, heroState: HeroState) {
    this.rng = scene.controller.rng;
    this.registry = scene.controller.registry;
    this.controller = scene.controller;
    this.scene = scene;
    this.heroState = heroState;
  }

  generate(level: number): DungeonLevel {
    const monsters_total = 3 + level;
    const drop_total = 5 + level;
    const is_boss = level % 5 === 0;

    const dungeon = new DungeonLevel(this.scene, this.heroState, level, level_size, level_size);

    this.generateRooms(dungeon);

    for (let m = 0; m < monsters_total; m++) {
      this.generateMonster(dungeon, is_boss);
    }
    if (is_boss) {
      this.generateBoss(dungeon);
    }

    for (let d = 0; d < drop_total; d++) {
      this.generateDrop(dungeon);
    }

    const first = dungeon.rooms[0];
    const hero_x = first.x + (first.w >> 1);
    const hero_y = first.y + (first.h >> 1);
    dungeon.hero.resetPosition(hero_x, hero_y);
    dungeon.monsterMap[hero_y][hero_x] = dungeon.hero;
    dungeon.container.sortChildren();
    dungeon.light.loadMap();
    return dungeon;
  }

  generateRooms(dungeon: DungeonLevel): boolean {
    const rooms_total = 1 + dungeon.level;
    const gen = new TunnelingAlgorithm(this.rng, dungeon.width, dungeon.height);
    if (gen.generate(rooms_total)) {
      dungeon.corridorsH.push(...gen.corridorsH);
      dungeon.corridorsV.push(...gen.corridorsV);
      dungeon.rooms.push(...gen.rooms);

      this.fill(dungeon);
      this.replace(dungeon);
      return true;
    }
    return false;
  }

  generateMonster(dungeon: DungeonLevel, isBoss: boolean): void {
    const max_room = dungeon.rooms.length - (isBoss ? 1 : 0);
    if (max_room > 1) {
      const r = this.rng.nextRange(1, max_room);
      const room = dungeon.rooms[r];
      for (let t = 0; t < 10; t++) {
        const x = room.x + this.rng.nextRange(0, room.w);
        const y = room.y + this.rng.nextRange(0, room.h);
        if (!dungeon.monsterMap[y][x]) {
          const name = this.rng.choice(tinyMonsterNames);
          const monster = new TinyMonster(dungeon, x, y, name);
          dungeon.monsters.push(monster);
          dungeon.monsterMap[y][x] = monster;
          break;
        }
      }
    }
  }

  generateBoss(dungeon: DungeonLevel): void {
    const room = dungeon.rooms[dungeon.rooms.length - 1];
    for (let t = 0; t < 10; t++) {
      const x = room.x + this.rng.nextRange(1, room.w - 1);
      const y = room.y + this.rng.nextRange(1, room.h - 1);
      if (
        !dungeon.monsterMap[y][x] && !dungeon.monsterMap[y][x + 1] &&
        !dungeon.monsterMap[y - 1][x] && !dungeon.monsterMap[y - 1][x + 1]
      ) {
        const name = mossMonsterNames[Math.floor(dungeon.level / 5) % mossMonsterNames.length];
        dungeon.boss = new BossMonster(this.registry, dungeon, x, y, name);
        return;
      }
    }
  }

  generateDrop(dungeon: DungeonLevel): void {
    const room = this.rng.choice(dungeon.rooms);
    for (let t = 0; t < 64; t++) {
      const x = room.x + this.rng.nextRange(0, room.w);
      const y = room.y + this.rng.nextRange(0, room.h);
      if (!dungeon.hasDrop(x, y)) {
        dungeon.randomDrop(x, y);
        return;
      }
    }
  }

  fill(dungeon: DungeonLevel): void {
    dungeon.rooms.forEach(r => this.fillRoom(dungeon, r));
    dungeon.corridorsH.forEach(r => this.fillCorridorH(dungeon, r));
    dungeon.corridorsV.forEach(r => this.fillCorridorV(dungeon, r));
  }

  fillRoom(dungeon: DungeonLevel, room: Rect): void {
    const x = room.x;
    const y = room.y;
    const w = room.w;
    const h = room.h;

    // fill floor
    for (let r_y = y; r_y < y + h; r_y++) {
      for (let r_x = x; r_x < x + w; r_x++) {
        dungeon.setFloor(r_x, r_y, 'floor_1.png');
      }
    }

    // fill top wall
    dungeon.setWall(x, y - 2, 'wall_corner_top_left.png');
    dungeon.setWall(x, y - 1, 'wall_corner_left.png');

    if (w > 1) {
      for (let r_x = x + 1; r_x < x + w - 1; r_x++) {
        dungeon.setWall(r_x, y - 2, 'wall_top_mid.png');
        dungeon.setWall(r_x, y - 1, 'wall_mid.png');
      }

      dungeon.setWall(x + w - 1, y - 2, 'wall_corner_top_right.png');
      dungeon.setWall(x + w - 1, y - 1, 'wall_corner_right.png');
    }
    // fill bottom wall
    dungeon.setWall(x, y + h - 1, 'wall_corner_bottom_left.png');
    dungeon.setWall(x, y + h, 'wall_left.png');
    if (w > 1) {
      for (let r_x = x + 1; r_x < x + w - 1; r_x++) {
        dungeon.setWall(r_x, y + h - 1, 'wall_top_mid.png');
        dungeon.setWall(r_x, y + h, 'wall_mid.png');
      }
      dungeon.setWall(x + w - 1, y + h - 1, 'wall_corner_bottom_right.png');
      dungeon.setWall(x + w - 1, y + h, 'wall_right.png');
    }
    // fill right wall
    for (let r_y = y; r_y < y + h - 1; r_y++) {
      dungeon.setWall(x, r_y, 'wall_side_mid_right.png');
    }
    // fill left wall
    for (let r_y = y; r_y < y + h - 1; r_y++) {
      dungeon.setWall(x + w - 1, r_y, 'wall_side_mid_left.png');
    }
  }

  fillCorridorH(dungeon: DungeonLevel, room: Rect): void {
    const x = room.x;
    const y = room.y;
    const w = room.w;
    const h = room.h;

    // fill floor
    for (let r_y = y; r_y < y + h; r_y++) {
      for (let r_x = x; r_x < x + w; r_x++) {
        dungeon.setFloor(r_x, r_y, 'floor_1.png');
      }
    }

    // connect with room top left
    switch (dungeon.wallMap[y - 2][x - 1].name) {
      case 'wall_corner_top_right.png':
        dungeon.setWall(x - 1, y - 2, 'wall_top_mid.png');
        break;
      case 'wall_side_mid_left.png':
        break;
      default:
        console.log('top left 2', dungeon.wallMap[y - 2][x - 1].name);
        break;
    }
    switch (dungeon.wallMap[y - 1][x - 1].name) {
      case 'wall_corner_right.png':
        dungeon.setWall(x - 1, y - 1, 'wall_mid.png');
        break;
      case 'wall_side_mid_left.png':
        dungeon.setWall(x - 1, y - 1, 'wall_side_front_left.png');
        break;
      default:
        console.log('top left 1', dungeon.wallMap[y - 1][x - 1].name);
        break;
    }

    // connect with room mid left
    if (h > 1) {
      for (let l_y = y; l_y < y + h - 1; l_y++) {
        switch (dungeon.wallMap[l_y][x - 1].name) {
          case 'wall_side_mid_left.png':
            dungeon.setWall(x - 1, l_y, null);
            break;
          default:
            console.log('mid left', dungeon.wallMap[l_y][x - 1].name);
            break;
        }
      }
    }

    // connect with room bottom left
    switch (dungeon.wallMap[y + h - 1][x - 1].name) {
      case 'wall_side_mid_left.png':
        dungeon.setWall(x - 1, y + h - 1, 'wall_side_top_left.png');
        break;
      case 'wall_corner_bottom_right.png':
        dungeon.setWall(x - 1, y + h - 1, 'wall_top_mid.png');
        break;
      default:
        console.log('bottom left 0', dungeon.wallMap[y + h - 1][x - 1].name);
        break;
    }
    switch (dungeon.wallMap[y + h][x - 1].name) {
      case 'wall_side_mid_left.png':
        break;
      case 'wall_right.png':
        dungeon.setWall(x - 1, y + h, 'wall_mid.png');
        break;
      default:
        console.log('bottom left 1', dungeon.wallMap[y + h][x - 1].name);
        break;
    }

    // connect with room top right
    switch (dungeon.wallMap[y - 2][x + w].name) {
      case 'wall_corner_top_left.png':
        dungeon.setWall(x + w, y - 2, 'wall_top_mid.png');
        break;
      case 'wall_side_mid_right.png':
        break;
      default:
        console.log('top right 2', dungeon.wallMap[y - 2][x + w].name);
        break;
    }
    switch (dungeon.wallMap[y - 1][x + w].name) {
      case 'wall_corner_left.png':
        dungeon.setWall(x + w, y - 1, 'wall_mid.png');
        break;
      case 'wall_side_mid_right.png':
        dungeon.setWall(x + w, y - 1, 'wall_side_front_right.png');
        break;
      default:
        console.log('top right 1', dungeon.wallMap[y - 1][x + w].name);
        break;
    }

    // connect with room mid right
    if (h > 1) {
      for (let l_y = y; l_y < y + h - 1; l_y++) {
        switch (dungeon.wallMap[l_y][x + w].name) {
          case 'wall_side_mid_right.png':
            dungeon.setWall(x + w, l_y, null);
            break;
          default:
            console.log('mid right', dungeon.wallMap[l_y][x + w].name);
            break;
        }
      }
    }

    // connect with room bottom right
    switch (dungeon.wallMap[y + h - 1][x + w].name) {
      case 'wall_side_mid_right.png':
        dungeon.setWall(x + w, y + h - 1, 'wall_side_top_right.png');
        break;
      case 'wall_corner_bottom_left.png':
        dungeon.setWall(x + w, y + h - 1, 'wall_top_mid.png');
        break;
      default:
        console.log('bottom right 0', dungeon.wallMap[y + h - 1][x + w].name);
        break;
    }
    switch (dungeon.wallMap[y + h][x + w].name) {
      case 'wall_side_mid_right.png':
        break;
      case 'wall_left.png':
        dungeon.setWall(x + w, y + h, 'wall_mid.png');
        break;
      default:
        console.log('bottom right +1', dungeon.wallMap[y + h][x + w].name);
        break;
    }

    // fill top wall
    for (let r_x = x; r_x < x + w; r_x++) {
      dungeon.setWall(r_x, y - 2, 'wall_top_mid.png');
      dungeon.setWall(r_x, y - 1, 'wall_mid.png');
    }

    // fill bottom wall
    for (let r_x = x; r_x < x + w; r_x++) {
      dungeon.setWall(r_x, y + h - 1, 'wall_top_mid.png');
      dungeon.setWall(r_x, y + h, 'wall_mid.png');
    }
  }

  fillCorridorV(dungeon: DungeonLevel, room: Rect): void {
    const x = room.x;
    const y = room.y;
    const w = room.w;
    const h = room.h;

    // fill floor
    for (let r_y = y; r_y < y + h; r_y++) {
      for (let r_x = x; r_x < x + w; r_x++) {
        dungeon.setFloor(r_x, r_y, 'floor_1.png');
      }
    }

    // connect with room top left
    switch (dungeon.wallMap[y - 1][x - 1].name) {
      case 'wall_top_mid.png':
        dungeon.setWall(x - 1, y - 1, 'wall_corner_top_right.png');
        break;
      default:
        console.log('top left -1 -1', dungeon.wallMap[y - 1][x - 1].name);
        break;
    }
    switch (dungeon.wallMap[y][x - 1].name) {
      case 'wall_mid.png':
        dungeon.setWall(x - 1, y, 'wall_corner_right.png');
        break;
      default:
        console.log('top left 0 -1', dungeon.wallMap[y][x - 1].name);
        break;
    }

    // connect with room top mid
    for (let r_x = x; r_x < x + w; r_x++) {
      switch (dungeon.wallMap[y - 1][r_x].name) {
        case 'wall_top_mid.png':
          dungeon.setWall(r_x, y - 1, null);
          break;
        default:
          console.log('top mid -1', dungeon.wallMap[y - 1][r_x].name);
          break;
      }
      switch (dungeon.wallMap[y][r_x].name) {
        case 'wall_mid.png':
          dungeon.setWall(r_x, y, null);
          break;
        default:
          console.log('top mid 0', dungeon.wallMap[y][r_x].name);
          break;
      }
    }

    // connect with room top right
    switch (dungeon.wallMap[y - 1][x + w].name) {
      case 'wall_top_mid':
        dungeon.setWall(x + w, y - 1, 'wall_corner_top_left');
        break;
      default:
        console.log('top right -1 1', dungeon.wallMap[y - 1][x + w].name);
        break;
    }
    switch (dungeon.wallMap[y][x + w].name) {
      case 'wall_mid.png':
        dungeon.setWall(x + w, y, 'wall_corner_left.png');
        break;
      default:
        console.log('top right 0 -1', dungeon.wallMap[y][x + w].name);
        break;
    }


    // connect with room bottom left
    switch (dungeon.wallMap[y + h - 2][x - 1].name) {
      case 'wall_top_mid.png':
        dungeon.setWall(x - 1, y + h - 2, 'wall_corner_bottom_right.png');
        break;
      default:
        console.log('bottom left -2 -1', dungeon.wallMap[y + h - 2][x - 1].name);
        break;
    }
    switch (dungeon.wallMap[y + h - 1][x - 1].name) {
      case 'wall_mid.png':
        dungeon.setWall(x - 1, y + h - 1, 'wall_corner_front_right.png');
        break;
      default:
        console.log('top left 0 -1', dungeon.wallMap[y + h - 1][x - 1].name);
        break;
    }

    // connect with room bottom mid
    for (let r_x = x; r_x < x + w; r_x++) {
      switch (dungeon.wallMap[y + h - 2][r_x].name) {
        case 'wall_top_mid.png':
          dungeon.setWall(r_x, y + h - 2, null);
          break;
        default:
          console.log('bottom mid -2', dungeon.wallMap[y + h - 2][r_x].name);
          break;
      }
      switch (dungeon.wallMap[y + h - 1][r_x].name) {
        case 'wall_mid.png':
          dungeon.setWall(r_x, y + h - 1, null);
          break;
        default:
          console.log('bottom mid -1', dungeon.wallMap[y + h - 1][r_x].name);
          break;
      }
    }

    // connect with room bottom right
    switch (dungeon.wallMap[y + h - 2][x + w].name) {
      case 'wall_top_mid.png':
        dungeon.setWall(x + w, y + h - 2, 'wall_corner_bottom_left.png');
        break;
      default:
        console.log('bottom right -2 -1', dungeon.wallMap[y + h - 2][x - 1].name);
        break;
    }
    switch (dungeon.wallMap[y + h - 1][x + w].name) {
      case 'wall_mid.png':
        dungeon.setWall(x + w, y + h - 1, 'wall_corner_front_left.png');
        break;
      default:
        console.log('bottom right 0 -1', dungeon.wallMap[y + h - 1][x - 1].name);
        break;
    }

    // fill side walls
    for (let r_y = y + 1; r_y < y + h - 2; r_y++) {
      dungeon.setWall(x - 1, r_y, 'wall_side_mid_left.png');
      dungeon.setWall(x + w, r_y, 'wall_side_mid_right.png');
    }
  }

  replace(dungeon: DungeonLevel): void {
    this.replaceFloorRandomly(dungeon);
    this.replaceLadder(dungeon);
    this.replaceWallRandomly(dungeon);
  }

  replaceFloorRandomly(dungeon: DungeonLevel) {
    const replacements = ['floor_2.png', 'floor_3.png', 'floor_4.png', 'floor_5.png', 'floor_6.png', 'floor_7.png', 'floor_8.png'];
    const percent = 0.2;
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        if (dungeon.floorMap[y][x] && this.rng.nextFloat() < percent) {
          dungeon.setFloor(x, y, this.rng.choice(replacements));
        }
      }
    }
  };

  replaceLadder(dungeon: DungeonLevel) {
    // replace one tile in last room as ladder = out from level!
    const last = dungeon.rooms[dungeon.rooms.length - 1];
    const ladder_x = last.x + (last.w >> 1);
    const ladder_y = last.y + (last.h >> 1);
    dungeon.setFloor(ladder_x, ladder_y, 'floor_ladder.png');
  };

  replaceWallRandomly(dungeon: DungeonLevel) {
    const wall_mid_top_replaces = [
      'wall_hole_1.png',
      'wall_hole_2.png',
      'wall_banner_red.png',
      'wall_banner_blue.png',
      'wall_banner_green.png',
      'wall_banner_yellow.png',
      'wall_goo.png',
      'wall_fountain_mid_red',
      'wall_fountain_mid_blue',
    ];
    const wall_mid_bottom_replaces = [
      'wall_hole_1.png',
      'wall_hole_2.png',
    ];
    const percent = 0.2;
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        if (dungeon.wallMap[y][x]) {
          switch (dungeon.wallMap[y][x].name) {
            case 'wall_mid.png':
              if (this.rng.nextFloat() < percent) {
                const is_top = !!dungeon.floorMap[y + 1][x];
                let replacements: string[];
                if (is_top) {
                  replacements = wall_mid_top_replaces;
                } else {
                  replacements = wall_mid_bottom_replaces;
                }
                const replacement = this.rng.choice(replacements);
                switch (replacement) {
                  case 'wall_goo.png':
                    dungeon.setWall(x, y, 'wall_goo.png');
                    dungeon.setFloor(x, y + 1, 'wall_goo_base.png');
                    break;
                  case 'wall_fountain_mid_red':
                    dungeon.setWall(x, y - 1, 'wall_fountain_top.png');
                    dungeon.setWall(x, y, 'wall_fountain_mid_red');
                    dungeon.setFloor(x, y + 1, 'wall_fountain_basin_red');
                    break;
                  case 'wall_fountain_mid_blue':
                    dungeon.setWall(x, y - 1, 'wall_fountain_top.png');
                    dungeon.setWall(x, y, 'wall_fountain_mid_blue');
                    dungeon.setFloor(x, y + 1, 'wall_fountain_basin_blue');
                    break;
                  default:
                    dungeon.setWall(x, y, replacement);
                    break;
                }
              }
              break;
            default:
              // console.log('replace', dungeon.wallMap[y][x]);
              break;
          }
        }
      }
    }
  };
}