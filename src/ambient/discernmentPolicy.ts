/**
 * SAMARA — AMBIENT PRESENCE & SPEAKER DISCERNMENT
 * GATE AP-2: DETERMINISTIC CONTRACTS & RESPONSE POLICY ENGINE
 *
 * Pure, deterministic, zero-I/O Response Policy Engine operating strictly on
 * typed upstream evidence states.
 *
 * This module enforces SAMARA's core architectural invariants:
 *   1. Speaker Discernment !== Addressee Discernment !== Response Discernment
 *   2. Speech detected !== Christopher speaking
 *   3. Christopher speaking !== Addressed to SAMARA
 *   4. Addressed to SAMARA !== Authorized for private information disclosure
 *   5. High model confidence (PROBABLE_ENROLLED_SPEAKER) !== Factual certainty
 *   6. Acoustic speaker features !== DID System/Front Identity
 */

import {
  ALLOWED_FRONT_IDENTITY_SOURCES,
  CANONICAL_ADDRESSEE_STATES,
  CANONICAL_RESPONSE_DECISIONS,
  CANONICAL_SPEAKER_STATES,
  CONVERSATION_TURN_STATES,
  FORBIDDEN_IDENTITY_INFERENCE_SOURCES,
  FORBIDDEN_IMPLICATION_VIOLATIONS,
  POLICY_RATIONALE_CODES,
  PRIVACY_MODES,
  SYSTEM_FRONT_IDENTITY_STATES,
  TRANSCRIPT_CERTAINTY_STATES,
  UTTERANCE_SIGNAL_CATEGORIES,
  type AddresseeEvidence,
  type AllowedFrontIdentitySource,
  type CanonicalAddresseeState,
  type CanonicalResponseDecision,
  type CanonicalSpeakerState,
  type ConversationTurnState,
  type DiscernmentPolicyEvaluation,
  type DiscernmentPolicyInput,
  type ForbiddenIdentityInferenceSource,
  type ForbiddenImplicationViolation,
  type FrontIdentityEvidenceSource,
  type GroundingPolicyConstraints,
  type PolicyRationaleCode,
  type PrivacyMode,
  type RoomPrivacyContext,
  type SessionSpeakerId,
  type SpeakerEvidence,
  type StandingPermissions,
  type SystemFrontIdentityInput,
  type SystemFrontIdentityResolution,
  type SystemFrontIdentityState,
  type TranscriptCertaintyState,
  type UtteranceSignalCategory,
} from './types.ts';

export {
  ALLOWED_FRONT_IDENTITY_SOURCES,
  CANONICAL_ADDRESSEE_STATES,
  CANONICAL_RESPONSE_DECISIONS,
  CANONICAL_SPEAKER_STATES,
  CONVERSATION_TURN_STATES,
  FORBIDDEN_IDENTITY_INFERENCE_SOURCES,
  FORBIDDEN_IMPLICATION_VIOLATIONS,
  POLICY_RATIONALE_CODES,
  PRIVACY_MODES,
  SYSTEM_FRONT_IDENTITY_STATES,
  TRANSCRIPT_CERTAINTY_STATES,
  UTTERANCE_SIGNAL_CATEGORIES,
  type AddresseeEvidence,
  type AllowedFrontIdentitySource,
  type CanonicalAddresseeState,
  type CanonicalResponseDecision,
  type CanonicalSpeakerState,
  type ConversationTurnState,
  type DiscernmentPolicyEvaluation,
  type DiscernmentPolicyInput,
  type ForbiddenIdentityInferenceSource,
  type ForbiddenImplicationViolation,
  type FrontIdentityEvidenceSource,
  type GroundingPolicyConstraints,
  type PolicyRationaleCode,
  type PrivacyMode,
  type RoomPrivacyContext,
  type SessionSpeakerId,
  type SpeakerEvidence,
  type StandingPermissions,
  type SystemFrontIdentityInput,
  type SystemFrontIdentityResolution,
  type SystemFrontIdentityState,
  type TranscriptCertaintyState,
  type UtteranceSignalCategory,
};

/**
 * Conservative, privacy-preserving default standing permissions.
 * Default ambient posture: LISTEN -> UNDERSTAND -> REMAIN QUIET unless clear
 * conditions exist for intervention.
 */
export const DEFAULT_STANDING_PERMISSIONS: Readonly<StandingPermissions> = Object.freeze({
  allowAmbientListening: true,
  allowActiveConversationContinuation: true,
  allowProactiveAuthorizedAssistance: false,
  allowGroundingOrOrientationSupport: true,
  allowThirdPartyInteraction: false,
  allowPrivateDisclosureInMultiPersonContext: false,
});

const SESSION_SPEAKER_ID_PATTERN = /^speaker_\d{2,}$/;

/**
 * Validates whether a candidate string matches the canonical neutral session
 * speaker identifier format (e.g., "speaker_01", "speaker_02", "speaker_03").
 */
export function isValidSessionSpeakerId(
  candidate: string | undefined,
): candidate is SessionSpeakerId {
  if (typeof candidate !== 'string') {
    return false;
  }
  return SESSION_SPEAKER_ID_PATTERN.test(candidate);
}

/**
 * Determines whether a purported identity provenance source is a forbidden
 * acoustic, biometric, prosodic, or lexical inference source.
 */
export function isForbiddenIdentityInferenceSource(
  source: unknown,
): source is ForbiddenIdentityInferenceSource {
  if (typeof source !== 'string') {
    return false;
  }
  return (FORBIDDEN_IDENTITY_INFERENCE_SOURCES as readonly string[]).includes(source);
}

/**
 * Resolves and sanitizes DID-aware System Front Identity independently of any
 * acoustic speaker state.
 *
 * Invariants enforced:
 * - Acoustic/prosodic/lexical sources are unconditionally rejected and downgraded
 *   to `IDENTITY_UNKNOWN`.
 * - `CONTEXTUAL_TENTATIVE` is only allowed when `source === 'EXPLICIT_SESSION_CONTINUITY'`
 *   and a non-empty `frontIdentityId` is provided.
 * - `USER_DECLARED` requires a non-empty `frontIdentityId` and an explicit user declaration
 *   source (`EXPLICIT_SELF_DECLARATION` or `EXPLICIT_UI_SELECTION`).
 * - `requiresUserDeclaration` is always `false` (SAMARA never pressures the user to
 *   identify who is fronting).
 */
export function resolveSystemFrontIdentity(
  input?: SystemFrontIdentityInput,
): {
  readonly resolution: SystemFrontIdentityResolution;
  readonly violations: readonly ForbiddenImplicationViolation[];
} {
  if (!input) {
    return {
      resolution: {
        state: 'IDENTITY_UNKNOWN',
        source: 'NONE',
        requiresUserDeclaration: false,
        rejectedAcousticInference: false,
      },
      violations: [],
    };
  }

  if (isForbiddenIdentityInferenceSource(input.source)) {
    return {
      resolution: {
        state: 'IDENTITY_UNKNOWN',
        source: 'NONE',
        requiresUserDeclaration: false,
        rejectedAcousticInference: true,
      },
      violations: ['FORBIDDEN_ACOUSTIC_FRONT_IDENTITY_INFERENCE'],
    };
  }

  if (input.state === 'IDENTITY_UNKNOWN') {
    return {
      resolution: {
        state: 'IDENTITY_UNKNOWN',
        source: 'NONE',
        requiresUserDeclaration: false,
        rejectedAcousticInference: false,
      },
      violations: [],
    };
  }

  const trimmedId = input.frontIdentityId?.trim();

  if (input.state === 'USER_DECLARED') {
    if (!trimmedId) {
      return {
        resolution: {
          state: 'IDENTITY_UNKNOWN',
          source: 'NONE',
          requiresUserDeclaration: false,
          rejectedAcousticInference: false,
        },
        violations: ['INVALID_USER_DECLARED_FRONT_WITHOUT_ID'],
      };
    }

    const validUserSource: AllowedFrontIdentitySource =
      input.source === 'EXPLICIT_UI_SELECTION'
        ? 'EXPLICIT_UI_SELECTION'
        : 'EXPLICIT_SELF_DECLARATION';

    return {
      resolution: {
        state: 'USER_DECLARED',
        frontIdentityId: trimmedId,
        source: validUserSource,
        requiresUserDeclaration: false,
        rejectedAcousticInference: false,
      },
      violations: [],
    };
  }

  if (input.state === 'CONTEXTUAL_TENTATIVE') {
    if (input.source !== 'EXPLICIT_SESSION_CONTINUITY' || !trimmedId) {
      return {
        resolution: {
          state: 'IDENTITY_UNKNOWN',
          source: 'NONE',
          requiresUserDeclaration: false,
          rejectedAcousticInference: true,
        },
        violations: ['FORBIDDEN_ACOUSTIC_FRONT_IDENTITY_INFERENCE'],
      };
    }

    return {
      resolution: {
        state: 'CONTEXTUAL_TENTATIVE',
        frontIdentityId: trimmedId,
        source: 'EXPLICIT_SESSION_CONTINUITY',
        requiresUserDeclaration: false,
        rejectedAcousticInference: false,
      },
      violations: [],
    };
  }

  return {
    resolution: {
      state: 'IDENTITY_UNKNOWN',
      source: 'NONE',
      requiresUserDeclaration: false,
      rejectedAcousticInference: false,
    },
    violations: [],
  };
}

/**
 * Resolves and validates upstream Speaker Evidence without collapsing probabilistic
 * states into certainty.
 *
 * Invariants enforced:
 * - `PROBABLE_ENROLLED_SPEAKER` is NEVER promoted to `verifiedPrimaryUser: true`.
 * - `KNOWN_ENROLLED_SPEAKER` or `PROBABLE_ENROLLED_SPEAKER` without a non-empty
 *   `enrolledSpeakerId` fails closed to `UNKNOWN_SPEAKER`.
 * - Invalid `sessionSpeakerId` strings are rejected and recorded as violations.
 */
export function resolveSpeakerDiscernment(speaker: SpeakerEvidence): {
  readonly speakerDiscernment: DiscernmentPolicyEvaluation['speakerDiscernment'];
  readonly violations: readonly ForbiddenImplicationViolation[];
} {
  const violations: ForbiddenImplicationViolation[] = [];

  let sessionSpeakerId: SessionSpeakerId | null = null;
  if (speaker.sessionSpeakerId !== undefined) {
    if (isValidSessionSpeakerId(speaker.sessionSpeakerId)) {
      sessionSpeakerId = speaker.sessionSpeakerId;
    } else {
      violations.push('INVALID_SESSION_SPEAKER_ID_FORMAT');
    }
  }

  const trimmedEnrolledId = speaker.enrolledSpeakerId?.trim() || null;
  let effectiveState: CanonicalSpeakerState = speaker.state;

  if (
    (speaker.state === 'KNOWN_ENROLLED_SPEAKER' ||
      speaker.state === 'PROBABLE_ENROLLED_SPEAKER') &&
    !trimmedEnrolledId
  ) {
    effectiveState = 'UNKNOWN_SPEAKER';
    violations.push('INVALID_ENROLLED_SPEAKER_WITHOUT_ID');
  }

  const verifiedPrimaryUser =
    effectiveState === 'KNOWN_ENROLLED_SPEAKER' &&
    Boolean(trimmedEnrolledId) &&
    speaker.isPrimaryUser === true;

  return {
    speakerDiscernment: {
      state: effectiveState,
      sessionSpeakerId,
      verifiedPrimaryUser,
      enrolledSpeakerId:
        effectiveState === 'KNOWN_ENROLLED_SPEAKER' ||
        effectiveState === 'PROBABLE_ENROLLED_SPEAKER'
          ? trimmedEnrolledId
          : null,
    },
    violations,
  };
}

/**
 * Helper to determine whether the current room context has multi-person or
 * unverified participant exposure.
 */
function hasMultiPersonPrivacyRisk(
  speakerState: CanonicalSpeakerState,
  roomPrivacy?: RoomPrivacyContext,
): boolean {
  if (speakerState === 'MULTIPLE_SPEAKERS' || speakerState === 'AMBIGUOUS_SPEAKER') {
    return true;
  }
  if (roomPrivacy?.unverifiedParticipantsPresent === true) {
    return true;
  }
  if (
    typeof roomPrivacy?.activeSessionSpeakerCount === 'number' &&
    roomPrivacy.activeSessionSpeakerCount > 1
  ) {
    return true;
  }
  return false;
}

/**
 * Evaluates all upstream evidence states and returns a deterministic, inspectable
 * response policy decision.
 */
export function evaluateDiscernmentPolicy(
  input: DiscernmentPolicyInput,
): DiscernmentPolicyEvaluation {
  const permissions: StandingPermissions = {
    ...DEFAULT_STANDING_PERMISSIONS,
    ...input.permissions,
  };
  const signalCategory: UtteranceSignalCategory =
    input.signalCategory ?? 'NONE_OR_ORDINARY';

  const { resolution: frontIdentityResolution, violations: frontViolations } =
    resolveSystemFrontIdentity(input.frontIdentity);
  const { speakerDiscernment, violations: speakerViolations } =
    resolveSpeakerDiscernment(input.speaker);

  const violatedInvariants: ForbiddenImplicationViolation[] = [
    ...frontViolations,
    ...speakerViolations,
  ];

  const rationaleCodes: PolicyRationaleCode[] = [];
  if (frontIdentityResolution.rejectedAcousticInference) {
    rationaleCodes.push('ACOUSTIC_FRONT_IDENTITY_REJECTED');
  }

  const addresseeDiscernment = {
    state: input.addressee.state,
    explicitWakeOrNameUsed: Boolean(input.addressee.explicitWakeOrNameUsed),
  };

  const multiPersonRisk = hasMultiPersonPrivacyRisk(
    speakerDiscernment.state,
    input.roomPrivacy,
  );

  const privateDisclosureEligible =
    speakerDiscernment.verifiedPrimaryUser &&
    (!multiPersonRisk || permissions.allowPrivateDisclosureInMultiPersonContext);

  const buildResult = (
    decision: CanonicalResponseDecision,
    privacyMode: PrivacyMode,
    privateDisclosurePermitted: boolean,
    groundingConstraints: GroundingPolicyConstraints | null = null,
  ): DiscernmentPolicyEvaluation => {
    const shouldSpeak =
      decision === 'ACKNOWLEDGE' ||
      decision === 'ASK_FOR_CLARIFICATION' ||
      decision === 'RESPOND' ||
      decision === 'PROVIDE_GROUNDING_OR_ORIENTATION';

    return {
      decision,
      shouldSpeak,
      speakerDiscernment,
      addresseeDiscernment,
      frontIdentityResolution,
      privacyMode,
      privateDisclosurePermitted,
      groundingConstraints,
      rationaleCodes,
      violatedInvariants,
    };
  };

  // --------------------------------------------------------------------------
  // GATE 1: Master Ambient Listening & Mute / Suspension Checks
  // --------------------------------------------------------------------------
  if (!permissions.allowAmbientListening) {
    rationaleCodes.push('AMBIENT_LISTENING_DISABLED');
    return buildResult('REMAIN_SILENT', 'SILENT', false);
  }

  if (input.turnState === 'SAMARA_MUTED_OR_SUSPENDED') {
    rationaleCodes.push('SAMARA_MUTED_OR_SUSPENDED');
    return buildResult('REMAIN_SILENT', 'SILENT', false);
  }

  // --------------------------------------------------------------------------
  // GATE 2: Non-Participant Media (TV, Radio, Podcasts, Background Video)
  // --------------------------------------------------------------------------
  if (addresseeDiscernment.state === 'NON_PARTICIPANT_MEDIA') {
    rationaleCodes.push('NON_PARTICIPANT_MEDIA_IGNORED');
    return buildResult('REMAIN_SILENT', 'SILENT', false);
  }

  // --------------------------------------------------------------------------
  // GATE 3: Explicit Stop / Quiet Command
  // --------------------------------------------------------------------------
  if (
    signalCategory === 'STOP_OR_QUIET_COMMAND' &&
    (addresseeDiscernment.state === 'ADDRESSED_TO_SAMARA' ||
      addresseeDiscernment.explicitWakeOrNameUsed ||
      input.turnState === 'ACTIVE_CONVERSATION_WITH_SAMARA')
  ) {
    rationaleCodes.push('EXPLICIT_QUIET_OR_STOP_DIRECTIVE');
    return buildResult('REMAIN_SILENT', 'SILENT', false);
  }

  // --------------------------------------------------------------------------
  // GATE 4: Silence / Pause with Insufficient Audio
  // --------------------------------------------------------------------------
  if (
    input.turnState === 'SILENCE_OR_PAUSE' &&
    speakerDiscernment.state === 'INSUFFICIENT_AUDIO'
  ) {
    rationaleCodes.push('SILENCE_OR_PAUSE_NO_ACTION', 'INSUFFICIENT_AUDIO_SILENCE');
    return buildResult('REMAIN_SILENT', 'SILENT', false);
  }

  // --------------------------------------------------------------------------
  // GATE 5: Addressed to Other Humans or Self-Talk (Never Interrupt)
  // Enforces: Christopher speaking !== addressed to SAMARA
  // --------------------------------------------------------------------------
  if (
    addresseeDiscernment.state === 'ADDRESSED_TO_CHRISTOPHER' ||
    addresseeDiscernment.state === 'ADDRESSED_TO_THIRD_PARTY'
  ) {
    rationaleCodes.push('ADDRESSED_TO_OTHER_HUMAN_SILENCE');
    return buildResult('REMAIN_SILENT', 'SILENT', false);
  }

  if (addresseeDiscernment.state === 'SELF_TALK_OR_THINKING_ALOUD') {
    rationaleCodes.push('SELF_TALK_NOT_ADDRESSED_TO_SAMARA');
    return buildResult('REMAIN_SILENT', 'SILENT', false);
  }

  // --------------------------------------------------------------------------
  // GATE 6: User Speaking In Progress -> Listen Without Interrupting
  // --------------------------------------------------------------------------
  if (input.turnState === 'USER_SPEAKING_IN_PROGRESS') {
    rationaleCodes.push('SPEAKER_TURN_IN_PROGRESS_WAIT');
    return buildResult('LISTEN_WITHOUT_INTERRUPTING', 'SILENT', false);
  }

  // --------------------------------------------------------------------------
  // GATE 7: Non-Addressed Proactive Assistance vs Human-to-Human / Unknown Addressee
  // --------------------------------------------------------------------------
  if (addresseeDiscernment.state !== 'ADDRESSED_TO_SAMARA') {
    // High-confidence contextual assistance when not directly addressed
    if (signalCategory === 'HIGH_CONFIDENCE_AUTHORIZED_ASSISTANCE') {
      if (
        permissions.allowProactiveAuthorizedAssistance &&
        speakerDiscernment.state !== 'INSUFFICIENT_AUDIO' &&
        input.transcriptCertainty === 'TRANSCRIPT_CONFIDENT'
      ) {
        rationaleCodes.push('AUTHORIZED_PROACTIVE_ASSISTANCE_RESPONSE');
        if (multiPersonRisk && !permissions.allowPrivateDisclosureInMultiPersonContext) {
          rationaleCodes.push('MULTI_PERSON_ROOM_PRIVACY_GUARD');
        }
        return buildResult(
          'RESPOND',
          privateDisclosureEligible ? 'PRIVATE_PRIMARY_USER' : 'PUBLIC_SAFE_ONLY',
          privateDisclosureEligible,
        );
      }
      rationaleCodes.push('PROACTIVE_ASSISTANCE_NOT_AUTHORIZED');
      return buildResult('REMAIN_SILENT', 'SILENT', false);
    }

    if (input.turnState === 'HUMAN_TO_HUMAN_CONVERSATION') {
      if (addresseeDiscernment.explicitWakeOrNameUsed) {
        rationaleCodes.push('ADDRESSEE_AMBIGUOUS_WITH_WAKE_CLARIFY');
        return buildResult('ASK_FOR_CLARIFICATION', 'PUBLIC_SAFE_ONLY', false);
      }
      rationaleCodes.push('HUMAN_CONVERSATION_NON_INTERFERENCE');
      return buildResult('REMAIN_SILENT', 'SILENT', false);
    }

    if (addresseeDiscernment.state === 'ADDRESSEE_UNKNOWN') {
      if (addresseeDiscernment.explicitWakeOrNameUsed) {
        rationaleCodes.push('ADDRESSEE_AMBIGUOUS_WITH_WAKE_CLARIFY');
        return buildResult('ASK_FOR_CLARIFICATION', 'PUBLIC_SAFE_ONLY', false);
      }
      rationaleCodes.push('ADDRESSEE_UNKNOWN_DEFAULT_SILENCE');
      return buildResult('REMAIN_SILENT', 'SILENT', false);
    }

    if (addresseeDiscernment.state === 'ADDRESSEE_AMBIGUOUS') {
      if (
        addresseeDiscernment.explicitWakeOrNameUsed ||
        input.turnState === 'AWAITING_CLARIFICATION_FROM_USER'
      ) {
        rationaleCodes.push('ADDRESSEE_AMBIGUOUS_WITH_WAKE_CLARIFY');
        return buildResult('ASK_FOR_CLARIFICATION', 'PUBLIC_SAFE_ONLY', false);
      }
      rationaleCodes.push('ADDRESSEE_AMBIGUOUS_NO_WAKE_SILENCE');
      return buildResult('REMAIN_SILENT', 'SILENT', false);
    }
  }

  // --------------------------------------------------------------------------
  // GATE 8: Addressed to SAMARA — Check Active Conversation Continuation Rule
  // --------------------------------------------------------------------------
  if (
    input.turnState === 'ACTIVE_CONVERSATION_WITH_SAMARA' &&
    !addresseeDiscernment.explicitWakeOrNameUsed &&
    !permissions.allowActiveConversationContinuation
  ) {
    rationaleCodes.push('ADDRESSEE_AMBIGUOUS_NO_WAKE_SILENCE');
    return buildResult('REMAIN_SILENT', 'SILENT', false);
  }

  // --------------------------------------------------------------------------
  // GATE 9: Grounding / Orientation Request Handling
  // --------------------------------------------------------------------------
  if (signalCategory === 'GROUNDING_OR_ORIENTATION_REQUEST') {
    if (!permissions.allowGroundingOrOrientationSupport) {
      rationaleCodes.push('GROUNDING_NOT_AUTHORIZED_SILENCE');
      return buildResult('REMAIN_SILENT', 'SILENT', false);
    }

    if (
      speakerDiscernment.state === 'INSUFFICIENT_AUDIO' ||
      input.transcriptCertainty !== 'TRANSCRIPT_CONFIDENT'
    ) {
      rationaleCodes.push('TRANSCRIPT_UNCERTAIN_OR_UNAVAILABLE_CLARIFY');
      return buildResult('ASK_FOR_CLARIFICATION', 'PUBLIC_SAFE_ONLY', false);
    }

    if (multiPersonRisk && !permissions.allowPrivateDisclosureInMultiPersonContext) {
      rationaleCodes.push('MULTI_PERSON_ROOM_PRIVACY_GUARD');
    }
    if (speakerDiscernment.state === 'PROBABLE_ENROLLED_SPEAKER') {
      rationaleCodes.push('PROBABLE_SPEAKER_PUBLIC_SAFE_CONSTRAINT');
    }

    rationaleCodes.push('GROUNDING_REQUEST_VERIFIED_RESPONSE');
    const groundingConstraints: GroundingPolicyConstraints = {
      verifiedFactsOnly: true,
      allowAcousticAlterInference: false,
      requireIdentityDeclaration: false,
      privateOrientationDetailsPermitted: privateDisclosureEligible,
    };

    return buildResult(
      'PROVIDE_GROUNDING_OR_ORIENTATION',
      privateDisclosureEligible
        ? 'PRIVATE_PRIMARY_USER'
        : 'GROUNDING_VERIFIED_FACTS_ONLY',
      privateDisclosureEligible,
      groundingConstraints,
    );
  }

  // --------------------------------------------------------------------------
  // GATE 10: Third-Party / Unknown Speaker Interaction Permission Check
  // Enforces: speech detected !== Christopher
  // --------------------------------------------------------------------------
  const isUnverifiedOrThirdPartySpeaker =
    speakerDiscernment.state === 'UNKNOWN_SPEAKER' ||
    (speakerDiscernment.state === 'KNOWN_ENROLLED_SPEAKER' &&
      !speakerDiscernment.verifiedPrimaryUser) ||
    (speakerDiscernment.state === 'PROBABLE_ENROLLED_SPEAKER' &&
      input.speaker.isPrimaryUser === false);

  if (isUnverifiedOrThirdPartySpeaker && !permissions.allowThirdPartyInteraction) {
    rationaleCodes.push('THIRD_PARTY_INTERACTION_NOT_AUTHORIZED');
    return buildResult('REMAIN_SILENT', 'SILENT', false);
  }

  // --------------------------------------------------------------------------
  // GATE 11: Audio Sufficiency & Transcript Certainty When Addressed to SAMARA
  // --------------------------------------------------------------------------
  if (speakerDiscernment.state === 'INSUFFICIENT_AUDIO') {
    if (
      addresseeDiscernment.explicitWakeOrNameUsed ||
      input.turnState === 'ACTIVE_CONVERSATION_WITH_SAMARA' ||
      input.turnState === 'AWAITING_CLARIFICATION_FROM_USER'
    ) {
      rationaleCodes.push(
        'INSUFFICIENT_AUDIO_SILENCE',
        'TRANSCRIPT_UNCERTAIN_OR_UNAVAILABLE_CLARIFY',
      );
      return buildResult('ASK_FOR_CLARIFICATION', 'PUBLIC_SAFE_ONLY', false);
    }
    rationaleCodes.push('INSUFFICIENT_AUDIO_SILENCE');
    return buildResult('REMAIN_SILENT', 'SILENT', false);
  }

  if (
    input.transcriptCertainty === 'TRANSCRIPT_UNCERTAIN' ||
    input.transcriptCertainty === 'TRANSCRIPT_UNAVAILABLE'
  ) {
    rationaleCodes.push('TRANSCRIPT_UNCERTAIN_OR_UNAVAILABLE_CLARIFY');
    return buildResult('ASK_FOR_CLARIFICATION', 'PUBLIC_SAFE_ONLY', false);
  }

  // --------------------------------------------------------------------------
  // GATE 12: Ambiguous or Multiple Speakers Addressing SAMARA
  // --------------------------------------------------------------------------
  if (
    speakerDiscernment.state === 'AMBIGUOUS_SPEAKER' ||
    speakerDiscernment.state === 'MULTIPLE_SPEAKERS'
  ) {
    rationaleCodes.push('AMBIGUOUS_OR_MULTIPLE_SPEAKERS_CLARIFY');
    return buildResult('ASK_FOR_CLARIFICATION', 'PUBLIC_SAFE_ONLY', false);
  }

  // --------------------------------------------------------------------------
  // GATE 13: Sensitive / Private Information Request Gating
  // Enforces:
  // - Addressed to SAMARA !== authorized for private disclosure
  // - High model confidence (PROBABLE_ENROLLED_SPEAKER) !== factual certainty
  // --------------------------------------------------------------------------
  if (signalCategory === 'SENSITIVE_PRIVATE_DATA_REQUEST') {
    if (!speakerDiscernment.verifiedPrimaryUser) {
      if (speakerDiscernment.state === 'PROBABLE_ENROLLED_SPEAKER') {
        rationaleCodes.push('PROBABLE_SPEAKER_PUBLIC_SAFE_CONSTRAINT');
      }
      rationaleCodes.push('UNVERIFIED_SPEAKER_SENSITIVE_REQUEST_CLARIFY');
      return buildResult('ASK_FOR_CLARIFICATION', 'PUBLIC_SAFE_ONLY', false);
    }

    if (multiPersonRisk && !permissions.allowPrivateDisclosureInMultiPersonContext) {
      rationaleCodes.push('MULTI_PERSON_ROOM_PRIVACY_GUARD');
      return buildResult('ASK_FOR_CLARIFICATION', 'PUBLIC_SAFE_ONLY', false);
    }
  }

  if (
    signalCategory === 'HIGH_CONFIDENCE_AUTHORIZED_ASSISTANCE' &&
    !permissions.allowProactiveAuthorizedAssistance &&
    !addresseeDiscernment.explicitWakeOrNameUsed &&
    input.turnState !== 'ACTIVE_CONVERSATION_WITH_SAMARA'
  ) {
    rationaleCodes.push('PROACTIVE_ASSISTANCE_NOT_AUTHORIZED');
    return buildResult('REMAIN_SILENT', 'SILENT', false);
  }

  // --------------------------------------------------------------------------
  // GATE 14: Brief Check-In / Acknowledgment Trigger
  // --------------------------------------------------------------------------
  if (signalCategory === 'BRIEF_CHECK_IN_OR_ACK_TRIGGER') {
    if (speakerDiscernment.state === 'PROBABLE_ENROLLED_SPEAKER') {
      rationaleCodes.push('PROBABLE_SPEAKER_PUBLIC_SAFE_CONSTRAINT');
    }
    if (multiPersonRisk && !permissions.allowPrivateDisclosureInMultiPersonContext) {
      rationaleCodes.push('MULTI_PERSON_ROOM_PRIVACY_GUARD');
    }
    rationaleCodes.push('BRIEF_CHECK_IN_ACKNOWLEDGMENT');
    return buildResult(
      'ACKNOWLEDGE',
      privateDisclosureEligible ? 'PRIVATE_PRIMARY_USER' : 'PUBLIC_SAFE_ONLY',
      privateDisclosureEligible,
    );
  }

  // --------------------------------------------------------------------------
  // GATE 15: Standard Confident Response (Direct Address or Active Continuation)
  // --------------------------------------------------------------------------
  if (speakerDiscernment.state === 'PROBABLE_ENROLLED_SPEAKER') {
    rationaleCodes.push('PROBABLE_SPEAKER_PUBLIC_SAFE_CONSTRAINT');
  }
  if (multiPersonRisk && !permissions.allowPrivateDisclosureInMultiPersonContext) {
    rationaleCodes.push('MULTI_PERSON_ROOM_PRIVACY_GUARD');
  }

  if (isUnverifiedOrThirdPartySpeaker) {
    rationaleCodes.push('THIRD_PARTY_PUBLIC_SAFE_RESPONSE');
    return buildResult('RESPOND', 'PUBLIC_SAFE_ONLY', false);
  }

  if (
    input.turnState === 'ACTIVE_CONVERSATION_WITH_SAMARA' &&
    !addresseeDiscernment.explicitWakeOrNameUsed
  ) {
    rationaleCodes.push('ACTIVE_CONVERSATION_CONTINUATION_RESPONSE');
  } else {
    rationaleCodes.push('DIRECT_ADDRESS_CONFIDENT_RESPONSE');
  }

  return buildResult(
    'RESPOND',
    privateDisclosureEligible ? 'PRIVATE_PRIMARY_USER' : 'PUBLIC_SAFE_ONLY',
    privateDisclosureEligible,
  );
}
