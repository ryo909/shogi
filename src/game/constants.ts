import type { PieceType, Player } from './types';

export const BOARD_SIZE = 9;

export const INITIAL_HAND = {
    P: 0, L: 0, N: 0, S: 0, G: 0, B: 0, R: 0
};

// Standard Shogi Initial Layout
// 9 8 7 6 5 4 3 2 1
// L N S G K G S N L  (1)
// . R . . . . . B .  (2)
// P P P P P P P P P  (3)
// . . . . . . . . .  (4)
// . . . . . . . . .  (5)
// . . . . . . . . .  (6)
// P P P P P P P P P  (7)
// . B . . . . . R .  (8)
// L N S G K G S N L  (9) (Sente)

// We represent this as a 9x9 array where [0][0] is 9一 (9,1) in shogi coordinate, top-left visual.
// But wait, standard shogi notation:
// Files: 9 -> 1 (Right to Left)
// Ranks: 一 -> 九 (Top to Bottom)
// array[y][x]: y is Rank (0=一), x is File (0=9, 8=1)

const SENTE: Player = 'sente';
const GOTE: Player = 'gote';

export const INITIAL_BOARD_LAYOUT: { type: PieceType; owner: Player; x: number; y: number }[] = [
    // GOTE (Top)
    { type: 'L', owner: GOTE, x: 0, y: 0 }, { type: 'N', owner: GOTE, x: 1, y: 0 }, { type: 'S', owner: GOTE, x: 2, y: 0 }, { type: 'G', owner: GOTE, x: 3, y: 0 }, { type: 'K', owner: GOTE, x: 4, y: 0 }, { type: 'G', owner: GOTE, x: 5, y: 0 }, { type: 'S', owner: GOTE, x: 6, y: 0 }, { type: 'N', owner: GOTE, x: 7, y: 0 }, { type: 'L', owner: GOTE, x: 8, y: 0 },
    { type: 'R', owner: GOTE, x: 1, y: 1 }, { type: 'B', owner: GOTE, x: 7, y: 1 },
    { type: 'P', owner: GOTE, x: 0, y: 2 }, { type: 'P', owner: GOTE, x: 1, y: 2 }, { type: 'P', owner: GOTE, x: 2, y: 2 }, { type: 'P', owner: GOTE, x: 3, y: 2 }, { type: 'P', owner: GOTE, x: 4, y: 2 }, { type: 'P', owner: GOTE, x: 5, y: 2 }, { type: 'P', owner: GOTE, x: 6, y: 2 }, { type: 'P', owner: GOTE, x: 7, y: 2 }, { type: 'P', owner: GOTE, x: 8, y: 2 },

    // SENTE (Bottom)
    { type: 'P', owner: SENTE, x: 0, y: 6 }, { type: 'P', owner: SENTE, x: 1, y: 6 }, { type: 'P', owner: SENTE, x: 2, y: 6 }, { type: 'P', owner: SENTE, x: 3, y: 6 }, { type: 'P', owner: SENTE, x: 4, y: 6 }, { type: 'P', owner: SENTE, x: 5, y: 6 }, { type: 'P', owner: SENTE, x: 6, y: 6 }, { type: 'P', owner: SENTE, x: 7, y: 6 }, { type: 'P', owner: SENTE, x: 8, y: 6 },
    { type: 'B', owner: SENTE, x: 1, y: 7 }, { type: 'R', owner: SENTE, x: 7, y: 7 },
    { type: 'L', owner: SENTE, x: 0, y: 8 }, { type: 'N', owner: SENTE, x: 1, y: 8 }, { type: 'S', owner: SENTE, x: 2, y: 8 }, { type: 'G', owner: SENTE, x: 3, y: 8 }, { type: 'K', owner: SENTE, x: 4, y: 8 }, { type: 'G', owner: SENTE, x: 5, y: 8 }, { type: 'S', owner: SENTE, x: 6, y: 8 }, { type: 'N', owner: SENTE, x: 7, y: 8 }, { type: 'L', owner: SENTE, x: 8, y: 8 },
];

export const PIECE_NAMES: Record<PieceType, string> = {
    'P': '歩', 'L': '香', 'N': '桂', 'S': '銀', 'G': '金', 'B': '角', 'R': '飛', 'K': '玉',
    '+P': 'と', '+L': '成香', '+N': '成桂', '+S': '成銀', '+B': '馬', '+R': '龍'
};

// Movement Definitions (dx, dy) from SENTE perspective.
// dy: -1 is forward (up)
export const MOVES: Record<PieceType, { x: number; y: number }[]> = {
    'P': [{ x: 0, y: -1 }],
    'L': [], // Special handling for sliding
    'N': [{ x: -1, y: -2 }, { x: 1, y: -2 }],
    'S': [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }],
    'G': [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    'B': [], // Special sliding
    'R': [], // Special sliding
    'K': [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    '+P': [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], // Like Gold
    '+L': [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], // Like Gold
    '+N': [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], // Like Gold
    '+S': [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], // Like Gold
    '+B': [], // Bishop + King moves
    '+R': [], // Rook + King moves
};
