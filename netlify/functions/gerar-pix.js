/* ====================================================
   Netlify Serverless Function – Gerador de PIX (Pixup)
   Arquivo: netlify/functions/gerar-pix.js
   Documentação: https://pixup.readme.io/reference/
   ==================================================== */

const CLIENT_ID  = 'Ruanmelo777_6481199570914110';
const SECRET_KEY = '3cd962fe70f357dc33ae6d03bdf7f37f9a461a8a6146fca1a78a0b68c8cecfb1';
const BASE_URL   = 'https://api.pixupbr.com/v2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async function (event) {

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Método não permitido.' }) };
  }

  // ── 1. Validar amount ───────────────────────────────
  let amount;
  try {
    const body = JSON.parse(event.body || '{}');
    amount = parseFloat(body.amount);
    if (!amount || isNaN(amount) || amount <= 0) throw new Error('Valor inválido');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Envie um amount válido.' }) };
  }

  // ── 2. Obter Token OAuth ────────────────────────────
  let accessToken;
  try {
    const credentials = Buffer.from(`${CLIENT_ID}:${SECRET_KEY}`).toString('base64');

    const tokenRes = await fetch(`${BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenBody = await tokenRes.text();
    console.log('[Pixup Token] Status:', tokenRes.status, '| Body:', tokenBody);

    if (!tokenRes.ok) throw new Error(`Auth falhou (${tokenRes.status}): ${tokenBody}`);

    const tokenData = JSON.parse(tokenBody);
    accessToken = tokenData.access_token;

    if (!accessToken) throw new Error('access_token não retornado: ' + tokenBody);

  } catch (err) {
    console.error('[Pixup] Erro de autenticação:', err.message);
    return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) };
  }

  // ── 3. Criar Cobrança PIX ───────────────────────────
  try {
    // externalId único por transação (obrigatório na Pixup)
    const externalId = `settle-${Date.now()}`;

    const pixPayload = {
      amount: Number(amount),
      externalId: externalId,
      description: 'Livro Interativo Touch & Sound – SETTLE DOWN',
    };

    console.log('[Pixup QR] Enviando:', JSON.stringify(pixPayload));

    const pixRes = await fetch(`${BASE_URL}/pix/qrcode`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pixPayload),
    });

    const pixBody = await pixRes.text();
    console.log('[Pixup QR] Status:', pixRes.status, '| Body:', pixBody);

    if (!pixRes.ok) throw new Error(`Pixup erro ${pixRes.status}: ${pixBody}`);

    const pixData = JSON.parse(pixBody);

    // Cobrir todas as variações de nome do campo
    const qrcode = pixData.qrcode
      ?? pixData.pix_copy_paste
      ?? pixData.pixCopiaECola
      ?? pixData.emv
      ?? pixData.brCode
      ?? pixData.qr_code
      ?? null;

    const transactionId = pixData.transactionId
      ?? pixData.transaction_id
      ?? pixData.txid
      ?? pixData.id
      ?? externalId;

    if (!qrcode) {
      console.error('[Pixup] Resposta sem qrcode:', pixBody);
      // Retornar a resposta completa para debug
      return {
        statusCode: 422,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Pixup não retornou qrcode. Ver campo "pixupResponse" para debug.',
          pixupResponse: pixData,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ qrcode, transactionId }),
    };

  } catch (err) {
    console.error('[Pixup] Erro na cobrança:', err.message);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
