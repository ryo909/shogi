import { ShogiGame } from './shogi';
import type { MoveRecord, Player, PieceType } from './types';

// Simple heuristic values
const PIECE_VALUES: Record<PieceType, number> = {
    'P': 100,
    'L': 300,
    'N': 400,
    'S': 500,
    'G': 600,
    'B': 800,
    'R': 1000,
    'K': 10000,
    '+P': 600, // Tokin is Gold
    '+L': 600,
    '+N': 600,
    '+S': 600,
    '+B': 1000, // Horse
    '+R': 1200  // Dragon
};

export const getBestMove = (game: ShogiGame, player: Player): MoveRecord | null => {
    // 1. Get all legal moves
    // We need to iterate all board pieces and hand pieces
    const legalMoves: MoveRecord[] = [];
    const state = game.state;

    // Board Moves
    for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 9; x++) {
            const piece = state.board[y][x];
            if (piece && piece.owner === player) {
                const moves = game.getLegalMoves({ x, y });
                legalMoves.push(...moves);
            }
        }
    }

    // Hand Drops
    const hand = state.hands[player];
    for (const type of Object.keys(hand) as PieceType[]) {
        if (hand[type as keyof typeof hand] > 0) {
            const drops = game.getDropMoves(type, player);
            legalMoves.push(...drops);
        }
    }

    if (legalMoves.length === 0) return null; // Resign

    // 2. Evaluate Moves
    // Priority 1: Checkmate (Capture King) - Though specific King capture checks usually happen during move application.
    // getLegalMoves usually filters self-check, but doesn't guarantee checkmate unless we look ahead.
    // For this simple AI, we just look for high value captures.

    let bestMove = legalMoves[0];
    let maxScore = -Infinity;

    // Randomize slightly to avoid deterministic loops
    const shuffledMoves = legalMoves.sort(() => Math.random() - 0.5);

    for (const move of shuffledMoves) {
        let score = 0;

        // Factor 1: Capture Value
        if (!move.drop) {
            const targetSq = state.board[move.to.y][move.to.x];
            if (targetSq) {
                if (targetSq.type === 'K') return move; // WIN
                score += PIECE_VALUES[targetSq.type];
            }
        }

        // Factor 2: Promotion
        if (move.promoted) {
            score += 200; // Bonus for promoting
        }

        // Factor 3: Safety (very basic)
        // Avoid moving into immediate capture? Too complex for this step.
        // But maybe prefer drops that are aggressive?

        // Factor 4: Center Control (Bonus for moving towards center)
        const distFromCenter = Math.abs(move.to.x - 4) + Math.abs(move.to.y - 4);
        score -= distFromCenter * 10;

        if (score > maxScore) {
            maxScore = score;
            bestMove = move;
        }
    }

    return bestMove;
};
