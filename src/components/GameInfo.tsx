import type { FC } from 'react';
import type { GameState } from '../game/types';
import { TRUMP_CARDS, EVENTS } from '../game/data';
import styles from './GameInfo.module.css';

interface GameInfoProps {
    state: GameState;
    onUseTrump?: () => void;
}

export const GameInfo: FC<GameInfoProps> = ({ state, onUseTrump }) => {
    const isSente = state.turn === 'sente';

    // Lookup cards
    const senteCard = TRUMP_CARDS.find(c => c.id === state.trumpCards.sente.chosenCardId);
    const goteCard = TRUMP_CARDS.find(c => c.id === state.trumpCards.gote.chosenCardId);

    // Active Events
    const activeEvents = state.events.active.map(ae => {
        const ev = EVENTS.find(e => e.id === ae.id);
        return { ...ev, duration: ae.durationRemaining };
    }).filter(e => e.id);

    // Next Preview (Candidates)
    const previewEvents = state.events.nextPreview.map(id => EVENTS.find(e => e.id === id)).filter(e => e);

    return (
        <div className={styles.container}>
            <div className={styles.playerSection}>
                <span className={`${styles.playerName} ${isSente ? styles.activePlayer : ''}`}>
                    {isSente ? '☗ SENTE' : 'SENTE'}
                </span>
                {senteCard && (
                    <div className={styles.cardInfo}>
                        <span style={{ fontWeight: 'bold' }}>{senteCard.name}</span>
                        {state.trumpCards.sente.used && ' (Used)'}
                        {isSente && !state.trumpCards.sente.used && (
                            <button className={styles.useBtn} onClick={onUseTrump}>Use Card</button>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.centerInfo}>
                <div className={styles.plyCount}>Ply: {state.ply}</div>

                {/* Active Events */}
                {activeEvents.map((ev, i) => (
                    <div key={i} className={styles.activeEvent}>
                        Active: {ev.name} ({ev.duration})
                    </div>
                ))}

                {/* Preview */}
                {previewEvents.length > 0 && (
                    <div className={styles.previewEvents}>
                        Next Candidates: {previewEvents.map(e => e?.name).join(', ')}
                    </div>
                )}
            </div>

            <div className={`${styles.playerSection} ${styles.right}`}>
                {goteCard && (
                    <div className={styles.cardInfo}>
                        {isSente ? null : !state.trumpCards.gote.used && (
                            <button className={styles.useBtn} onClick={onUseTrump}>Use Card</button>
                        )}
                        {state.trumpCards.gote.used && ' (Used)'}
                        <span style={{ fontWeight: 'bold', marginLeft: '0.5rem' }}>{goteCard.name}</span>
                    </div>
                )}
                <span className={`${styles.playerName} ${!isSente ? styles.activePlayer : ''}`}>
                    {state.turn === 'gote' ? '☖ GOTE' : 'GOTE'}
                </span>
            </div>
        </div>
    );
};
