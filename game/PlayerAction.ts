export type PlayerAction = 
    | { type: 'PLACE_BET'; amount: number }
    | { type: 'HIT' }
    | { type: 'STAND' }
    | { type: 'SPLIT' }
    | { type: 'DOUBLE' }