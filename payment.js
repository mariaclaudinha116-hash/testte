/* ====================================================
   PAYMENT PAGE JAVASCRIPT – Integração PIX via Pixup
   ==================================================== */

// ── Load Order Data ──────────────────────────────────
const paymentData = JSON.parse(
  localStorage.getItem('payment') ||
  '{"color":"Rosa","img":"book_rosa.png","quantity":1,"total":39.90,"priceUnit":39.90,"accessories":[],"accessoriesTotal":0}'
);

const state = {
  color:            paymentData.color            || 'Rosa',
  img:              paymentData.img              || 'book_rosa.png',
  quantity:         paymentData.quantity         || 1,
  priceUnit:        paymentData.priceUnit        || 39.90,
  accessoriesTotal: paymentData.accessoriesTotal || 0,
  accessories:      paymentData.accessories      || [],
  total:            paymentData.total            || 39.90,
  payerName:        paymentData.payerName        || 'Cliente SETTLE DOWN',
  payerDocument:    paymentData.payerDocument    || '',
  pixSeconds:       1800,
};

// ── Helpers ───────────────────────────────────────────
function formatPrice(val) {
  return 'R$ ' + Number(val).toFixed(2).replace('.', ',');
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function showLoading(show) {
  const qrWrapper = document.querySelector('.qr-wrapper');
  const instruction = document.querySelector('.pix-instruction');
  if (!qrWrapper) return;
  if (show) {
    qrWrapper.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px 20px">
        <div class="pix-spinner"></div>
        <span style="font-size:13px;color:var(--color-text-secondary)">Gerando QR Code PIX...</span>
      </div>`;
    if (instruction) instruction.textContent = 'Aguarde, gerando seu QR Code...';
  }
}

function showErrorMessage(msg) {
  const qrWrapper = document.querySelector('.qr-wrapper');
  const instruction = document.querySelector('.pix-instruction');
  if (qrWrapper) {
    qrWrapper.innerHTML = `
      <div style="text-align:center;padding:30px 20px">
        <div style="font-size:32px;margin-bottom:8px">⚠️</div>
        <div style="font-size:13px;color:#EF5350;font-weight:600">${msg}</div>
        <button onclick="location.reload()" style="margin-top:14px;padding:8px 20px;border-radius:20px;border:1.5px solid #EF5350;color:#EF5350;background:#fff;font-size:13px;cursor:pointer;font-weight:600">Tentar novamente</button>
      </div>`;
  }
  if (instruction) {
    instruction.textContent = msg;
    instruction.style.color = '#EF5350';
  }
}

// ── Aplicar Dados do Pedido ───────────────────────────
function applyData() {
  // Produto principal
  const productImg = document.getElementById('pay-product-img');
  if (productImg) productImg.src = state.img;

  const colorEl = document.getElementById('pay-color');
  if (colorEl) colorEl.textContent = state.color;

  const qtyEl = document.getElementById('pay-qty');
  if (qtyEl) qtyEl.textContent = state.quantity;

  const subtotalEl = document.getElementById('pay-subtotal');
  if (subtotalEl) subtotalEl.textContent = formatPrice(state.priceUnit * state.quantity);

  // Acessórios (order bumps)
  const accList = document.getElementById('pay-accessories-list');
  const accRow  = document.getElementById('pay-acc-row');
  const accVal  = document.getElementById('pay-acc-val');

  if (accList && state.accessories && state.accessories.length > 0) {
    accList.innerHTML = state.accessories.map(acc => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--color-divider)">
        <img src="${acc.img}" alt="${acc.name}"
             style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid var(--color-divider)"
             onerror="this.style.display='none'">
        <div style="flex:1">
          <div style="font-size:12px;font-weight:600;color:var(--color-text)">${acc.name}</div>
          <div style="font-size:11px;color:var(--color-text-secondary)">Qtd: 1 &nbsp;•&nbsp; com 70% off</div>
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--color-action)">${formatPrice(acc.price)}</div>
      </div>
    `).join('');
  }

  if (state.accessoriesTotal > 0) {
    if (accRow) accRow.style.display = 'flex';
    if (accVal) accVal.textContent = formatPrice(state.accessoriesTotal);
  }

  // Total e valor PIX
  const totalEl  = document.getElementById('pay-total');
  const amountEl = document.getElementById('pix-amount');
  if (totalEl)  totalEl.textContent  = formatPrice(state.total);
  if (amountEl) amountEl.textContent = formatPrice(state.total);
}

// ── Integração PIX – Netlify Function ─────────────────
async function initPixPayment() {
  const canvas  = document.getElementById('qr-canvas');
  const codeEl  = document.getElementById('pix-code');

  showLoading(true);

  try {
    // Chama o backend seguro (Netlify Function)
    const response = await fetch('/.netlify/functions/gerar-pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: state.total,
        payerName: state.payerName,
        payerDocument: state.payerDocument,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || `Erro ${response.status}`);
    }

    // Restaurar wrapper e renderizar QR Code (qrcodejs)
    const qrWrapper = document.querySelector('.qr-wrapper');
    if (qrWrapper && data.qrcode) {
      qrWrapper.innerHTML = '<div id="qr-render"></div>';
      new QRCode(document.getElementById('qr-render'), {
        text: data.qrcode,
        width: 240,
        height: 240,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M,
      });
    }

    // Preencher código Copia e Cola
    if (codeEl && data.qrcode) {
      codeEl.textContent = data.qrcode;
    }


    // Salvar transactionId para consulta futura
    if (data.transactionId) {
      sessionStorage.setItem('pixTransactionId', data.transactionId);
    }

    // Instrução de sucesso
    const instruction = document.querySelector('.pix-instruction');
    if (instruction) {
      instruction.textContent = 'Escaneie o QR Code ou copie o código PIX para pagar';
      instruction.style.color = '';
    }

  } catch (err) {
    console.error('[PIX] Erro:', err);
    showErrorMessage('Erro ao gerar QR Code. Tente novamente.');
  }
}

// ── PIX Timer ─────────────────────────────────────────
function startPixTimer() {
  const timerEl = document.getElementById('pix-timer');
  if (!timerEl) return;
  function tick() {
    if (state.pixSeconds <= 0) {
      timerEl.textContent = 'EXPIRADO';
      timerEl.style.color = '#EF5350';
      return;
    }
    timerEl.textContent = formatTime(state.pixSeconds);
    state.pixSeconds--;
    setTimeout(tick, 1000);
  }
  tick();
}

// ── Copiar Código PIX ─────────────────────────────────
function initCopyBtn() {
  const copyBtn = document.getElementById('pix-copy-btn');
  const codeEl  = document.getElementById('pix-code');
  if (!copyBtn || !codeEl) return;

  copyBtn.addEventListener('click', async () => {
    const code = codeEl.textContent.trim();
    if (!code || code.length < 10) {
      copyBtn.textContent = '⏳ Aguarde o QR Code...';
      setTimeout(() => { copyBtn.textContent = '📋 Copiar código PIX'; }, 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    copyBtn.textContent = '✓ Código copiado!';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = '📋 Copiar código PIX';
      copyBtn.classList.remove('copied');
    }, 3000);
  });
}

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  applyData();
  startPixTimer();
  initCopyBtn();
  await initPixPayment();
});
