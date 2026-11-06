import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Trophy, Award, Users, X, Download, Copy, Share2, Loader2 } from "lucide-react";
import { toBlob } from "html-to-image";

/**
 * Prints do X1 SCL para postar nas redes / WhatsApp.
 * Gera 4 imagens separadas (PNG 1080px de largura, qualidade 2x):
 *   1. Franquia campeã do dia
 *   2. Ranking completo das franquias
 *   3. Angel campeão do dia
 *   4. Ranking completo dos Angels
 */

export type PrintFranquia = { id: string; nome: string; uf: string; os: number; acum: number; foto?: string };
export type PrintAngel = { id: string; nome: string; franquia: string; cargo: string; os: number; media: number | null; foto?: string };

type Props = {
  diaRotulo: string; // ex.: 03/11/2026
  diaIso: string; // ex.: 2026-11-03 (usado no nome do arquivo)
  totalDia: number;
  franquias: PrintFranquia[];
  angels: PrintAngel[];
  xMedia: number | null;
  onClose: () => void;
  onToast: (type: "ok" | "err", text: string) => void;
};

type Chave = "franquiaCampea" | "rankingFranquias" | "angelCampeao" | "rankingAngels";

const LARGURA = 1080;
const ESCALA_PREVIA = 0.36;

const inteiro = (v: number) => v.toLocaleString("pt-BR");
const dec = (v: number, c: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c });
const iniciais = (nome: string) => nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

/** Baixa a foto e converte em data URL, para o print não falhar por CORS. Se não der, devolve null (cai nas iniciais). */
const paraDataUrl = async (url: string): Promise<string | null> => {
  try {
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onloadend = () => resolve(typeof fr.result === "string" ? fr.result : null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const Foto: React.FC<{ nome: string; src?: string | null; size: number; borda: string; fundo: string; cor: string }> = ({ nome, src, size, borda, fundo, cor }) =>
  src ? (
    <img src={src} alt={nome} style={{ width: size, height: size, borderColor: borda }} className="rounded-full object-cover bg-white flex-shrink-0 border-4" />
  ) : (
    <div
      style={{ width: size, height: size, borderColor: borda, background: fundo, color: cor, fontSize: Math.round(size * 0.34) }}
      className="rounded-full flex items-center justify-center font-black flex-shrink-0 border-4"
    >
      {iniciais(nome)}
    </div>
  );

const Pos: React.FC<{ n: number }> = ({ n }) => {
  const estilo =
    n === 1 ? { background: "#fbbf24", color: "#fff" } : n === 2 ? { background: "#e2e8f0", color: "#334155" } : n === 3 ? { background: "#fdba74", color: "#7c2d12" } : { background: "#f1f5f9", color: "#64748b" };
  return (
    <span style={{ width: 64, height: 64, fontSize: 26, ...estilo }} className="rounded-full flex items-center justify-center font-black flex-shrink-0">
      {n}º
    </span>
  );
};

const Rodape: React.FC = () => (
  <p style={{ fontSize: 20 }} className="font-bold text-slate-400 uppercase tracking-widest text-center">
    Hermes • X1 SCL
  </p>
);

const Selo: React.FC<{ texto: string; tom: "ouro" | "verde" | "escuro"; icone: React.ReactNode }> = ({ texto, tom, icone }) => {
  const cores = {
    ouro: { background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" },
    verde: { background: "#d1fae5", color: "#065f46", borderColor: "#6ee7b7" },
    escuro: { background: "#0f172a", color: "#6ee7b7", borderColor: "#0f172a" },
  }[tom];
  return (
    <span style={{ ...cores, fontSize: 24 }} className="inline-flex items-center gap-3 border-2 px-6 py-3 rounded-full font-extrabold uppercase tracking-wide">
      {icone}
      {texto}
    </span>
  );
};

export const X1PrintModal: React.FC<Props> = ({ diaRotulo, diaIso, totalDia, franquias, angels, xMedia, onClose, onToast }) => {
  const [sel, setSel] = useState<Record<Chave, boolean>>({ franquiaCampea: true, rankingFranquias: true, angelCampeao: true, rankingAngels: true });
  const [fotos, setFotos] = useState<Record<string, string | null>>({});
  const [carregandoFotos, setCarregandoFotos] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  // pré-carrega todas as fotos como data URL
  useEffect(() => {
    let cancelado = false;
    const urls = [...new Set([...franquias.map((f) => f.foto), ...angels.map((a) => a.foto)].filter((u): u is string => !!u))];
    (async () => {
      const entradas = await Promise.all(urls.map(async (u) => [u, await paraDataUrl(u)] as const));
      if (cancelado) return;
      setFotos(Object.fromEntries(entradas));
      setCarregandoFotos(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [franquias, angels]);

  const foto = (u?: string) => (u ? fotos[u] ?? null : null);
  const campeaFr = franquias[0] && franquias[0].os > 0 ? franquias[0] : null;
  const campeaoAngel = angels[0] ?? null;
  const maxFr = Math.max(1, ...franquias.map((f) => f.os));

  const itens: { chave: Chave; titulo: string; node: React.ReactNode }[] = useMemo(
    () => [
      {
        chave: "franquiaCampea",
        titulo: "Franquia campeã do dia",
        node: (
          <div style={{ width: LARGURA, height: LARGURA, padding: 72, background: "linear-gradient(135deg,#fffbeb 0%,#ffffff 60%,#fef3c7 100%)" }} className="flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <Selo tom="ouro" texto={`Franquia campeã do dia • ${diaRotulo}`} icone={<Trophy size={30} />} />
            </div>
            {campeaFr ? (
              <div className="flex flex-col items-center text-center gap-6">
                <Foto nome={campeaFr.nome} src={foto(campeaFr.foto)} size={300} borda="#fcd34d" fundo="#fef3c7" cor="#92400e" />
                <div>
                  <p style={{ fontSize: 72, lineHeight: 1.05 }} className="font-black text-slate-900">Franquia {campeaFr.nome}</p>
                  <p style={{ fontSize: 30 }} className="text-slate-500 mt-2 font-semibold">{campeaFr.nome}/{campeaFr.uf}</p>
                </div>
                <div className="flex gap-16 mt-4">
                  <div>
                    <p style={{ fontSize: 22 }} className="font-bold text-slate-500 uppercase">OS atendidas no dia</p>
                    <p style={{ fontSize: 96, lineHeight: 1.1, color: "#78350f" }} className="font-black">{inteiro(campeaFr.os)} OS</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 22 }} className="font-bold text-slate-500 uppercase">Acumulado no mês</p>
                    <p style={{ fontSize: 96, lineHeight: 1.1 }} className="font-black text-slate-900">{inteiro(campeaFr.acum)} OS</p>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 32 }} className="text-center text-slate-500">Nenhuma franquia com OS neste dia.</p>
            )}
            <Rodape />
          </div>
        ),
      },
      {
        chave: "rankingFranquias",
        titulo: "Ranking das franquias",
        node: (
          <div style={{ width: LARGURA, padding: 64, background: "#ffffff" }} className="flex flex-col gap-8">
            <div className="flex justify-between items-start gap-6">
              <div>
                <Selo tom="escuro" texto={`X1 SCL • ${diaRotulo}`} icone={<Trophy size={28} />} />
                <p style={{ fontSize: 54 }} className="font-black text-slate-900 mt-5">Ranking das Franquias</p>
                <p style={{ fontSize: 24 }} className="text-slate-500 mt-1">OS atendidas na data • total do dia: {inteiro(totalDia)} OS</p>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {franquias.map((f, i) => (
                <div
                  key={f.id}
                  style={{ padding: "22px 28px", borderWidth: 2 }}
                  className={`rounded-3xl border ${i === 0 ? "bg-amber-50 border-amber-300" : i === 1 ? "bg-slate-50 border-slate-200" : i === 2 ? "bg-orange-50 border-orange-200" : "bg-white border-slate-200"}`}
                >
                  <div className="flex items-center gap-5">
                    <Pos n={i + 1} />
                    <Foto nome={f.nome} src={foto(f.foto)} size={72} borda="#e2e8f0" fundo="#d1fae5" cor="#047857" />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 34 }} className="font-extrabold text-slate-900">Franquia {f.nome}</p>
                      <p style={{ fontSize: 22 }} className="text-slate-500">{f.nome}/{f.uf}</p>
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize: 38, color: "#92400e" }} className="font-black">{inteiro(f.os)} OS do Dia</p>
                      <p style={{ fontSize: 20 }} className="text-slate-500">({inteiro(f.acum)} OS no mês)</p>
                    </div>
                  </div>
                  <div style={{ height: 12, marginTop: 16 }} className="rounded-full bg-slate-100 overflow-hidden">
                    <div style={{ width: `${(f.os / maxFr) * 100}%`, background: "#10b981", height: "100%" }} className="rounded-full" />
                  </div>
                </div>
              ))}
            </div>
            <Rodape />
          </div>
        ),
      },
      {
        chave: "angelCampeao",
        titulo: "Angel campeão do dia",
        node: (
          <div style={{ width: LARGURA, height: LARGURA, padding: 72, background: "linear-gradient(135deg,#ecfdf5 0%,#ffffff 60%,#d1fae5 100%)" }} className="flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <Selo tom="verde" texto={`Angel campeão do dia • ${diaRotulo}`} icone={<Award size={30} />} />
            </div>
            {campeaoAngel ? (
              <div className="flex flex-col items-center text-center gap-6">
                <Foto nome={campeaoAngel.nome} src={foto(campeaoAngel.foto)} size={300} borda="#6ee7b7" fundo="#d1fae5" cor="#047857" />
                <div>
                  <p style={{ fontSize: 64, lineHeight: 1.05 }} className="font-black text-slate-900">{campeaoAngel.nome}</p>
                  <p style={{ fontSize: 30 }} className="text-slate-500 mt-2 font-semibold">{campeaoAngel.franquia} • {campeaoAngel.cargo || "Green Angel"}</p>
                </div>
                <div className="flex gap-14 mt-4">
                  <div>
                    <p style={{ fontSize: 22 }} className="font-bold text-slate-500 uppercase">OS na data</p>
                    <p style={{ fontSize: 88, lineHeight: 1.1 }} className="font-black text-slate-900">{inteiro(campeaoAngel.os)} OS</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 22 }} className="font-bold text-slate-500 uppercase">Média real</p>
                    <p style={{ fontSize: 88, lineHeight: 1.1, color: "#047857" }} className="font-black">{campeaoAngel.media !== null ? `${dec(campeaoAngel.media, 1)} OS/d` : "—"}</p>
                  </div>
                  {xMedia !== null && (
                    <div>
                      <p style={{ fontSize: 22 }} className="font-bold text-slate-500 uppercase">x Média</p>
                      <p style={{ fontSize: 88, lineHeight: 1.1, color: "#047857" }} className="font-black">{xMedia >= 0 ? "+" : ""}{Math.round(xMedia)}%</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 32 }} className="text-center text-slate-500">Nenhum Angel com OS neste dia.</p>
            )}
            <Rodape />
          </div>
        ),
      },
      {
        chave: "rankingAngels",
        titulo: "Ranking dos Angels",
        node: (
          <div style={{ width: LARGURA, padding: 64, background: "#ffffff" }} className="flex flex-col gap-8">
            <div>
              <Selo tom="escuro" texto={`X1 SCL • ${diaRotulo}`} icone={<Users size={28} />} />
              <p style={{ fontSize: 54 }} className="font-black text-slate-900 mt-5">Ranking dos Angels</p>
              <p style={{ fontSize: 24 }} className="text-slate-500 mt-1">Atendimentos concluídos na data e média diária real</p>
            </div>
            <div className="flex flex-col gap-4">
              {angels.map((a, i) => (
                <div
                  key={a.id}
                  style={{ padding: "20px 28px", borderWidth: 2 }}
                  className={`rounded-3xl border flex items-center gap-5 ${i === 0 ? "bg-emerald-50 border-emerald-300" : i === 1 ? "bg-slate-50 border-slate-200" : i === 2 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}
                >
                  <Pos n={i + 1} />
                  <Foto nome={a.nome} src={foto(a.foto)} size={80} borda="#6ee7b7" fundo="#d1fae5" cor="#047857" />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 32, lineHeight: 1.15 }} className="font-extrabold text-slate-900">{a.nome}</p>
                    <p style={{ fontSize: 21 }} className="text-slate-500">{a.franquia} • {a.cargo || "—"}</p>
                  </div>
                  <div className="text-right" style={{ minWidth: 150 }}>
                    <p style={{ fontSize: 16 }} className="font-bold text-slate-400 uppercase">Atendidos no dia</p>
                    <p style={{ fontSize: 38 }} className="font-black text-slate-900">{inteiro(a.os)} OS</p>
                  </div>
                  <div className="text-right" style={{ minWidth: 170 }}>
                    <p style={{ fontSize: 16 }} className="font-bold text-slate-400 uppercase">Média real</p>
                    <p style={{ fontSize: 38, color: "#047857" }} className="font-black">{a.media !== null ? `${dec(a.media, 1)} OS/d` : "—"}</p>
                  </div>
                </div>
              ))}
            </div>
            <Rodape />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diaRotulo, totalDia, franquias, angels, xMedia, fotos],
  );

  const nomeArquivo = (chave: Chave) => {
    const nomes: Record<Chave, string> = {
      franquiaCampea: "franquia-campea",
      rankingFranquias: "ranking-franquias",
      angelCampeao: "angel-campeao",
      rankingAngels: "ranking-angels",
    };
    return `x1-${diaIso}-${nomes[chave]}.png`;
  };

  const gerar = async (chave: Chave): Promise<Blob | null> => {
    const node = refs.current[chave];
    if (!node) return null;
    return toBlob(node, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: false });
  };

  const baixarBlob = (blob: Blob, nome: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const escolhidos = itens.filter((i) => sel[i.chave]);

  const baixarSelecionados = async () => {
    if (escolhidos.length === 0) return onToast("err", "Marque pelo menos um print.");
    setOcupado(true);
    try {
      for (const it of escolhidos) {
        const blob = await gerar(it.chave);
        if (!blob) throw new Error("falha ao gerar");
        baixarBlob(blob, nomeArquivo(it.chave));
        await new Promise((r) => setTimeout(r, 400)); // evita o navegador bloquear downloads em sequência
      }
      onToast("ok", `${escolhidos.length} print(s) baixado(s).`);
    } catch {
      onToast("err", "Não consegui gerar os prints. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  };

  const copiarImagem = async (chave: Chave) => {
    setOcupado(true);
    try {
      const blob = await gerar(chave);
      if (!blob) throw new Error("falha ao gerar");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      onToast("ok", "Imagem copiada. É só colar no WhatsApp ou na rede social.");
    } catch {
      onToast("err", "Seu navegador não permitiu copiar. Use “Baixar”.");
    } finally {
      setOcupado(false);
    }
  };

  const podeCompartilhar = typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function";
  const compartilharSelecionados = async () => {
    if (escolhidos.length === 0) return onToast("err", "Marque pelo menos um print.");
    setOcupado(true);
    try {
      const files: File[] = [];
      for (const it of escolhidos) {
        const blob = await gerar(it.chave);
        if (blob) files.push(new File([blob], nomeArquivo(it.chave), { type: "image/png" }));
      }
      if (!navigator.canShare({ files })) throw new Error("sem suporte");
      await navigator.share({ files, title: `X1 SCL — ${diaRotulo}` });
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") onToast("err", "Não foi possível compartilhar. Use “Baixar”.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-5xl my-4 p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-black text-slate-900">Prints do X1 SCL — {diaRotulo}</p>
            <p className="text-[11px] text-slate-500">Marque os prints que quer. Cada um vira uma imagem separada (PNG).</p>
          </div>
          <button aria-label="Fechar" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {carregandoFotos && (
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparando fotos...
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {itens.map((it) => (
            <Previa key={it.chave} titulo={it.titulo} marcado={sel[it.chave]} onMarcar={() => setSel((s) => ({ ...s, [it.chave]: !s[it.chave] }))} onCopiar={() => copiarImagem(it.chave)} ocupado={ocupado || carregandoFotos} setRef={(el) => (refs.current[it.chave] = el)}>
              {it.node}
            </Previa>
          ))}
        </div>

        <div className="flex justify-end gap-2 flex-wrap">
          {podeCompartilhar && (
            <button disabled={ocupado || carregandoFotos} onClick={compartilharSelecionados} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-60 rounded-xl text-xs font-extrabold text-slate-700">
              <Share2 className="w-3.5 h-3.5" /> Compartilhar
            </button>
          )}
          <button disabled={ocupado || carregandoFotos} onClick={baixarSelecionados} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-extrabold">
            {ocupado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Baixar selecionados ({escolhidos.length})
          </button>
        </div>
      </div>
    </div>
  );
};

/** Pré-visualização reduzida; o nó capturado (setRef) fica em tamanho real dentro de um wrapper escalado. */
const Previa: React.FC<{
  titulo: string;
  marcado: boolean;
  onMarcar: () => void;
  onCopiar: () => void;
  ocupado: boolean;
  setRef: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}> = ({ titulo, marcado, onMarcar, onCopiar, ocupado, setRef, children }) => {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [altura, setAltura] = useState(LARGURA);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const medir = () => setAltura(el.offsetHeight);
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={`border rounded-2xl p-3 ${marcado ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200"}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <label className="flex items-center gap-2 text-xs font-extrabold text-slate-800 cursor-pointer">
          <input type="checkbox" checked={marcado} onChange={onMarcar} aria-label={`Incluir: ${titulo}`} />
          {titulo}
        </label>
        <button disabled={ocupado} onClick={onCopiar} className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 hover:bg-white disabled:opacity-60 rounded-lg text-[10px] font-extrabold text-slate-600">
          <Copy className="w-3 h-3" /> Copiar imagem
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 mx-auto" style={{ width: LARGURA * ESCALA_PREVIA, height: altura * ESCALA_PREVIA }}>
        <div style={{ width: LARGURA, transform: `scale(${ESCALA_PREVIA})`, transformOrigin: "top left" }}>
          <div
            ref={(el) => {
              innerRef.current = el;
              setRef(el);
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
