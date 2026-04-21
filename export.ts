import { readdirSync, writeFileSync } from 'fs';

const files: string[] = [
    ...readdirSync('config').filter(file => file.endsWith('.ts')).map(file => `config/${file}`),
    ...readdirSync('game').filter(file => file.endsWith('.ts')).map(file => `game/${file}`),
    ...readdirSync('models').filter(file => file.endsWith('.ts')).map(file => `models/${file}`)
];

const exportLines = files.map(file => `export * from './${file.replace('.ts', '')}'`).join(';\n');

writeFileSync('main.ts', exportLines + ';\n');