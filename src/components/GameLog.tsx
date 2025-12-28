import React, { useEffect, useRef } from 'react';
import type { MoveRecord } from '../game/types';
import { PIECE_NAMES } from '../game/constants';
import styles from './GameLog.module.css';

interface GameLogProps {
    history: MoveRecord[];
}

export const GameLog: React.FC<GameLogProps> = ({ history }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                Battle Log
            </div>
            <div ref={scrollRef} className={styles.scrollArea}>
                {history.map((move, idx) => {
                    const playerIcon = move.player === 'sente' ? '☗' : '☖';
                    const pieceName = PIECE_NAMES[move.piece];

                    const file = 9 - move.to.x;
                    const rank = move.to.y + 1;

                    let text = `${file}${rank}${pieceName}`;
                    if (move.promoted) text += '成';
                    if (move.drop) text += '打';
                    if (move.from === 'hand' && !move.drop && move.piece === 'P') text = `Trump: ${text}`; // Trump?

                    return (
                        <div key={idx} className={`${styles.entry} ${styles[move.player]}`}>
                            <span className={styles.ply}>{move.ply}</span>
                            <span className={styles.icon}>{playerIcon}</span>
                            <span>{text}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
