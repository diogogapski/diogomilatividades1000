const crypto = require("crypto");

const baseProduct = {
  id: "1000-atividades-leitura-ortografia-bncc",
  title: "1000 Atividades de Leitura e Ortografia - BNCC",
  gatewayTitle: "1000 Atividades BNCC",
  price: 17.9
};

const bumps = [
  { id: "producao-texto-320", title: "320 Atividades de Producao de Texto", gatewayTitle: "320 Atividades de Producao de Texto", price: 5.9 },
  { id: "generos-textuais-850", title: "850 Atividades de Generos Textuais", gatewayTitle: "850 Atividades de Generos Textuais", price: 7.9 },
  { id: "verbos-200", title: "+200 Atividades de Verbos", gatewayTitle: "+200 Atividades de Verbos", price: 5.9 },
  { id: "numerais", title: "Atividades sobre Numerais", gatewayTitle: "Atividades sobre Numerais", price: 5.9 },
  { id: "silabas-complexas-150", title: "+150 Atividades de Silabas Complexas", gatewayTitle: "+150 Atividades de Silabas Complexas", price: 6.9 }
];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json({ error: "Metodo nao permitido." }, 405);

  const body = parseJson(event.body || "{}");
  const product = resolveProduct(body.plan);
  const selected = new Set(Array.isArray(body.bumpIds) ? body.bumpIds : []);
  const chosenBumps = bumps.filter((bump) => selected.has(bump.id));
  const amount = Number((product.price + chosenBumps.reduce((sum, bump) => sum + bump.price, 0)).toFixed(2));
  const reference = `PARADISE-${Date.now()}-${randomHex(4)}`;
  const customer = {
    name: body.name || randomBrazilianName(),
    email: String(body.email || "").trim(),
    phone: onlyDigits(body.phone) || randomPhone(),
    document: validCpf(onlyDigits(body.document))
  };

  const validationError = validateCustomer(customer);
  if (validationError) return json({ ok: false, error: validationError }, 502);

  const origin = getOrigin(event);
  const payload = {
    amount: Math.round(amount * 100),
    description: product.gatewayTitle,
    reference,
    postback_url: process.env.POSTBACK_URL || `${origin}/api/webhook`,
    source: "api_externa",
    customer,
    tracking: pickTracking(body.tracking || {})
  };

  const response = await fetch(`${process.env.PARADISE_API_URL || "https://multi.paradisepags.com"}${process.env.PARADISE_TRANSACTION_PATH || "/api/v1/transaction.php"}`, {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "OfertaPedagogicaCheckout/1.0",
      "X-API-Key": process.env.PARADISE_API_KEY || process.env.AMPLO_SECRET_KEY || ""
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  const provider = parseJson(text);
  const providerData = provider.data && typeof provider.data === "object" ? provider.data : provider;
  const pix = providerData.pix || provider.pix || {};
  const qrCode = providerData.qr_code || provider.qr_code || pix.code || pix.qrCode || pix.qr_code || "";
  const result = {
    ok: response.ok && Boolean(qrCode) && (provider.status === "success" || providerData.status === "success" || response.status < 300),
    mode: "live",
    status: response.status,
    orderId: providerData.id || provider.id || reference,
    transactionId: providerData.transaction_id || provider.transaction_id || providerData.id || reference,
    amount: typeof providerData.amount === "number" ? providerData.amount / 100 : amount,
    qrCode,
    qrCodeBase64: providerData.qr_code_base64 || provider.qr_code_base64 || pix.base64 || pix.qrCodeBase64 || "",
    qrCodeImage: pix.image || pix.qrCodeImage || providerData.pixInformation?.image || "",
    receiptUrl: providerData.order?.receiptUrl || "",
    provider,
    error: response.ok && qrCode ? undefined : gatewayError(provider)
  };

  if (result.ok) {
    fetch(`${origin}/api/record-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.PARADISE_API_KEY || process.env.AMPLO_SECRET_KEY || ""
      },
      body: JSON.stringify({ body: { ...body, ...customer }, result, product, chosenBumps, reference })
    }).catch(() => {});
  }

  return json(result, result.ok ? 200 : 502);
};

function resolveProduct(plan) {
  if (String(plan || "").trim().toLowerCase() !== "premium") return baseProduct;
  return {
    id: "pacote-premium-alfabetizacao-reforco",
    title: "Pacote Premium de Alfabetizacao + Reforco Avancado",
    gatewayTitle: "Pacote Premium 1000 Atividades + Reforco",
    price: 27.9
  };
}

function getOrigin(event) {
  const proto = event.headers["x-forwarded-proto"] || "https";
  const host = event.headers["x-forwarded-host"] || event.headers.host || "";
  return `${proto}://${host}`;
}

function validateCustomer(customer) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return "Informe um email valido.";
  if (customer.document.length !== 11) return "Confira o CPF para gerar o Pix.";
  if (customer.phone.length !== 11) return "Informe um WhatsApp com DDD.";
  return "";
}

function gatewayError(data) {
  return data.message || data.error?.message || data.error || data.raw || "A Paradise recusou a transacao.";
}

function pickTracking(source) {
  const allowed = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src", "sck"];
  return allowed.reduce((tracking, key) => {
    const value = String(source[key] || "").trim();
    if (value) tracking[key] = value;
    return tracking;
  }, {});
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function json(data, statusCode = 200) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(data)
  };
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function randomPhone() {
  return `119${Math.floor(10000000 + Math.random() * 89999999)}`;
}

function randomBrazilianName() {
  const first = ["Ana", "Maria", "Juliana", "Camila", "Fernanda", "Patricia"];
  const last = ["Silva", "Oliveira", "Santos", "Souza", "Almeida", "Costa"];
  return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
}

function validCpf(value) {
  if (value.length === 11 && !/^(\d)\1+$/.test(value)) return value;
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  digits.push(cpfDigit(digits));
  digits.push(cpfDigit(digits));
  return digits.join("");
}

function cpfDigit(numbers) {
  const factor = numbers.length + 1;
  const sum = numbers.reduce((total, number, index) => total + number * (factor - index), 0);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}
