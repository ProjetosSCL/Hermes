// Cores dos gráficos. No tema Stone usa a paleta da marca; no clássico mantém as cores originais.
// (o index.html define data-theme antes do sistema carregar)
const stone =
  typeof document !== "undefined" &&
  document.documentElement.getAttribute("data-theme") === "stone";

export const chartColors = stone
  ? {
      palette: ["#00A800", "#235096", "#FF8232", "#9766FF", "#CD3773", "#008267"],
      neutral: "#C8D2C8",
      meta: "#007D00",
    }
  : {
      palette: ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"],
      neutral: "#cbd5e1",
      meta: "#059669",
    };
