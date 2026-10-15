// Rastreador blindado de abandono e retenção com lembrete de 30 min
export interface ViewedProductEvent {
  productId: string;
  title: string;
  price: number;
  imageUrl?: string | null;
  viewedAt: number;
  notified: boolean;
}

const STORAGE_KEY = "hs_abandonment_queue_v1";
const DELAY_MS = 30 * 60 * 1000; // 30 minutos

export function trackProductView(product: {
  id: string;
  title: string;
  price: number;
  image_url?: string | null;
}) {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const queue: ViewedProductEvent[] = raw ? JSON.parse(raw) : [];

    // Remove qualquer visualização duplicada antiga do mesmo produto
    const filtered = queue.filter((item) => item.productId !== product.id);

    // Registra a visualização atual
    filtered.unshift({
      productId: product.id,
      title: product.title,
      price: Number(product.price),
      imageUrl: product.image_url,
      viewedAt: Date.now(),
      notified: false,
    });

    // Mantém no máximo os últimos 10 para economizar memória do navegador
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, 10)));

    // Solicita permissão suavemente apenas se o usuário ainda não tiver decidido
    if ("Notification" in window && Notification.permission === "default") {
      setTimeout(() => {
        Notification.requestPermission().catch(() => {});
      }, 5000);
    }
  } catch (err) {
    console.warn("Falha segura no tracker:", err);
  }
}

// Cancela o lembrete se o comprador comprou ou adicionou ao carrinho
export function markAsPurchasedOrInCart(productId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const queue: ViewedProductEvent[] = JSON.parse(raw);
    const updated = queue.filter((item) => item.productId !== productId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

// Motor que confere os 30 minutos em background sem pesar a CPU
export function initAbandonmentWatcher() {
  if (typeof window === "undefined") return;

  const check = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const queue: ViewedProductEvent[] = JSON.parse(raw);
      const now = Date.now();
      let changed = false;

      for (const item of queue) {
        if (!item.notified && now - item.viewedAt >= DELAY_MS) {
          item.notified = true;
          changed = true;

          // Dispara notificação nativa na barra de notificações do Windows/Android/Mac
          if ("Notification" in window && Notification.permission === "granted") {
            const notif = new Notification("Você ainda tem interesse neste item?", {
              body: `${item.title.slice(0, 50)}... por apenas R$ ${item.price.toFixed(2)} com Frete Grátis garantido!`,
              icon: item.imageUrl || "/hs-digital-logo.png",
              badge: "/hs-digital-logo.png",
              tag: `reminder-${item.productId}`,
            });

            notif.onclick = () => {
              window.focus();
              window.location.href = `/produto/${item.productId}`;
            };
          }
        }
      }

      if (changed) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      }
    } catch {}
  };

  // Roda uma verificação rápida no carregamento e a cada 60 segundos com baixíssimo consumo
  check();
  const timer = setInterval(check, 60 * 1000);
  return () => clearInterval(timer);
}
