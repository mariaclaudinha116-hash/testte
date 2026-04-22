/* ====================================================
   PRODUCT PAGE JAVASCRIPT
   ==================================================== */

// ── State ──────────────────────────────────────────
const state = {
  galleryIndex: 0,
  galleryTotal: 5,
  isFavorited: false,
  isFollowing: false,
  selectedColor: 'Rosa',
  selectedImg: 'book_rosa.png',
  quantity: 1,
  priceUnit: 39.90,
  cartCount: 0,
  countdownSeconds: 3599,
};

// ── Utility ────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function formatPrice(val) {
  return val.toFixed(2).replace('.', ',');
}

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ── Countdown ──────────────────────────────────────
function startCountdown() {
  const timerEl = $('countdown-timer');
  const modalTimer = $('modal-countdown');

  function tick() {
    if (state.countdownSeconds <= 0) {
      state.countdownSeconds = 3599;
    }
    const formatted = `00:${formatTime(state.countdownSeconds)}`;
    if (timerEl) timerEl.textContent = formatted;
    if (modalTimer) modalTimer.textContent = `0 dias e ${formatted}`;
    state.countdownSeconds--;
  }
  tick();
  setInterval(tick, 1000);
}

// ── Gallery ────────────────────────────────────────
function initGallery() {
  const track = $('gallery-track');
  const counter = $('gallery-counter');
  const prevBtn = $('gallery-prev');
  const nextBtn = $('gallery-next');
  const wrapper = $('gallery-wrapper');

  let startX = 0;
  let isDragging = false;

  function goTo(idx) {
    state.galleryIndex = (idx + state.galleryTotal) % state.galleryTotal;
    track.style.transform = `translateX(-${state.galleryIndex * 100}%)`;
    counter.textContent = `${state.galleryIndex + 1}/${state.galleryTotal}`;
  }

  prevBtn.addEventListener('click', () => goTo(state.galleryIndex - 1));
  nextBtn.addEventListener('click', () => goTo(state.galleryIndex + 1));

  // Touch swipe
  wrapper.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  wrapper.addEventListener('touchend', e => {
    if (!isDragging) return;
    const diffX = e.changedTouches[0].clientX - startX;
    if (Math.abs(diffX) > 40) {
      goTo(state.galleryIndex + (diffX < 0 ? 1 : -1));
    }
    isDragging = false;
  });

  // Mouse drag
  wrapper.addEventListener('mousedown', e => { startX = e.clientX; isDragging = true; });
  wrapper.addEventListener('mouseup', e => {
    if (!isDragging) return;
    const diffX = e.clientX - startX;
    if (Math.abs(diffX) > 40) goTo(state.galleryIndex + (diffX < 0 ? 1 : -1));
    isDragging = false;
  });
  wrapper.addEventListener('mouseleave', () => { isDragging = false; });

  // Auto slide
  setInterval(() => { goTo(state.galleryIndex + 1); }, 5000);
}

// ── Zoom ───────────────────────────────────────────
function initZoom() {
  const zoomBtn = $('gallery-zoom');
  const zoomModal = $('zoom-modal');
  const zoomOverlay = $('zoom-overlay');
  const zoomClose = $('zoom-close');
  const zoomImg = $('zoom-img');

  function openZoom() {
    const slides = $$('.gallery-slide img');
    const src = slides[state.galleryIndex]?.src || slides[0].src;
    zoomImg.src = src;
    zoomOverlay.classList.add('active');
    zoomModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeZoom() {
    zoomOverlay.classList.remove('active');
    zoomModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  zoomBtn.addEventListener('click', openZoom);
  zoomClose.addEventListener('click', closeZoom);
  zoomOverlay.addEventListener('click', closeZoom);
}

// ── Favorite ───────────────────────────────────────
function initFavorite() {
  const btn = $('fav-btn');
  const icon = $('fav-icon');
  btn.addEventListener('click', () => {
    state.isFavorited = !state.isFavorited;
    icon.setAttribute('fill', state.isFavorited ? '#FF4081' : 'none');
    btn.classList.toggle('active', state.isFavorited);
  });
}

// ── Follow ─────────────────────────────────────────
function initFollow() {
  const btn = $('follow-btn');
  btn.addEventListener('click', () => {
    state.isFollowing = !state.isFollowing;
    btn.textContent = state.isFollowing ? 'Seguindo ✓' : 'Seguir';
    btn.classList.toggle('active', state.isFollowing);
  });
}

// ── Accordion ──────────────────────────────────────
function initAccordion() {
  $$('.accordion-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      // Close all
      $$('.accordion-trigger').forEach(t => {
        t.setAttribute('aria-expanded', 'false');
        t.nextElementSibling.classList.remove('open');
      });
      // Open clicked if was closed
      if (!isOpen) {
        trigger.setAttribute('aria-expanded', 'true');
        trigger.nextElementSibling.classList.add('open');
      }
    });
  });
}

// ── Buy Modal ──────────────────────────────────────
function initBuyModal() {
  const overlay = $('overlay');
  const modal = $('buy-modal');
  const closeBtn = $('modal-close');
  const buyBarBtn = $('bar-buy-btn');
  const addCartBarBtn = $('bar-add-cart-btn');
  const modalBuyBtn = $('modal-buy-btn');
  const modalAddCartBtn = $('modal-add-cart-btn');
  const qtyMinus = $('qty-minus');
  const qtyPlus = $('qty-plus');
  const qtyInput = $('qty-input');
  const modalTotal = $('modal-total');
  const cartDot = $('cart-dot');

  let startY = 0;
  let isDragging = false;

  function openModal() {
    overlay.classList.add('active');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.classList.remove('active');
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function updateTotal() {
    modalTotal.textContent = formatPrice(state.priceUnit * state.quantity);
  }

  buyBarBtn.addEventListener('click', openModal);
  addCartBarBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  // Qty controls
  qtyMinus.addEventListener('click', () => {
    if (state.quantity > 1) {
      state.quantity--;
      qtyInput.value = state.quantity;
      updateTotal();
    }
  });

  qtyPlus.addEventListener('click', () => {
    if (state.quantity < 99) {
      state.quantity++;
      qtyInput.value = state.quantity;
      updateTotal();
    }
  });

  qtyInput.addEventListener('change', () => {
    let val = parseInt(qtyInput.value) || 1;
    val = Math.max(1, Math.min(99, val));
    state.quantity = val;
    qtyInput.value = val;
    updateTotal();
  });

  // Color variant selection
  $$('.variant-thumb').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.variant-thumb').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
      state.selectedColor = btn.dataset.color;
      state.selectedImg = btn.dataset.img;
      // Update modal thumbnail
      const modalImg = $('modal-img');
      if (modalImg) modalImg.src = state.selectedImg;
      // Update color name label
      const colorName = $('selected-color-name');
      if (colorName) colorName.textContent = state.selectedColor;
    });
  });

  // Swipe to close modal
  modal.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  modal.addEventListener('touchend', e => {
    if (!isDragging) return;
    const diffY = e.changedTouches[0].clientY - startY;
    if (diffY > 80) closeModal();
    isDragging = false;
  });

  // Add to cart
  function addToCart() {
    state.cartCount += state.quantity;
    cartDot.style.display = 'block';
    closeModal();
    showToast(`✓ ${state.quantity}x Livro Interativo (${state.selectedColor}) adicionado!`);
  }

  // Go to checkout
  function goToCheckout() {
    localStorage.setItem('order', JSON.stringify({
      color: state.selectedColor,
      img: state.selectedImg,
      quantity: state.quantity,
      price: state.priceUnit * state.quantity,
      priceUnit: state.priceUnit,
    }));
    window.location.href = 'checkout.html';
  }

  modalBuyBtn.addEventListener('click', goToCheckout);
  modalAddCartBtn.addEventListener('click', addToCart);
}

// ── Toast Notification ─────────────────────────────
function showToast(message, duration = 3000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: calc(var(--bottom-bar-height) + 16px); left: 50%;
    transform: translateX(-50%) translateY(20px); background: rgba(0,0,0,0.85);
    color: #fff; padding: 10px 20px; border-radius: 24px; font-size: 13px;
    font-weight: 600; z-index: 9999; opacity: 0; white-space: nowrap;
    transition: opacity 300ms ease, transform 300ms ease; pointer-events: none;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Share ──────────────────────────────────────────
function initShare() {
  $('share-btn').addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Livro Interativo com Som – Touch & Sound Bilíngue',
          text: 'Livro educativo bilíngue em oferta relâmpago -68%! Confira!',
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      showToast('🔗 Link copiado!');
    }
  });
}

// ── Init ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initGallery();
  initZoom();
  initFavorite();
  initFollow();
  initAccordion();
  initBuyModal();
  initShare();
  startCountdown();
});
