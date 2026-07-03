const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const checkoutParams = new URLSearchParams(window.location.search);
const selectedPlan = checkoutParams.get("plan") === "premium" ? "premium" : "base";
const plans = {
  base: {
    id: "base",
    title: "1000 Atividades de Leitura e Ortografia - BNCC",
    subtitle: "Pacote digital para imprimir, com gabarito completo, bônus inclusos e garantia de 7 dias.",
    price: 17.9,
    checkoutTitle: "Falta só seu e-mail para liberar as 1000 atividades",
    hint: "Ao gerar o Pix, seu acesso fica reservado por alguns minutos com o valor de R$17,90."
  },
  premium: {
    id: "premium",
    title: "Pacote Premium de Alfabetização + Reforço Avançado",
    subtitle: "Inclui tudo do pacote principal, atividades extras, trilha por nível, jogos recortáveis e roteiro semanal.",
    price: 27.9,
    checkoutTitle: "Falta só seu e-mail para liberar o pacote premium",
    hint: "Ao gerar o Pix, seu pacote premium fica reservado por alguns minutos com o valor de R$27,90."
  }
};

const state = {
  product: { ...plans[selectedPlan] },
  bumps: [],
  selected: new Set()
};

const form = document.querySelector("#checkoutForm");
const productTitle = document.querySelector("#productTitle");
const productSubtitle = document.querySelector("#productSubtitle");
const basePrice = document.querySelector("#basePrice");
const totalPrice = document.querySelector("#totalPrice");
const checkoutIncludes = document.querySelector(".checkout-includes");
const payButton = document.querySelector("#payButton");
const resultEl = document.querySelector("#result");
const statusEl = document.querySelector("#status");
const resultTitle = document.querySelector("#resultTitle");
const checkoutTitle = document.querySelector("#checkoutTitle");
const paymentHint = document.querySelector(".payment-hint");
const qrImage = document.querySelector("#qrImage");
const pixCodeLabel = document.querySelector("#pixCodeLabel");
const pixCode = document.querySelector("#pixCode");
const copyPix = document.querySelector("#copyPix");
const deliveryLink = document.querySelector("#deliveryLink");
const bumpsFieldset = document.querySelector("#bumpsFieldset");
const bumpsEl = document.querySelector("#bumps");
let paymentPollTimer = null;
let checkoutStatusTimer = null;

init();

async function init() {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    const data = await response.json();
    state.product = {
      ...data.product,
      ...plans[selectedPlan]
    };
    state.bumps = selectedPlan === "premium" ? [] : data.bumps || [];
    document.title = `Checkout - ${state.product.title}`;
    productTitle.textContent = state.product.title;
    productSubtitle.textContent = state.product.subtitle;
    if (checkoutTitle) checkoutTitle.textContent = state.product.checkoutTitle;
    if (paymentHint) paymentHint.textContent = state.product.hint;
    renderCheckoutIncludes();
    basePrice.textContent = money.format(state.product.price);
    renderBumps();
    updateTotal();
    payButton.disabled = false;
    track("view", "checkout_open");
    metaTrack("InitiateCheckout", {
      content_name: state.product.title,
      content_category: "Infoproduto Educacional",
      value: getCurrentTotal(),
      currency: "BRL"
    });
  } catch {
    statusEl.textContent = "Checkout indisponível. Recarregue a página e tente novamente.";
    payButton.disabled = true;
  }
}

function renderCheckoutIncludes() {
  if (!checkoutIncludes || selectedPlan !== "premium") return;
  checkoutIncludes.innerHTML = `
    <span>1000 atividades prontas</span>
    <span>+300 atividades extras</span>
    <span>Jogos silábicos recortáveis</span>
    <span>Roteiro semanal de 30 dias</span>
  `;
}

function renderBumps() {
  bumpsEl.innerHTML = "";
  if (!state.bumps.length) {
    bumpsFieldset.classList.add("hidden");
    return;
  }

  bumpsFieldset.classList.remove("hidden");
  for (const bump of state.bumps) {
    const label = document.createElement("label");
    label.className = `bump-option${bump.highlight ? " hot-bump" : ""}`;
    const image = bump.image || "/assets/order-bumps/producao-texto.svg";
    const compareAt = Number(bump.compareAtPrice || 0);
    label.innerHTML = `
      <input type="checkbox" value="${escapeHtml(bump.id)}">
      <span class="bump-check" aria-hidden="true"></span>
      <img class="bump-image" src="${escapeHtml(image)}" alt="${escapeHtml(bump.title)}">
      <span class="bump-copy">
        <h3>${escapeHtml(bump.title)}</h3>
        <p>${escapeHtml(bump.description)}</p>
        <span class="bump-pricing">
          ${compareAt > bump.price ? `<s>De ${money.format(compareAt)}</s>` : ""}
          <strong>Por apenas ${money.format(bump.price)}</strong>
        </span>
      </span>
      <span class="bump-action">Adicionar ao meu pacote</span>
    `;
    label.querySelector("input").addEventListener("change", (event) => {
      if (event.target.checked) {
        state.selected.add(bump.id);
        label.classList.add("is-selected");
        label.querySelector(".bump-action").textContent = "Oferta adicionada ao pacote";
      } else {
        state.selected.delete(bump.id);
        label.classList.remove("is-selected");
        label.querySelector(".bump-action").textContent = "Adicionar ao meu pacote";
      }
      updateTotal();
    });
    bumpsEl.appendChild(label);
  }
}

function updateTotal() {
  totalPrice.textContent = money.format(getCurrentTotal());
}

function getCurrentTotal() {
  const bumpTotal = state.bumps
    .filter((bump) => state.selected.has(bump.id))
    .reduce((sum, bump) => sum + Number(bump.price || 0), 0);
  return Math.max(1, state.product.price + bumpTotal);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (payButton.disabled) return;

  const validationMessage = getValidationMessage();
  if (validationMessage) {
    showStatus(validationMessage, true);
    return;
  }

  payButton.disabled = true;
  payButton.textContent = "Gerando Pix...";
  showStatus("Criando seu Pix seguro...", false);
  scheduleCheckoutStatusMessages();

  const data = Object.fromEntries(new FormData(form).entries());
  Object.assign(data, generateBackendCustomer());
  data.bumpIds = Array.from(state.selected);
  data.plan = selectedPlan;
  data.tracking = Object.fromEntries(checkoutParams.entries());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    const result = await response.json();
    resultEl.classList.remove("hidden");

    if (!result.ok) {
      showStatus(result.error || "Não foi possível criar o pagamento.", true);
      qrImage.classList.add("hidden");
      pixCodeLabel.classList.add("hidden");
      copyPix.classList.add("hidden");
      deliveryLink.classList.add("hidden");
      track("error", "checkout_error", result.error || "erro");
      return;
    }

    const code = result.qrCode || result.provider?.pix?.code || result.provider?.data?.pix?.code || result.provider?.qr_code || "";
    const image = result.qrCodeBase64 || result.qrCodeImage || result.provider?.pix?.image || result.provider?.data?.pix?.image || result.provider?.qr_code_base64 || (code ? `/api/qr?data=${encodeURIComponent(code)}` : "");
    showStatus(`Total ${money.format(result.amount)}. Pague pelo app do seu banco para liberar os PDFs.`, false);
    pixCode.value = code;
    pixCodeLabel.classList.toggle("hidden", !code);
    copyPix.classList.toggle("hidden", !code);
    qrImage.classList.toggle("hidden", !image);
    if (image) qrImage.src = image;
    if (result.orderId) {
      deliveryLink.href = `/obrigado?orderId=${encodeURIComponent(result.orderId)}`;
      deliveryLink.classList.add("hidden");
      startPaymentApprovalPolling(result.orderId);
    }
    resultEl.scrollIntoView({ behavior: "smooth", block: "center" });
    track("success", "pix_ready");
    metaTrack("AddPaymentInfo", {
      content_name: state.product.title,
      content_category: "Infoproduto Educacional",
      value: Number(result.amount || getCurrentTotal()),
      currency: "BRL"
    });
    metaTrack("Lead", {
      content_name: state.product.title,
      content_category: "Pix Gerado",
      value: Number(result.amount || getCurrentTotal()),
      currency: "BRL"
    });
  } catch {
    resultEl.classList.remove("hidden");
    showStatus("A geração do Pix demorou mais que o normal. Tente novamente em alguns segundos.", true);
  } finally {
    clearTimeout(timeout);
    clearCheckoutStatusMessages();
    payButton.disabled = false;
    payButton.textContent = "Gerar meu Pix e reservar acesso";
  }
});

copyPix.addEventListener("click", async () => {
  await navigator.clipboard.writeText(pixCode.value);
  copyPix.textContent = "Copiado";
  setTimeout(() => {
    copyPix.textContent = "Copiar Pix";
  }, 1600);
});

function getValidationMessage() {
  const fields = form.elements;
  const email = String(fields.email.value || "").trim();

  if (!email || !fields.email.checkValidity()) {
    fields.email.focus();
    return "Informe um e-mail válido.";
  }
  return "";
}

function showStatus(message, isError) {
  resultEl.classList.remove("hidden");
  if (resultTitle) resultTitle.textContent = isError ? "Não foi possível gerar o Pix" : "Seu Pix foi gerado";
  statusEl.textContent = message;
  statusEl.classList.toggle("is-error", Boolean(isError));
}

function scheduleCheckoutStatusMessages() {
  clearCheckoutStatusMessages();
  checkoutStatusTimer = setTimeout(() => {
    showStatus("Estamos conectando com o banco para gerar seu Pix...", false);
    checkoutStatusTimer = setTimeout(() => {
      showStatus("Quase pronto. A Paradise está retornando os dados do Pix...", false);
    }, 7000);
  }, 4500);
}

function clearCheckoutStatusMessages() {
  clearTimeout(checkoutStatusTimer);
  checkoutStatusTimer = null;
}

function track(type, event, label = "") {
  const payload = JSON.stringify({
    type,
    event,
    label,
    path: location.pathname,
    sessionId: getSessionId(),
    at: new Date().toISOString()
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }));
    return;
  }

  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true
  }).catch(() => {});
}

function metaTrack(eventName, params = {}) {
  if (typeof window.fbq !== "function") return;
  window.fbq("track", eventName, params);
}

function startPaymentApprovalPolling(orderId) {
  clearTimeout(paymentPollTimer);
  let attempts = 0;

  async function checkPaymentApproval() {
    attempts += 1;

    try {
      const response = await fetch(`/api/order-status?orderId=${encodeURIComponent(orderId)}`, { cache: "no-store" });
      const result = await response.json();

      if (result.ok && result.approved) {
        clearTimeout(paymentPollTimer);
        showStatus("Pagamento confirmado. Seu acesso ja esta liberado.", false);
        deliveryLink.href = `/obrigado?orderId=${encodeURIComponent(orderId)}`;
        deliveryLink.classList.remove("hidden");
        trackMetaPurchase(result);
        return;
      }
    } catch {
      // Keep polling silently; the visible Pix instructions remain useful.
    }

    paymentPollTimer = setTimeout(checkPaymentApproval, attempts < 24 ? 5000 : 12000);
  }

  paymentPollTimer = setTimeout(checkPaymentApproval, 5000);
}

function trackMetaPurchase(result) {
  const orderId = String(result.orderId || "").trim();
  const storageKey = orderId ? `metaPurchase:${orderId}` : "";
  if (storageKey && localStorage.getItem(storageKey)) return;
  if (typeof window.fbq !== "function") return;

  const value = Number(result.amount || getCurrentTotal() || state.product.price || 17.9);
  const eventId = orderId ? `purchase-${orderId}` : `purchase-${Date.now()}`;
  window.fbq("track", "Purchase", {
    content_name: state.product.title || "1000 Atividades de Leitura e Ortografia - BNCC",
    content_category: "Infoproduto Educacional",
    content_type: "product",
    content_ids: ["1000-atividades-bncc"],
    contents: [{ id: "1000-atividades-bncc", quantity: 1, item_price: value }],
    num_items: 1,
    value,
    currency: "BRL",
    order_id: orderId
  }, { eventID: eventId });

  if (storageKey) localStorage.setItem(storageKey, "1");
}

function getSessionId() {
  const key = "atividadesBnccSessionId";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function generateBackendCustomer() {
  return {
    name: generateBrazilianName(),
    phone: generateBrazilianPhone(),
    document: generateValidCpf()
  };
}

function generateBrazilianName() {
  const firstNames = [
    "Ana", "Beatriz", "Camila", "Carolina", "Fernanda", "Gabriela",
    "Isabela", "Juliana", "Larissa", "Mariana", "Patricia", "Rafaela",
    "Renata", "Sabrina", "Vanessa", "Cristina"
  ];
  const lastNames = [
    "Almeida", "Barbosa", "Cardoso", "Carvalho", "Costa", "Ferreira",
    "Gomes", "Lima", "Martins", "Oliveira", "Pereira", "Santos",
    "Silva", "Souza", "Ribeiro", "Mendes"
  ];
  return `${randomItem(firstNames)} ${randomItem(lastNames)}`;
}

function generateBrazilianPhone() {
  const areaCodes = ["11", "21", "31", "41", "51", "61", "71", "81", "85"];
  const number = String(Math.floor(Math.random() * 100000000)).padStart(8, "0");
  return `${randomItem(areaCodes)}9${number}`;
}

function generateValidCpf() {
  const numbers = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  numbers.push(calculateCpfDigit(numbers));
  numbers.push(calculateCpfDigit(numbers));
  return numbers.join("");
}

function calculateCpfDigit(numbers) {
  const factorStart = numbers.length + 1;
  const total = numbers.reduce((sum, number, index) => sum + number * (factorStart - index), 0);
  const rest = total % 11;
  return rest < 2 ? 0 : 11 - rest;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
