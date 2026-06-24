import React from 'react';
import './HomeScreen.css';

const STEPS = [
  { n: '01', t: 'Get your note', d: 'Everyone is dealt a dollar-bill serial number. Your digits are yours alone.' },
  { n: '02', t: 'Make the market', d: 'Bid on how many of a digit exist across ALL notes on the table. Raise to up the stakes.' },
  { n: '03', t: 'Call the bluff', d: 'Think the last bid is hot air? Challenge it. Notes are revealed. Best read wins.' },
];

const HomeScreen = ({ onCreateRoom, onJoinRoom }) => {
  return (
    <div className="home center-col">
      <div className="home-inner shell-max stagger">
        <div className="home-eyebrow">
          <span className="tp-pill live"><span className="dot" />Real-time multiplayer</span>
        </div>

        <h1 className="home-title tp-display">
          Liar's<br /><span className="accent">Poker</span>
        </h1>

        <p className="home-tag">
          The legendary trading-floor bluffing game. Bet on the digits hiding in
          everyone's serial numbers — out-read the table, or get called.
        </p>

        <div className="home-cta">
          <button className="tp-btn" onClick={onCreateRoom}>▸ Open a Table</button>
          <button className="tp-btn ghost" onClick={onJoinRoom}>Join with Code</button>
        </div>

        <div className="home-steps">
          {STEPS.map((s) => (
            <div className="home-step tp-panel" key={s.n}>
              <div className="home-step-n tp-display">{s.n}</div>
              <div className="home-step-t">{s.t}</div>
              <div className="home-step-d">{s.d}</div>
            </div>
          ))}
        </div>

        <div className="home-foot">
          <span className="tp-eyebrow">Inspired by Michael Lewis · <em>Liar's Poker</em></span>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
