/* ====================================================
   CHECKOUT PAGE JAVASCRIPT
   ==================================================== */

// ── State ──────────────────────────────────────────
const order = JSON.parse(localStorage.getItem('order') || '{"color":"Rosa","img":"book_rosa.png","quantity":1,"price":39.90,"priceUnit":39.90}');

const state = {
  color: order.color || 'Rosa',
  img: order.img || 'book_rosa.png',
  quantity: order.quantity || 1,
  priceUnit: order.priceUnit || 39.90,
  priceOrig: 147.90,
  discount: 108.00,
  accessoriesTotal: 0,
  addedAccessories: new Set(),
  hasAddress: false,
  couponSeconds: 14182,
};

// ── Utility ────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function formatPrice(val) {
  return 'R$ ' + val.toFixed(2).replace('.', ',');
}

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ── Apply order data ────────────────────────────────
function applyOrderData() {
  // Cor selecionada
  const sizeDisplay = $('size-display');
  if (sizeDisplay) sizeDisplay.textContent = state.color;
  // Imagem do produto
  const itemImg = $('co-item-img');
  if (itemImg) itemImg.src = state.img;
  // Quantidade
  const qtyInput = $('co-qty-input');
  if (qtyInput) qtyInput.value = state.quantity;
  updateTotals();
}

// ── Update Totals ───────────────────────────────────
function updateTotals() {
  const subtotal = state.priceUnit * state.quantity;
  const total = subtotal + state.accessoriesTotal;
  const savings = state.discount * state.quantity;

  $('item-price').textContent = formatPrice(subtotal);
  $('subtotal-val').textContent = formatPrice(subtotal);
  $('discount-val').textContent = '-' + formatPrice(savings);
  $('total-val').textContent = formatPrice(total);
  $('bar-total').textContent = formatPrice(total);
  $('bar-savings').textContent = formatPrice(savings);
  $('savings-display').textContent = formatPrice(savings);
  $('item-count').textContent = state.quantity;

  // Accessories row
  const accRow = $('accessories-row');
  if (state.accessoriesTotal > 0) {
    accRow.style.display = 'flex';
    $('accessories-val').textContent = formatPrice(state.accessoriesTotal);
  } else {
    accRow.style.display = 'none';
  }
}

// ── Quantity Controls ───────────────────────────────
function initQtyControls() {
  const minus = $('co-qty-minus');
  const plus = $('co-qty-plus');
  const input = $('co-qty-input');

  minus.addEventListener('click', () => {
    if (state.quantity > 1) {
      state.quantity--;
      input.value = state.quantity;
      updateTotals();
    }
  });

  plus.addEventListener('click', () => {
    if (state.quantity < 99) {
      state.quantity++;
      input.value = state.quantity;
      updateTotals();
    }
  });

  input.addEventListener('change', () => {
    let val = parseInt(input.value) || 1;
    val = Math.max(1, Math.min(99, val));
    state.quantity = val;
    input.value = val;
    updateTotals();
  });
}

// ── Accessories ─────────────────────────────────────
function initAccessories() {
  $$('.accessory-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const card = btn.closest('.accessory-card');
      const price = parseFloat(card.dataset.price);

      if (state.addedAccessories.has(id)) {
        // Remove
        state.addedAccessories.delete(id);
        state.accessoriesTotal -= price;
        btn.textContent = '+ Adicionar';
        btn.classList.remove('added');
        card.classList.remove('added');
      } else {
        // Add
        state.addedAccessories.add(id);
        state.accessoriesTotal += price;
        btn.textContent = '✓ Adicionado';
        btn.classList.add('added');
        card.classList.add('added');
      }

      state.accessoriesTotal = Math.max(0, Math.round(state.accessoriesTotal * 100) / 100);
      updateTotals();
    });
  });
}

// ── Coupon Timer ────────────────────────────────────
function startCouponTimer() {
  const timerEl = $('coupon-timer');
  function tick() {
    if (state.couponSeconds <= 0) {
      timerEl.textContent = 'Expirado';
      return;
    }
    timerEl.textContent = formatTime(state.couponSeconds);
    state.couponSeconds--;
  }
  tick();
  setInterval(tick, 1000);
}

// ── Back Button ─────────────────────────────────────
function initBackBtn() {
  $('back-btn').addEventListener('click', () => {
    window.history.back();
  });
}

// ── Modals ──────────────────────────────────────────
function initModals() {
  const overlay = $('overlay');
  const addrModal = $('addr-modal');
  const cpfModal = $('cpf-modal');

  function openModal(modal) {
    overlay.classList.add('active');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModals() {
    overlay.classList.remove('active');
    addrModal.classList.remove('active');
    cpfModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  overlay.addEventListener('click', closeModals);

  // Add address
  $('add-addr-btn').addEventListener('click', () => openModal(addrModal));

  // Save address
  $('save-addr-btn').addEventListener('click', () => {
    const street = $('addr-street').value.trim();
    const num = $('addr-num').value.trim();
    const city = $('addr-city').value.trim();

    if (!street && !num && !city) {
      showToast('Preencha ao menos o endereço e número');
      return;
    }

    const addr = [street, num, city].filter(Boolean).join(', ');
    $('addr-display').textContent = addr || 'Endereço confirmado';
    $('addr-display').style.color = 'var(--color-text)';
    $('add-addr-btn').textContent = 'Editar';
    state.hasAddress = true;
    closeModals();
  });

  // Skip address (go to payment)
  $('skip-addr-btn').addEventListener('click', () => {
    closeModals();
    goToPayment();
  });

  // Add CPF
  $('add-cpf-btn').addEventListener('click', () => openModal(cpfModal));

  // Save CPF
  $('save-cpf-btn').addEventListener('click', () => {
    const cpf = $('cpf-input').value.trim();
    if (cpf) {
      $('cpf-display').textContent = cpf;
      $('cpf-display').style.color = 'var(--color-text)';
      $('add-cpf-btn').textContent = 'Editar';
      state.payerDocument = cpf.replace(/\D/g, ''); // salva CPF no state
    }
    closeModals();
  });

  // Add note
  $('add-note-btn').addEventListener('click', () => showToast('Função em desenvolvimento'));

  // Place order
  $('place-order-btn').addEventListener('click', () => {
    if (!state.hasAddress) {
      openModal(addrModal);
    } else {
      goToPayment();
    }
  });
}

function goToPayment() {
  const subtotal = state.priceUnit * state.quantity;
  const total = subtotal + state.accessoriesTotal;

  // Build accessories array from added cards
  const accessoriesArr = [];
  document.querySelectorAll('.accessory-card.added').forEach(card => {
    const id = card.dataset.id;
    const price = parseFloat(card.dataset.price);
    const name = card.querySelector('.accessory-name')?.textContent || '';
    const img = card.querySelector('img')?.src?.split('/').pop() || '';
    accessoriesArr.push({ id, price, name, img });
  });

  // Capturar nome e CPF do campo de endereço se disponíveis
  const payerName = $('addr-street')?.value?.trim() ? 'Cliente SETTLE DOWN' : 'Cliente SETTLE DOWN';
  const payerDoc  = state.payerDocument || '';

  localStorage.setItem('payment', JSON.stringify({
    color: state.color,
    img: state.img,
    quantity: state.quantity,
    priceUnit: state.priceUnit,
    accessoriesTotal: state.accessoriesTotal,
    accessories: accessoriesArr,
    total: total,
    payerName: payerName,
    payerDocument: payerDoc,
  }));
  window.location.href = 'payment.html';
}


// ── Toast ───────────────────────────────────────────
function showToast(message, duration = 3000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 140px; left: 50%;
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

// ── Rotating Social Proof ───────────────────────────
function initSocialProof() {
  const proofs = [
    { name: 'Rafael M.', city: 'São Paulo, SP', time: 'há 2 minutos' },
    { name: 'Camila S.', city: 'Rio de Janeiro, RJ', time: 'há 5 minutos' },
    { name: 'Lucas P.', city: 'Belo Horizonte, MG', time: 'há 8 minutos' },
    { name: 'Ana F.', city: 'Curitiba, PR', time: 'há 11 minutos' },
    { name: 'Marcos T.', city: 'Porto Alegre, RS', time: 'há 15 minutos' },
  ];
  let idx = 0;
  const banner = $('social-proof');

  setInterval(() => {
    idx = (idx + 1) % proofs.length;
    const p = proofs[idx];
    banner.style.opacity = '0';
    setTimeout(() => {
      banner.querySelector('div div:first-child').textContent = `${p.name} acabou de comprar!`;
      banner.querySelector('div div:nth-child(2)').textContent = `${p.city} • ${p.time}`;
      banner.style.opacity = '1';
    }, 300);
    banner.style.transition = 'opacity 300ms';
  }, 6000);
}

// ── CPF Mask ────────────────────────────────────────
function initCPFMask() {
  const cpfInput = $('cpf-input');
  if (!cpfInput) return;
  cpfInput.addEventListener('input', () => {
    let val = cpfInput.value.replace(/\D/g, '').substring(0, 11);
    if (val.length > 9) val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
    else if (val.length > 6) val = val.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
    else if (val.length > 3) val = val.replace(/(\d{3})(\d{0,3})/, '$1.$2');
    cpfInput.value = val;
  });
}

function initCEPMask() {
  const cepInput = $('addr-cep');
  const streetInput = $('addr-street');
  const cityInput = $('addr-city');
  const numInput = $('addr-num');
  if (!cepInput) return;

  // Mask
  cepInput.addEventListener('input', () => {
    let val = cepInput.value.replace(/\D/g, '').substring(0, 8);
    if (val.length > 5) val = val.replace(/(\d{5})(\d{0,3})/, '$1-$2');
    cepInput.value = val;

    // Auto-fill when 8 digits typed
    const digits = val.replace(/\D/g, '');
    if (digits.length === 8) {
      fetchCEP(digits);
    }
  });

  async function fetchCEP(cep) {
    cepInput.style.borderColor = '#aaa';
    const original = cepInput.placeholder;
    cepInput.placeholder = 'Buscando...';
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        cepInput.style.borderColor = '#EF5350';
        showToast('⚠️ CEP não encontrado. Verifique e tente novamente.');
      } else {
        // Preencher campos
        if (streetInput) streetInput.value = data.logradouro || '';
        if (cityInput) cityInput.value = `${data.localidade || ''}, ${data.uf || ''}`;
        // Foco no número após preencher
        if (numInput) numInput.focus();
        cepInput.style.borderColor = '#00C853';
        showToast('✓ Endereço preenchido automaticamente!');
      }
    } catch {
      cepInput.style.borderColor = '#EF5350';
      showToast('Erro ao buscar CEP. Verifique sua conexão.');
    } finally {
      cepInput.placeholder = original;
    }
  }
}

// ── Init ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyOrderData();
  initQtyControls();
  initAccessories();
  initModals();
  initBackBtn();
  startCouponTimer();
  initSocialProof();
  initCPFMask();
  initCEPMask();
});
