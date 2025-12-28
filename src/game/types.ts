export type Player = 'sente' | 'gote';

export type PieceType =
  | 'P' // Pawn (Fu)
  | 'L' // Lance (Kyosha)
  | 'N' // Knight (Keima)
  | 'S' // Silver (Gin)
  | 'G' // Gold (Kin)
  | 'B' // Bishop (Kaku)
  | 'R' // Rook (Hisha)
  | 'K' // King (Ou/Gyoku)
  | '+P' // Tokin
  | '+L' // Narikyo
  | '+N' // Narikei
  | '+S' // Narigin
  | '+B' // Horse (Uma)
  | '+R'; // Dragon (Ryu)

export interface Piece {
  type: PieceType;
  owner: Player;
  id: string; // Unique ID for tracking (important for Trump effects)
}

// 0-indexed, 0,0 is Top-Right (Standard Shogi coordinates logic usually 1-9, but we use 0-8 for array)
// Visual: 
// x=0(9), 1(8), ... 8(1)
// y=0(一), ... 8(九)
export interface Position {
  x: number; // 0-8
  y: number; // 0-8
}

export type BoardState = (Piece | null)[][]; // 9x9 grid

export interface Hand {
  P: number;
  L: number;
  N: number;
  S: number;
  G: number;
  B: number;
  R: number;
  // King cannot be in hand
}

export interface GameState {
  board: BoardState;
  hands: {
    sente: Hand;
    gote: Hand;
  };
  turn: Player;
  ply: number; // Total half-moves (1 = Sente move 1, 2 = Gote move 1)
  history: MoveRecord[];

  // Trump Card State
  trumpCards: {
    sente: TrumpState;
    gote: TrumpState;
  };

  // Event State
  events: {
    active: ActiveEvent[];
    nextPreview: string[]; // IDs of candidate events
  };
  winner: Player | null; // 'sente' | 'gote' | null
}

export interface TrumpState {
  chosenCardId: string | null;
  used: boolean;
}

export interface ActiveEvent {
  id: string;
  durationRemaining: number; // in Ply or Turn depending on implementation, we'll try to normalize to Ply
  data?: any; // For targeted effects (e.g. { targetPieceId: "..." })
}

export interface MoveRecord {
  ply: number;
  player: Player;
  from: Position | 'hand';
  to: Position;
  piece: PieceType;
  promoted?: boolean;
  captured?: PieceType;
  drop?: boolean;
}
