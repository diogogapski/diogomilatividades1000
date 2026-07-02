const params = new URLSearchParams(window.location.search);
const orderId = params.get("orderId") || params.get("id") || "";
const statusEl = document.querySelector("#deliveryStatus");
const messageEl = document.querySelector("#deliveryMessage");
const listEl = document.querySelector("#downloadList");

let attempts = 0;
let timer = null;

checkOrder();

async function checkOrder() {
  attempts += 1;

  if (!orderId) {
    setWaiting("Pedido não identificado. Volte ao checkout e use o link de acompanhamento gerado junto com o Pix.");
    return;
  }

  try {
    const response = await fetch(`/api/order-status?orderId=${encodeURIComponent(orderId)}`, { cache: "no-store" });
    const result = await response.json();

    if (!result.ok) {
      setWaiting(result.message || "Ainda não encontramos esse pedido. Tentando novamente...");
      scheduleNext();
      return;
    }

    if (!result.approved) {
      setWaiting(result.message || "Pagamento ainda não confirmado. Esta página atualiza automaticamente.");
      scheduleNext();
      return;
    }

    clearTimeout(timer);
    statusEl.textContent = "Pagamento confirmado";
    statusEl.classList.add("is-approved");
    messageEl.textContent = "Tudo certo. Agora você já pode baixar os materiais do pacote.";
    renderDownloads(result.files || []);
    trackPurchase(result);
  } catch {
    setWaiting("Não foi possível consultar agora. Vamos tentar novamente em alguns segundos.");
    scheduleNext();
  }
}

function scheduleNext() {
  clearTimeout(timer);
  timer = setTimeout(checkOrder, attempts < 20 ? 5000 : 12000);
}

function setWaiting(message) {
  statusEl.textContent = "Aguardando confirmação do Pix";
  statusEl.classList.remove("is-approved");
  messageEl.textContent = message;
}

function renderDownloads(files) {
  listEl.innerHTML = "";
  listEl.classList.remove("hidden");

  for (const file of files) {
    const link = document.createElement("a");
    link.className = "download-item";
    link.href = file.url;
    link.textContent = file.title;
    link.setAttribute("download", "");
    listEl.appendChild(link);
  }
}

function trackPurchase(result) {
  const key = `metaPurchase:${orderId}`;
  if (localStorage.getItem(key)) return;
  if (typeof window.fbq !== "function") return;
  const value = Number(result.amount || 17.9);
  window.fbq("track", "Purchase", {
    content_name: "1000 Atividades de Leitura e Ortografia - BNCC",
    content_category: "Infoproduto Educacional",
    content_type: "product",
    content_ids: ["1000-atividades-bncc"],
    contents: [{ id: "1000-atividades-bncc", quantity: 1, item_price: value }],
    num_items: 1,
    value,
    currency: "BRL",
    order_id: orderId
  }, { eventID: `purchase-${orderId}` });
  localStorage.setItem(key, "1");
}
