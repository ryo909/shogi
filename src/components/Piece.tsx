import type { FC } from 'react';
import type { Piece, PieceType } from '../game/types';
import { PIECE_NAMES } from '../game/constants';
import styles from './Piece.module.css';

interface PieceProps {
    piece: Piece;
    isUpsideDown?: boolean; // For Gote pieces when viewed by Sente
    onClick?: () => void;
    isSelected?: boolean;
}

// Map for simplified Kanji or standard
export const PieceComponent: FC<PieceProps> = ({ piece, isUpsideDown, onClick, isSelected }) => {
    const isPromoted = piece.type.startsWith('+');
    // const baseType = isPromoted ? piece.type.substring(1) : piece.type;

    // Sente is bottom, Gote is Top. Gote should be upside down visually if we are sitting at Sente.
    // Standard Shogi apps just rotate 180 deg for Gote.

    const className = [
        styles.piece,
        isUpsideDown ? styles.isGote : styles.isSente,
        isSelected ? styles.selected : '',
        isPromoted ? styles.promoted : ''
    ].join(' ');

    return (
        <div className={className} onClick={onClick}>
            <div className={styles.inner}>
                {PIECE_NAMES[piece.type as PieceType]}
            </div>
        </div>
    );
};
