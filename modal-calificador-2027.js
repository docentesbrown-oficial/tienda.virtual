(() => {
  'use strict';

  const CAMPAIGN_DATE = { year: 2026, month: 8, day: 31 };
  const TIME_ZONE = 'America/Argentina/Buenos_Aires';
  const MODAL_ID = 'db-calificador-2027-modal';

  function getBuenosAiresDateParts() {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const parts = formatter.formatToParts(new Date());
    const map = {};
    parts.forEach(part => {
      if (part.type !== 'literal') map[part.type] = Number(part.value);
    });

    return {
      year: map.year,
      month: map.month,
      day: map.day
    };
  }

  function isCampaignDay() {
    const today = getBuenosAiresDateParts();
    return (
      today.year === CAMPAIGN_DATE.year &&
      today.month === CAMPAIGN_DATE.month &&
      today.day === CAMPAIGN_DATE.day
    );
  }

  function closePromoModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.classList.remove('db-promo-visible');
    document.body.classList.remove('db-promo-lock');

    setTimeout(() => {
      modal.remove();
    }, 260);
  }

  function goToCalificador2027() {
    closePromoModal();

    // Integración preferida con la tienda actual.
    if (typeof openConfigModal === 'function') {
      setTimeout(() => openConfigModal('profesores'), 280);
      return;
    }

    // Fallback: intenta hacer clic en la tarjeta del calificador.
    const productCard =
      document.querySelector('[onclick*="openConfigModal(\'profesores\')"]') ||
      document.querySelector('[onclick*="openConfigModal(&quot;profesores&quot;)"]');

    if (productCard) {
      setTimeout(() => productCard.click(), 280);
      return;
    }

    // Último fallback: WhatsApp si la tienda expone WA_NUMBER.
    try {
      if (typeof WA_NUMBER !== 'undefined' && WA_NUMBER) {
        const msg = encodeURIComponent(
          'Hola Docentes Brown. Quiero encargar mi Calificador 2027 hoy 31 de agosto y pagarlo antes del 10 de septiembre manteniendo el precio de agosto.'
        );
        window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank', 'noopener');
      }
    } catch (_) {}
  }

  function buildModal() {
    if (!isCampaignDay()) return;
    if (document.getElementById(MODAL_ID)) return;

    const style = document.createElement('style');
    style.id = 'db-calificador-2027-style';
    style.textContent = `
      .db-promo-lock {
        overflow: hidden !important;
      }

      #${MODAL_ID} {
        --db-blue: var(--primary-blue, #24496e);
        --db-cream: var(--bg-brand, #f3efdc);
        --db-coral: #da6863;
        --db-ink: #18212a;
        --db-white: #ffffff;
        --db-shadow: 0 24px 70px rgba(24, 33, 42, .30);

        position: fixed;
        inset: 0;
        z-index: 100000;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(10, 20, 30, .58);
        backdrop-filter: blur(9px);
        -webkit-backdrop-filter: blur(9px);
        opacity: 0;
        pointer-events: none;
        transition: opacity .22s ease;
      }

      #${MODAL_ID}.db-promo-visible {
        opacity: 1;
        pointer-events: auto;
      }

      #${MODAL_ID} .db-promo-card {
        width: min(100%, 500px);
        position: relative;
        overflow: hidden;
        border-radius: 28px;
        background: var(--db-cream);
        border: 1px solid rgba(255,255,255,.5);
        box-shadow: var(--db-shadow);
        transform: translateY(18px) scale(.98);
        transition: transform .28s cubic-bezier(.2,.8,.2,1);
      }

      #${MODAL_ID}.db-promo-visible .db-promo-card {
        transform: translateY(0) scale(1);
      }

      #${MODAL_ID} .db-promo-top {
        position: relative;
        padding: 24px 26px 72px;
        background: var(--db-blue);
        color: var(--db-white);
      }

      #${MODAL_ID} .db-promo-top::after {
        content: '';
        position: absolute;
        left: -8%;
        right: -8%;
        bottom: -36px;
        height: 74px;
        background: var(--db-cream);
        border-radius: 50% 50% 0 0 / 100% 100% 0 0;
      }

      #${MODAL_ID} .db-promo-brand {
        font-family: 'League Spartan', sans-serif;
        font-weight: 800;
        font-size: .86rem;
        letter-spacing: .08em;
        text-transform: uppercase;
        opacity: .9;
      }

      #${MODAL_ID} .db-promo-kicker {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 20px;
        padding: 8px 12px;
        border-radius: 999px;
        background: var(--db-coral);
        color: white;
        font-family: 'League Spartan', sans-serif;
        font-size: .82rem;
        font-weight: 800;
        letter-spacing: .04em;
      }

      #${MODAL_ID} h2 {
        margin: 16px 0 0;
        max-width: 390px;
        color: white;
        font-family: 'League Spartan', sans-serif;
        font-size: clamp(2rem, 8vw, 3rem);
        line-height: .98;
        letter-spacing: -.025em;
        text-transform: uppercase;
      }

      #${MODAL_ID} .db-promo-body {
        padding: 25px 26px 26px;
        color: var(--db-ink);
      }

      #${MODAL_ID} .db-promo-lead {
        margin: 0;
        font-size: 1.08rem;
        line-height: 1.42;
      }

      #${MODAL_ID} .db-promo-highlight {
        margin: 18px 0;
        padding: 16px 17px;
        border-radius: 18px;
        background: white;
        border-left: 5px solid var(--db-coral);
        box-shadow: 0 8px 24px rgba(36,73,110,.08);
        font-size: .98rem;
        line-height: 1.45;
      }

      #${MODAL_ID} .db-promo-highlight strong {
        color: var(--db-blue);
      }

      #${MODAL_ID} .db-promo-cta {
        width: 100%;
        border: 0;
        border-radius: 16px;
        padding: 17px 18px;
        background: var(--db-blue);
        color: white;
        cursor: pointer;
        font-family: 'League Spartan', sans-serif;
        font-size: 1.08rem;
        font-weight: 800;
        letter-spacing: .015em;
        box-shadow: 0 8px 22px rgba(36,73,110,.20);
      }

      #${MODAL_ID} .db-promo-cta:active {
        transform: scale(.985);
      }

      #${MODAL_ID} .db-promo-note {
        margin: 11px 0 0;
        color: #66717a;
        font-size: .82rem;
        line-height: 1.35;
        text-align: center;
      }

      #${MODAL_ID} .db-promo-close {
        position: absolute;
        top: 15px;
        right: 15px;
        z-index: 3;
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 50%;
        background: rgba(255,255,255,.14);
        color: white;
        cursor: pointer;
        font-size: 1.2rem;
        line-height: 1;
      }

      @media (max-width: 480px) {
        #${MODAL_ID} {
          align-items: end;
          padding: 10px;
        }

        #${MODAL_ID} .db-promo-card {
          border-radius: 26px 26px 18px 18px;
        }

        #${MODAL_ID} .db-promo-top {
          padding: 22px 22px 64px;
        }

        #${MODAL_ID} .db-promo-body {
          padding: 23px 22px 22px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${MODAL_ID},
        #${MODAL_ID} .db-promo-card {
          transition: none;
        }
      }
    `;
    document.head.appendChild(style);

    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'db-promo-title');

    modal.innerHTML = `
      <section class="db-promo-card">
        <button class="db-promo-close" type="button" aria-label="Cerrar promoción">×</button>

        <div class="db-promo-top">
          <div class="db-promo-brand">Docentes Brown</div>
          <div class="db-promo-kicker">HOY • 31 DE AGOSTO</div>
          <h2 id="db-promo-title">Congelá hoy el precio de tu Calificador 2027</h2>
        </div>

        <div class="db-promo-body">
          <p class="db-promo-lead">
            <strong>Encargá hoy tu Calificador 2027</strong> y asegurate el
            <strong>precio de agosto</strong>.
          </p>

          <div class="db-promo-highlight">
            Lo reservás <strong>hoy, 31 de agosto</strong> y tenés tiempo para
            <strong>pagarlo hasta el 10 de septiembre</strong>.
          </div>

          <button class="db-promo-cta" type="button">
            QUIERO ENCARGAR MI CALIFICADOR 2027
          </button>

          <p class="db-promo-note">
            Beneficio válido únicamente para encargos realizados durante el 31/08/2026.
          </p>
        </div>
      </section>
    `;

    document.body.appendChild(modal);
    document.body.classList.add('db-promo-lock');

    const closeBtn = modal.querySelector('.db-promo-close');
    const ctaBtn = modal.querySelector('.db-promo-cta');

    closeBtn.addEventListener('click', closePromoModal);
    ctaBtn.addEventListener('click', goToCalificador2027);

    modal.addEventListener('click', (event) => {
      if (event.target === modal) closePromoModal();
    });

    document.addEventListener('keydown', function escHandler(event) {
      if (event.key === 'Escape' && document.getElementById(MODAL_ID)) {
        closePromoModal();
        document.removeEventListener('keydown', escHandler);
      }
    });

    requestAnimationFrame(() => {
      modal.classList.add('db-promo-visible');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildModal);
  } else {
    buildModal();
  }
})();