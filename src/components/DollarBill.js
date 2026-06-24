import React from 'react';
import './DollarBill.css';

/**
 * Terminal-styled "Federal Reserve Note" rendering a player's serial number.
 * @param {string}  serialNumber  e.g. "QB07734512"
 * @param {string}  label         small eyebrow label (default "YOUR NOTE")
 * @param {string}  owner         optional owner name shown on the note
 * @param {number}  highlightDigit  digit (0-9) to highlight across the serial (reveal)
 * @param {boolean} compact       smaller variant for lists / grids
 * @param {node}    children      action area (e.g. regenerate button)
 */
const DollarBill = ({
  serialNumber = '',
  label = 'Your Note',
  owner,
  highlightDigit = null,
  compact = false,
  children,
}) => {
  const chars = serialNumber.split('');

  return (
    <div className={`note ${compact ? 'note-compact' : ''}`}>
      <div className="note-guilloche" aria-hidden="true" />

      {/* corners */}
      <span className="note-corner tl">1</span>
      <span className="note-corner tr">1</span>
      <span className="note-corner bl">1</span>
      <span className="note-corner br">1</span>

      <div className="note-top">
        <span className="note-reserve">Federal Reserve Note</span>
        <span className="note-series">Series 2026</span>
      </div>

      <div className="note-body">
        <div className="note-left">
          <div className="note-portrait">
            <span className="note-portrait-glyph">$</span>
            <span className="note-portrait-ring" />
          </div>
          <div className="note-copy">
            <div className="note-denom">One Dollar</div>
            <div className="note-country">The United States of America</div>
            <div className="note-tender">Legal tender for all debts, public &amp; private</div>
          </div>
        </div>

        <div className="note-right">
          <div className="note-seal">★</div>
          <div className="note-serial-label">{label}</div>
          <div className="note-serial">
            {chars.map((ch, i) => {
              const isDigit = /[0-9]/.test(ch);
              const hot = highlightDigit !== null && isDigit && Number(ch) === highlightDigit;
              return (
                <span key={i} className={`note-char ${hot ? 'hot' : ''} ${isDigit ? 'digit' : 'alpha'}`}>
                  {ch}
                </span>
              );
            })}
          </div>
          {owner && <div className="note-owner">{owner}</div>}
        </div>
      </div>

      {children && <div className="note-actions">{children}</div>}
    </div>
  );
};

export default DollarBill;
