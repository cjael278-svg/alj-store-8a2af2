// Recibe el pedido desde la tienda y lo manda al webhook de Discord.
// El webhook vive en una variable de entorno (DISCORD_WEBHOOK_URL), nunca en la página.
exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Método no permitido" }) };
  }
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Falta DISCORD_WEBHOOK_URL" }) };
  }

  let data;
  try { data = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "JSON inválido" }) }; }

  const items = Array.isArray(data.items) ? data.items.slice(0, 30) : [];
  if (!items.length) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Pedido vacío" }) };
  }

  const clean = (s, n) => String(s ?? "").replace(/[@`]/g, "").slice(0, n);
  const lines = items.map((i) => `• ${clean(i.name, 60)} — $${Number(i.price || 0).toFixed(2)}`);
  const total = items.reduce((a, i) => a + (Number(i.price) || 0), 0);

  const payload = {
    username: "ALJ Store",
    allowed_mentions: { parse: [] },
    embeds: [{
      title: "🛒 Nuevo pedido",
      color: 0x7c3aed,
      description: lines.join("\n").slice(0, 3800),
      fields: [
        { name: "Total", value: `$${total.toFixed(2)}`, inline: true },
        { name: "Cliente (Discord)", value: clean(data.customer, 40) || "No indicado", inline: true },
        { name: "Mensaje del cliente", value: clean(data.message, 900) || "—" }
      ],
      timestamp: new Date().toISOString()
    }]
  };

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Discord rechazó el mensaje" }) };
  }
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
};
