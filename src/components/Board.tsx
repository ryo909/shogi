import type { FC } from 'react';
import type { BoardState, MoveRecord, Position } from '../game/types';
import { ShogiGame } from '../game/shogi';
import { PieceComponent } from './Piece';
import styles from './Board.module.css';
import { BOARD_SIZE } from '../game/constants';

interface BoardProps {
    game: ShogiGame;
    board: BoardState;
    selectedPos: Position | null;
    validMoves: MoveRecord[];
    onSquareClick: (pos: Position) => void;
    lastMove?: MoveRecord;
}

export const Board: FC<BoardProps> = ({ board, selectedPos, validMoves, onSquareClick, lastMove }) => {
    // Helper to check if a position is in validMoves
    const isValidTarget = (x: number, y: number) => {
        return validMoves.some(m => !m.drop && m.to.x === x && m.to.y === y);
    };

    // Helper for Hoshi (Star points)
    const isHoshi = (x: number, y: number) => {
        // 3,3 (6,2 in 0-indexed?), 3,6, 6,3, 6,6
        // Standard Shogi dots are at 3,3; 3,6; 6,3; 6,6 (0-indexed: 2,2; 2,5; 5,2; 5,5 from top-right... wait. 
        // x=0 is 9, x=8 is 1.
        // 3rd file from right is x=2 (7-suji?). No, x=0=9, x=2=7.
        // Standard stars: 9x9 board. usually at 3,3 (3rd file, 3rd rank) -> 7,3 in array coords?
        // Wait. x=0 is 9. x=2 is 7. x=6 is 3.
        // So stars are at x=2,6 and y=2,6.
        return (x === 2 || x === 6) && (y === 2 || y === 6);
    };

    const cells = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const piece = board[y][x];
            const isSelected = selectedPos?.x === x && selectedPos?.y === y;
            const isHighlight = isValidTarget(x, y);
            const isLastMove = lastMove?.to.x === x && lastMove?.to.y === y;

            cells.push(
                <div
                    key={`${x}-${y}`}
                    data-pos={`${x}-${y}`}
                    className={`${styles.cell} ${isLastMove ? styles.lastMove : ''
                        } ${isHighlight ? styles.highlight : ''} ${isSelected ? styles.selected : ''
                        }`}
                    data-hoshi={isHoshi(x, y)}
                    onClick={() => onSquareClick({ x, y })}
                >
                    {piece && (
                        <PieceComponent
                            piece={piece}
                            isUpsideDown={piece.owner === 'gote'} // Gote is top, looks upside down to Sente
                        />
                    )}
                </div>
            );
        }
    }

    return (
        <div className={styles.boardContainer}>
            <div className={styles.board}>
                {cells}
            </div>
        </div>
    );
};
