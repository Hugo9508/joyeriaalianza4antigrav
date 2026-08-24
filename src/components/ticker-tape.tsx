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
      // Antes: isTransparent false + fondo del wrapper #131722 (azul de
      // TradingView, ajeno a la marca). Con isTransparent el widget no
      // pinta su propio fondo y se ve la tinta del sitio (--foreground)
      // por detrás, sin la costura de color.
      "isTransparent": true,
      "displayMode": "adaptive",
      "locale": "es"
    });

    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="w-full border-t border-background/10 bg-foreground overflow-hidden">
      <div className="tradingview-widget-container" ref={containerRef}>
        <div className="tradingview-widget-container__widget"></div>
      </div>
    </div>
  );
}
