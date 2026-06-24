import React, { useEffect, useRef, useState } from 'react';
import { listenToRoom, updateRoomStatus, generateSerialNumber } from '../firebase';
import { updateDoc, doc } from 'firebase/firestore';
import db from '../firebase';
import { useToast } from './Toast';
import { sounds } from '../sounds';
import DollarBill from './DollarBill';
import './GameRoom.css';

const betLabel = (qty, digit) => `${qty} × ${digit}'s`;
const COLORS = ['#2ee6a0', '#ffb000', '#5bb8ff', '#ff8fa3', '#b388ff', '#4dd0e1', '#ffd54f', '#80cbc4'];

const GameRoom = ({ roomId, playerId, playerName, serialNumber, onBack }) => {
  const toast = useToast();
  const [room, setRoom] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [digit, setDigit] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [revealStep, setRevealStep] = useState(0);

  // refs to detect transitions for sound/toast cues
  const prevTurnRef = useRef(false);
  const prevHistLenRef = useRef(0);
  const prevStatusRef = useRef('waiting');

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = listenToRoom(roomId, (roomData) => setRoom(roomData));
    return () => unsubscribe();
  }, [roomId]);

  // ---- derived state ----
  const status = room?.status || 'waiting';
  const gameStarted = status === 'playing';
  const gameEnded = status === 'finished';
  const isHost = room?.hostId === playerId;
  const players = room?.players || [];
  const playerCount = players.length;
  const currentBet = room?.currentBet || null;
  const currentPlayerIndex = room?.gameState?.currentPlayerIndex || 0;
  const currentPlayer = players[currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId;
  const round = room?.gameState?.round || 1;
  const history = room?.betHistory || [];
  const result = room?.gameResult || null;
  const winner = room?.winner || null;

  const canMakeInitialBet = isHost && playerCount >= 2 && gameStarted && !currentBet;
  const canMakeMove = gameStarted && isMyTurn && !gameEnded && !!currentBet;

  const myPlayer = players.find((p) => p.id === playerId);
  const mySerial = myPlayer?.serialNumber || serialNumber;

  const isValidRaise = !currentBet
    || quantity > currentBet.quantity
    || (quantity === currentBet.quantity && digit > currentBet.digit);

  // ---- snap sliders to the standing bid when it's my turn ----
  useEffect(() => {
    if (currentBet) {
      setQuantity(currentBet.quantity);
      setDigit(currentBet.digit);
    } else {
      setQuantity(1);
      setDigit(0);
    }
  }, [currentBet?.quantity, currentBet?.digit]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- cue: my turn started ----
  useEffect(() => {
    if (isMyTurn && !prevTurnRef.current && gameStarted && !gameEnded && currentBet) {
      sounds.tick();
      toast("Your move — raise or call the bluff", 'info', 2400);
    }
    prevTurnRef.current = isMyTurn;
  }, [isMyTurn, gameStarted, gameEnded, currentBet, toast]);

  // ---- cue: a new bid landed (for everyone) ----
  useEffect(() => {
    if (history.length > prevHistLenRef.current && prevHistLenRef.current !== 0) {
      const last = history[history.length - 1];
      if (last && last.playerId !== playerId && last.type !== 'challenge') sounds.tick();
    }
    prevHistLenRef.current = history.length;
  }, [history.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- cue + reveal sequence on game end ----
  useEffect(() => {
    if (status === 'finished' && prevStatusRef.current !== 'finished') {
      setRevealStep(0);
      sounds.challenge();
      const t1 = setTimeout(() => { setRevealStep(1); sounds.reveal(); }, 700);
      const t2 = setTimeout(() => {
        setRevealStep(2);
        if (winner?.id === playerId) sounds.win(); else sounds.lose();
      }, 1900);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    if (status === 'playing') setRevealStep(0);
    prevStatusRef.current = status;
  }, [status, winner, playerId]);

  // ---- actions ----
  const pushHistory = (entry) => [...history, { ...entry, ts: Date.now() }];

  const handleStartGame = async () => {
    if (!isHost || playerCount < 2) return;
    try {
      await updateRoomStatus(roomId, 'playing');
      sounds.bet();
    } catch (e) {
      console.error(e);
      toast('Failed to start the game', 'error');
    }
  };

  const handlePlaceBet = async () => {
    if (!canMakeInitialBet) return;
    setIsSubmitting(true);
    try {
      const betData = {
        quantity, digit, playerId, playerName,
        betText: betLabel(quantity, digit),
        timestamp: new Date(),
      };
      await updateDoc(doc(db, 'rooms', roomId), {
        currentBet: betData,
        gameState: { currentBet: betData, round: 1, currentPlayerIndex: 1 },
        betHistory: pushHistory({ type: 'bid', playerId, playerName, quantity, digit }),
      });
      sounds.bet();
    } catch (e) {
      console.error(e);
      toast('Failed to place the bid', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRaiseBet = async () => {
    if (!canMakeMove) return;
    if (!isValidRaise) {
      toast('Raise must increase the count, or hold the count with a higher digit', 'warn');
      return;
    }
    setIsSubmitting(true);
    try {
      const betData = {
        quantity, digit, playerId, playerName,
        betText: betLabel(quantity, digit),
        timestamp: new Date(),
      };
      const nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;
      await updateDoc(doc(db, 'rooms', roomId), {
        currentBet: betData,
        gameState: { currentBet: betData, round, currentPlayerIndex: nextPlayerIndex },
        betHistory: pushHistory({ type: 'raise', playerId, playerName, quantity, digit }),
      });
      sounds.raise();
    } catch (e) {
      console.error(e);
      toast('Failed to raise', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChallenge = async () => {
    if (!canMakeMove) return;
    setIsSubmitting(true);
    try {
      const allDigits = players.map((p) => p.serialNumber).join('');
      const targetDigit = currentBet.digit.toString();
      const actualCount = allDigits.split('').filter((c) => c === targetDigit).length;
      const challengerWins = actualCount < currentBet.quantity;
      const winName = challengerWins ? playerName : currentBet.playerName;
      const winId = challengerWins ? playerId : currentBet.playerId;

      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'finished',
        winner: {
          name: winName,
          id: winId,
          reason: challengerWins ? 'The bluff was called' : 'The bid held up',
        },
        gameResult: {
          claimedCount: currentBet.quantity,
          actualCount,
          targetDigit: currentBet.digit,
          challengerName: playerName,
          bidderName: currentBet.playerName,
          challengerWon: challengerWins,
          allSerialNumbers: players.map((p) => ({ name: p.name, serial: p.serialNumber, id: p.id })),
        },
        betHistory: pushHistory({ type: 'challenge', playerId, playerName, quantity: currentBet.quantity, digit: currentBet.digit }),
      });
    } catch (e) {
      console.error(e);
      toast('Failed to challenge', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlayAgain = async () => {
    if (!isHost) return;
    setIsSubmitting(true);
    try {
      const newPlayers = players.map((p) => ({ ...p, serialNumber: generateSerialNumber() }));
      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'playing',
        currentBet: null,
        gameState: null,
        winner: null,
        gameResult: null,
        players: newPlayers,
        betHistory: [],
      });
      sounds.bet();
      toast('New hand dealt', 'success');
    } catch (e) {
      console.error(e);
      toast('Failed to deal a new hand', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveRoom = async () => {
    setIsLeaving(true);
    try {
      const updatedPlayers = players.filter((p) => p.id !== playerId);
      const roomRef = doc(db, 'rooms', roomId);
      if (updatedPlayers.length === 0) await updateDoc(roomRef, { status: 'deleted' });
      else await updateDoc(roomRef, { players: updatedPlayers });
      onBack();
    } catch (e) {
      console.error(e);
      toast('Failed to leave the room', 'error');
    } finally {
      setIsLeaving(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(roomId);
    sounds.click();
    toast('Room code copied', 'success', 1800);
  };
  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard?.writeText(url);
    sounds.click();
    toast('Invite link copied', 'success', 1800);
  };

  if (!room) {
    return (
      <div className="gr center-col">
        <div className="gr-loading">
          <span className="tp-pill live"><span className="dot" />Connecting to the floor…</span>
        </div>
      </div>
    );
  }

  const colorFor = (i) => COLORS[i % COLORS.length];

  return (
    <div className="gr">
      <div className="gr-shell shell-max">
        {/* ===== Top bar ===== */}
        <div className="gr-topbar tp-panel">
          <button className="tp-back" onClick={gameEnded ? handleLeaveRoom : onBack}>◂ Leave</button>

          <div className="gr-code">
            <span className="gr-code-label">Table</span>
            <code className="gr-code-val">{roomId}</code>
            <button className="icon-btn sm" onClick={copyCode} title="Copy code">⧉</button>
            <button className="icon-btn sm" onClick={copyLink} title="Copy invite link">🔗</button>
          </div>

          <div className="gr-meta">
            {gameStarted && !gameEnded && <span className="tp-pill live"><span className="dot" />Hand {round}</span>}
            {!gameStarted && !gameEnded && <span className="tp-pill warn"><span className="dot" />Waiting</span>}
            {gameEnded && <span className="tp-pill danger"><span className="dot" />Settled</span>}
            <span className="tp-pill">{playerCount} seat{playerCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {gameEnded ? (
          /* ===================== REVEAL ===================== */
          <div className="gr-reveal">
            <div className="reveal-banner anim-pop" data-win={winner?.id === playerId}>
              <span className="tp-eyebrow">{result?.challengerWon ? 'Bluff Called' : 'Bid Held'}</span>
              <h1 className="reveal-winner tp-display">
                {winner?.id === playerId ? 'You Win' : `${winner?.name} Wins`}
              </h1>
              <p className="reveal-reason">{winner?.reason}</p>
            </div>

            {revealStep >= 1 && result && (
              <div className="reveal-tally anim-fade-up">
                <div className="tally-col">
                  <span className="tally-label">Claimed</span>
                  <span className="tally-num">{result.claimedCount}</span>
                </div>
                <div className="tally-vs">
                  <span className="tally-digit">{result.targetDigit}'s</span>
                  <span className="tally-arrow">vs</span>
                </div>
                <div className="tally-col">
                  <span className="tally-label">Actual on table</span>
                  <span className={`tally-num ${result.actualCount >= result.claimedCount ? 'good' : 'bad'}`}>
                    {result.actualCount}
                  </span>
                </div>
              </div>
            )}

            {revealStep >= 2 && result && (
              <div className="reveal-notes">
                <span className="tp-eyebrow center">All notes revealed · {result.targetDigit}'s highlighted</span>
                <div className="reveal-grid">
                  {result.allSerialNumbers.map((p, i) => (
                    <div className="reveal-note" key={p.id || i} style={{ animationDelay: `${i * 0.08}s` }}>
                      <DollarBill
                        serialNumber={p.serial}
                        owner={p.name}
                        label={p.id === winner?.id ? 'Winner' : 'Note'}
                        highlightDigit={result.targetDigit}
                        compact
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="reveal-actions">
              {isHost && (
                <button className="tp-btn" onClick={handlePlayAgain} disabled={isSubmitting}>
                  {isSubmitting ? 'Dealing…' : '↻ Deal Again'}
                </button>
              )}
              <button className="tp-btn ghost red" onClick={handleLeaveRoom} disabled={isLeaving}>
                {isLeaving ? 'Leaving…' : 'Leave Table'}
              </button>
            </div>
          </div>
        ) : (
          /* ===================== LIVE TABLE ===================== */
          <div className="gr-grid">
            {/* --- Left: roster + history --- */}
            <aside className="gr-side">
              <div className="gr-roster tp-panel">
                <div className="panel-head">
                  <span className="tp-eyebrow">The Floor</span>
                  {gameStarted && <span className="panel-sub">{currentPlayer?.name}'s turn</span>}
                </div>
                <ul className="roster-list">
                  {players.map((p, i) => {
                    const turn = gameStarted && currentPlayerIndex === i;
                    return (
                      <li key={p.id} className={`roster-item ${turn ? 'turn' : ''} ${p.id === playerId ? 'me' : ''}`}>
                        <span className="roster-avatar" style={{ background: colorFor(i) }}>
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="roster-name">
                          {p.name}{p.id === playerId && <em> (you)</em>}
                        </span>
                        <span className="roster-tags">
                          {p.isHost && <span className="tag host" title="Host">♛</span>}
                          {turn && <span className="tag turn-tag">▸</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="gr-log tp-panel">
                <div className="panel-head"><span className="tp-eyebrow">Order Book</span></div>
                <div className="log-feed">
                  {history.length === 0 && <div className="log-empty">No bids yet — the table is quiet.</div>}
                  {[...history].reverse().map((h, i) => (
                    <div className={`log-row ${h.type}`} key={h.ts || i}>
                      <span className="log-type">
                        {h.type === 'bid' ? 'OPEN' : h.type === 'raise' ? 'RAISE' : 'CALL'}
                      </span>
                      <span className="log-who">{h.playerName}</span>
                      <span className="log-bid">{betLabel(h.quantity, h.digit)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* --- Right: note + bid + controls --- */}
            <main className="gr-main">
              <DollarBill serialNumber={mySerial} label="Your Note" owner={playerName} />

              {currentBet && (
                <div className="gr-bid tp-panel">
                  <span className="tp-eyebrow">Standing Bid</span>
                  <div className="bid-big">{currentBet.betText}</div>
                  <div className="bid-by">by {currentBet.playerName}</div>
                </div>
              )}

              {/* Waiting room (pre-game) */}
              {!gameStarted && (
                <div className="gr-controls tp-panel">
                  {isHost ? (
                    <>
                      <p className="ctrl-note">
                        {playerCount < 2
                          ? 'Waiting for at least one more trader to sit down…'
                          : 'Everyone\'s seated. Open the market when ready.'}
                      </p>
                      <button className="tp-btn" onClick={handleStartGame} disabled={playerCount < 2}>
                        {playerCount < 2 ? 'Need 2+ traders' : '▸ Start Hand'}
                      </button>
                      <button className="tp-btn ghost" onClick={copyLink}>🔗 Copy Invite Link</button>
                    </>
                  ) : (
                    <p className="ctrl-note pulse">Waiting for the host to start the hand…</p>
                  )}
                </div>
              )}

              {/* My turn: initial bet OR raise/challenge */}
              {gameStarted && (canMakeInitialBet || canMakeMove) && (
                <div className="gr-controls tp-panel anim-pop">
                  <div className="panel-head">
                    <span className="tp-eyebrow">{canMakeInitialBet ? 'Open the Market' : 'Your Move'}</span>
                  </div>

                  <div className="bid-builder">
                    <div className="slider-block">
                      <div className="slider-top"><span>Count</span><b>{quantity}</b></div>
                      <input className="tp-range" type="range" min="1" max={Math.max(10, playerCount * 8)}
                        value={quantity} onChange={(e) => { setQuantity(+e.target.value); sounds.tick(); }} />
                    </div>
                    <div className="slider-block">
                      <div className="slider-top"><span>Digit</span><b>{digit}</b></div>
                      <input className="tp-range" type="range" min="0" max="9"
                        value={digit} onChange={(e) => { setDigit(+e.target.value); sounds.tick(); }} />
                    </div>
                  </div>

                  <div className={`bid-preview ${!canMakeInitialBet && !isValidRaise ? 'invalid' : ''}`}>
                    “I bid <b>{betLabel(quantity, digit)}</b>”
                    {!canMakeInitialBet && !isValidRaise && (
                      <span className="bid-hint">must beat {currentBet.betText}</span>
                    )}
                  </div>

                  {canMakeInitialBet ? (
                    <button className="tp-btn" onClick={handlePlaceBet} disabled={isSubmitting}>
                      {isSubmitting ? 'Placing…' : '▸ Place Opening Bid'}
                    </button>
                  ) : (
                    <div className="ctrl-actions">
                      <button className="tp-btn" onClick={handleRaiseBet} disabled={isSubmitting || !isValidRaise}>
                        {isSubmitting ? '…' : '▲ Raise'}
                      </button>
                      <button className="tp-btn red" onClick={handleChallenge} disabled={isSubmitting}>
                        {isSubmitting ? '…' : '✕ Call Bluff'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Not my turn */}
              {gameStarted && !canMakeInitialBet && !canMakeMove && (
                <div className="gr-controls tp-panel">
                  <p className="ctrl-note pulse">
                    {currentBet
                      ? `Waiting on ${currentPlayer?.name} to act…`
                      : `Waiting for ${currentPlayer?.name} to open the market…`}
                  </p>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameRoom;
