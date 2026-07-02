const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const QRCode = require("qrcode");

const root = __dirname;
const publicDir = path.join(root, "public");
const deliveryDir = path.join(root, "delivery", "pdfs");
const seedDataDir = path.join(root, "data");
const writableDataDir = process.env.VERCEL || process.env.NETLIFY
  ? path.join(os.tmpdir(), "atividades-bncc-checkout")
  : seedDataDir;
const bumpsFile = path.join(writableDataDir, "order-bumps.json");
const couponsFile = path.join(writableDataDir, "coupons.json");
const settingsFile = path.join(writableDataDir, "settings.json");
const ordersFile = path.join(writableDataDir, "orders.json");
const analyticsFile = path.join(writableDataDir, "analytics.json");
const seedBumpsFile = path.join(seedDataDir, "order-bumps.json");
const seedCouponsFile = path.join(seedDataDir, "coupons.json");
const seedSettingsFile = path.join(seedDataDir, "settings.json");
const seedOrdersFile = path.join(seedDataDir, "orders.json");
const uploadDir = path.join(publicDir, "uploads");

const deliveryFiles = [
  {
    id: "50-atividades-alfabetizacao",
    title: "50 Atividades para Alfabetizacao",
    filename: "50-atividades-para-alfabetizacao.pdf"
  },
  {
    id: "material-complementar-alfabetizacao",
    title: "Material Complementar de Alfabetizacao",
    filename: "material-complementar-alfabetizacao.pdf"
  },
  {
    id: "atividades-5-anos",
    title: "Atividades para 5 Anos",
    filename: "atividades-5-anos.pdf"
  }
];

loadEnv(path.join(root, ".env"));

const envConfig = {
  port: Number(process.env.PORT || 4177),
  adminPassword: process.env.ADMIN_PASSWORD || "troque-essa-senha",
  amploMode: process.env.AMPLO_MODE || "mock",
  amploPublicKey: process.env.AMPLO_PUBLIC_KEY || "",
  amploSecretKey: process.env.AMPLO_SECRET_KEY || "",
  amploApiUrl: process.env.AMPLO_API_URL || "https://app.amplopay.com/api/v1",
  amploPaymentPath: process.env.AMPLO_PAYMENT_PATH || "/gateway/pix/deposit",
  paradiseApiKey: process.env.PARADISE_API_KEY || "",
  paradiseApiUrl: process.env.PARADISE_API_URL || "https://multi.paradisepags.com",
  paradiseTransactionPath: process.env.PARADISE_TRANSACTION_PATH || "/api/v1/transaction.php",
  postbackUrl: process.env.POSTBACK_URL || ""
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg"
};

const defaultSettings = {
  product: {
    id: "1000-atividades-leitura-ortografia-bncc",
    title: "1000 Atividades de Leitura e Ortografia - BNCC",
    gatewayTitle: "1000 Atividades BNCC",
    subtitle: "PDF para imprimir + gabarito + 4 bônus.",
    price: 17.9
  },
  payments: {
    mode: envConfig.paradiseApiKey ? "live" : envConfig.amploMode,
    publicKey: envConfig.amploPublicKey,
    secretKey: envConfig.paradiseApiKey || envConfig.amploSecretKey,
    apiUrl: envConfig.paradiseApiKey ? envConfig.paradiseApiUrl : envConfig.amploApiUrl,
    paymentPath: envConfig.paradiseApiKey ? envConfig.paradiseTransactionPath : envConfig.amploPaymentPath,
    postbackUrl: envConfig.postbackUrl
  },
  media: {
    introAudio: "",
    revealAudio: ""
  },
  links: {
    instagramUrl: ""
  }
};

const defaultBumps = [
  {
    id: "producao-texto-320",
    hash: "producao-texto-320",
    title: "320 Atividades de Produção de Texto",
    gatewayTitle: "320 Atividades de Produção de Texto",
    description: "Do básico ao avançado. Material completo e sem perder tempo planejando.",
    image: "/assets/order-bumps/producao-texto.svg",
    price: 5.9,
    compareAtPrice: 35.9,
    enabled: true,
    highlight: true
  },
  {
    id: "generos-textuais-850",
    hash: "generos-textuais-850",
    title: "850 Atividades de Gêneros Textuais",
    gatewayTitle: "850 Atividades de Gêneros Textuais",
    description: "Atividades prontas para desenvolver leitura, interpretação e produção textual.",
    image: "/assets/order-bumps/generos-textuais.svg",
    price: 7.9,
    compareAtPrice: 109.9,
    enabled: true,
    highlight: false
  },
  {
    id: "verbos-200",
    hash: "verbos-200",
    title: "+200 Atividades de Verbos",
    gatewayTitle: "+200 Atividades de Verbos",
    description: "Cruzadinhas, caça-palavras, textos animados e atividades lúdicas sobre verbos.",
    image: "/assets/order-bumps/verbos.svg",
    price: 5.9,
    compareAtPrice: 27.9,
    enabled: true,
    highlight: false
  },
  {
    id: "numerais",
    hash: "numerais",
    title: "Atividades sobre Numerais",
    gatewayTitle: "Atividades sobre Numerais",
    description: "Mais de 400 atividades de numerais prontas para imprimir e aplicar.",
    image: "/assets/order-bumps/numerais.svg",
    price: 5.9,
    compareAtPrice: 27.9,
    enabled: true,
    highlight: false
  },
  {
    id: "silabas-complexas-150",
    hash: "silabas-complexas-150",
    title: "+150 Atividades de Sílabas Complexas",
    gatewayTitle: "+150 Atividades de Sílabas Complexas",
    description: "Caderno de atividades prontas para imprimir com sílabas complexas.",
    image: "/assets/order-bumps/silabas-complexas.svg",
    price: 6.9,
    compareAtPrice: 37.9,
    enabled: true,
    highlight: false
  }
];

const server = http.createServer(handleRequest);

if (!process.env.VERCEL && !process.env.NETLIFY) {
  server.listen(envConfig.port, () => {
    console.log(`Checkout rodando em http://localhost:${envConfig.port}`);
  });
}

module.exports = handleRequest;

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/config") {
      const { product, media, links } = await readSettings();
      const bumps = await readBumps();
      return json(res, 200, {
        product: publicCheckoutProduct(product),
        media: publicCheckoutMedia(media),
        links,
        bumps: bumps.filter((b) => b.enabled).map(publicCheckoutBump)
      });
    }

    if (req.method === "POST" && url.pathname === "/api/coupon") {
      const body = await readJson(req);
      return json(res, 200, await previewCoupon(body));
    }

    if (req.method === "GET" && url.pathname === "/api/admin/settings") {
      if (!isAdmin(req)) return json(res, 401, { error: "Senha do painel invalida." });
      return json(res, 200, publicAdminSettings(await readSettings()));
    }

    if (req.method === "GET" && url.pathname === "/api/order-status") {
      return json(res, 200, await publicOrderStatus(url.searchParams.get("orderId") || url.searchParams.get("id")));
    }

    if (req.method === "GET" && url.pathname === "/api/qr") {
      const data = String(url.searchParams.get("data") || "");
      if (!data) return json(res, 400, { error: "Dados do QR Code ausentes." });
      const buffer = await QRCode.toBuffer(data, { type: "png", margin: 1, width: 320 });
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "no-store"
      });
      return res.end(buffer);
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/download/")) {
      return serveDownload(url, res);
    }

    if (req.method === "POST" && url.pathname === "/api/admin/settings") {
      if (!isAdmin(req)) return json(res, 401, { error: "Senha do painel invalida." });
      const body = await readJson(req);
      const settings = sanitizeSettings(body, await readSettings());
      await writeStoredJson("settings", settingsFile, settings);
      return json(res, 200, publicAdminSettings(settings));
    }

    if (req.method === "GET" && url.pathname === "/api/admin/order-bumps") {
      if (!isAdmin(req)) return json(res, 401, { error: "Senha do painel invalida." });
      return json(res, 200, { bumps: await readBumps() });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/order-bumps") {
      if (!isAdmin(req)) return json(res, 401, { error: "Senha do painel invalida." });
      const body = await readJson(req);
      const bumps = sanitizeBumps(body.bumps || []);
      await writeStoredJson("order-bumps", bumpsFile, bumps);
      return json(res, 200, { bumps });
    }

    if (req.method === "GET" && url.pathname === "/api/admin/coupons") {
      if (!isAdmin(req)) return json(res, 401, { error: "Senha do painel invalida." });
      return json(res, 200, { coupons: await readCoupons() });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/coupons") {
      if (!isAdmin(req)) return json(res, 401, { error: "Senha do painel invalida." });
      const body = await readJson(req);
      const coupons = sanitizeCoupons(body.coupons || []);
      await writeStoredJson("coupons", couponsFile, coupons);
      return json(res, 200, { coupons });
    }

    if (req.method === "GET" && url.pathname === "/api/admin/orders") {
      if (!isAdmin(req)) return json(res, 401, { error: "Senha do painel invalida." });
      return json(res, 200, groupOrders(await readOrders()));
    }

    if (req.method === "POST" && url.pathname === "/api/admin/media") {
      if (!isAdmin(req)) return json(res, 401, { error: "Senha do painel invalida." });
      const body = await readJson(req);
      const settings = await saveAudioUpload(body, await readSettings());
      await writeStoredJson("settings", settingsFile, settings);
      return json(res, 200, publicAdminSettings(settings));
    }

    if (req.method === "GET" && url.pathname === "/api/admin/analytics") {
      if (!isAdmin(req)) return json(res, 401, { error: "Senha do painel invalida." });
      return json(res, 200, summarizeAnalytics(await readAnalytics()));
    }

    if (req.method === "POST" && url.pathname === "/api/analytics") {
      const body = await readJson(req);
      await appendAnalyticsEvent(body, req);
      return json(res, 200, { ok: true });
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/media/")) {
      return serveMedia(url.pathname, req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/checkout") {
      const body = await readJson(req);
      const response = await createPayment(body, req);
      return json(res, response.ok ? 200 : 502, response);
    }

    if (req.method === "POST" && url.pathname === "/api/record-order") {
      const settings = await readSettings();
      const internalSecret = process.env.PARADISE_API_KEY || settings.payments.secretKey;
      if (req.headers["x-internal-secret"] !== internalSecret) {
        return json(res, 401, { error: "Nao autorizado." });
      }
      const payload = await readJson(req);
      const amount = Number(payload.result?.amount || 0);
      await saveOrder({
        body: payload.body || {},
        result: payload.result || {},
        product: payload.product || settings.product,
        chosenBumps: Array.isArray(payload.chosenBumps) ? payload.chosenBumps : [],
        coupon: null,
        discountCents: 0,
        amount,
        amountCents: Math.round(amount * 100),
        reference: payload.reference || payload.result?.orderId || "",
        status: normalizeStatus(payload.result?.status || "pending")
      });
      return json(res, 200, { ok: true });
    }

    if (req.method === "POST" && url.pathname === "/api/webhook") {
      const body = await readJson(req);
      await updateOrderFromWebhook(body);
      return json(res, 200, { ok: true });
    }

    if (req.method === "GET") {
      if (url.pathname === "/admin") return serveStatic("/admin.html", req, res);
      if (url.pathname === "/checkout") return serveStatic("/checkout.html", req, res);
      if (url.pathname === "/obrigado") return serveStatic("/obrigado.html", req, res);
      const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
      return serveStatic(pathname, req, res);
    }

    json(res, 405, { error: "Metodo nao permitido." });
  } catch (error) {
    json(res, 500, { error: "Erro interno.", detail: error.message });
  }
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function isAdmin(req) {
  return req.headers["x-admin-password"] === envConfig.adminPassword;
}

async function readSettings() {
  const stored = await readStoredJson("settings", settingsFile, seedSettingsFile, {});
  const storedProduct = stored.product || {};
  const mergedProduct = { ...defaultSettings.product, ...storedProduct };
  if (!storedProduct.gatewayTitle && !storedProduct.gateway_title) {
    mergedProduct.gatewayTitle = storedProduct.title || defaultSettings.product.gatewayTitle;
  }
  const settings = {
    product: mergedProduct,
    payments: { ...defaultSettings.payments, ...(stored.payments || {}) },
    media: { ...defaultSettings.media, ...(stored.media || {}) },
    links: { ...defaultSettings.links, ...(stored.links || {}) }
  };

  if (envConfig.amploPublicKey) settings.payments.publicKey = envConfig.amploPublicKey;
  if (envConfig.amploSecretKey) settings.payments.secretKey = envConfig.amploSecretKey;
  if (envConfig.paradiseApiKey) settings.payments.secretKey = envConfig.paradiseApiKey;
  if (process.env.AMPLO_MODE) settings.payments.mode = envConfig.amploMode;
  if (envConfig.paradiseApiKey) settings.payments.mode = "live";
  if (process.env.AMPLO_API_URL) settings.payments.apiUrl = envConfig.amploApiUrl;
  if (process.env.AMPLO_PAYMENT_PATH) settings.payments.paymentPath = envConfig.amploPaymentPath;
  if (process.env.PARADISE_API_URL) settings.payments.apiUrl = envConfig.paradiseApiUrl;
  if (process.env.PARADISE_TRANSACTION_PATH) settings.payments.paymentPath = envConfig.paradiseTransactionPath;
  if (process.env.POSTBACK_URL) settings.payments.postbackUrl = envConfig.postbackUrl;
  return sanitizeSettings(settings, defaultSettings);
}

function sanitizeSettings(input, previous) {
  const product = input.product || {};
  const payments = input.payments || {};
  const media = input.media || {};
  const links = input.links || {};
  const previousPayments = previous.payments || {};
  const previousMedia = previous.media || {};
  const previousLinks = previous.links || {};
  const publicKey = String(payments.publicKey || "").trim();
  const secretKey = String(payments.secretKey || "").trim();

  return {
    product: {
      id: slugify(product.title || product.id || previous.product?.title || "pack-da-julia").slice(0, 80),
      title: String(product.title || previous.product?.title || "Pack Da Julia").trim().slice(0, 80),
      gatewayTitle: String(product.gatewayTitle || product.gateway_title || previous.product?.gatewayTitle || product.title || previous.product?.title || "Pack Da Julia").trim().slice(0, 120),
      subtitle: String(product.subtitle || previous.product?.subtitle || "").trim().slice(0, 140),
      price: Math.max(1, Number(product.price || previous.product?.price || 89.9))
    },
    payments: {
      mode: payments.mode === "live" ? "live" : "mock",
      publicKey: publicKey || previousPayments.publicKey || "",
      secretKey: secretKey || previousPayments.secretKey || "",
      apiUrl: String(payments.apiUrl || previousPayments.apiUrl || envConfig.paradiseApiUrl).trim(),
      paymentPath: String(payments.paymentPath || previousPayments.paymentPath || envConfig.paradiseTransactionPath).trim(),
      postbackUrl: String(payments.postbackUrl || previousPayments.postbackUrl || "").trim()
    },
    media: {
      introAudio: sanitizeMediaPath(media.introAudio || previousMedia.introAudio || ""),
      revealAudio: sanitizeMediaPath(media.revealAudio || previousMedia.revealAudio || "")
    },
    links: {
      instagramUrl: sanitizeExternalUrl(links.instagramUrl || previousLinks.instagramUrl || "")
    }
  };
}

function publicAdminSettings(settings) {
  return {
    product: settings.product,
    payments: {
      mode: settings.payments.mode,
      apiUrl: settings.payments.apiUrl,
      paymentPath: settings.payments.paymentPath,
      postbackUrl: settings.payments.postbackUrl,
      hasPublicKey: Boolean(settings.payments.publicKey),
      hasSecretKey: Boolean(settings.payments.secretKey),
      hasApiKey: Boolean(settings.payments.secretKey)
    },
    media: settings.media || defaultSettings.media,
    links: settings.links || defaultSettings.links
  };
}

function publicCheckoutProduct(product) {
  return {
    id: product.id,
    title: product.title,
    subtitle: product.subtitle,
    price: product.price
  };
}

function publicCheckoutBump(bump) {
  return {
    id: bump.id,
    hash: bump.hash,
    title: bump.title,
    description: bump.description,
    image: bump.image,
    price: bump.price,
    compareAtPrice: bump.compareAtPrice,
    enabled: bump.enabled,
    highlight: bump.highlight
  };
}

function publicCheckoutMedia(media) {
  return {
    introAudio: iosSafeAudio(media?.introAudio || "", "/intro-audio-ios.mp3"),
    revealAudio: iosSafeAudio(media?.revealAudio || "", "")
  };
}

function iosSafeAudio(value, fallback) {
  const audioPath = String(value || "");
  return /\.ogg($|\?)/i.test(audioPath) ? fallback : audioPath;
}

async function readBumps() {
  return readStoredJson("order-bumps", bumpsFile, seedBumpsFile, defaultBumps);
}

async function readCoupons() {
  return sanitizeCoupons(await readStoredJson("coupons", couponsFile, seedCouponsFile, []));
}

async function readOrders() {
  return sanitizeOrders(await readStoredJson("orders", ordersFile, seedOrdersFile, []));
}

async function readAnalytics() {
  return readStoredJson("analytics", analyticsFile, null, []);
}

async function writeOrders(orders) {
  await writeStoredJson("orders", ordersFile, sanitizeOrders(orders));
}

async function appendAnalyticsEvent(body, req) {
  const events = await readAnalytics();
  const event = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    sessionId: String(body.sessionId || "").slice(0, 80),
    event: String(body.event || "event").slice(0, 80),
    step: String(body.step || "").slice(0, 120),
    label: String(body.label || "").slice(0, 180),
    path: String(body.path || "").slice(0, 200),
    referrer: String(body.referrer || "").slice(0, 300),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 300)
  };
  events.push(event);
  await writeStoredJson("analytics", analyticsFile, events.slice(-5000));
}

function summarizeAnalytics(events) {
  const sessions = new Map();
  const byStep = {};
  const byEvent = {};
  const clicks = {};
  const lastBySession = {};

  for (const event of events) {
    if (event.sessionId) sessions.set(event.sessionId, true);
    if (event.step) byStep[event.step] = (byStep[event.step] || 0) + 1;
    byEvent[event.event] = (byEvent[event.event] || 0) + 1;
    if (event.event === "click" && event.label) clicks[event.label] = (clicks[event.label] || 0) + 1;
    if (event.sessionId) lastBySession[event.sessionId] = event;
  }

  const dropoff = {};
  for (const event of Object.values(lastBySession)) {
    const key = event.step || event.event || "desconhecido";
    dropoff[key] = (dropoff[key] || 0) + 1;
  }

  return {
    totalEvents: events.length,
    sessions: sessions.size,
    byStep: sortCounts(byStep),
    byEvent: sortCounts(byEvent),
    clicks: sortCounts(clicks),
    dropoff: sortCounts(dropoff),
    recent: events.slice(-80).reverse()
  };
}

function sortCounts(counts) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

async function saveAudioUpload(body, previousSettings) {
  const slot = body.slot === "revealAudio" ? "revealAudio" : "introAudio";
  const dataUrl = String(body.dataUrl || "");
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Arquivo de audio invalido.");
  const mime = match[1];
  const allowed = {
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/mp4": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/aac": ".aac",
    "audio/wav": ".wav",
    "audio/wave": ".wav"
  };
  const ext = allowed[mime];
  if (!ext) throw new Error("Use MP3, M4A, AAC ou WAV. OGG nao toca bem no iPhone.");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 12_000_000) throw new Error("Audio muito grande. Use ate 12 MB.");
  const filename = `${slot}-${Date.now()}${ext}`;
  const settings = sanitizeSettings(previousSettings, previousSettings);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    await put(`uploads/${filename}`, buffer, {
      access: "private",
      allowOverwrite: true,
      contentType: mime
    });
    settings.media[slot] = `/api/media/uploads/${filename}`;
    return settings;
  }
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  settings.media[slot] = `/uploads/${filename}`;
  return settings;
}

function sanitizeMediaPath(value) {
  const mediaPath = String(value || "").trim();
  if (!mediaPath) return "";
  if (/^https:\/\/[^"'<>\s]+$/i.test(mediaPath)) return mediaPath.slice(0, 500);
  if (mediaPath.startsWith("/api/media/uploads/")) return mediaPath.slice(0, 220);
  return mediaPath.startsWith("/uploads/") ? mediaPath.slice(0, 180) : "";
}

function sanitizeExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString().slice(0, 300);
  } catch {
    return "";
  }
}

async function readStoredJson(key, primaryFile, seedFile, fallback) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await getBlob(`data/${key}.json`);
      if (blob) return blob;
    } catch {
      if (process.env.VERCEL) return fallback;
    }
  }
  const file = fs.existsSync(primaryFile) ? primaryFile : seedFile;
  if (!file || !fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

async function writeStoredJson(key, file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    await put(`data/${key}.json`, body, {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json"
    });
    return;
  }
  ensureDataDir();
  fs.writeFileSync(file, body);
}

async function getBlob(pathname) {
  const { get } = await import("@vercel/blob");
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result?.stream) return null;
  return new Response(result.stream).json();
}

async function getBlobFile(pathname) {
  const { get } = await import("@vercel/blob");
  return get(pathname, { access: "private", useCache: false });
}

function ensureDataDir() {
  fs.mkdirSync(writableDataDir, { recursive: true });
}

function sanitizeBumps(bumps) {
  return bumps.map((bump) => {
    const title = String(bump.title || "").trim().slice(0, 80);
    return {
      id: String(bump.id || slugify(title || crypto.randomUUID())).slice(0, 80),
      hash: String(bump.hash || bump.id || "").trim().slice(0, 120),
      title,
      gatewayTitle: String(bump.gatewayTitle || bump.gateway_title || title).trim().slice(0, 120),
      description: String(bump.description || "").trim().slice(0, 180),
      image: String(bump.image || "").trim().slice(0, 220),
      price: Math.max(0, Number(bump.price || 0)),
      compareAtPrice: Math.max(0, Number(bump.compareAtPrice || bump.compare_at_price || 0)),
      enabled: Boolean(bump.enabled),
      highlight: Boolean(bump.highlight)
    };
  }).filter((bump) => bump.title && bump.price > 0);
}

function sanitizeCoupons(coupons) {
  if (!Array.isArray(coupons)) return [];
  const seen = new Set();
  return coupons.map((coupon) => {
    const code = normalizeCouponCode(coupon.code);
    const type = coupon.type === "fixed" ? "fixed" : "percent";
    const sanitized = {
      id: String(coupon.id || code || crypto.randomUUID()).slice(0, 80),
      code,
      type,
      value: Math.max(0, Number(coupon.value || 0)),
      minimumAmount: Math.max(0, Number(coupon.minimumAmount || 0)),
      maxUses: Math.max(0, Math.floor(Number(coupon.maxUses || 0))),
      enabled: Boolean(coupon.enabled)
    };
    if (sanitized.type === "percent") sanitized.value = Math.min(95, sanitized.value);
    return sanitized;
  }).filter((coupon) => {
    if (!coupon.code || coupon.value <= 0 || seen.has(coupon.code)) return false;
    seen.add(coupon.code);
    return true;
  });
}

function slugify(value) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || crypto.randomUUID();
}

async function publicOrderStatus(orderId) {
  const order = await findOrder(orderId);
  if (!order) {
    return {
      ok: false,
      status: "not_found",
      message: "Pedido nao encontrado. Aguarde alguns segundos e atualize a pagina."
    };
  }

  const approved = order.status === "approved";
  return {
    ok: true,
    orderId: order.id,
    status: order.status,
    approved,
    customerEmail: order.customer?.email || "",
    amount: order.amount,
    files: approved ? deliveryFiles.map((file) => ({
      id: file.id,
      title: file.title,
      url: `/api/download/${encodeURIComponent(file.filename)}?orderId=${encodeURIComponent(order.id)}`
    })) : [],
    message: approved
      ? "Pagamento confirmado. Seus materiais ja estao liberados."
      : "Pagamento ainda nao confirmado. Esta pagina atualiza automaticamente."
  };
}

async function findOrder(orderId) {
  const id = String(orderId || "").trim();
  if (!id) return null;
  const orders = await readOrders();
  return orders.find((order) =>
    order.id === id ||
    order.reference === id ||
    order.transactionId === id
  ) || null;
}

async function serveDownload(url, res) {
  const filename = decodeURIComponent(url.pathname.replace(/^\/api\/download\//, ""));
  const file = deliveryFiles.find((item) => item.filename === filename);
  if (!file) return json(res, 404, { error: "Arquivo nao encontrado." });

  const order = await findOrder(url.searchParams.get("orderId") || url.searchParams.get("id"));
  if (!order) return json(res, 404, { error: "Pedido nao encontrado." });
  if (order.status !== "approved") {
    return json(res, 403, { error: "Pagamento ainda nao confirmado." });
  }

  const filePath = path.normalize(path.join(deliveryDir, file.filename));
  if (!filePath.startsWith(deliveryDir) || !fs.existsSync(filePath)) {
    return json(res, 404, { error: "PDF nao encontrado no servidor." });
  }

  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Length": String(stat.size),
    "Content-Disposition": `attachment; filename="${file.filename}"`,
    "Cache-Control": "private, no-store"
  });
  fs.createReadStream(filePath).pipe(res);
}

function serveStatic(requestPath, req, res) {
  const decoded = decodeURIComponent(requestPath);
  const filePath = path.normalize(path.join(publicDir, decoded));
  if (!filePath.startsWith(publicDir)) return json(res, 403, { error: "Acesso negado." });
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return json(res, 404, { error: "Arquivo nao encontrado." });
  }
  const contentType = contentTypes[path.extname(filePath)] || "application/octet-stream";
  if (isMediaType(contentType) && req.headers.range) {
    return streamRangeFromFile(filePath, contentType, req.headers.range, res);
  }
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": String(stat.size),
    "Accept-Ranges": isMediaType(contentType) ? "bytes" : "none"
  });
  fs.createReadStream(filePath).pipe(res);
}

async function serveMedia(requestPath, req, res) {
  const blobPath = decodeURIComponent(requestPath.replace(/^\/api\/media\//, ""));
  if (!blobPath.startsWith("uploads/") || blobPath.includes("..")) {
    return json(res, 403, { error: "Acesso negado." });
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await getBlobFile(blobPath);
    if (!blob?.stream) return json(res, 404, { error: "Audio nao encontrado." });
    const arrayBuffer = await new Response(blob.stream).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = blob.contentType || contentTypes[path.extname(blobPath)] || "application/octet-stream";
    if (req.headers.range) {
      return streamRangeFromBuffer(buffer, contentType, req.headers.range, res);
    }
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable"
    });
    res.end(buffer);
    return;
  }

  return serveStatic(`/${blobPath}`, req, res);
}

function isMediaType(contentType) {
  return /^(audio|video)\//.test(contentType);
}

function parseRange(rangeHeader, size) {
  const match = String(rangeHeader || "").match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : size - 1;
  if (!match[1] && match[2]) {
    const suffixLength = Number(match[2]);
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start < 0 || end >= size) return null;
  return { start, end };
}

function streamRangeFromFile(filePath, contentType, rangeHeader, res) {
  const stat = fs.statSync(filePath);
  const range = parseRange(rangeHeader, stat.size);
  if (!range) {
    res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
    res.end();
    return;
  }
  res.writeHead(206, {
    "Content-Type": contentType,
    "Content-Length": String(range.end - range.start + 1),
    "Content-Range": `bytes ${range.start}-${range.end}/${stat.size}`,
    "Accept-Ranges": "bytes"
  });
  fs.createReadStream(filePath, { start: range.start, end: range.end }).pipe(res);
}

function streamRangeFromBuffer(buffer, contentType, rangeHeader, res) {
  const range = parseRange(rangeHeader, buffer.length);
  if (!range) {
    res.writeHead(416, { "Content-Range": `bytes */${buffer.length}` });
    res.end();
    return;
  }
  res.writeHead(206, {
    "Content-Type": contentType,
    "Content-Length": String(range.end - range.start + 1),
    "Content-Range": `bytes ${range.start}-${range.end}/${buffer.length}`,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable"
  });
  res.end(buffer.subarray(range.start, range.end + 1));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 18_000_000) {
        reject(new Error("Payload muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data ? JSON.parse(data) : {}));
    req.on("error", reject);
  });
}

async function createPayment(body, req) {
  const settings = await readSettings();
  const product = settings.product;
  const payments = settings.payments;
  const bumps = (await readBumps()).filter((b) => b.enabled);
  const coupons = await readCoupons();
  const orders = await readOrders();
  const selected = new Set(Array.isArray(body.bumpIds) ? body.bumpIds : []);
  const chosenBumps = bumps.filter((b) => selected.has(b.id));
  const subtotalCents = Math.round(product.price * 100) +
    chosenBumps.reduce((sum, bump) => sum + Math.round(bump.price * 100), 0);
  const couponResult = resolveCoupon(body.couponCode, coupons, subtotalCents, orders);
  if (couponResult.error) return { ok: false, error: couponResult.error };
  const discountCents = couponResult.discountCents;
  const amountCents = Math.max(100, subtotalCents - discountCents);
  const amount = amountCents / 100;
  const useParadise = Boolean(process.env.PARADISE_API_KEY) || /paradisepags/i.test(payments.apiUrl || "");
  const reference = `${useParadise ? "PARADISE" : "AMPLO"}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const tracking = pickTracking(body.tracking || {});
  const generatedCustomer = await generateCustomer(body);
  const customer = {
    name: generatedCustomer.name,
    email: String(body.email || "").trim(),
    phone: generatedCustomer.phone,
    document: normalizeCpf(body.document)
  };
  body.name = customer.name;
  body.phone = customer.phone;
  body.document = customer.document;
  const customerError = validateCustomer(customer);
  if (customerError) return { ok: false, error: customerError };
  const payload = {
    identifier: reference,
    amount: Number(amount.toFixed(2)),
    client: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      document: customer.document
    },
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      document: customer.document
    },
    products: buildGatewayProducts(product, chosenBumps, discountCents)
  };
  const callbackUrl = normalizeCallbackUrl(payments.postbackUrl, req);
  if (callbackUrl) payload.callbackUrl = callbackUrl;

  if (payments.mode === "mock") {
    const qrCode = "00020126580014br.gov.bcb.pix0136checkout-amplopay-demo5204000053039865405" +
      amount.toFixed(2).replace(".", "") + "5802BR5909DEMO PIX6009SAO PAULO6304ABCD";
    const result = {
      ok: true,
      mode: "mock",
      orderId: reference,
      transactionId: Math.floor(100000 + Math.random() * 900000),
      amount,
      qrCode,
      qrCodeBase64: await QRCode.toDataURL(qrCode),
      message: "Pagamento simulado criado. Configure PARADISE_API_KEY para enviar para a API."
    };
    await saveOrder({ body, result, product, chosenBumps, coupon: couponResult.coupon, discountCents, amount, amountCents, reference, status: "pending" });
    return result;
  }

  if (!payments.secretKey || !payments.apiUrl) {
    return { ok: false, error: "API da Paradise nao configurada. Defina PARADISE_API_KEY." };
  }

  if (useParadise) {
    const paradisePayload = {
      amount: amountCents,
      description: product.gatewayTitle,
      reference,
      postback_url: callbackUrl || `${getRequestOrigin(req)}/api/webhook`,
      source: "api_externa",
      customer,
      tracking
    };
    const endpoint = new URL(payments.paymentPath, payments.apiUrl);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "OfertaPedagogicaCheckout/1.0 (+https://ofertapedagogica.vercel.app)",
        "X-API-Key": payments.secretKey
      },
      body: JSON.stringify(paradisePayload)
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    const providerData = data.data && typeof data.data === "object" ? data.data : data;
    const pixData = providerData.pix || data.pix || {};
    const qrCode = providerData.qr_code || data.qr_code || pixData.code || pixData.qrCode || pixData.qr_code || "";
    const ok = response.ok && Boolean(qrCode) && (data.status === "success" || providerData.status === "success" || response.status < 300);
    const result = {
      ok,
      mode: "live",
      status: response.status,
      orderId: providerData.id || data.id || reference,
      transactionId: providerData.transaction_id || data.transaction_id || providerData.id || reference,
      amount: typeof providerData.amount === "number" ? providerData.amount / 100 : amount,
      qrCode,
      qrCodeBase64: providerData.qr_code_base64 || data.qr_code_base64 || pixData.base64 || pixData.qrCodeBase64 || "",
      qrCodeImage: pixData.image || pixData.qrCodeImage || providerData.pixInformation?.image || "",
      receiptUrl: providerData.order?.receiptUrl || "",
      provider: data,
      error: ok ? undefined : parseGatewayError(data, response.status, "A Paradise recusou a transação.")
    };
    if (!ok) {
      console.error("Paradise recusou Pix", {
        status: response.status,
        endpoint: endpoint.toString(),
        response: sanitizeGatewayLog(data),
        payload: sanitizeGatewayLog(paradisePayload)
      });
    }
    if (ok) {
      await saveOrder({
        body,
        result,
        product,
        chosenBumps,
        coupon: couponResult.coupon,
        discountCents,
        amount: result.amount,
        amountCents: Math.round(result.amount * 100),
        reference,
        status: "pending"
      });
    }
    return result;
  }

  if (!payments.publicKey) {
    return { ok: false, error: "API da Amplo Pay nao configurada. Defina AMPLO_PUBLIC_KEY." };
  }

  const endpoint = new URL(payments.paymentPath, payments.apiUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "OfertaPedagogicaCheckout/1.0 (+https://ofertapedagogica.vercel.app)",
      "x-public-key": payments.publicKey,
      "x-secret-key": payments.secretKey
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  const providerData = data.data && typeof data.data === "object" ? data.data : data;
  const pixData = providerData.pix || data.pix || {};
  const qrCode = pixData.code || pixData.qrCode || pixData.qr_code || providerData.pixInformation?.qrCode || providerData.qrCode || providerData.qr_code || providerData.code || "";
  const ok = response.ok && Boolean(qrCode);
  const transactionStatus = providerData.status || providerData.transaction?.status || data.status || data.transaction?.status || "pending";
  const result = {
    ok,
    mode: "live",
    status: response.status,
    orderId: providerData.order?.id || providerData.id || data.order?.id || data.id || reference,
    transactionId: providerData.transactionId || providerData.transaction_id || providerData.id || data.transactionId || data.transaction_id || data.id || reference,
    amount: typeof providerData.amount === "number" ? providerData.amount : typeof data.amount === "number" ? data.amount : amount,
    qrCode,
    qrCodeBase64: pixData.base64 || pixData.qrCodeBase64 || providerData.qrCodeBase64 || providerData.qr_code_base64 || data.qrCodeBase64 || data.qr_code_base64 || (qrCode ? await QRCode.toDataURL(qrCode) : ""),
    qrCodeImage: pixData.image || pixData.qrCodeImage || providerData.pixInformation?.image || providerData.qrCodeImage || data.pixInformation?.image || data.qrCodeImage,
    receiptUrl: providerData.order?.receiptUrl || data.order?.receiptUrl,
    provider: data,
    error: ok ? undefined : parseGatewayError(data, response.status, "A Amplo Pay recusou a transação.")
  };
  if (!ok) {
    console.error("Amplo Pay recusou Pix", {
      status: response.status,
      endpoint: endpoint.toString(),
      response: sanitizeGatewayLog(data),
      payload: sanitizeGatewayLog(payload)
    });
  }
  if (ok) {
    await saveOrder({
      body,
      result,
      product,
      chosenBumps,
      coupon: couponResult.coupon,
      discountCents,
      amount: result.amount,
      amountCents: Math.round(result.amount * 100),
      reference,
      status: normalizeStatus(transactionStatus)
    });
  }
  return result;
}

function buildGatewayProducts(product, bumps, discountCents) {
  const items = [
    {
      id: product.id,
      name: product.gatewayTitle || product.title,
      quantity: 1,
      cents: Math.round(product.price * 100)
    },
    ...bumps.map((bump) => ({
      id: bump.id,
      name: bump.gatewayTitle || bump.title,
      quantity: 1,
      cents: Math.round(bump.price * 100)
    }))
  ];
  const discount = Math.max(0, Number(discountCents || 0));
  if (!discount || !items.length) return items.map(gatewayProductFromCents);

  const subtotalCents = items.reduce((sum, item) => sum + item.cents, 0);
  let remainingDiscount = Math.min(discount, Math.max(0, subtotalCents - items.length));
  const adjusted = items.map((item, index) => {
    const proportional = index === items.length - 1
      ? remainingDiscount
      : Math.min(item.cents - 1, Math.floor(discount * item.cents / subtotalCents));
    const itemDiscount = Math.min(item.cents - 1, proportional, remainingDiscount);
    remainingDiscount -= itemDiscount;
    return { ...item, cents: item.cents - itemDiscount };
  });

  for (const item of adjusted) {
    if (remainingDiscount <= 0) break;
    const extraDiscount = Math.min(item.cents - 1, remainingDiscount);
    item.cents -= extraDiscount;
    remainingDiscount -= extraDiscount;
  }

  return adjusted.map(gatewayProductFromCents);
}

function gatewayProductFromCents(item) {
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    price: item.cents / 100
  };
}

async function previewCoupon(body) {
  const settings = await readSettings();
  const bumps = (await readBumps()).filter((b) => b.enabled);
  const selected = new Set(Array.isArray(body.bumpIds) ? body.bumpIds : []);
  const subtotalCents = Math.round(settings.product.price * 100) +
    bumps.filter((b) => selected.has(b.id)).reduce((sum, bump) => sum + Math.round(bump.price * 100), 0);
  const result = resolveCoupon(body.code, await readCoupons(), subtotalCents, await readOrders());
  if (result.error) return { ok: false, error: result.error };
  return {
    ok: true,
    code: result.coupon?.code || "",
    discount: result.discountCents / 100,
    total: Math.max(1, subtotalCents / 100 - result.discountCents / 100)
  };
}

function resolveCoupon(code, coupons, subtotalCents, orders) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return { coupon: null, discountCents: 0 };
  const coupon = coupons.find((item) => item.enabled && item.code === normalized);
  if (!coupon) return { error: "Cupom invalido ou expirado." };
  if (subtotalCents < Math.round(coupon.minimumAmount * 100)) return { error: `Cupom valido a partir de ${formatBRL(coupon.minimumAmount)}.` };
  const used = orders.filter((order) => order.coupon?.code === coupon.code && !["failed", "canceled", "cancelled", "expired", "rejected"].includes(order.status)).length;
  if (coupon.maxUses > 0 && used >= coupon.maxUses) return { error: "Cupom esgotado." };
  const discountCents = coupon.type === "fixed"
    ? Math.round(coupon.value * 100)
    : Math.floor(subtotalCents * coupon.value / 100);
  return { coupon, discountCents: Math.min(discountCents, Math.max(0, subtotalCents - 100)) };
}

function validateCustomer(customer) {
  if (customer.name.length < 2) return "Informe seu nome para gerar o Pix.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return "Informe um email valido.";
  if (customer.document.length !== 11) return "Confira o CPF para gerar o Pix.";
  const phoneDigits = String(customer.phone || "").replace(/\D/g, "");
  if (phoneDigits.length !== 11) return "Informe um WhatsApp com DDD.";
  return "";
}

async function generateCustomer(body) {
  const providedName = String(body.name || "").trim();
  const providedPhone = normalizePhone(body.phone);
  const profile = providedName.length >= 2 ? null : await fetchBrazilianProfile();
  return {
    name: providedName.length >= 2 ? providedName : profile?.name || generateBrazilianName(),
    phone: providedPhone || generatePhone()
  };
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11) return formatPhone(digits);
  if (digits.length === 10) return formatPhone(`${digits.slice(0, 2)}9${digits.slice(2)}`);
  return "";
}

async function fetchBrazilianProfile() {
  try {
    const response = await fetch("https://randomuser.me/api/?nat=br&inc=name&noinfo", {
      signal: AbortSignal.timeout(1800)
    });
    if (!response.ok) return null;
    const data = await response.json();
    const person = data.results?.[0]?.name;
    const name = [person?.first, person?.last].filter(Boolean).join(" ").trim();
    return name.length >= 2 ? { name } : null;
  } catch {
    return null;
  }
}

function generateBrazilianName() {
  const firstNames = ["Ana", "Beatriz", "Camila", "Carolina", "Fernanda", "Gabriela", "Isabela", "Juliana", "Larissa", "Mariana", "Patricia", "Rafaela"];
  const lastNames = ["Almeida", "Barbosa", "Cardoso", "Carvalho", "Costa", "Ferreira", "Gomes", "Lima", "Martins", "Oliveira", "Pereira", "Santos", "Silva", "Souza"];
  return `${firstNames[crypto.randomInt(0, firstNames.length)]} ${lastNames[crypto.randomInt(0, lastNames.length)]}`;
}

function generatePhone() {
  const areaCodes = ["11", "21", "31", "41", "51", "61", "71", "81", "85"];
  const areaCode = areaCodes[crypto.randomInt(0, areaCodes.length)];
  const suffix = String(crypto.randomInt(0, 100000000)).padStart(8, "0");
  return formatPhone(`${areaCode}9${suffix}`);
}

function formatPhone(digits) {
  return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function normalizeCpf(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 11 ? digits : generateCpf();
}

function generateCpf() {
  const digits = Array.from({ length: 9 }, () => crypto.randomInt(0, 10));
  digits.push(calculateCpfDigit(digits));
  digits.push(calculateCpfDigit(digits));
  return digits.join("");
}

function calculateCpfDigit(digits) {
  const startWeight = digits.length + 1;
  const sum = digits.reduce((total, digit, index) => total + digit * (startWeight - index), 0);
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

async function saveOrder({ body, result, product, chosenBumps, coupon, discountCents, amount, amountCents, reference, status }) {
  const orders = await readOrders();
  const now = new Date().toISOString();
  const order = {
    id: String(result.orderId || reference),
    reference,
    transactionId: result.transactionId ? String(result.transactionId) : "",
    status: normalizeStatus(status),
    product: product.title,
    amount,
    amountCents,
    customer: {
      name: String(body.name || "").trim(),
      email: String(body.email || "").trim(),
      phone: String(body.phone || "").trim(),
      document: String(body.document || "").replace(/\D/g, "")
    },
    bumps: chosenBumps.map((bump) => bump.title),
    coupon: coupon ? {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount: Math.max(0, Number(discountCents || 0)) / 100
    } : null,
    createdAt: now,
    updatedAt: now
  };
  await writeOrders([order, ...orders.filter((item) => item.id !== order.id && item.reference !== reference)].slice(0, 500));
}

async function updateOrderFromWebhook(payload) {
  const orders = await readOrders();
  const transaction = payload.transaction || {};
  const reference = String(payload.external_id || payload.reference || payload.clientIdentifier || transaction.clientIdentifier || payload.identifier || payload.id || "").trim();
  const transactionId = String(payload.transaction_id || payload.transactionId || transaction.id || payload.id || "").trim();
  const status = normalizeStatus(payload.status || transaction.status || payload.raw_status || "pending");
  const now = new Date().toISOString();
  let found = false;
  const next = orders.map((order) => {
    const sameReference = reference && (order.reference === reference || order.id === reference);
    const sameTransaction = transactionId && order.transactionId === transactionId;
    if (!sameReference && !sameTransaction) return order;
    found = true;
    return { ...order, status, updatedAt: now };
  });
  if (!found && (reference || transactionId)) {
    next.unshift({
      id: reference || transactionId,
      reference,
      transactionId,
      status,
      product: "Pedido Paradise",
      amount: normalizeWebhookAmount(payload.amount || transaction.amount || 0),
      amountCents: normalizeWebhookAmountCents(payload.amount || transaction.amount || 0),
      customer: payload.customer || payload.client || transaction.customer || transaction.client || {},
      bumps: [],
      coupon: null,
      createdAt: now,
      updatedAt: now
    });
  }
  await writeOrders(next);
}

function groupOrders(orders) {
  return {
    approved: orders.filter((order) => order.status === "approved"),
    unpaid: orders.filter((order) => order.status !== "approved")
  };
}

function sanitizeOrders(orders) {
  if (!Array.isArray(orders)) return [];
  return orders.map((order) => ({
    id: String(order.id || order.reference || crypto.randomUUID()).slice(0, 120),
    reference: String(order.reference || "").slice(0, 120),
    transactionId: String(order.transactionId || "").slice(0, 80),
    status: normalizeStatus(order.status || "pending"),
    product: String(order.product || "Pedido").slice(0, 120),
    amount: Math.max(0, Number(order.amount || 0)),
    amountCents: Math.max(0, Number(order.amountCents || 0)),
    customer: {
      name: String(order.customer?.name || "").slice(0, 120),
      email: String(order.customer?.email || "").slice(0, 160),
      phone: String(order.customer?.phone || "").slice(0, 40),
      document: String(order.customer?.document || "").slice(0, 40)
    },
    bumps: Array.isArray(order.bumps) ? order.bumps.map((bump) => String(bump).slice(0, 120)) : [],
    coupon: order.coupon ? {
      code: normalizeCouponCode(order.coupon.code),
      type: order.coupon.type === "fixed" ? "fixed" : "percent",
      value: Math.max(0, Number(order.coupon.value || 0)),
      discount: Math.max(0, Number(order.coupon.discount || 0))
    } : null,
    createdAt: String(order.createdAt || new Date().toISOString()),
    updatedAt: String(order.updatedAt || order.createdAt || new Date().toISOString())
  }));
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();
  if (["approved", "completed", "paid", "success", "ok"].includes(value)) return "approved";
  if (["failed", "refunded", "chargeback", "charged_back", "canceled", "cancelled", "expired", "rejected"].includes(value)) return value;
  return "pending";
}

function normalizeWebhookAmount(value) {
  const amount = Number(value || 0);
  return amount > 100 ? amount / 100 : amount;
}

function normalizeWebhookAmountCents(value) {
  const amount = Number(value || 0);
  return Math.round(amount > 100 ? amount : amount * 100);
}

function sanitizeGatewayLog(value) {
  if (!value || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value, (key, item) => {
    if (["publicKey", "secretKey", "x-public-key", "x-secret-key"].includes(key)) return "[redacted]";
    return item;
  }));
}

function parseGatewayError(data, status, fallback) {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (status === 403 && typeof data.raw === "string" && /cloudfront|request blocked/i.test(data.raw)) {
    return "A Amplo Pay bloqueou a requisicao do servidor. Confira se o dominio/IP da Vercel esta liberado na Amplo.";
  }
  if (status === 404 && data.raw) return "Endpoint da Amplo Pay não encontrado. Confira AMPLO_API_URL e AMPLO_PAYMENT_PATH.";
  const details = Array.isArray(data.details)
    ? data.details.map((detail) => {
      const path = Array.isArray(detail.path) ? detail.path.join(".") : "";
      return [path, detail.message].filter(Boolean).join(": ");
    }).filter(Boolean).join(" ")
    : "";
  const objectDetails = data.details && typeof data.details === "object" ? JSON.stringify(data.details) : "";
  const objectError = data.error && typeof data.error === "object" ? JSON.stringify(data.error) : "";
  return details || data.message || data.error?.message || objectError || data.error || objectDetails || data.errorDescription || fallback;
}

function normalizeCallbackUrl(value, req) {
  const raw = String(value || "").trim();
  if (!raw) {
    const origin = getRequestOrigin(req);
    return origin ? `${origin}/api/webhook` : "";
  }
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function getRequestOrigin(req) {
  const host = String(req?.headers?.["x-forwarded-host"] || req?.headers?.host || "").trim();
  if (!host) return "";
  const protocol = String(req?.headers?.["x-forwarded-proto"] || "https").split(",")[0].trim() || "https";
  return `${protocol}://${host}`;
}

function normalizeCouponCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function pickTracking(source) {
  const allowed = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src", "sck"];
  return allowed.reduce((tracking, key) => {
    const value = String(source[key] || "").trim();
    if (value) tracking[key] = value;
    return tracking;
  }, {});
}

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}
