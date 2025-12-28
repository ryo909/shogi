import type { FC } from 'react';
import type { Hand as HandType, Player, PieceType } from '../game/types';
import { PieceComponent } from './Piece';
import styles from './Hand.module.css';

interface HandProps {
    player: Player;
    hand: HandType;
    isTurn: boolean;
    onPieceClick: (piece: PieceType) => void;
    selectedPiece?: PieceType | null;
}

export const Hand: FC<HandProps> = ({ player, hand, isTurn, onPieceClick, selectedPiece }) => {
    // Define order of pieces
    const order: PieceType[] = ['R', 'B', 'G', 'S', 'N', 'L', 'P'];

    return (
        <div className={`${styles.handContainer} ${isTurn ? styles.active : ''}`}>
            <div className={styles.title}>
                {player === 'sente' ? '☗ 先手' : '☖ 後手'}
            </div>
            <div className={styles.pieceList}>
                {order.map(pt => {
                    const count = hand[pt as keyof HandType];
                    if (count === 0) return null;

                    return (
                        <div key={pt} className={styles.handPieceWrapper} onClick={() => isTurn && onPieceClick(pt)}>
                            <PieceComponent
                                piece={{ type: pt, owner: player, id: 'hand-preview' }}
                                isUpsideDown={false} // Hand pieces always face up relative to owner UI? Or standard?
                                // Standard: Sente pieces point Up. Gote pieces point Down?
                                // Actually usually Hand pieces face the player.
                                // But for hotseat, if Gote is top, maybe face down?
                                // Let's keep them upright for readability for now.
                                isSelected={selectedPiece === pt}
                            />
                            {count > 1 && <div className={styles.countBadge}>{count}</div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
