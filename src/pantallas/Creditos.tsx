import { Link } from 'react-router-dom';

/**
 * Créditos y licencias. Se completa en la Fase 6 (ARASAAC requiere atribución
 * visible por su licencia CC BY-NC-SA).
 */
export default function Creditos() {
  return (
    <main className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto px-8 py-10 font-sans text-lg leading-relaxed">
      <h1 className="text-4xl font-bold text-mar">Créditos</h1>

      <section>
        <h2 className="text-2xl font-bold">Pictogramas</h2>
        <p>
          Los símbolos pictográficos utilizados son propiedad del Gobierno de Aragón y han sido
          creados por Sergio Palao para{' '}
          <a className="text-mar underline" href="https://arasaac.org" target="_blank" rel="noreferrer">
            ARASAAC
          </a>
          , que los distribuye bajo Licencia Creative Commons BY-NC-SA.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Tipografía</h2>
        <p>Andika, de SIL International, bajo licencia SIL Open Font License 1.1.</p>
      </section>

      <Link
        to="/"
        className="mt-4 inline-flex min-h-16 w-fit items-center rounded-2xl bg-mar px-8 text-xl font-bold text-white"
      >
        Volver
      </Link>
    </main>
  );
}
