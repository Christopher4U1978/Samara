/**
 * SAMARA — AMBIENT PRESENCE & SPEAKER DISCERNMENT
 * GATE AP-2: DETERMINISTIC CONTRACTS & RESPONSE POLICY ENGINE
 *
 * Pure TypeScript domain contracts establishing the epistemic boundaries between:
 *   1. Speaker Discernment (Who appears to be speaking?)
 *   2. System/Front Identity (DID-aware interaction identity — never inferred from acoustics)
 *   3. Addressee Discernment (Who appears to be addressed?)
 *   4. Transcription / Utterance Certainty (Is the structural transcript reliable?)
 *   5. Conversation Turn & Room Context (What is the current turn-taking and privacy state?)
 *   6. Response Discernment (What may SAMARA conclude and when may SAMARA respond?)
 *
 * IMPORTANT ARCHITECTURAL INVARIANTS:
 * - No fixed numeric biometric similarity thresholds are defined in this module.
 * - Acoustic speaker state MUST NEVER imply system/front identity.
 * - Speech detected MUST NEVER imply Christopher is speaking.
 * - Christopher speaking MUST NEVER imply SAMARA is addressed.
 * - Addressed to SAMARA MUST NEVER imply automatic authorization for private disclosure.
 */

// ============================================================================
// 1. CANONICAL SPEAKER STATE
// ============================================================================

export const CANONICAL_SPEAKER_STATES = [
  'KNOWN_ENROLLED_SPEAKER',
  'PROBABLE_ENROLLED_SPEAKER',
  'UNKNOWN_SPEAKER',
  'AMBIGUOUS_SPEAKER',
  'MULTIPLE_SPEAKERS',
  'INSUFFICIENT_AUDIO',
] as const;

export type CanonicalSpeakerState = (typeof CANONICAL_SPEAKER_STATES)[number];

/**
 * Neutral session-scoped speaker identifier (e.g., "speaker_01", "speaker_02", "speaker_03").
 * Used to track conversational turns without inventing personal identity.
 */
export type SessionSpeakerId = `speaker_${string}`;

export interface SpeakerEvidence {
  readonly state: CanonicalSpeakerState;
  /**
   * Neutral session identifier such as "speaker_01", "speaker_02".
   */
  readonly sessionSpeakerId?: SessionSpeakerId;
  /**
   * Identifier of an enrolled speaker profile when state is KNOWN_ENROLLED_SPEAKER
   * or PROBABLE_ENROLLED_SPEAKER.
   */
  readonly enrolledSpeakerId?: string;
  /**
   * Indicates whether the matched enrolled speaker profile corresponds to the
   * primary account owner (Christopher). Note: Policy only treats this as
   * verified when `state === 'KNOWN_ENROLLED_SPEAKER'`.
   */
  readonly isPrimaryUser?: boolean;
  /**
   * Candidate speaker identifiers (enrolled or neutral session IDs) when state
   * is AMBIGUOUS_SPEAKER or MULTIPLE_SPEAKERS.
   */
  readonly candidateSpeakerIds?: readonly string[];
}

// ============================================================================
// 2. SYSTEM FRONT IDENTITY (DID-AWARE, NON-ACOUSTIC)
// ============================================================================

export const SYSTEM_FRONT_IDENTITY_STATES = [
  'IDENTITY_UNKNOWN',
  'USER_DECLARED',
  'CONTEXTUAL_TENTATIVE',
] as const;

export type SystemFrontIdentityState = (typeof SYSTEM_FRONT_IDENTITY_STATES)[number];

/**
 * Acoustic, prosodic, biometric, or stylistic features from which system/front
 * identity MUST NEVER be inferred.
 */
export const FORBIDDEN_IDENTITY_INFERENCE_SOURCES = [
  'pitch',
  'cadence',
  'accent',
  'voice_embedding',
  'speaker_similarity',
  'prosody',
  'vocal_tension',
  'lexical_style',
  'acoustic_biometrics',
] as const;

export type ForbiddenIdentityInferenceSource =
  (typeof FORBIDDEN_IDENTITY_INFERENCE_SOURCES)[number];

/**
 * Valid, non-acoustic origins for DID-aware system/front interaction identity.
 */
export const ALLOWED_FRONT_IDENTITY_SOURCES = [
  'NONE',
  'EXPLICIT_SELF_DECLARATION',
  'EXPLICIT_UI_SELECTION',
  'EXPLICIT_SESSION_CONTINUITY',
] as const;

export type AllowedFrontIdentitySource = (typeof ALLOWED_FRONT_IDENTITY_SOURCES)[number];

export type FrontIdentityEvidenceSource =
  | AllowedFrontIdentitySource
  | ForbiddenIdentityInferenceSource;

export interface SystemFrontIdentityInput {
  readonly state: SystemFrontIdentityState;
  /**
   * Optional user-defined interaction profile identifier (only valid when
   * state is USER_DECLARED or non-acoustic CONTEXTUAL_TENTATIVE).
   */
  readonly frontIdentityId?: string;
  /**
   * Provenance of the identity state. Any forbidden acoustic/stylistic source
   * causes immediate fail-closed downgrade to IDENTITY_UNKNOWN.
   */
  readonly source?: FrontIdentityEvidenceSource;
}

export interface SystemFrontIdentityResolution {
  readonly state: SystemFrontIdentityState;
  readonly frontIdentityId?: string;
  readonly source: AllowedFrontIdentitySource;
  /**
   * Invariant: SAMARA must NEVER require or pressure the user to declare who is fronting.
   * This property is strictly false in all valid policy outputs.
   */
  readonly requiresUserDeclaration: false;
  readonly rejectedAcousticInference: boolean;
}

// ============================================================================
// 3. CANONICAL ADDRESSEE STATE
// ============================================================================

export const CANONICAL_ADDRESSEE_STATES = [
  'ADDRESSED_TO_SAMARA',
  'ADDRESSED_TO_CHRISTOPHER',
  'ADDRESSED_TO_THIRD_PARTY',
  'SELF_TALK_OR_THINKING_ALOUD',
  'NON_PARTICIPANT_MEDIA',
  'ADDRESSEE_AMBIGUOUS',
  'ADDRESSEE_UNKNOWN',
] as const;

export type CanonicalAddresseeState = (typeof CANONICAL_ADDRESSEE_STATES)[number];

export interface AddresseeEvidence {
  readonly state: CanonicalAddresseeState;
  /**
   * Indicates whether an explicit wake phrase or SAMARA's name was detected
   * by the upstream addressee detector.
   */
  readonly explicitWakeOrNameUsed?: boolean;
  /**
   * Optional target participant identifier when addressed to a known human.
   */
  readonly targetParticipantId?: string;
}

// ============================================================================
// 4. TRANSCRIPTION / UTTERANCE CERTAINTY
// ============================================================================

export const TRANSCRIPT_CERTAINTY_STATES = [
  'TRANSCRIPT_CONFIDENT',
  'TRANSCRIPT_UNCERTAIN',
  'TRANSCRIPT_UNAVAILABLE',
] as const;

export type TranscriptCertaintyState = (typeof TRANSCRIPT_CERTAINTY_STATES)[number];

// ============================================================================
// 5. CONVERSATION TURN & ROOM CONTEXT STATE
// ============================================================================

export const CONVERSATION_TURN_STATES = [
  'IDLE_AMBIENT',
  'ACTIVE_CONVERSATION_WITH_SAMARA',
  'AWAITING_CLARIFICATION_FROM_USER',
  'HUMAN_TO_HUMAN_CONVERSATION',
  'USER_SPEAKING_IN_PROGRESS',
  'SILENCE_OR_PAUSE',
  'SAMARA_MUTED_OR_SUSPENDED',
] as const;

export type ConversationTurnState = (typeof CONVERSATION_TURN_STATES)[number];

export const UTTERANCE_SIGNAL_CATEGORIES = [
  'NONE_OR_ORDINARY',
  'DIRECT_QUESTION_OR_REQUEST',
  'BRIEF_CHECK_IN_OR_ACK_TRIGGER',
  'GROUNDING_OR_ORIENTATION_REQUEST',
  'SENSITIVE_PRIVATE_DATA_REQUEST',
  'HIGH_CONFIDENCE_AUTHORIZED_ASSISTANCE',
  'STOP_OR_QUIET_COMMAND',
] as const;

export type UtteranceSignalCategory = (typeof UTTERANCE_SIGNAL_CATEGORIES)[number];

export interface RoomPrivacyContext {
  /**
   * Whether additional or unverified human participants are currently detected
   * or known to be present in the physical environment.
   */
  readonly unverifiedParticipantsPresent: boolean;
  /**
   * Total count of distinct session speakers recently active in the room.
   */
  readonly activeSessionSpeakerCount?: number;
}

export interface StandingPermissions {
  /**
   * Master switch for ambient presence evaluation. If false, SAMARA remains silent.
   */
  readonly allowAmbientListening: boolean;
  /**
   * Allows SAMARA to respond during an active conversation turn with SAMARA
   * without requiring her wake phrase on every consecutive utterance.
   */
  readonly allowActiveConversationContinuation: boolean;
  /**
   * Allows SAMARA to respond to a high-confidence contextual situation
   * explicitly covered by an authorized standing assistance policy.
   */
  readonly allowProactiveAuthorizedAssistance: boolean;
  /**
   * Allows SAMARA to provide grounding/orientation responses when requested.
   */
  readonly allowGroundingOrOrientationSupport: boolean;
  /**
   * Allows SAMARA to provide public-safe responses when directly addressed by
   * an unknown or third-party speaker.
   */
  readonly allowThirdPartyInteraction: boolean;
  /**
   * Explicit override allowing private/sensitive information disclosure when
   * unverified participants are present in the room. Defaults to false.
   */
  readonly allowPrivateDisclosureInMultiPersonContext: boolean;
}

// ============================================================================
// 6. CANONICAL RESPONSE DECISIONS & POLICY OUTPUT
// ============================================================================

export const CANONICAL_RESPONSE_DECISIONS = [
  'REMAIN_SILENT',
  'LISTEN_WITHOUT_INTERRUPTING',
  'ACKNOWLEDGE',
  'ASK_FOR_CLARIFICATION',
  'RESPOND',
  'PROVIDE_GROUNDING_OR_ORIENTATION',
] as const;

export type CanonicalResponseDecision = (typeof CANONICAL_RESPONSE_DECISIONS)[number];

export const PRIVACY_MODES = [
  'SILENT',
  'PUBLIC_SAFE_ONLY',
  'GROUNDING_VERIFIED_FACTS_ONLY',
  'PRIVATE_PRIMARY_USER',
] as const;

export type PrivacyMode = (typeof PRIVACY_MODES)[number];

export const POLICY_RATIONALE_CODES = [
  'AMBIENT_LISTENING_DISABLED',
  'SAMARA_MUTED_OR_SUSPENDED',
  'EXPLICIT_QUIET_OR_STOP_DIRECTIVE',
  'NON_PARTICIPANT_MEDIA_IGNORED',
  'INSUFFICIENT_AUDIO_SILENCE',
  'SILENCE_OR_PAUSE_NO_ACTION',
  'SPEAKER_TURN_IN_PROGRESS_WAIT',
  'ADDRESSED_TO_OTHER_HUMAN_SILENCE',
  'SELF_TALK_NOT_ADDRESSED_TO_SAMARA',
  'HUMAN_CONVERSATION_NON_INTERFERENCE',
  'ADDRESSEE_UNKNOWN_DEFAULT_SILENCE',
  'ADDRESSEE_AMBIGUOUS_NO_WAKE_SILENCE',
  'ADDRESSEE_AMBIGUOUS_WITH_WAKE_CLARIFY',
  'TRANSCRIPT_UNCERTAIN_OR_UNAVAILABLE_CLARIFY',
  'AMBIGUOUS_OR_MULTIPLE_SPEAKERS_CLARIFY',
  'UNVERIFIED_SPEAKER_SENSITIVE_REQUEST_CLARIFY',
  'THIRD_PARTY_INTERACTION_NOT_AUTHORIZED',
  'THIRD_PARTY_PUBLIC_SAFE_RESPONSE',
  'PROBABLE_SPEAKER_PUBLIC_SAFE_CONSTRAINT',
  'MULTI_PERSON_ROOM_PRIVACY_GUARD',
  'BRIEF_CHECK_IN_ACKNOWLEDGMENT',
  'DIRECT_ADDRESS_CONFIDENT_RESPONSE',
  'ACTIVE_CONVERSATION_CONTINUATION_RESPONSE',
  'AUTHORIZED_PROACTIVE_ASSISTANCE_RESPONSE',
  'PROACTIVE_ASSISTANCE_NOT_AUTHORIZED',
  'GROUNDING_REQUEST_VERIFIED_RESPONSE',
  'GROUNDING_NOT_AUTHORIZED_SILENCE',
  'ACOUSTIC_FRONT_IDENTITY_REJECTED',
] as const;

export type PolicyRationaleCode = (typeof POLICY_RATIONALE_CODES)[number];

export const FORBIDDEN_IMPLICATION_VIOLATIONS = [
  'FORBIDDEN_ACOUSTIC_FRONT_IDENTITY_INFERENCE',
  'INVALID_USER_DECLARED_FRONT_WITHOUT_ID',
  'INVALID_ENROLLED_SPEAKER_WITHOUT_ID',
  'INVALID_SESSION_SPEAKER_ID_FORMAT',
] as const;

export type ForbiddenImplicationViolation =
  (typeof FORBIDDEN_IMPLICATION_VIOLATIONS)[number];

export interface GroundingPolicyConstraints {
  /**
   * Grounding responses must only use verified facts; never invent memories.
   */
  readonly verifiedFactsOnly: true;
  /**
   * Grounding responses must never infer or diagnose DID alter identity from voice.
   */
  readonly allowAcousticAlterInference: false;
  /**
   * Grounding responses must never pressure the user to declare who is fronting.
   */
  readonly requireIdentityDeclaration: false;
  /**
   * Whether personal/private orientation ledger details may be spoken aloud
   * given current speaker verification and room privacy.
   */
  readonly privateOrientationDetailsPermitted: boolean;
}

export interface DiscernmentPolicyInput {
  readonly speaker: SpeakerEvidence;
  readonly addressee: AddresseeEvidence;
  readonly transcriptCertainty: TranscriptCertaintyState;
  readonly turnState: ConversationTurnState;
  readonly signalCategory?: UtteranceSignalCategory;
  readonly frontIdentity?: SystemFrontIdentityInput;
  readonly roomPrivacy?: RoomPrivacyContext;
  readonly permissions?: Partial<StandingPermissions>;
}

export interface DiscernmentPolicyEvaluation {
  /**
   * Primary deterministic response decision (Stage 8).
   */
  readonly decision: CanonicalResponseDecision;
  /**
   * True only when decision is ACKNOWLEDGE, ASK_FOR_CLARIFICATION, RESPOND,
   * or PROVIDE_GROUNDING_OR_ORIENTATION.
   */
  readonly shouldSpeak: boolean;
  /**
   * Preserve Stage 1: Speaker Discernment without collapsing uncertainty.
   */
  readonly speakerDiscernment: {
    readonly state: CanonicalSpeakerState;
    readonly sessionSpeakerId: SessionSpeakerId | null;
    readonly verifiedPrimaryUser: boolean;
    readonly enrolledSpeakerId: string | null;
  };
  /**
   * Preserve Stage 2: Addressee Discernment independently of speaker and response.
   */
  readonly addresseeDiscernment: {
    readonly state: CanonicalAddresseeState;
    readonly explicitWakeOrNameUsed: boolean;
  };
  /**
   * Preserve DID-aware System Front Identity resolution (strictly non-acoustic).
   */
  readonly frontIdentityResolution: SystemFrontIdentityResolution;
  /**
   * Privacy & disclosure boundary enforcement.
   */
  readonly privacyMode: PrivacyMode;
  readonly privateDisclosurePermitted: boolean;
  /**
   * Populated when decision === 'PROVIDE_GROUNDING_OR_ORIENTATION'.
   */
  readonly groundingConstraints: GroundingPolicyConstraints | null;
  /**
   * Ordered, deterministic rationale codes explaining every guard that fired.
   */
  readonly rationaleCodes: readonly PolicyRationaleCode[];
  /**
   * Any upstream contract/invariant violations that were caught and fail-closed.
   */
  readonly violatedInvariants: readonly ForbiddenImplicationViolation[];
}
