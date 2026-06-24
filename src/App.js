import React, { useEffect, useState } from 'react';
import './App.css';
import HomeScreen from './components/HomeScreen';
import CreateRoom from './components/CreateRoom';
import JoinRoom from './components/JoinRoom';
import GameRoom from './components/GameRoom';
import { ToastProvider } from './components/Toast';
import { isMuted, toggleMute, sounds } from './sounds';

const TICKER = [
  { sym: 'BLUF', val: '+12.4%', dir: 'up' },
  { sym: 'CALL', val: '−3.1%', dir: 'down' },
  { sym: 'RAISE', val: '+7.8%', dir: 'up' },
  { sym: 'POT', val: '$1.00', dir: 'up' },
  { sym: '7s', val: 'HEAVY', dir: 'up' },
  { sym: 'NERVE', val: '−0.5%', dir: 'down' },
  { sym: 'TELL', val: '+0.0%', dir: 'up' },
  { sym: 'ANTE', val: 'OPEN', dir: 'up' },
];

function Ticker() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="ticker">
      <div className="ticker-track">
        {items.map((t, i) => (
          <span className="ticker-item" key={i}>
            <b>{t.sym}</b>
            <span className={t.dir}>{t.val}</span>
            <span className={t.dir}>{t.dir === 'up' ? '▲' : '▼'}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [roomData, setRoomData] = useState(null);
  const [muted, setMuted] = useState(isMuted());

  // Deep-link: ?room=ID lands directly on the join screen
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('room')) setCurrentScreen('join-room');
  }, []);

  const go = (screen) => {
    sounds.click();
    setCurrentScreen(screen);
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
    setRoomData(null);
    // strip ?room= from the URL when returning home
    window.history.replaceState({}, '', window.location.pathname);
  };

  const enterRoom = (roomId, playerId, playerName, serialNumber) => {
    setRoomData({ roomId, playerId, playerName, serialNumber });
    setCurrentScreen('game-room');
  };

  const handleMute = () => setMuted(toggleMute());

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'create-room':
        return <CreateRoom onBack={handleBackToHome} onRoomCreated={enterRoom} />;
      case 'join-room':
        return <JoinRoom onBack={handleBackToHome} onRoomJoined={enterRoom} />;
      case 'game-room':
        return roomData ? (
          <GameRoom
            roomId={roomData.roomId}
            playerId={roomData.playerId}
            playerName={roomData.playerName}
            serialNumber={roomData.serialNumber}
            onBack={handleBackToHome}
          />
        ) : (
          <div className="center-col">Loading…</div>
        );
      case 'home':
      default:
        return (
          <HomeScreen
            onCreateRoom={() => go('create-room')}
            onJoinRoom={() => go('join-room')}
          />
        );
    }
  };

  return (
    <ToastProvider>
      <div className="App">
        <div className="floor-bg" />
        <div className="floor-grid" />

        <header className="brand-bar">
          <div className="brand" onClick={handleBackToHome} title="Back to lobby">
            <div className="brand-mark">L</div>
            <div>
              <div className="brand-name">Liar's <b>Poker</b></div>
              <div className="brand-sub">Trading Floor · Est. 1989</div>
            </div>
          </div>
          <div className="brand-actions">
            <button
              className="icon-btn"
              onClick={handleMute}
              title={muted ? 'Unmute' : 'Mute'}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </header>

        <Ticker />

        <div className="screen-wrap">
          <div className="page-enter" key={currentScreen}>
            {renderCurrentScreen()}
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
