const CLIENT_ID  = 'Ruanmelo777_6481199570914110';
const SECRET_KEY = '3cd962fe70f357dc33ae6d03bdf7f37f9a461a8a6146fca1a78a0b68c8cecfb1';
const BASE_URL   = 'https://api.pixupbr.com/v2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Método não permitido.' }) };

  let amount;
  try {
    const body = JSON.parse(event.body || '{}');
    amount = parseFloat(body.amount);
    if (!amount || amount <= 0) throw new Error('Valor inválido');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Envie um amount válido.' }) };
  }

  let accessToken;
  try {
    const credentials = Buffer.from(`${CLIENT_ID}:${SECRET_KEY}`).toString('base64');
    const tokenRes = await fetch(`${BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    if (!tokenRes.ok) throw new Error(`Falha na autenticação (${tokenRes.status})`);
    accessToken = (await tokenRes.json()).access_token;
  } catch (err) {
    return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) };
  }

  try {
    const pixRes = await fetch(`${BASE_URL}/pix/qrcode`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(amount).toFixed(2), expiration: 1800, description: 'Livro Interativo Touch & Sound – SETTLE DOWN' }),
    });
    if (!pixRes.ok) throw new Error(`Pixup erro ${pixRes.status}`);
    const pixData = await pixRes.json();
    const qrcode = pixData.qrcode ?? pixData.pix_copy_paste ?? pixData.pixCopiaECola ?? pixData.emv ?? null;
    const transactionId = pixData.transactionId ?? pixData.transaction_id ?? pixData.txid ?? pixData.id ?? null;
    
    if (!qrcode) throw new Error('A Pixup não retornou o código QR.');
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ qrcode, transactionId }) };
  } catch (err) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
