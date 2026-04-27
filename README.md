# Golden Jack Game Engine
An all-in-one blackjack engine providing a turn-based game flow.

This game engine is developped to work along a Nuxt WebApp.
### Installation
Configure a `.npmrc` to use Github Packages :
```npm
@golden-jack:registry=https://npm.pkg.github.com
```
Then install the package :
```sh
npm install @golden-jack/engine
```
Will soon be usable via npm packages.
### Usage
Basic usage :
```ts
import {
    DEFAULT_GAME_CONFIG, DEFAULT_ECONOMY_CONFIG,
    GameConfig, EconomyConfig,
    Casino, Player, Game
} from '@golden-jack/engine';

const gameConfig: GameConfig = DEFAULT_GAME_CONFIG;
const economyConfig: EconomyConfig = DEFAULT_ECONOMY_CONFIG;

Casino.init(gameConfig);

const player: Player = new Player('random-id', 'username', economyConfig.initialBalance);
const game: Game = new Game([player], gameConfig, economyConfig);

game.startRound();
```
### License
This project is licensed under MIT License. See the [LICENSE](LICENSE) for details.