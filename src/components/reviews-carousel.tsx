'use client';

import { useState, useRef } from "react";

interface Review {
    name: string;
    badge: string | null;
    stars: number;
    time: string;
    text: string;
    initial: string;
    color: string;
    photo: string | null;
}

const REVIEWS: Review[] = [
    {
        name: "Romina",
        badge: "Local Guide",
        stars: 5,
        time: "8 meses atrás",
        text: "Muy buena atención, excelente servicio! y los precios están súper accesibles. Realizó un ajuste a mi anillo y quedó tal cual lo quería. Recomiendo mucho el lugar.",
        initial: "R",
        color: "#c084fc",
        photo: "https://i.imgur.com/Y27nt3T.png",
    },
    {
        name: "Leonardo Núñez Gómez",
        badge: null,
        stars: 5,
        time: "7 meses atrás",
        text: "Excelente atención, acabado de calidad, buen precio, más que satisfecho. Estoy feliz de haber elegido esta joyería; la recomiendo 100%.",
        initial: "L",
        color: "#60a5fa",
        photo: null,
    },
    {
        name: "Valentín Sosa",
        badge: null,
        stars: 5,
        time: "7 meses atrás",
        text: "Servicio y calidad excelentes. El anillo que encargamos fue perfectamente personalizado según lo solicitado y muy bien hecho — exactamente como debería ser.",
        initial: "V",
        color: "#34d399",
        photo: "https://i.imgur.com/mnLW9nR.png",
    },
    {
        name: "Carmen Signorelli",
        badge: "Local Guide",
        stars: 5,
        time: "7 meses atrás",
        text: "Joyas excelentes y originales; es evidente el empeño y el amor que dedican a su trabajo, y la atención es impecable. Muy profesionales y confiables. Los recomiendo sin reservas.",
        initial: "C",
        color: "#f472b6",
        photo: "https://i.imgur.com/Yka8zpN.png",
    },
    {
        name: "Andrés de Acevedo",
        badge: null,
        stars: 5,
        time: "un año atrás",
        text: "Atención y servicio excelentes. Dos años después de nuestra boda, fuimos a la joyería a hacer el mantenimiento de nuestras alianzas y nos trataron maravillosamente bien, sin ningún costo adicional.",
        initial: "A",
        color: "#fbbf24",
        photo: "https://i.imgur.com/bB6QRyC.png",
    },
    {
        name: "M. Olivera",
        badge: null,
        stars: 5,
        time: "un año atrás",
        text: "Servicio excelente, acabado impecable y lo que es realmente excepcional: la rapidez con que trabajan. El montaje personalizado se hizo el mismo día. Dudo que exista otro lugar como este.",
        initial: "M",
        color: "#fb923c",
        photo: null,
    },
    {
        name: "Fabiana Moreira",
        badge: null,
        stars: 5,
        time: "7 meses atrás",
        text: "Excelente atención, compramos nuestras alianzas de casamiento y son lindas, además, los precios son muy buenos. Super recomendado.",
        initial: "F",
        color: "#a78bfa",
        photo: null,
    },
    {
        name: "Nay Buono",
        badge: "Local Guide",
        stars: 5,
        time: "5 meses atrás",
        text: "Si buscas calidad, este es definitivamente el lugar correcto 🫶🏼",
        initial: "N",
        color: "#2dd4bf",
        photo: "https://i.imgur.com/993wTWJ.png",
    },
    {
        name: "Francisca González",
        badge: "Local Guide",
        stars: 5,
        time: "un año atrás",
        text: "¡Servicio excelente! ¡Excelente trabajo personalizado! ¡Recomiendo 100%! Con certeza los elegiría de nuevo.",
        initial: "F",
        color: "#f87171",
        photo: null,
    },
];

const TOTAL_SCORE = 5.0;
const TOTAL_REVIEWS = 34;
const CARD_WIDTH = 340;
const GAP = 20;
const VISIBLE = 3;

export function ReviewsCarousel() {
    const [index, setIndex] = useState(0);
    const maxIndex = REVIEWS.length - VISIBLE;
    const dragStartX = useRef<number | null>(null);
    const dragDelta = useRef(0);
    const [isDragging, setIsDragging] = useState(false);

    const prev = () => setIndex((i) => Math.max(0, i - 1));
    const next = () => setIndex((i) => Math.min(maxIndex, i + 1));

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        const clientX = 'clientX' in e ? e.clientX : e.touches?.[0]?.clientX;
        dragStartX.current = clientX ?? null;
        dragDelta.current = 0;
        setIsDragging(true);
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (dragStartX.current === null) return;
        const clientX = 'clientX' in e ? e.clientX : e.touches?.[0]?.clientX;
        if (clientX !== undefined) {
            dragDelta.current = clientX - dragStartX.current;
        }
    };

    const handlePointerUp = () => {
        if (dragStartX.current === null) return;
        if (dragDelta.current < -50) next();
        else if (dragDelta.current > 50) prev();
        dragStartX.current = null;
        dragDelta.current = 0;
        setIsDragging(false);
    };

    const translateX = index * (CARD_WIDTH + GAP);

    return (
        <section className="reviews-section">
            <style>{`
        .reviews-section {
          width: 100%;
          max-width: 1140px;
          margin: 0 auto;
        }

        .reviews-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 52px;
          flex-wrap: wrap;
          gap: 28px;
        }

        .reviews-eyebrow {
          font-size: 11px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: var(--gold, #d4a843);
          font-weight: 500;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .eyebrow-line {
          display: inline-block;
          width: 32px;
          height: 1px;
          background: var(--gold, #d4a843);
          opacity: 0.5;
        }

        .reviews-title {
          font-family: var(--font-headline, 'Cormorant Garamond', serif);
          font-size: clamp(38px, 5vw, 58px);
          font-weight: 300;
          line-height: 1.1;
          color: var(--white, #ffffff);
          letter-spacing: -0.5px;
        }

        .reviews-title em {
          font-style: italic;
          color: var(--gold, #d4a843);
        }

        .score-block { text-align: right; flex-shrink: 0; }

        .score-number {
          font-family: var(--font-headline, 'Cormorant Garamond', serif);
          font-size: 80px;
          font-weight: 300;
          color: var(--white, #ffffff);
          line-height: 1;
          letter-spacing: -3px;
        }

        .score-stars {
          display: flex;
          justify-content: flex-end;
          gap: 4px;
          margin: 8px 0 6px;
        }

        .star-icon { color: var(--gold, #d4a843); font-size: 17px; }

        .score-sub { font-size: 12px; color: #6b7280; letter-spacing: 0.5px; }

        .google-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
          padding: 5px 12px;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          font-size: 11px;
          color: #6b7280;
        }

        .carousel-wrap { position: relative; }

        .track-outer {
          overflow: hidden;
          border-radius: 20px;
          cursor: grab;
          user-select: none;
        }

        .track-outer:active { cursor: grabbing; }

        .review-track {
          display: flex;
          gap: ${GAP}px;
          transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          will-change: transform;
          padding: 6px 3px 20px;
        }

        .review-track.is-dragging { transition: none; }

        .review-card {
          flex: 0 0 ${CARD_WIDTH}px;
          background: rgba(14, 20, 32, 0.9);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .review-card::before {
          content: '\\201C';
          position: absolute;
          top: -16px; right: 16px;
          font-family: var(--font-headline, 'Cormorant Garamond', serif);
          font-size: 130px;
          font-weight: 300;
          color: rgba(212,168,67,0.08);
          line-height: 1;
          pointer-events: none;
          transition: color 0.3s;
        }

        .review-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 28px 64px rgba(0,0,0,0.5);
          border-color: rgba(212,168,67,0.22);
        }

        .review-card:hover::before { color: rgba(212,168,67,0.18); }

        .card-stars { display: flex; gap: 3px; }
        .card-star { color: var(--gold, #d4a843); font-size: 14px; }

        .card-text {
          font-size: 14px;
          line-height: 1.75;
          color: #c0b8ac;
          font-weight: 300;
          flex: 1;
          position: relative;
          z-index: 1;
        }

        .card-author {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .review-avatar {
          width: 40px; height: 40px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-headline, 'Cormorant Garamond', serif);
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          flex-shrink: 0;
        }

        .author-info { flex: 1; min-width: 0; }

        .author-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--white, #ffffff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .author-meta { font-size: 11px; color: #6b7280; margin-top: 2px; }

        .author-badge {
          font-size: 10px;
          color: var(--gold, #d4a843);
          background: rgba(212,168,67,0.12);
          padding: 3px 9px;
          border-radius: 10px;
          font-weight: 500;
          white-space: nowrap;
          border: 1px solid rgba(212,168,67,0.15);
        }

        .review-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 32px;
          padding: 0 4px;
        }

        .review-dots { display: flex; gap: 8px; align-items: center; }

        .review-dot {
          height: 2px;
          border-radius: 2px;
          background: rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.35s ease;
        }

        .review-dot.active { background: var(--gold, #d4a843); }

        .review-arrows { display: flex; gap: 10px; }

        .review-arrow {
          width: 48px; height: 48px;
          border-radius: 50%;
          background: rgba(20, 27, 45, 0.9);
          border: 1px solid rgba(255,255,255,0.06);
          color: #e8e2d8;
          font-size: 16px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }

        .review-arrow:hover:not(:disabled) {
          background: rgba(212,168,67,0.12);
          border-color: rgba(212,168,67,0.3);
          color: var(--gold, #d4a843);
          transform: scale(1.08);
        }

        .review-arrow:disabled { opacity: 0.25; cursor: not-allowed; }

        .reviews-cta-footer {
          margin-top: 44px;
          padding: 26px 32px;
          background: rgba(14, 20, 32, 0.9);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .footer-text {
          font-family: var(--font-headline, 'Cormorant Garamond', serif);
          font-size: 21px;
          font-weight: 300;
          color: var(--white, #ffffff);
        }

        .footer-text em { color: var(--gold, #d4a843); font-style: italic; }

        .footer-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border: 1px solid rgba(212,168,67,0.3);
          border-radius: 40px;
          font-size: 13px;
          font-weight: 500;
          color: var(--gold, #d4a843);
          text-decoration: none;
          transition: all 0.22s;
          background: rgba(212,168,67,0.12);
          letter-spacing: 0.3px;
        }

        .footer-link:hover {
          background: rgba(212,168,67,0.2);
          box-shadow: 0 4px 20px rgba(212,168,67,0.15);
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .review-card { flex: 0 0 290px; }
          .score-block { text-align: left; }
          .reviews-header { flex-direction: column; align-items: flex-start; }
          .score-stars { justify-content: flex-start; }
        }
      `}</style>

            {/* HEADER */}
            <div className="reviews-header">
                <div>
                    <div className="reviews-eyebrow">
                        <span className="eyebrow-line" />
                        Google Reviews
                        <span className="eyebrow-line" />
                    </div>
                    <h2 className="reviews-title">
                        Lo que dicen<br />nuestros <em>clientes</em>
                    </h2>
                </div>
                <div className="score-block">
                    <div className="score-number">{TOTAL_SCORE.toFixed(1)}</div>
                    <div className="score-stars">
                        {[...Array(5)].map((_, i) => <span key={i} className="star-icon">★</span>)}
                    </div>
                    <div className="score-sub">{TOTAL_REVIEWS} reseñas verificadas</div>
                    <div className="google-badge">🔍 Google Maps</div>
                </div>
            </div>

            {/* CAROUSEL */}
            <div className="carousel-wrap">
                <div
                    className="track-outer"
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={handlePointerUp}
                    onMouseLeave={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                    onTouchEnd={handlePointerUp}
                >
                    <div
                        className={`review-track ${isDragging ? "is-dragging" : ""}`}
                        style={{ transform: `translateX(-${translateX}px)` }}
                    >
                        {REVIEWS.map((r, i) => (
                            <div key={i} className="review-card">
                                <div className="card-stars">
                                    {[...Array(r.stars)].map((_, s) => <span key={s} className="card-star">★</span>)}
                                </div>
                                <p className="card-text">{r.text}</p>
                                <div className="card-author">
                                    {r.photo ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                            src={r.photo}
                                            alt={r.name}
                                            className="review-avatar"
                                            style={{ objectFit: "cover", border: `2px solid ${r.color}44` }}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = "none";
                                                if (target.nextElementSibling) {
                                                    (target.nextElementSibling as HTMLElement).style.display = "flex";
                                                }
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className="review-avatar"
                                        style={{
                                            background: `linear-gradient(135deg, ${r.color}88, ${r.color}44)`,
                                            border: `1px solid ${r.color}33`,
                                            display: r.photo ? "none" : "flex",
                                        }}
                                    >
                                        {r.initial}
                                    </div>
                                    <div className="author-info">
                                        <div className="author-name">{r.name}</div>
                                        <div className="author-meta">{r.time}</div>
                                    </div>
                                    {r.badge && <span className="author-badge">{r.badge}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CONTROLS */}
            <div className="review-controls">
                <div className="review-dots">
                    {REVIEWS.map((_, i) => (
                        <div
                            key={i}
                            className={`review-dot ${i === index ? "active" : ""}`}
                            style={{ width: i === index ? 28 : 8 }}
                            onClick={() => setIndex(Math.min(i, maxIndex))}
                        />
                    ))}
                </div>
                <div className="review-arrows">
                    <button className="review-arrow" onClick={prev} disabled={index === 0}>←</button>
                    <button className="review-arrow" onClick={next} disabled={index >= maxIndex}>→</button>
                </div>
            </div>

            {/* FOOTER */}
            <div className="reviews-cta-footer">
                <div className="footer-text">
                    <em>{TOTAL_REVIEWS} familias</em> eligieron Joyería Alianzas
                </div>
                <a
                    href="https://share.google/JkYbjTKsgx9eN0UGt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                >
                    Ver todas en Google ↗
                </a>
            </div>
        </section>
    );
}
