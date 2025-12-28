import { useState, useEffect } from 'react';
import './App.css';
import { ShogiGame } from './game/shogi';
import type { GameState, MoveRecord, PieceType, Player, Position } from './game/types';
import { Board } from './components/Board';
import { Hand } from './components/Hand';
import { GameInfo } from './components/GameInfo';
import { GameLog } from './components/GameLog';

import { CardSelector } from './components/CardSelector';
import type { TrumpCardData } from './game/data';
import { TRUMP_CARDS } from './game/data';

const gameInstance = new ShogiGame();

function App() {
  const [gameState, setGameState] = useState<GameState>(gameInstance.state);
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [selectedHandPiece, setSelectedHandPiece] = useState<{ type: PieceType; player: Player } | null>(null);
  const [legalMoves, setLegalMoves] = useState<MoveRecord[]>([]);

  // Card Selection State
  // Sequence: 'sente' -> 'gote' -> null (Game Start)
  const [cardSelectionPlayer, setCardSelectionPlayer] = useState<Player | null>('sente');

  // Interaction Modes: 'NORMAL' | 'TRUMP_TARGETING'
  const [interactionMode, setInteractionMode] = useState<'NORMAL' | 'TRUMP_TARGETING'>('NORMAL');
  const [activeTrumpId, setActiveTrumpId] = useState<string | null>(null);
  const [trumpTargets, setTrumpTargets] = useState<Position[]>([]);

  // Game Mode State
  const [gameMode, setGameMode] = useState<'PvP' | 'PvEA' | null>(null); // null = Title Screen

  // Update logic helper
  const updateState = () => {
    setGameState({ ...gameInstance.state });
  };

  // AI Turn Handling
  useEffect(() => {
    // Only trigger AI after card selection is complete
    if (cardSelectionPlayer !== null) return;

    if (gameMode === 'PvEA' && gameState.turn === 'gote' && !gameState.winner) {
      // AI Turn
      const timer = setTimeout(() => {
        // Simple AI Logic
        import('./game/ai').then(({ getBestMove }) => {
          const bestMove = getBestMove(gameInstance, 'gote');
          if (bestMove) {
            gameInstance.state = gameInstance.applyMove(gameInstance.state, bestMove);
            updateState();
          } else {
            // Resign or stuck?
            console.log("AI Resigns");
          }
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, gameMode, cardSelectionPlayer]);

  const handleCardSelect = (card: TrumpCardData) => {
    if (!cardSelectionPlayer) return;

    // Save to state
    gameInstance.state.trumpCards[cardSelectionPlayer].chosenCardId = card.id;

    // Next player or Finish
    if (cardSelectionPlayer === 'sente') {
      if (gameMode === 'PvEA') {
        // CPU auto-selects card
        // Randomly pick one for Gote
        const tactics = TRUMP_CARDS.filter(c => c.category === 'TACTICS');
        const support = TRUMP_CARDS.filter(c => c.category === 'SUPPORT');
        const hype = TRUMP_CARDS.filter(c => c.category === 'HYPE');
        const all = [...tactics, ...support, ...hype];
        const randomCard = all[Math.floor(Math.random() * all.length)];
        gameInstance.state.trumpCards['gote'].chosenCardId = randomCard.id;

        setCardSelectionPlayer(null); // Finish
        updateState();
      } else {
        setCardSelectionPlayer('gote');
      }
    } else {
      setCardSelectionPlayer(null); // Finish selection
      updateState();
    }
  };

  const onUseTrump = () => {
    // Get current player's card
    const player = gameState.turn;

    // Block Human using Trump on AI turn
    if (gameMode === 'PvEA' && player === 'gote') return;

    const cardId = gameState.trumpCards[player].chosenCardId;
    if (!cardId || gameState.trumpCards[player].used) return;

    const card = TRUMP_CARDS.find(c => c.id === cardId);
    if (!card) return;

    if (card.targeting.requiresTarget) {
      setInteractionMode('TRUMP_TARGETING');
      setActiveTrumpId(cardId);
      setTrumpTargets([]);
      // Simple visual feedback could be added in render
      alert(`Select target for ${card.name} (${card.shortText})`);
    } else {
      // Apply immediately
      gameInstance.applyTrumpCard(cardId, null);
      updateState();
      // alert(`Used ${card.name}!`);
    }
  };

  // Handle Board Click
  const onSquareClick = (pos: Position) => {
    // Block input during AI turn
    if (gameMode === 'PvEA' && gameState.turn === 'gote') return;

    const { x, y } = pos;
    // const isSente = gameState.turn === 'sente'; 

    if (interactionMode === 'TRUMP_TARGETING') {
      const card = TRUMP_CARDS.find(c => c.id === activeTrumpId);
      if (!card) {
        setInteractionMode('NORMAL');
        return;
      }

      // Handle specific targeting logic
      // MVP: Handle 1 target or 2 targets (Body Double)

      let newTargets = [...trumpTargets, pos];

      // Validation (very basic for MVP)
      // If card is Body Double, wait for 2 targets
      if (activeTrumpId === 'BTN_BODYDOUBLE') {
        setTrumpTargets(newTargets);
        if (newTargets.length === 2) {
          // Apply
          gameInstance.applyTrumpCard(activeTrumpId!, { pos1: newTargets[0], pos2: newTargets[1] });
          updateState();
          setInteractionMode('NORMAL');
          setActiveTrumpId(null);
          setTrumpTargets([]);
        } else {
          // Wait for second
          // alert("Select second target to swap.");
        }
        return;
      }

      // If card is Pushback, need Target + Direction. 
      // Direction is hard to click. Maybe click adjacent square?
      if (activeTrumpId === 'BTN_PUSHBACK') {
        // First click: Target Piece
        if (trumpTargets.length === 0) {
          // Check if piece exists
          if (gameInstance.getPiece(pos)) {
            setTrumpTargets([pos]);
            // alert("Select destination square (adjacent empty).");
          }
        } else {
          // Second click: Destination (defines direction)
          const from = trumpTargets[0];
          const dx = pos.x - from.x;
          const dy = pos.y - from.y;
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0)) {
            gameInstance.applyTrumpCard(activeTrumpId!, { pos: from, dir: { x: dx, y: dy } });
            updateState();
            setInteractionMode('NORMAL');
            setActiveTrumpId(null);
            setTrumpTargets([]);
          } else {
            // Invalid, reset
            setTrumpTargets([]);
            // alert("Invalid direction. Select piece again.");
          }
        }
        return;
      }

      // Default Single Target (Pin, Escort, Withdraw, Checkpoint, etc)
      // Check validation based on card.targeting
      // MVP Generic Validation
      const targetDef = card.targeting.targets ? card.targeting.targets[0] : null; // Assume 1 target for these

      const targetPiece = gameInstance.getPiece(pos);
      // let isValid = true;

      if (targetDef) {
        if (targetDef.type === 'SQUARE_EMPTY' || targetDef.type === 'SQUARE_EMPTY_OWN_TERRITORY') {
          if (targetPiece) {
            // alert("Must select empty square.");
            return; // Don't close mode
          }
          // Own Territory Check for Sandbags
          if (targetDef.type === 'SQUARE_EMPTY_OWN_TERRITORY') {
            const isSente = gameState.turn === 'sente';
            const inTerritory = isSente ? pos.y >= 6 : pos.y <= 2;
            if (!inTerritory) return;
          }
        } else if (targetDef.type === 'PIECE') {
          if (!targetPiece) return;
          if (targetDef.side === 'SELF' && targetPiece.owner !== gameState.turn) return;
          if (targetDef.side === 'OPP' && targetPiece.owner === gameState.turn) return;
          if (targetDef.kingAllowed === false && targetPiece.type === 'K') return;
        }
      }

      // Apply with single pos
      gameInstance.applyTrumpCard(activeTrumpId!, { pos });
      updateState();
      setInteractionMode('NORMAL');
      setActiveTrumpId(null);
      setTrumpTargets([]);

      return;
    }

    // NORMAL MODE

    // 1. Handling Drop?
    if (selectedHandPiece) {
      if (selectedHandPiece.player !== gameState.turn) {
        // Wrong player's hand piece selected (shouldn't happen if UI locks it, but safe check)
        setSelectedHandPiece(null);
        return;
      }

      const dropMoves = gameInstance.getDropMoves(selectedHandPiece.type, gameState.turn);
      const move = dropMoves.find(m => m.to.x === x && m.to.y === y);

      if (move) {
        gameInstance.state = gameInstance.applyMove(gameInstance.state, move);
        updateState();
        setSelectedHandPiece(null);
        setLegalMoves([]);
      } else {
        const targetPiece = gameInstance.getPiece(pos);
        if (targetPiece && targetPiece.owner === gameState.turn) {
          setSelectedHandPiece(null);
          selectBoardPiece(pos);
        } else {
          setSelectedHandPiece(null);
          setLegalMoves([]);
        }
      }
      return;
    }

    // 2. Handling Board Selection / Move
    if (selectedPos) {
      const moveCandidate = legalMoves.find(m => m.to.x === x && m.to.y === y);

      if (moveCandidate) {
        const variants = legalMoves.filter(m => m.to.x === x && m.to.y === y);
        let finalMove = variants[0];

        if (variants.length > 1) {
          const wantPromote = window.confirm("Promote? (成りますか？)");
          finalMove = variants.find(v => v.promoted === wantPromote) || variants[0];
        } else if (variants[0].promoted && !variants[0].drop) {
          // Forced promotion (only one option and it is promoted) logic already handled in legal moves
          // If 'promoted' is true there, it means it was added as promoted move.
          // Note: My getLegalMoves adds BOTH if optional. If only one, it's either forced or not reachable zone.
        }

        gameInstance.state = gameInstance.applyMove(gameInstance.state, finalMove);
        updateState();
        setSelectedPos(null);
        setLegalMoves([]);
      } else {
        const targetPiece = gameInstance.getPiece(pos);
        if (targetPiece && targetPiece.owner === gameState.turn) {
          selectBoardPiece(pos);
        } else {
          setSelectedPos(null);
          setLegalMoves([]);
        }
      }
    } else {
      const targetPiece = gameInstance.getPiece(pos);
      if (targetPiece && targetPiece.owner === gameState.turn) {
        selectBoardPiece(pos);
      }
    }
  };

  const selectBoardPiece = (pos: Position) => {
    setSelectedPos(pos);
    setSelectedHandPiece(null);
    const moves = gameInstance.getLegalMoves(pos);
    setLegalMoves(moves);
  };

  const onHandPieceClick = (type: PieceType, player: Player) => {
    // Block input during AI turn
    if (gameMode === 'PvEA' && gameState.turn === 'gote') return;

    if (player !== gameState.turn) return;

    // Toggle
    if (selectedHandPiece && selectedHandPiece.type === type) {
      setSelectedHandPiece(null);
      setLegalMoves([]);
    } else {
      setSelectedHandPiece({ type, player });
      setSelectedPos(null);
      // Show drop candidates
      const moves = gameInstance.getDropMoves(type, player);
      setLegalMoves(moves);
    }
  };

  return (
    <div className="app-container">
      {/* Title Screen / Mode Selection */}
      {!gameMode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.9)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, color: 'white'
        }}>
          <h1 style={{ fontSize: '4rem', marginBottom: '40px', color: '#ffd700', textShadow: '0 0 20px #ffd700' }}>TRUMP SHOGI</h1>
          <div style={{ display: 'flex', gap: '20px' }}>
            <button
              onClick={() => setGameMode('PvEA')}
              style={{
                padding: '20px 40px', fontSize: '1.5rem',
                background: 'linear-gradient(135deg, #ffd700, #b8860b)',
                border: 'none', borderRadius: '12px', cursor: 'pointer',
                color: 'black', fontWeight: 'bold'
              }}
            >
              VS CPU
            </button>
            <button
              onClick={() => setGameMode('PvP')}
              style={{
                padding: '20px 40px', fontSize: '1.5rem',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid #ffd700', borderRadius: '12px', cursor: 'pointer',
                color: '#ffd700', fontWeight: 'bold'
              }}
            >
              VS HUMAN
            </button>
          </div>
        </div>
      )}

      {cardSelectionPlayer && (gameMode === 'PvP' || (gameMode === 'PvEA' && cardSelectionPlayer === 'sente')) &&
        <CardSelector player={cardSelectionPlayer} onSelect={handleCardSelect} />
      }

      <GameInfo state={gameState} onUseTrump={onUseTrump} />

      <div className="game-layout">
        <div className="side-panel">
          <Hand
            player="gote"
            hand={gameState.hands.gote}
            isTurn={gameState.turn === 'gote'}
            onPieceClick={(pt) => onHandPieceClick(pt, 'gote')}
            selectedPiece={selectedHandPiece?.player === 'gote' ? selectedHandPiece.type : null}
          />
          <div className="spacer"></div>
          <GameLog history={gameState.history} />
        </div>

        <div className="board-area">
          <Board
            game={gameInstance}
            board={gameState.board}
            selectedPos={selectedPos}
            validMoves={legalMoves}
            onSquareClick={onSquareClick}
            lastMove={gameState.history[gameState.history.length - 1]}
          />
        </div>

        <div className="side-panel">
          <div className="spacer"></div>
          <Hand
            player="sente"
            hand={gameState.hands.sente}
            isTurn={gameState.turn === 'sente'}
            onPieceClick={(pt) => onHandPieceClick(pt, 'sente')}
            selectedPiece={selectedHandPiece?.player === 'sente' ? selectedHandPiece.type : null}
          />
        </div>
      </div>

      {gameState.winner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: '#ffd700', zIndex: 1000
        }}>
          <h1 style={{ fontSize: '4rem', textShadow: '0 0 20px #ffd700' }}>GAME SET</h1>
          <h2 style={{ fontSize: '2rem', marginTop: '20px' }}>
            Winner: {gameState.winner === 'sente' ? 'SENTE (Front)' : 'GOTE (Back)'}
          </h2>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '40px', padding: '15px 40px', fontSize: '1.2rem',
              background: 'transparent', border: '2px solid #ffd700', color: '#ffd700',
              cursor: 'pointer', borderRadius: '8px'
            }}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
