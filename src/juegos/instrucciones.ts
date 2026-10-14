/**
 * Explicación muy corta de cada minijuego.
 *  - `nina`: una frase que se lee EN VOZ ALTA (ella aún lee despacio).
 *  - `adulto`: nota opcional para el adulto que acompaña.
 */
import type { JuegoProfe, Nivel } from '../datos/esquemas.ts';

export interface Instruccion {
  nina: string;
  adulto?: string;
}

export function instruccionDe(nivel: Nivel): Instruccion {
  switch (nivel.mecanica) {
    case 'intrusa':
      return {
        nina: 'En la palabra hay una letra que sobra. ¡Tócala!',
        adulto: 'Cada letra que encuentra vuela a la palabra secreta de arriba. Al completarla gana una pegatina.',
      };
    case 'burbujas':
      return nivel.esFrase
        ? {
            nina: `Toca solo las burbujas que dicen: ${nivel.objetivo}.`,
            adulto: 'El dibujo de arriba muestra la frase buena. Las burbujas que se escapan vuelven a salir.',
          }
        : {
            nina: `Toca solo las burbujas que dicen: ${nivel.objetivo}.`,
            adulto: 'Hay que llenar los círculos de arriba. Las burbujas que se escapan vuelven a salir.',
          };
    case 'tren':
      return nivel.items[0]?.unidad === 'palabra'
        ? {
            nina: 'Falta una palabra en el tren. ¡Ponla en su vagón!',
            adulto: 'Se puede arrastrar la pieza al vagón, o tocar la pieza y después el vagón.',
          }
        : {
            nina: 'Lleva cada trocito de la palabra a su vagón.',
            adulto: 'Se puede arrastrar la sílaba al vagón, o tocar la sílaba y después el vagón. Una pieza es una trampa.',
          };
    case 'detective':
      return {
        nina: 'Lee la frase y toca el dibujo que dice lo mismo.',
        adulto: 'Aquí la frase no se lee en voz alta: es para comprobar que entiende lo que lee.',
      };
    case 'carrera':
      return {
        nina: 'Lee las palabras en voz alta. ¡Tu cohete corre contra el fantasma!',
        adulto:
          'Pulsa ▶ para empezar. Ella lee cada palabra en voz alta y tú tocas ✓ si la ha leído bien o ✗ si no. ' +
          'El cohete avanza con cada palabra; el fantasma es su mejor marca anterior. ' +
          'Al final se calculan sus palabras correctas por minuto.',
      };
  }
}

/** Juegos con el profe (tutoría): aquí la nota para el adulto es la clave. */
export function instruccionProfe(juego: JuegoProfe): Instruccion {
  switch (juego) {
    case 'pillado':
      return {
        nina: 'El profe lee la palabra. ¿La ha leído bien, o le has pillado?',
        adulto:
          'Lee en voz alta lo que te indica el recuadro «Profe, lee». A veces es la palabra bien y a veces con un error ' +
          'típico. Ella toca el pulgar si está bien o la lupa si te ha pillado.',
      };
    case 'dictado':
      return {
        nina: 'Escucha la palabra y escríbela con las letras.',
        adulto:
          'Dicta despacio la palabra del recuadro «Profe, dicta» (o toca el altavoz). Ella toca las letras en orden. ' +
          'Hay letras trampa en espejo o que suenan parecido.',
      };
    case 'parejas':
      return {
        nina: 'Busca cada palabra con su dibujo. ¡Jugáis por turnos!',
        adulto:
          'Por turnos, cada uno levanta dos cartas. Si sale pareja, quien la encuentra lee la palabra en voz alta y ' +
          'repite turno. Cuando ella lee, tú marcas si la ha leído bien.',
      };
  }
}
