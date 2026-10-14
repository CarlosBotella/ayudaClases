/**
 * Voz de la app: lee palabras con la síntesis de voz del propio dispositivo
 * (speechSynthesis). No graba nada ni envía audio a ningún sitio.
 */

let vozElegida: SpeechSynthesisVoice | null = null;

/** Prefiere es-ES; si no hay, cualquier voz en español. */
function elegirVoz(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const voces = window.speechSynthesis.getVoices();
  return (
    voces.find((v) => v.lang.replace('_', '-').toLowerCase() === 'es-es') ??
    voces.find((v) => v.lang.toLowerCase().startsWith('es')) ??
    null
  );
}

/**
 * Espera a que el dispositivo cargue sus voces (en Chrome llegan con retraso)
 * y devuelve la elegida, o null si no hay ninguna en español.
 */
export function prepararVoz(): Promise<SpeechSynthesisVoice | null> {
  if (!('speechSynthesis' in window)) return Promise.resolve(null);
  vozElegida = elegirVoz();
  if (vozElegida) return Promise.resolve(vozElegida);

  return new Promise((resolver) => {
    const alCargar = () => {
      vozElegida = elegirVoz();
      resolver(vozElegida);
    };
    window.speechSynthesis.addEventListener('voiceschanged', alCargar, { once: true });
    // Algunos dispositivos nunca lanzan el evento: no esperar más de 2 s.
    window.setTimeout(alCargar, 2000);
  });
}

/** Lee un texto en voz alta, despacio. Devuelve false si no se puede hablar. */
export function hablar(texto: string): boolean {
  if (!('speechSynthesis' in window)) return false;
  const synth = window.speechSynthesis;
  synth.cancel(); // corta lo anterior: nunca dos voces a la vez

  const frase = new SpeechSynthesisUtterance(texto);
  frase.lang = 'es-ES';
  if (vozElegida) frase.voice = vozElegida;
  frase.rate = 0.8; // algo más lento: es una lectora que empieza
  frase.pitch = 1.05;
  synth.speak(frase);
  return true;
}
