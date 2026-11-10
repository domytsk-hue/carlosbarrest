"use client";

// Avisos sonoros do painel. O navegador do tablet só libera som depois de um
// toque na tela, então o contexto de áudio é criado no primeiro toque e
// reaproveitado.

let ctx: AudioContext | null = null;

function contexto() {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Som pode tocar sozinho? (falso até a primeira interação no tablet) */
export const somLiberado = () => ctx?.state === "running";

/** Chame num toque/clique para liberar o som no tablet. */
export function liberarSom() {
  contexto();
}

function nota(c: AudioContext, freq: number, inicio: number, dur: number, volume = 0.18) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(volume, c.currentTime + inicio);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + inicio + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + inicio);
  o.stop(c.currentTime + inicio + dur);
}

/** "novo": pedido chegou na cozinha (dois bipes). "pronto": pedido pronto para levar (três notas subindo). */
export function tocar(tipo: "novo" | "pronto") {
  const c = contexto();
  if (!c) return;
  try {
    if (tipo === "novo") {
      nota(c, 880, 0, 0.35);
      nota(c, 880, 0.45, 0.35);
    } else {
      nota(c, 660, 0, 0.25);
      nota(c, 880, 0.22, 0.25);
      nota(c, 1100, 0.44, 0.45);
    }
  } catch {}
  try {
    navigator.vibrate?.(tipo === "novo" ? [200, 100, 200] : [120, 80, 120, 80, 300]);
  } catch {}
}
