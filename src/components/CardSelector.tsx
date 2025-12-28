import { useState, type FC } from 'react';
import type { TrumpCardData } from '../game/data';
import { TRUMP_CARDS } from '../game/data';
import type { Player } from '../game/types';
import styles from './CardSelector.module.css';

interface CardSelectorProps {
    player: Player;
    onSelect: (card: TrumpCardData) => void;
}

export const CardSelector: FC<CardSelectorProps> = ({ player, onSelect }) => {
    // Generate candidates once
    const [candidates] = useState<TrumpCardData[]>(() => {
        // One from each category
        const tactics = TRUMP_CARDS.filter(c => c.category === 'TACTICS');
        const support = TRUMP_CARDS.filter(c => c.category === 'SUPPORT');
        const hype = TRUMP_CARDS.filter(c => c.category === 'HYPE');

        const pick = (arr: TrumpCardData[]) => arr[Math.floor(Math.random() * arr.length)];

        return [pick(tactics), pick(support), pick(hype)];
    });

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <h2 className={styles.title} style={{ color: player === 'sente' ? 'var(--accent-gold)' : 'white' }}>
                    {player === 'sente' ? '☗ SENTE' : '☖ GOTE'}
                </h2>
                <div className={styles.subtitle}>Select Your Trump Card</div>

                <div className={styles.cardContainer}>
                    {candidates.map(card => (
                        <div
                            key={card.id}
                            className={styles.card}
                            onClick={() => onSelect(card)}
                        >
                            <div className={styles.category}>{card.category}</div>
                            <div className={styles.cardName}>{card.name}</div>
                            <div className={styles.shortText}>{card.shortText}</div>
                            <div className={styles.longText}>{card.longText}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
