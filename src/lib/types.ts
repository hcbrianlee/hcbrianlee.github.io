export type ModelKey = "light" | "heavy";
export type Provider = "openai" | "anthropic";
export type InfoVariant = "environmental" | "energy_usage" | "convenience" | "none";
export type PricingVariant = "variable" | "fixed" | "free";
/** Which task participants see -- global, toggled from /admin. See src/lib/overrides.ts: ActiveTask. */
export type ActiveTask = "cartoon" | "scheduling" | "staffScheduling" | "adCaption" | "negotiation";

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
  /** All caption ideas submitted so far for this cartoon, oldest first. Capped at maxCaptionSubmissions. */
  captionSubmissions: CaptionSubmission[];
  /** Most captions a single session may submit (see /api/submit-caption). */
  maxCaptionSubmissions: number;
  /** Static per-1,000-token heavy vs. light comparison, for the environmental/energy_usage nudge under the model toggle. */
  modelComparison: ModelComparison;
  /** Which task this session is doing -- global (not per-session), toggled from /admin. */
  activeTask: ActiveTask;
  /** ISO timestamp the session was created (page load) -- not the scheduling timer's reference point, see scheduleStartedAt. */
  sessionStartedAt: string;
  /**
   * ISO timestamp the participant clicked "Start" on the scheduling puzzle
   * (scheduling task only), or null if they haven't yet -- the timer doesn't
   * run until this is set. See /api/start-schedule.
   */
  scheduleStartedAt: string | null;
  /** True once a fully-correct schedule has been submitted for this session (scheduling task only). */
  scheduleSolved: boolean;
  /** Same as scheduleStartedAt but for the staffScheduling task. See /api/start-staff-schedule. */
  staffScheduleStartedAt: string | null;
  /**
   * True once a complete, internally-consistent submission (schedule +
   * relaxed constraint + rationale) has been made for the staffScheduling
   * task -- NOT a claim that the relaxed constraint or rationale were the
   * right choice. See src/lib/session.ts getStaffScheduleSolved.
   */
  staffScheduleSolved: boolean;
  /** Env-configured product image URL (adCaption task), or null if AD_PRODUCT_IMAGE_URL isn't set. */
  adProductImageUrl: string | null;
  /** All ad caption ideas submitted so far (adCaption task), oldest first. Capped at maxAdCaptionSubmissions. */
  adCaptionSubmissions: CaptionSubmission[];
  /** Most ad captions a single session may submit (see /api/submit-ad-caption). */
  maxAdCaptionSubmissions: number;
  /** All negotiation strategy memos submitted so far (negotiation task), oldest first. Capped at maxNegotiationSubmissions. */
  negotiationSubmissions: CaptionSubmission[];
  /** Most negotiation memos a single session may submit (see /api/submit-negotiation). */
  maxNegotiationSubmissions: number;
}

export interface CaptionSubmission {
  text: string;
  submittedAt: string;
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
