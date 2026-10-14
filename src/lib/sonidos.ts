/**
 * Efectos de sonido sintetizados con Web Audio (sin archivos ni grabaciones).
 * Solo sonidos de ÉXITO: nunca hay sonido de error.
 */
let contexto: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  contexto ??= new AudioContext();
  // En iPad el audio empieza "suspendido" hasta el primer toque.
  if (contexto.state === 'suspended') void contexto.resume();
  return contexto;
}

function nota(frecuencia: number, inicio: number, duracion: number, volumen = 0.18, tipo: OscillatorType = 'sine') {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + inicio;
  const osc = c.createOscillator();
  const gan = c.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frecuencia, t);
  gan.gain.setValueAtTime(0.0001, t);
  gan.gain.exponentialRampToValueAtTime(volumen, t + 0.015);
  gan.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
  osc.connect(gan).connect(c.destination);
  osc.start(t);
  osc.stop(t + duracion + 0.05);
}

/** Burbuja que estalla. */
export function sonidoPop(): void {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gan = c.createGain();
  osc.frequency.setValueAtTime(900, t);
  osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);
  gan.gain.setValueAtTime(0.25, t);
  gan.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  osc.connect(gan).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.16);
}

/** "Clac" de un vagón que encaja. */
export function sonidoClac(): void {
  nota(160, 0, 0.08, 0.3, 'square');
  nota(320, 0.02, 0.06, 0.12, 'triangle');
}

/** Pequeña fanfarria de acierto. */
export function sonidoAcierto(): void {
  nota(660, 0, 0.18);
  nota(880, 0.09, 0.25);
}

/** Fanfarria más larga: final de nivel o pegatina. */
export function sonidoFanfarria(): void {
  [523, 659, 784, 1047].forEach((f, i) => nota(f, i * 0.11, 0.35, 0.16, 'triangle'));
}
