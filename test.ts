import { randomUUID } from 'uncrypto';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { Player } from './models/Player';
import { Hand } from './models/Hand';
import { Game } from './game/Game';
import { Casino } from './game/Casino';
import { GameState } from './game/GameState';
import { DEFAULT_GAME_CONFIG } from './config/GameConfig';
import { DEFAULT_ECONOMY_CONFIG } from './config/EconomyConfig';

const rl = readline.createInterface({ input, output });

const gameConfig = DEFAULT_GAME_CONFIG;
const economyConfig = DEFAULT_ECONOMY_CONFIG;

Casino.init(economyConfig.bankroll);

const player = new Player(randomUUID(), 'Li', economyConfig.initialBalance);
const game = new Game([player], gameConfig, economyConfig);

function renderHand(hand: Hand, label: string): string {
    const cards = [...hand].map(c => `${c.rank}${c.symbol}`).join(' ');
    return `${label} [${cards}] => ${hand.score}${hand.isBust ? ' (BUST)' : ''}${hand.isBlackjack ? ' (BLACKJACK)' : ''}`;
}

function findActiveHandIndex(roundHandCount: number, getHand: (i: number) => Hand | undefined): number {
    for (let i = 0; i < roundHandCount; i++) {
        const hand = getHand(i);
        if (hand && !hand.isBust && hand.score < gameConfig.bustThreshold) return i;
    }
    return -1;
}

function isSplittable(hand: Hand): boolean {
    const [first, second] = [...hand];
    return hand.size === 2 && !!first && !!second && first.rank === second.rank;
}

function isDoublable(hand: Hand, fromSplit: boolean): boolean {
    if (hand.size !== 2) return false;
    if (fromSplit && !gameConfig.allowDoubleAfterSplit) return false;
    if (gameConfig.doubleOnly.length > 0 && !gameConfig.doubleOnly.includes(hand.score)) return false;
    return true;
}

function availableActions(hand: Hand, handCount: number, fromSplit: boolean): string {
    const actions = ['h=hit', 's=stand'];
    if (isDoublable(hand, fromSplit)) actions.push('d=double');
    if (isSplittable(hand) && handCount < gameConfig.maxSplitHands) actions.push('p=split');
    return actions.join(', ');
}

async function playRound(): Promise<void> {
    game.startRound();
    const round = game.rounds[game.rounds.length - 1]!;

    let betAmount = NaN;
    while (Number.isNaN(betAmount) || betAmount <= 0) {
        const raw = await rl.question(`Balance: ${player.balance} | Mise ? `);
        betAmount = Number(raw);
        try {
            round.bet(player.id, betAmount);
        } catch (err) {
            console.log((err as Error).message);
            betAmount = NaN;
        }
    }

    while (round.state === GameState.PLAYER) {
        const handCount = round.handCount(player.id);
        const activeIndex = findActiveHandIndex(handCount, i => round.findHand(player.id, i));

        console.log('\n--- Dealer ---');
        console.log(renderHand(round.dealerHand, 'Dealer'));
        console.log('--- Tes mains ---');
        for (let i = 0; i < handCount; i++) {
            const hand = round.findHand(player.id, i)!;
            const marker = i === activeIndex ? '>' : ' ';
            console.log(`${marker} ${renderHand(hand, `Main ${i + 1} (mise ${round.getBet(player.id, i)})`)}`);
        }

        const activeHand = round.findHand(player.id, activeIndex)!;
        const activeFromSplit = round.isFromSplit(player.id, activeIndex);
        const answer = (await rl.question(`Action ? (${availableActions(activeHand, handCount, activeFromSplit)}) `)).trim().toLowerCase();

        try {
            switch (answer) {
                case 'h': round.hit(player.id); break;
                case 's': round.stand(player.id); break;
                case 'd': round.double(player.id); break;
                case 'p': round.split(player.id); break;
                default: console.log('Entrée invalide.');
            }
        } catch (err) {
            console.log((err as Error).message);
        }
    }

    console.log('\n=== Résultat ===');
    console.log(renderHand(round.dealerHand, 'Dealer'));
    for (let i = 0; i < round.handCount(player.id); i++) {
        const hand = round.findHand(player.id, i)!;
        const outcome = round.findOutcome(player.id, i);
        console.log(`${renderHand(hand, `Main ${i + 1}`)} -> ${outcome}`);
    }
    console.log(`Balance: ${player.balance} | Casino: ${Casino.instance.balance}`);
}

async function main(): Promise<void> {
    while (true) {
        await playRound();

        if (player.balance < economyConfig.minBet) {
            console.log('Plus assez de solde pour continuer.');
            break;
        }

        const again = (await rl.question('\nRejouer ? (o/n) ')).trim().toLowerCase();
        if (again !== 'o') break;
    }

    rl.close();
}

main();