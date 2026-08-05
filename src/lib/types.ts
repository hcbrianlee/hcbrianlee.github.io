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
  pricingCopy: CopyBlock;
  fixedCreditCents: number;
  socialProofPct: number | null;
  cumulative: CumulativeUsage;
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
