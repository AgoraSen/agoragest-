// netlify/functions/send-email.js
const https = require('https')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'RESEND_API_KEY non configurata' }) }
  }

  let body
  try { body = JSON.parse(event.body) } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body non valido' }) }
  }

  const { to, subject, html, from } = body
  if (!to || !subject || !html) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Campi mancanti: to, subject, html' }) }
  }

  const payload = JSON.stringify({
    from: from || 'Agorà Gestionale <noreply@agora.ancona.it>',
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  })

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: 200, body: data })
        } else {
          resolve({ statusCode: res.statusCode, body: data })
        }
      })
    })
    req.on('error', (e) => resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) }))
    req.write(payload)
    req.end()
  })
}
