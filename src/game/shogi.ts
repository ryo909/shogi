import type { ActiveEvent, BoardState, GameState, Hand, MoveRecord, Piece, PieceType, Player, Position } from './types';
import { BOARD_SIZE, INITIAL_BOARD_LAYOUT, INITIAL_HAND, MOVES } from './constants';
import { TRUMP_CARDS, EVENTS } from './data';

export class ShogiGame {
    state: GameState;

    constructor() {
        this.state = this.getInitialState();
    }

    getInitialState(): GameState {
        const board: BoardState = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

        INITIAL_BOARD_LAYOUT.forEach(p => {
            // Shogi coordinates: p.x is 0-8 (9-1), p.y is 0-8 (一-九)
            board[p.y][p.x] = {
                type: p.type,
                owner: p.owner,
                id: `${p.owner}-${p.type}-${p.x}-${p.y}` // simple unique ID
            };
        });

        return {
            board,
            hands: {
                sente: { ...INITIAL_HAND },
                gote: { ...INITIAL_HAND },
            },
            turn: 'sente',
            ply: 1,
            history: [],
            trumpCards: {
                sente: { chosenCardId: null, used: false },
                gote: { chosenCardId: null, used: false },
            },
            events: {
                active: [],
                nextPreview: [],
            },
            winner: null,
        };
    }

    // Get piece at position
    getPiece(pos: Position): Piece | null {
        if (!this.isValidPos(pos)) return null;
        return this.state.board[pos.y][pos.x];
    }

    isValidPos(pos: Position): boolean {
        return pos.x >= 0 && pos.x < BOARD_SIZE && pos.y >= 0 && pos.y < BOARD_SIZE;
    }

    // Check if a move is pseudo-legal (geometry + obstructions + friendly fire).
    // Does NOT check for King safety (Check).
    getDir(from: Position, to: Position): { x: number, y: number } {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        return {
            x: dx === 0 ? 0 : dx / Math.abs(dx),
            y: dy === 0 ? 0 : dy / Math.abs(dy)
        };
    }

    // Check Active Effects helper
    hasEffect(id: string): ActiveEvent | undefined {
        return this.state.events.active.find(e => e.id === id);
    }

    // Check if a piece is involved in a targeted effect (like Pin)
    isPiecePinned(pieceId: string): boolean {
        const pin = this.hasEffect('BTN_PIN');
        return !!(pin && pin.data && pin.data.targetPieceId === pieceId);
    }

    getLegalMoves(pos: Position): MoveRecord[] {
        const piece = this.getPiece(pos);
        if (!piece) return [];
        // Only current turn player can move
        if (piece.owner !== this.state.turn) return [];

        // Check Pin
        if (this.isPiecePinned(piece.id)) return [];

        const moves: MoveRecord[] = [];
        const isSente = piece.owner === 'sente';

        // Checkpoint Check
        const checkpoint = this.hasEffect('BTN_CHECKPOINT');
        const forbidPos = checkpoint?.data?.targetPos;

        // Escort logic is handle in OPPONENT'S capture logic (which is implicitly filtered? No, explicit capture check)
        // See "Captured" logic in applyMove. But getLegalMoves generates candidate moves.
        // If I try to capture an Escorted piece, is it illegal? Or just "bounce"?
        // Usually in Shogi variants, if you can't capture, you can't move to that square if occupied.
        // So we need to check if target is Immune.

        // Event: EV_DARKNESS (Limit Ranged Moves)
        const darkness = this.hasEffect('EV_DARKNESS');
        const rangeLimit = darkness ? 3 : 99;

        // Pursuit Logic: If PURSUIT active, maybe only the pieces that captured can move? 
        // Or wait, PURSUIT is "If you capture, you get another move". That's a "Turn Logic" change.
        // Meaning: AFTER capture, turn doesn't swap.
        // Implementation: update applyMove to NOT swap turn if Pursuit active + capture occurred.
        // But here in getLegalMoves, standard rules apply.

        // Event: EV_EXHAUST (No consecutive moves)
        // Need to check last move.
        const exhaust = this.hasEffect('EV_EXHAUST');
        if (exhaust && this.state.history.length > 0) {
            const lastMove = this.state.history[this.state.history.length - 1];
            if (lastMove.player === piece.owner && !lastMove.drop) {
                // How to track "same piece"? ID check.
                // We don't store ID in MoveRecord easily, but we can infer for now or assume piece type matching isn't enough.
                // Actually, if we want strict ID check, we need to look up board?
                // Wait, pieces move. ID is persistent.
                // If last move moved Piece ID X, checking Piece ID X now is valid.
                // Problem: MoveRecord doesn't store ID.
                // Workaround: We can't implement EXHAUST perfectly without ID in history.
                // Let's rely on strict matching if possible or skip for MVP.
                // Note: ID was added to BoardState piece objects.
            }
        }

        // 1. Standard Moves (Step & Slide)
        const defs = MOVES[piece.type];

        // Helper to add move if valid
        const tryAddMove = (tx: number, ty: number) => {
            if (tx < 0 || tx >= BOARD_SIZE || ty < 0 || ty >= BOARD_SIZE) return false; // Out of bounds

            // Checkpoint Forbid
            if (forbidPos && tx === forbidPos.x && ty === forbidPos.y) return false;

            const targetSq = this.state.board[ty][tx];
            if (targetSq && targetSq.owner === piece.owner) return false; // Blocked by friend

            // Check Escort (Immunity)
            if (targetSq) {
                // If target has ESCORT effect?
                const escort = this.state.events.active.find(e => e.id === 'BTN_ESCORT' && e.data.targetPieceId === targetSq.id);
                if (escort) return false; // Cannot capture -> Cannot move there (blocked)
            }

            // Promotion Check
            // Zone: Sente (y=0,1,2), Gote (y=6,7,8)
            const isPromotionZone = isSente ? ty <= 2 : ty >= 6;
            const fromZone = isSente ? pos.y <= 2 : pos.y >= 6;
            const canPromote = ['P', 'L', 'N', 'S', 'R', 'B'].includes(piece.type) && (isPromotionZone || fromZone);

            // Force Promotion (Dead end)
            const isDeadEnd = (piece.type === 'P' || piece.type === 'L') && (isSente ? ty === 0 : ty === 8)
                || (piece.type === 'N' && (isSente ? ty <= 1 : ty >= 7));

            if (canPromote) {
                if (isDeadEnd) {
                    moves.push({ ply: this.state.ply, player: piece.owner, from: pos, to: { x: tx, y: ty }, piece: piece.type, promoted: true, captured: targetSq?.type });
                } else {
                    // Can promote or stay
                    moves.push({ ply: this.state.ply, player: piece.owner, from: pos, to: { x: tx, y: ty }, piece: piece.type, promoted: true, captured: targetSq?.type });
                    moves.push({ ply: this.state.ply, player: piece.owner, from: pos, to: { x: tx, y: ty }, piece: piece.type, promoted: false, captured: targetSq?.type });
                }
            } else {
                moves.push({ ply: this.state.ply, player: piece.owner, from: pos, to: { x: tx, y: ty }, piece: piece.type, promoted: false, captured: targetSq?.type });
            }

            return !targetSq; // Continue sliding if empty
        };

        if (['R', 'B', 'L', '+R', '+B'].includes(piece.type)) {
            // Sliding Logic
            const directions: { x: number, y: number }[] = [];
            if (piece.type === 'L') directions.push({ x: 0, y: isSente ? -1 : 1 });
            if (['R', '+R'].includes(piece.type)) directions.push({ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 });
            if (['B', '+B'].includes(piece.type)) directions.push({ x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 });

            const limit = ['R', 'B'].includes(piece.type) ? rangeLimit : 99;

            directions.forEach(d => {
                let k = 1;
                while (k <= limit) {
                    const tx = pos.x + d.x * k;
                    const ty = pos.y + d.y * k;
                    if (!tryAddMove(tx, ty)) break; // Stop if blocked or OOB
                    k++;
                }
            });

            // King moves for +R, +B
            if (piece.type === '+R') { /* Diagonals 1 step handled by step logic below? No, separate definition needed or mix */
                // +R is R + K. R handles Orthogonal slide. We need Diagonal step.
                [{ x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }].forEach(d => tryAddMove(pos.x + d.x, pos.y + d.y));
            }
            if (piece.type === '+B') {
                // +B is B + K. B handles Diagonal slide. We need Orthogonal step.
                [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }].forEach(d => tryAddMove(pos.x + d.x, pos.y + d.y));
            }

        } else {
            // Step Logic
            // +L, +N, +S, +P use Gold moves defined in MOVES
            defs.forEach(d => {
                // Adjust for owner
                const dx = d.x;
                const dy = isSente ? d.y : -d.y;
                tryAddMove(pos.x + dx, pos.y + dy);
            });
        }

        // TODO: Filter moves that result in Self-Check (Illegal)
        // This requires simulating the move and checking isKingInCheck()

        return moves;
    }

    getDropMoves(piece: PieceType, player: Player): MoveRecord[] {
        // Event: EV_INSPECTION (Forbid Drop)
        if (this.hasEffect('EV_INSPECTION')) return [];

        // Basic drop logic
        // 1. Cannot drop on occupied square
        // 2. Nifu (Pawn) check
        // 3. Drop Pawn Mate (Uchi-Fuzume) - checking this is expensive, maybe skip for MVP or warn?
        // 4. Dead end drop (P, L, N)

        const moves: MoveRecord[] = [];
        const isSente = player === 'sente';

        // Nifu Check
        if (piece === 'P') {
            for (let x = 0; x < BOARD_SIZE; x++) {
                // Check if this file has a unpromoted Pawn of same owner
                let hasPawn = false;
                for (let y = 0; y < BOARD_SIZE; y++) {
                    const sq = this.state.board[y][x];
                    if (sq && sq.owner === player && sq.type === 'P') {
                        hasPawn = true;
                        break;
                    }
                }
                if (hasPawn) continue; // Skip this file

                // Add drops for this file
                for (let y = 0; y < BOARD_SIZE; y++) {
                    if (!this.state.board[y][x]) {
                        if (isSente && y === 0) continue; // Dead end
                        if (!isSente && y === 8) continue; // Dead end
                        moves.push({ ply: this.state.ply, player, from: 'hand', to: { x, y }, piece });
                    }
                }
            }
        } else {
            // Other pieces
            for (let y = 0; y < BOARD_SIZE; y++) {
                for (let x = 0; x < BOARD_SIZE; x++) {
                    if (!this.state.board[y][x]) {
                        // Dead end check
                        if (piece === 'L' && (isSente ? y === 0 : y === 8)) continue;
                        if (piece === 'N' && (isSente ? y <= 1 : y >= 7)) continue;
                        moves.push({ ply: this.state.ply, player, from: 'hand', to: { x, y }, piece });
                    }
                }
            }
        }

        return moves;
    }

    // Pure logic to generate a new state from a move (for validation or preview)
    // Does NOT check validity itself, just applies.
    applyMove(prevState: GameState, move: MoveRecord): GameState {
        const nextState: GameState = JSON.parse(JSON.stringify(prevState)); // Deep clone simple state
        const { from, to, player, piece, promoted, drop } = move;

        // --- Logic to check for Capture BEFORE modifying board ---
        let capturedAny = false;
        let capturedPieceId: string | undefined; // For Bounty

        if (!drop) {
            if (typeof from !== 'object') throw new Error("Move source error");
            const targetSq = nextState.board[to.y][to.x];
            if (targetSq) {
                // WIN Check
                if (targetSq.type === 'K') {
                    nextState.winner = player;
                }

                capturedAny = true;
                capturedPieceId = targetSq.id;

                // Add to hand
                const capturedType = targetSq.type.replace('+', '') as keyof Hand;

                // Effect: BTN_SCORCHED (Deny Capture)
                // Check if opponent (owner of captured piece) has Scorched active
                const opp = player === 'sente' ? 'gote' : 'sente';
                const scorched = nextState.events.active.find(e => e.id === 'BTN_SCORCHED' && e.data.owner === opp);

                if (scorched) {
                    // Destroy piece, do not add to hand
                    // Remove event
                    nextState.events.active = nextState.events.active.filter(e => e !== scorched);
                } else {
                    nextState.hands[player][capturedType]++;

                    // Effect: BTN_BOUNTY?
                    // "If marked piece captured, reward Marker."
                    const bounty = nextState.events.active.find(e => e.id === 'BTN_BOUNTY' && e.data.targetPieceId === capturedPieceId);
                    if (bounty) {
                        const markerOwner = bounty.data.markerOwner as Player;
                        nextState.hands[markerOwner]['P']++; // Reward Pawn
                        nextState.events.active = nextState.events.active.filter(e => e !== bounty);
                    }

                    // Effect: EV_WARDRUM
                    const wardrum = nextState.events.active.find(e => e.id === 'EV_WARDRUM');
                    if (wardrum) {
                        nextState.hands[player]['P']++;
                    }
                }
            }
        } else {
            // Drop logic
            const dropPiece = piece as keyof Hand;
            nextState.hands[player][dropPiece]--;

            // Double Deploy tracking
            const dd = nextState.events.active.find(e => e.id === 'BTN_DOUBLEDEPLOY' && e.data.owner === player);
            if (dd) {
                dd.data.dropsCount = (dd.data.dropsCount || 0) + 1;
            }
        }

        // --- Apply Board Changes ---
        if (drop) {
            nextState.board[to.y][to.x] = {
                type: piece,
                owner: player,
                id: `${player}-${piece}-dropped-${nextState.ply}-${Math.random().toString(36).substr(2, 5)}`
            };
        } else {
            if (typeof from !== 'object') throw new Error("Move source error");
            const movingPiece = nextState.board[from.y][from.x];
            nextState.board[from.y][from.x] = null;
            if (movingPiece) {
                movingPiece.type = promoted ? ('+' + movingPiece.type) as PieceType : movingPiece.type;
                nextState.board[to.y][to.x] = movingPiece;
            }
        }

        nextState.history.push(move);
        nextState.ply++; // Ply always increases to track time? Or only on turn change? 
        // Usually Ply = Half-move. If Same player moves again, strictly speaking it's a new "move" but usually Ply count implies turn swap.
        // Let's increment Ply always for history uniqueness.

        // --- Turn Change Logic ---
        let swapTurn = true;

        // Effect: PURSUIT
        const pursuit = nextState.events.active.find(e => e.id === 'BTN_PURSUIT' && e.data.owner === player);
        if (pursuit && capturedAny) {
            // Grant extra move?
            // "One time only". Remove event.
            nextState.events.active = nextState.events.active.filter(e => e !== pursuit);
            swapTurn = false; // STAY Same Turn
            // TODO: UI needs to know this? "Extra Move!"
        }

        // Effect: DOUBLE DEPLOY
        const doubleDeploy = nextState.events.active.find(e => e.id === 'BTN_DOUBLEDEPLOY' && e.data.owner === player);
        if (doubleDeploy && drop) {
            if (doubleDeploy.data.dropsCount < 2) {
                swapTurn = false;
            } else {
                // Used up 2 drops.
            }
        }

        if (swapTurn) {
            nextState.turn = nextState.turn === 'sente' ? 'gote' : 'sente';

            // Decrement Active Events Duration ONLY ON TURN SWAP?
            // Or Ply based?
            // If Ply increases, Duration decreases.
            // If we didn't swap turn, did Ply increase? Yes.
            // So Duration logic handles itself via Ply.
        }

        // Event Triggers (Ply based)
        // If we have extra moves, Ply increases faster. That's fine.
        if (nextState.ply === 8 || nextState.ply === 16) {
            this.activateRandomEvent(nextState);
        } else if (nextState.ply === 7 || nextState.ply === 15) {
            this.generateEventCandidates(nextState);
        }

        // Decrement Duration
        nextState.events.active = nextState.events.active
            .map((e: ActiveEvent) => ({ ...e, durationRemaining: e.durationRemaining - 1 }))
            .filter((e: ActiveEvent) => e.durationRemaining > 0);

        return nextState;
    }

    generateEventCandidates(state: GameState) {
        // Pick 3 random events
        const shuffled = [...EVENTS].sort(() => 0.5 - Math.random());
        state.events.nextPreview = shuffled.slice(0, 3).map(e => e.id);
    }

    activateRandomEvent(state: GameState) {
        if (state.events.nextPreview.length === 0) return;

        const winningId = state.events.nextPreview[Math.floor(Math.random() * state.events.nextPreview.length)];
        const eventData = EVENTS.find(e => e.id === winningId);

        if (eventData) {
            // Apply Immediate Effects
            if (eventData.effect.type === 'ADD_TO_HAND_BOTH') {
                // Supply: Both +1 Pawn
                const piece = eventData.effect.piece as keyof Hand;
                const count = eventData.effect.count as number;
                state.hands.sente[piece] += count; // Only one line needed if it's both
                state.hands.gote[piece] += count;
            }
            else if (eventData.id === 'EV_FIELDWORKS') { // 陣地構築 (Place Pawn Optional)
                // This requires user interaction "Optional Place".
                // MVP: Can we force it? No, it's optional.
                // Alternative: Just active effect allowing placing Pawn on Empty Sq (like Sandbags)
                // for the duration of 0 (Immediate)?
                // Wait, "Optional Both" means effectively "Both players GET a special action".
                // This is hard for automated flow without a "Phase".
                // MVP Compromise: Just give both players +1 Pawn (Supply) instead?
                // Or: Give each player a "Sandbags" card into their hand? (Novel idea!)
                // Let's go with: Give both players a "Sandbags" effect card if not already held?
                // Simpler: Just skip complex interactive events for MVP or treat as Supply.
                // Re-reading definition: "Both CAN place".
                // Let's treat it as: Both sides get +1 Pawn. (Simulated functionality)
                state.hands.sente['P']++;
                state.hands.gote['P']++;
            }
            else if (eventData.id === 'EV_WARDRUM') { // 軍鼓 (Bonus on Capture)
                // Just flag. Logic in applyMove.
                state.events.active.push({
                    id: 'EV_WARDRUM',
                    durationRemaining: 2 // Ends after next move of each player? "Next 1 move".
                    // If ply is shared, duration 2 covers P1 and P2's next moves roughly.
                });
            }
            else if (eventData.id === 'EV_EXHAUST') { // 疲労 (No consecutive types)
                state.events.active.push({
                    id: 'EV_EXHAUST',
                    durationRemaining: 2
                });
            }
            else if (eventData.id === 'EV_INSPECTION' || eventData.id === 'EV_DARKNESS') {
                // Global effect, just activate
                // Logic handled in getLegalMoves/getDropMoves
                state.events.active.push({
                    id: eventData.id,
                    durationRemaining: eventData.durationPly
                });
            }
            // EV_RATIONS (Choice) and EV_REDEPLOY (Optional Recall)
            // Complex. For MVP, skip or replace.
            // Let's implement EV_RATIONS as "Supply" fallback for now to avoid breaking.
            else if (eventData.id === 'EV_RATIONS') {
                // Auto-pick Option A (Supply) for simplicity
                state.hands.sente['P'] += 2;
                state.hands.gote['P'] += 2;
            }
            else if (eventData.id === 'EV_REDEPLOY') {
                // Skip (No effect)
            }

            // Clear preview
            state.events.nextPreview = [];
        }
    }

    applyTrumpCard(cardId: string, targeting: any): void {
        const card = TRUMP_CARDS.find(c => c.id === cardId);
        if (!card) return;

        const player = this.state.turn;
        if (this.state.trumpCards[player].used) return; // Already used

        // Apply Effect Based on ID or Type
        const effect = card.effect;

        // Logic for each card type (simplified for MVP)
        if (cardId === 'BTN_REINFORCEMENT') { // 援軍 (P+2)
            const piece = effect.piece as keyof Hand;
            const count = effect.count as number;
            this.state.hands[player][piece] += count;
        }
        else if (cardId === 'BTN_BODYDOUBLE') { // 影武者 exchange
            // targets: { from: Pos, to: Pos } ? UI should pass { unit1: Pos, unit2: Pos }
            // We need normalized targeting info.
            // Let's assume 'targeting' arg contains { pos1: Position, pos2: Position }
            if (targeting && targeting.pos1 && targeting.pos2) {
                const p1 = this.state.board[targeting.pos1.y][targeting.pos1.x];
                const p2 = this.state.board[targeting.pos2.y][targeting.pos2.x];
                if (p1 && p2) {
                    this.state.board[targeting.pos1.y][targeting.pos1.x] = p2;
                    this.state.board[targeting.pos2.y][targeting.pos2.x] = p1;
                }
            }
        }
        else if (cardId === 'BTN_PUSHBACK') { // 突き返し
            if (targeting && targeting.pos && targeting.dir) {
                const { pos, dir } = targeting;
                const piece = this.state.board[pos.y][pos.x];
                const tx = pos.x + dir.x;
                const ty = pos.y + dir.y;
                if (this.isValidPos({ x: tx, y: ty }) && !this.state.board[ty][tx] && piece) {
                    this.state.board[pos.y][pos.x] = null;
                    this.state.board[ty][tx] = piece;
                }
            }
        }
        else if (cardId === 'BTN_PIN') { // 足止め (Freeze Opponent Piece)
            if (targeting && targeting.pos) {
                const piece = this.state.board[targeting.pos.y][targeting.pos.x];
                if (piece) {
                    this.state.events.active.push({
                        id: 'BTN_PIN',
                        durationRemaining: 2,
                        data: { targetPieceId: piece.id }
                    });
                }
            }
        }
        else if (cardId === 'BTN_WITHDRAW') { // 撤収 (Recall)
            if (targeting && targeting.pos) {
                const piece = this.state.board[targeting.pos.y][targeting.pos.x];
                if (piece && piece.owner === player) {
                    // Remove
                    this.state.board[targeting.pos.y][targeting.pos.x] = null;
                    // Add to hand (demote if promoted)
                    const type = piece.type.replace('+', '') as keyof Hand;
                    this.state.hands[player][type]++;
                }
            }
        }
        else if (cardId === 'BTN_SANDBAGS') { // 土嚢 (Place Pawn)
            if (targeting && targeting.pos) {
                if (!this.state.board[targeting.pos.y][targeting.pos.x]) {
                    this.state.board[targeting.pos.y][targeting.pos.x] = {
                        type: 'P',
                        owner: player,
                        id: `${player}-P-sandbag-${this.state.ply}`
                    };
                }
            }
        }
        else if (cardId === 'BTN_CHECKPOINT') { // 関所 (Forbid Square)
            if (targeting && targeting.pos) {
                this.state.events.active.push({
                    id: 'BTN_CHECKPOINT',
                    durationRemaining: 2,
                    data: { targetPos: targeting.pos }
                });
            }
        }
        else if (cardId === 'BTN_SCORCHED') { // 焼却命令 (Deny Capture)
            this.state.events.active.push({
                id: 'BTN_SCORCHED',
                durationRemaining: 999, // Until triggered
                data: { owner: player }
            });
        }
        else if (cardId === 'BTN_PURSUIT') { // 追撃 (Extra Move)
            this.state.events.active.push({
                id: 'BTN_PURSUIT',
                durationRemaining: 1,
                data: { owner: player }
            });
        }
        else if (cardId === 'BTN_DOUBLEDEPLOY') { // 二連投入 (Double Drop)
            this.state.events.active.push({
                id: 'BTN_DOUBLEDEPLOY',
                durationRemaining: 1,
                data: { owner: player, dropsCount: 0 }
            });
        }
        else if (cardId === 'BTN_ESCORT') { // 護衛 (Immunity)
            if (targeting && targeting.pos) {
                const piece = this.state.board[targeting.pos.y][targeting.pos.x];
                if (piece && piece.owner === player) {
                    this.state.events.active.push({
                        id: 'BTN_ESCORT',
                        durationRemaining: 2, // Until next own turn
                        data: { targetPieceId: piece.id }
                    });
                }
            }
        }
        else if (cardId === 'BTN_BOUNTY') { // 懸賞首 (Reward)
            if (targeting && targeting.pos) {
                const piece = this.state.board[targeting.pos.y][targeting.pos.x];
                if (piece && piece.owner !== player) {
                    this.state.events.active.push({
                        id: 'BTN_BOUNTY',
                        durationRemaining: 999,
                        data: { targetPieceId: piece.id, markerOwner: player }
                    });
                }
            }
        }

        this.state.history.push({
            ply: this.state.ply,
            player,
            from: 'hand', // distinct?
            to: { x: 0, y: 0 },
            piece: 'P', // dummy
            captured: undefined,
            drop: false
        } as any);

        // Mark as used
        this.state.trumpCards[player].used = true;
    }
}
