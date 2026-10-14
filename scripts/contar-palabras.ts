// Ejecuta el filtro real del generador sobre las fuentes reales e imprime
// cuántas palabras salen por mundo y las primeras de cada uno.
import { descargarFuentes } from '../src/generador/fuentes.ts';
import { construirCandidatas, resumenPorMundo } from '../src/generador/candidatas.ts';
import { generarMundo } from '../src/generador/niveles.ts';

const { frecuencias, pictogramas } = await descargarFuentes((m) => console.log(m));
const candidatas = construirCandidatas(frecuencias, pictogramas);
console.log('RESUMEN', JSON.stringify(resumenPorMundo(candidatas)));
for (let n = 1; n <= 5; n++) {
  const del = candidatas.filter((c) => c.mundo === n);
  const comunes = del.filter((c) => c.comun);
  console.log(`\nMUNDO ${n}: ${comunes.length} comunes + ${del.length - comunes.length} propios`);
  console.log('  primeras:', comunes.slice(0, 40).map((c) => c.texto).join(', '));
  console.log('  propios:', del.filter((c) => !c.comun).slice(0, 15).map((c) => c.texto).join(', '));
  const r = generarMundo(n, comunes.slice(0, 120), new Set(frecuencias.keys()));
  console.log(`  niveles: ${r.niveles.length} · frases: ${r.frases.length} · avisos: ${r.avisos.join(' | ') || 'ninguno'}`);
  console.log('  frases:', r.frases.slice(0, 12).map((f) => f.texto).join(', '));
}
