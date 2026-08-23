export type ModelKey = "light" | "heavy";
export type Provider = "openai" | "anthropic";
/**
 * "token" shows the participant's own running token count (no $/CO2
 * framing); "environmental" shows CO2 impact (per-response comparison
 * under the model toggle, plus the running total in the sidebar);
 * "environmental_token" shows both together.
 */
export type InfoVariant = "none" | "token" | "environmental" | "environmental_token";
/** "flat" replaces the old "free" name -- same behavior (no budget, no per-message charge), renamed for the 2026-08 redesign. The old "fixed" (pick once upfront) pricing condition was dropped entirely. */
export type PricingVariant = "variable" | "flat";
/** Which task participants see -- global, toggled from /admin. See src/lib/overrides.ts: ActiveTask. */
export type ActiveTask = "cartoon" | "scheduling" | "staffScheduling" | "adCaption" | "tripPlanning";

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
  pricingCopy: CopyBlock | null;
  fixedCreditCents: number;
  /**
   * Total-token cap for THIS session, universal across both pricing
   * variants (see src/lib/pricing.ts getMaxTokensPerSession) -- "variable"
   * additionally caps by dollar credit (fixedCreditCents) on top of this;
   * "flat" has no dollar cost, so this token cap is its only limit.
   */
  maxTokensPerSession: number;
  socialProofPct: number | null;
  cumulative: CumulativeUsage;
  /**
   * True once this session has hit a cap and /api/chat will reject further
   * generations: cumulative.totalTokens >= maxTokensPerSession (either
   * variant), or -- "variable" only, additionally -- cumulative.spentCents
   * >= fixedCreditCents.
   */
  budgetExhausted: boolean;
  /** Typical (real, platform-wide average -- see src/lib/session.ts getAverageTokensPerModel) tokens and derived CO2 per response, for the "token"/"environmental" model-toggle captions. */
  avgResponseImpact: { heavy: { tokens: number; co2G: number }; light: { tokens: number; co2G: number } };
  /** Hotlinked image URL for this session's assigned cartoon (chosen once, deterministically, at session creation). */
  cartoonImageUrl: string;
  /** All caption ideas submitted so far for this cartoon, oldest first. Capped at maxCaptionSubmissions. */
  captionSubmissions: CaptionSubmission[];
  /** Most captions a single session may submit (see /api/submit-caption). */
  maxCaptionSubmissions: number;
  /** Static per-1,000-token heavy vs. light comparison, for the environmental / environmental_token nudge under the model toggle. */
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
  /** All trip itineraries submitted so far (tripPlanning task), oldest first. Capped at maxTripPlanSubmissions. */
  tripPlanSubmissions: CaptionSubmission[];
  /** Most trip itineraries a single session may submit (see /api/submit-trip-plan). */
  maxTripPlanSubmissions: number;
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
  /** Always 0 under "flat" pricing. */
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
