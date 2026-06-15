'use client';

import { useEffect, useRef } from 'react';

/**
 * @fileOverview Componente para mostrar el Ticker Tape de TradingView con precios de metales en tiempo real.
 */
export function TickerTape() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Evitar duplicados si el componente se re-renderiza
    if (containerRef.current.querySelector('script')) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = JSON.stringify({
      "symbols": [
        { "proName": "OANDA:XAGUSD", "title": "PLATA" },
        { "proName": "OANDA:XPTUSD", "title": "PLATINO" },
        { "proName": "OANDA:XPDUSD", "title": "PALADIO" },
        { "proName": "OANDA:XAUUSD", "title": "ORO" }
      ],
      "showSymbolLogo": false,
      "colorTheme": "dark",
      "isTransparent": false,
      "displayMode": "adaptive",
      "locale": "es"
    });

    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="w-full border-t border-white/5 bg-[#131722] overflow-hidden">
      <div className="tradingview-widget-container" ref={containerRef}>
        <div className="tradingview-widget-container__widget"></div>
      </div>
    </div>
  );
}
