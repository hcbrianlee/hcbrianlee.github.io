export type ModelKey = "light" | "heavy";
export type Provider = "openai" | "anthropic";
export type InfoVariant = "environmental" | "energy_usage" | "convenience" | "none";
export type PricingVariant = "variable" | "fixed" | "free";

export interface CopyBlock {
  title: string;
  body: string;
}

export interface ConditionRow {
  id: number;
  code: string;
  info_variant: InfoVariant;
  pricing_variant: PricingVariant;
  default_model: ModelKey;
}

export interface SessionInfo {
  sessionId: string;
  condition: {
    code: string;
    infoVariant: InfoVariant;
    pricingVariant: PricingVariant;
    defaultModel: ModelKey;
  };
  infoCopy: CopyBlock | null;
  pricingCopy: CopyBlock | null;
  fixedCreditCents: number;
  socialProofPct: number | null;
  cumulative: CumulativeUsage;
  /** Only meaningful when condition.pricingVariant === "fixed". Null until a plan has been picked via /api/select-plan. */
  fixedPlan: { model: ModelKey; costCents: number } | null;
  /** Flat one-time prices for each model, for the "fixed" plan-picker screen. */
  fixedPlanOptions: { heavy: number; light: number };
  /** Hotlinked image URL for this session's assigned cartoon (chosen once, deterministically, at session creation). */
  cartoonImageUrl: string;
  /** The participant's submitted caption for this cartoon, if any. */
  finalCaption: string | null;
  /** ISO timestamp of when finalCaption was submitted, if any. */
  finalCaptionSubmittedAt: string | null;
  /** Static per-1,000-token heavy vs. light comparison, for the environmental/energy_usage nudge under the model toggle. */
  modelComparison: ModelComparison;
}

export interface ModelComparison {
  heavy: ImpactEstimate;
  light: ImpactEstimate;
  deltaEnergyWh: number;
  deltaCo2G: number;
  deltaWaterMl: number;
  /** Hypothetical group size used to scale these per-1,000-token figures into a more tangible aggregate for nudge copy. */
  scaleUsers: number;
}

export interface CumulativeUsage {
  promptCount: number;
  totalTokens: number;
  co2G: number;
  waterMl: number;
  /** Always 0 for the "free" pricing condition. */
  spentCents: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

export interface ImpactEstimate {
  energyWh: number;
  co2G: number;
  waterMl: number;
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// Newline-delimited JSON frames streamed back from POST /api/chat.
export type ChatStreamFrame =
  | { type: "delta"; text: string }
  | {
      type: "done";
      usage: UsageTotals;
      impact: ImpactEstimate;
      cumulative: CumulativeUsage;
    }
  | { type: "error"; message: string };
