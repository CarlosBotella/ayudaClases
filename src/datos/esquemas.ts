/**
 * Esquemas de todos los datos que viven en Firestore.
 * Se validan con Zod al LEER: si un documento no encaja, la app no se rompe;
 * lo ignora y avisa en consola.
 *
 * Este archivo no importa Firebase a propósito (así se puede usar en tests y
 * en el generador sin cargar el SDK).
 */
import { z } from 'zod';

export const SCHEMA_VERSION = 1;

/** Email del tutor: el único que puede entrar al panel (las reglas lo comprueban también). */
export const EMAIL_TUTOR = 'cbotnav@gmail.com';

// ─── Piezas comunes ──────────────────────────────────────────────────────────

export const TipoErrorZ = z.enum([
  'inversion',
  'espejo',
  'sonoridad',
  'omision',
  'intrusa',
  'sustitucion',
  'comprension',
]);

export const DistractorZ = z.object({ texto: z.string().min(1), tipo: TipoErrorZ });

export const ElementoEscenaZ = z.object({
  palabra: z.string().min(1),
  escala: z.number().positive().max(3),
  copias: z.number().int().min(1).max(5),
});
export const EscenaZ = z.object({ elementos: z.array(ElementoEscenaZ).min(1).max(3) });

export const PalabraContenidoZ = z.object({
  silabas: z.array(z.string().min(1)).min(1),
  /** Id del pictograma de ARASAAC. */
  img: z.number().int().positive(),
});

export const ContextoZ = z.enum(['tutoria', 'casa']);
export type Contexto = z.infer<typeof ContextoZ>;

export const MecanicaZ = z.enum([
  'intrusa',
  'burbujas',
  'tren',
  'detective',
  'carrera',
  // Juegos con el profe (solo en tablets de tutoría)
  'pillado',
  'dictado',
  'parejas',
]);
/** Juegos que se juegan con el profe, en tutoría. */
export type JuegoProfe = 'pillado' | 'dictado' | 'parejas';
export type Mecanica = z.infer<typeof MecanicaZ>;

// ─── Niveles (uno por mecánica) ─────────────────────────────────────────────

const base = {
  id: z.string().min(1),
  titulo: z.string(),
  /** 1 (muy fácil) a 5. */
  dificultad: z.number().int().min(1).max(5),
};

export const ItemIntrusaZ = z.object({
  palabra: z.string(),
  conIntrusa: z.string(),
  posicion: z.number().int().min(0),
  letra: z.string().length(1),
  dificultad: z.enum(['muy-distinta', 'normal', 'palabra-real', 'espejo']),
});

export const NivelIntrusaZ = z.object({
  ...base,
  mecanica: z.literal('intrusa'),
  items: z.array(ItemIntrusaZ).min(1),
  /** Palabra secreta: sus letras son las intrusas, en orden. */
  secreta: z.string().min(3).max(5),
  /** Si la palabra suena sola al empezar cada ítem. */
  audioAuto: z.boolean(),
});

export const NivelBurbujasZ = z.object({
  ...base,
  mecanica: z.literal('burbujas'),
  /** Sílaba (o frase corta) que hay que pescar. */
  objetivo: z.string().min(1),
  /** Patrón de la sílaba objetivo (CV, CCV…) o "frase". */
  patron: z.string(),
  /** Dibujo de apoyo (palabra que contiene la sílaba, o la escena de la frase). */
  pista: EscenaZ,
  distractores: z.array(DistractorZ).min(1),
  /** Cuántas burbujas objetivo hay que reventar. */
  meta: z.number().int().min(1).max(20),
  /** Segundos que tarda una burbuja en cruzar la pantalla. */
  velocidad: z.number().min(3).max(30),
  maxBurbujas: z.number().int().min(2).max(10),
  /** Proporción de burbujas objetivo (0–1). */
  proporcion: z.number().min(0.1).max(0.9),
  esFrase: z.boolean(),
});

export const ItemTrenZ = z.object({
  /** Texto de cada vagón, en orden (sílabas de una palabra o palabras de una frase). */
  piezas: z.array(z.string().min(1)).min(1).max(6),
  /** Índices de los vagones que empiezan vacíos. */
  huecos: z.array(z.number().int().min(0)).min(1),
  trampas: z.array(DistractorZ),
  escena: EscenaZ,
  /** Lo que se lee en voz alta al completar el tren. */
  lectura: z.string(),
  unidad: z.enum(['silaba', 'palabra']),
});

export const NivelTrenZ = z.object({
  ...base,
  mecanica: z.literal('tren'),
  items: z.array(ItemTrenZ).min(1),
});

export const ItemDetectiveZ = z.object({
  frase: z.string(),
  escenas: z.array(EscenaZ).min(2).max(3),
  correcta: z.number().int().min(0).max(2),
});

export const NivelDetectiveZ = z.object({
  ...base,
  mecanica: z.literal('detective'),
  items: z.array(ItemDetectiveZ).min(1),
});

export const NivelCarreraZ = z.object({
  ...base,
  mecanica: z.literal('carrera'),
  palabras: z.array(z.string().min(1)).min(3).max(20),
});

export const NivelZ = z.discriminatedUnion('mecanica', [
  NivelIntrusaZ,
  NivelBurbujasZ,
  NivelTrenZ,
  NivelDetectiveZ,
  NivelCarreraZ,
]);

export type ItemIntrusa = z.infer<typeof ItemIntrusaZ>;
export type ItemTren = z.infer<typeof ItemTrenZ>;
export type ItemDetective = z.infer<typeof ItemDetectiveZ>;
export type NivelIntrusa = z.infer<typeof NivelIntrusaZ>;
export type NivelBurbujas = z.infer<typeof NivelBurbujasZ>;
export type NivelTren = z.infer<typeof NivelTrenZ>;
export type NivelDetective = z.infer<typeof NivelDetectiveZ>;
export type NivelCarrera = z.infer<typeof NivelCarreraZ>;
export type Nivel = z.infer<typeof NivelZ>;
export type EscenaDatos = z.infer<typeof EscenaZ>;
export type DistractorDatos = z.infer<typeof DistractorZ>;
export type TipoErrorDatos = z.infer<typeof TipoErrorZ>;

// ─── Documentos ─────────────────────────────────────────────────────────────

export const FraseGuardadaZ = z.object({
  texto: z.string(),
  plantilla: z.enum(['nombre', 'tamano', 'cantidad', 'pareja']),
  mundo: z.number().int().min(1).max(5),
  escena: EscenaZ,
  distractoras: z.array(EscenaZ),
});
export type FraseGuardada = z.infer<typeof FraseGuardadaZ>;

/** contenido/mundo-{n} */
export const ContenidoZ = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  mundo: z.number().int().min(1).max(5),
  palabras: z.record(z.string(), PalabraContenidoZ),
  niveles: z.array(NivelZ),
  frases: z.array(FraseGuardadaZ),
  /** Timestamp de Firestore (no se valida su forma). */
  actualizado: z.unknown(),
});
export type Contenido = z.infer<typeof ContenidoZ>;

/** students/{sid} */
export const AlumnaZ = z.object({ nombre: z.string().min(1).max(40), creado: z.unknown() });
export type Alumna = z.infer<typeof AlumnaZ>;

/** pairingCodes/{codigo} */
export const CodigoVinculacionZ = z.object({
  studentId: z.string(),
  nombre: z.string(),
  contexto: ContextoZ,
  /** Timestamp de Firestore. */
  expira: z.unknown(),
});

/** devices/{uid} */
export const DispositivoZ = z.object({
  studentId: z.string(),
  nombre: z.string(),
  contexto: ContextoZ,
  codigo: z.string(),
  vinculado: z.unknown(),
});
export type Dispositivo = z.infer<typeof DispositivoZ>;

/** students/{sid}/levelAttempts/{id} */
export const IntentoNivelZ = z.object({
  nivelId: z.string(),
  mundo: z.number().int(),
  nivel: z.number().int(),
  mecanica: MecanicaZ,
  estrellas: z.number().int().min(0).max(3),
  puntuacion: z.number().min(0).max(1),
  duracionMs: z.number().min(0),
  pcpm: z.number().min(0).optional(),
  contexto: ContextoZ,
  /** Pegatina ganada (palabra secreta) y su pictograma. */
  pegatina: z.string().optional(),
  pegatinaImg: z.number().int().optional(),
  completadoEn: z.unknown(),
});
export type IntentoNivel = z.infer<typeof IntentoNivelZ>;

/** students/{sid}/attempts/{uuid} — solo se añaden, nunca se editan. */
export const IntentoItemZ = z.object({
  levelAttemptId: z.string(),
  mecanica: MecanicaZ,
  /** Lo que se presentaba: palabra, sílaba o frase. */
  item: z.string(),
  /** Unidad que se evalúa (sílaba, grafema o palabra). */
  unidadObjetivo: z.string(),
  patron: z.string(),
  respuesta: z.string(),
  correcto: z.boolean(),
  errorTipo: TipoErrorZ.nullable(),
  latenciaMs: z.number().min(0),
  ayudas: z.number().int().min(0),
  intentoN: z.number().int().min(1),
  contexto: ContextoZ,
  creadoEn: z.unknown(),
});
export type IntentoItem = z.infer<typeof IntentoItemZ>;
