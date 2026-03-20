// ============================================================
// 16PF Type Definitions
// ============================================================

/** A single answer is always 1, 2, or 3 */
export type AnswerValue = 1 | 2 | 3;

/** Map of question ID → answer value */
export type Answers = Record<number, AnswerValue>;

/** Map of factor code → decatipo (sten score 1-10) */
export type Decatipos = Record<string, number>;

/** Map of factor code → raw score */
export type RawScores = Record<string, number>;

/** Result of computeResults() */
export type ScoringResult = {
  rawScores: RawScores;
  decatipos: Decatipos;
};

/** Global dimension scores */
export type GlobalDims = {
  ANS: number; // Ansiedad
  EXT: number; // Extraversión
  SCO: number; // Control Social
  IND: number; // Independencia
  OBJ: number; // Objetividad/Mentalidad Dura
};

/** Derived equation scores */
export type DerivedEqs = {
  CRE: number; // Creatividad
  NEU: number; // Neuroticismo
  PSI: number; // Psicoticismo/Aislamiento
  LID: number; // Liderazgo
  LAC: number; // Libre de Accidentes
};

/** Discriminant analysis scores */
export type Discriminants = {
  SEC: number;
  ADM_CUOTA: number;
  ADM_CUOTA_PCT: number;
  SPA: number;
  MED: number;
  EMPRES: number;
  CIENT: number;
  CIENT_ING: number;
  CIENT_SOC: number;
};

/** Interpretation sections */
export type Interpretation = {
  intelectual: string[];
  emocional: string[];
  social: string[];
  etica: string[];
};

/** Specialist notes structure */
export type SpecialistNotes = {
  intelectual?: string;
  emocional?: string;
  social?: string;
  etica?: string;
  resumen?: string;
};

/** Sincerity/Image Management result */
export type SincerityResult = {
  score: number;
  label: string;
  color: string;
  bg: string;
  icon: string;
} | null;

/** Question definition */
export type Question = {
  id: number;
  text: string;
  options: string[];
};

/** Factor definition for display */
export type FactorDef = {
  id: string;
  name: string;
  low: string;
  high: string;
};

/** Factor description for interpretation */
export type FactorDescription = {
  low: string;
  mid: string;
  high: string;
};

/** Status of a 16PF evaluation */
export type Pf16Status = 'pending' | 'sent' | 'in_progress' | 'completed' | 'expired';

/** Full evaluation record from Supabase */
export type Pf16Evaluation = {
  id: string;
  organization_id: string;
  candidate_id: string | null;
  vacancy_id: string | null;
  job_position_id: string | null;
  evaluator_id: string;
  norm_idx: number;
  status: Pf16Status;
  access_token: string;
  answers_encrypted: string | null;
  decatipos: Decatipos | null;
  global_dims: GlobalDims | null;
  derived_eqs: DerivedEqs | null;
  discriminants: Discriminants | null;
  interpretation: Interpretation | null;
  specialist_notes: SpecialistNotes | null;
  consent_given: boolean;
  consent_at: string | null;
  sent_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  progress_pct: number;
  created_at: string;
};

/** Job position 16PF reference profile */
export type ReferenceProfile = {
  factores: Array<{
    factor: string;
    nivel: 'alto' | 'medio' | 'bajo';
    justificacion: string;
  }>;
  nota_metodologica: string;
};

/** Comparison result for a single factor */
export type FactorComparison = {
  factor: string;
  candidato_score: number;
  referencia_nivel: string;
  brecha: 'coincide' | 'leve' | 'significativa';
};

/** Full comparison result */
export type ComparisonResult = {
  factores: FactorComparison[];
  analisis_narrativo: string;
  puntos_alineacion: string[];
  areas_atencion: string[];
  recomendacion: string;
};

/** Parse result for paste string */
export type ParseResult =
  | { ok: true; answers: Answers }
  | { ok: false; error: string };
