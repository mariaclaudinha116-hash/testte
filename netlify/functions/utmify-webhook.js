/* ====================================================
   Netlify Serverless Function – Webhook UTMify
   Arquivo: netlify/functions/utmify-webhook.js
   Descrição: Recebe o webhook da Pixup (PIX Pago) e 
   envia para a API da UTMify via S2S para marcar Purchase.
   ==================================================== */

const UTMIFY_API_TOKEN = 'x09OFWCdoQzTN0nmQKbHnlhh89QtiVI6kUO5';
const UTMIFY_API_URL = 'https://api.utmify.com.br/api/postback';

exports.handler = async function (event) {
  // Apenas aceita POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    console.log('[Webhook Pixup] Payload recebido:', JSON.stringify(payload));

    // A estrutura do webhook da Pixup tem requestBody
    const reqBody = payload.requestBody || payload;

    // Só vamos enviar para a UTMify se a transação estiver PAGA
    // Pixup envia status "PAID" para Recebimento de PIX ou "PAYMENT"
    const status = reqBody.status || reqBody.statusCode?.description || '';
    
    // Convertendo status para o padrão UTMify (paid, waiting_payment, canceled)
    let utmifyStatus = 'waiting_payment';
    if (status === 'PAID' || status === 'Pagamento aprovado') {
      utmifyStatus = 'paid';
    } else {
      console.log('[Webhook] Status não é de pagamento aprovado. Status:', status);
      return { statusCode: 200, body: 'Ignorado (não é PAID)' };
    }

    // Pega os dados do cliente (creditParty no Pixup)
    const customer = reqBody.creditParty || {};

    // Montando o JSON exato que a API da UTMify espera
    const utmifyPayload = {
      orderId: reqBody.transactionId || reqBody.external_id || `pixup-${Date.now()}`,
      platform: "Pixup",
      paymentMethod: "pix",
      status: utmifyStatus,
      createdAt: reqBody.dateApproval || new Date().toISOString(),
      approvedDate: reqBody.dateApproval || new Date().toISOString(),
      customer: {
        name: customer.name || "Cliente Settle Down",
        email: customer.email || "cliente@settledown.com",
        document: customer.taxId || "00000000000",
        phone: "11999999999" // Fallback necessário para UTMify
      },
      products: [
        {
          id: "livro-interativo-settle-down",
          name: "Livro Interativo Touch & Sound",
          price: Number(reqBody.amount || 39.90)
        }
      ],
      commission: {
        value: Number(reqBody.amount || 39.90)
      }
    };

    console.log('[Webhook UTMify] Enviando payload:', JSON.stringify(utmifyPayload));

    // Enviando para a API da UTMify
    const response = await fetch(UTMIFY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': UTMIFY_API_TOKEN
      },
      body: JSON.stringify(utmifyPayload)
    });

    const respText = await response.text();
    console.log('[Webhook UTMify] Resposta:', response.status, respText);

    if (!response.ok) {
      console.error('[Webhook UTMify] Erro da API UTMify:', respText);
      // Se falhar, tentamos a rota alternativa de s2s caso a primeira de 404
      if (response.status === 404 || response.status === 403) {
         console.log('[Webhook UTMify] Tentando URL alternativa...');
         await fetch('https://api.utmify.com.br/api/campaigns/s2s', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-token': UTMIFY_API_TOKEN },
            body: JSON.stringify(utmifyPayload)
         });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Webhook processado e enviado para UTMify' })
    };

  } catch (error) {
    console.error('[Webhook Erro]:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno no processamento do webhook' })
    };
  }
};
