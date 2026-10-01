import { describe, expect, it } from 'vitest';
import {
  CANONICAL_ADDRESSEE_STATES,
  CANONICAL_RESPONSE_DECISIONS,
  CANONICAL_SPEAKER_STATES,
  CONVERSATION_TURN_STATES,
  DEFAULT_STANDING_PERMISSIONS,
  FORBIDDEN_IDENTITY_INFERENCE_SOURCES,
  SYSTEM_FRONT_IDENTITY_STATES,
  TRANSCRIPT_CERTAINTY_STATES,
  evaluateDiscernmentPolicy,
  isForbiddenIdentityInferenceSource,
  isValidSessionSpeakerId,
  resolveSpeakerDiscernment,
  resolveSystemFrontIdentity,
  type DiscernmentPolicyInput,
  type ForbiddenIdentityInferenceSource,
} from './discernmentPolicy.ts';

describe('GATE AP-2: SAMARA Deterministic Contracts & Response Policy Engine', () => {
  // ==========================================================================
  // 1. CANONICAL ENUMERATIONS & STRUCTURAL CONTRACTS
  // ==========================================================================
  describe('1. Canonical State Enumerations & Neutral Session Speaker IDs', () => {
    it('defines all six required canonical speaker states', () => {
      expect(CANONICAL_SPEAKER_STATES).toEqual([
        'KNOWN_ENROLLED_SPEAKER',
        'PROBABLE_ENROLLED_SPEAKER',
        'UNKNOWN_SPEAKER',
        'AMBIGUOUS_SPEAKER',
        'MULTIPLE_SPEAKERS',
        'INSUFFICIENT_AUDIO',
      ]);
    });

    it('defines DID-aware system front identity states with IDENTITY_UNKNOWN and USER_DECLARED', () => {
      expect(SYSTEM_FRONT_IDENTITY_STATES).toContain('IDENTITY_UNKNOWN');
      expect(SYSTEM_FRONT_IDENTITY_STATES).toContain('USER_DECLARED');
      expect(SYSTEM_FRONT_IDENTITY_STATES).toContain('CONTEXTUAL_TENTATIVE');
    });

    it('defines all seven canonical addressee states', () => {
      expect(CANONICAL_ADDRESSEE_STATES).toEqual([
        'ADDRESSED_TO_SAMARA',
        'ADDRESSED_TO_CHRISTOPHER',
        'ADDRESSED_TO_THIRD_PARTY',
        'SELF_TALK_OR_THINKING_ALOUD',
        'NON_PARTICIPANT_MEDIA',
        'ADDRESSEE_AMBIGUOUS',
        'ADDRESSEE_UNKNOWN',
      ]);
    });

    it('defines all three transcript certainty states', () => {
      expect(TRANSCRIPT_CERTAINTY_STATES).toEqual([
        'TRANSCRIPT_CONFIDENT',
        'TRANSCRIPT_UNCERTAIN',
        'TRANSCRIPT_UNAVAILABLE',
      ]);
    });

    it('defines all six canonical response decisions', () => {
      expect(CANONICAL_RESPONSE_DECISIONS).toEqual([
        'REMAIN_SILENT',
        'LISTEN_WITHOUT_INTERRUPTING',
        'ACKNOWLEDGE',
        'ASK_FOR_CLARIFICATION',
        'RESPOND',
        'PROVIDE_GROUNDING_OR_ORIENTATION',
      ]);
    });

    it('defines conversation turn context states', () => {
      expect(CONVERSATION_TURN_STATES).toContain('IDLE_AMBIENT');
      expect(CONVERSATION_TURN_STATES).toContain('ACTIVE_CONVERSATION_WITH_SAMARA');
      expect(CONVERSATION_TURN_STATES).toContain('AWAITING_CLARIFICATION_FROM_USER');
      expect(CONVERSATION_TURN_STATES).toContain('HUMAN_TO_HUMAN_CONVERSATION');
      expect(CONVERSATION_TURN_STATES).toContain('USER_SPEAKING_IN_PROGRESS');
      expect(CONVERSATION_TURN_STATES).toContain('SILENCE_OR_PAUSE');
      expect(CONVERSATION_TURN_STATES).toContain('SAMARA_MUTED_OR_SUSPENDED');
    });

    it('supports neutral session speaker identifiers (speaker_01, speaker_02, speaker_03) and rejects invalid formats', () => {
      expect(isValidSessionSpeakerId('speaker_01')).toBe(true);
      expect(isValidSessionSpeakerId('speaker_02')).toBe(true);
      expect(isValidSessionSpeakerId('speaker_03')).toBe(true);
      expect(isValidSessionSpeakerId('speaker_12')).toBe(true);

      expect(isValidSessionSpeakerId('speaker_1')).toBe(false);
      expect(isValidSessionSpeakerId('christopher')).toBe(false);
      expect(isValidSessionSpeakerId('')).toBe(false);
      expect(isValidSessionSpeakerId(undefined)).toBe(false);

      const invalidSessionEval = resolveSpeakerDiscernment({
        state: 'UNKNOWN_SPEAKER',
        sessionSpeakerId: 'speaker_invalid' as `speaker_${string}`,
      });
      expect(invalidSessionEval.speakerDiscernment.sessionSpeakerId).toBeNull();
      expect(invalidSessionEval.violations).toContain('INVALID_SESSION_SPEAKER_ID_FORMAT');
    });

    it('fails closed to UNKNOWN_SPEAKER if KNOWN_ENROLLED_SPEAKER lacks an enrolledSpeakerId', () => {
      const result = resolveSpeakerDiscernment({
        state: 'KNOWN_ENROLLED_SPEAKER',
        sessionSpeakerId: 'speaker_01',
        isPrimaryUser: true,
      });
      expect(result.speakerDiscernment.state).toBe('UNKNOWN_SPEAKER');
      expect(result.speakerDiscernment.verifiedPrimaryUser).toBe(false);
      expect(result.violations).toContain('INVALID_ENROLLED_SPEAKER_WITHOUT_ID');
    });
  });

  // ==========================================================================
  // 2. DID-AWARE SYSTEM FRONT IDENTITY FIREWALL
  // ==========================================================================
  describe('2. DID-Aware System Front Identity Firewall (Acoustic Invariance)', () => {
    it('defaults to IDENTITY_UNKNOWN with requiresUserDeclaration strictly false', () => {
      const { resolution, violations } = resolveSystemFrontIdentity(undefined);
      expect(resolution).toEqual({
        state: 'IDENTITY_UNKNOWN',
        source: 'NONE',
        requiresUserDeclaration: false,
        rejectedAcousticInference: false,
      });
      expect(violations).toEqual([]);
    });

    it('accepts explicit USER_DECLARED front identity from self-declaration or UI selection', () => {
      const selfDeclared = resolveSystemFrontIdentity({
        state: 'USER_DECLARED',
        frontIdentityId: 'member_alpha',
        source: 'EXPLICIT_SELF_DECLARATION',
      });
      expect(selfDeclared.resolution).toEqual({
        state: 'USER_DECLARED',
        frontIdentityId: 'member_alpha',
        source: 'EXPLICIT_SELF_DECLARATION',
        requiresUserDeclaration: false,
        rejectedAcousticInference: false,
      });
      expect(selfDeclared.violations).toEqual([]);

      const uiSelected = resolveSystemFrontIdentity({
        state: 'USER_DECLARED',
        frontIdentityId: 'member_beta',
        source: 'EXPLICIT_UI_SELECTION',
      });
      expect(uiSelected.resolution.state).toBe('USER_DECLARED');
      expect(uiSelected.resolution.source).toBe('EXPLICIT_UI_SELECTION');
      expect(uiSelected.resolution.requiresUserDeclaration).toBe(false);
    });

    it.each(FORBIDDEN_IDENTITY_INFERENCE_SOURCES)(
      'unconditionally rejects forbidden acoustic/stylistic inference source "%s" and downgrades to IDENTITY_UNKNOWN',
      (forbiddenSource: ForbiddenIdentityInferenceSource) => {
        expect(isForbiddenIdentityInferenceSource(forbiddenSource)).toBe(true);

        const attemptDeclared = resolveSystemFrontIdentity({
          state: 'USER_DECLARED',
          frontIdentityId: 'inferred_alter',
          source: forbiddenSource,
        });
        expect(attemptDeclared.resolution).toEqual({
          state: 'IDENTITY_UNKNOWN',
          source: 'NONE',
          requiresUserDeclaration: false,
          rejectedAcousticInference: true,
        });
        expect(attemptDeclared.violations).toContain(
          'FORBIDDEN_ACOUSTIC_FRONT_IDENTITY_INFERENCE',
        );

        const attemptTentative = resolveSystemFrontIdentity({
          state: 'CONTEXTUAL_TENTATIVE',
          frontIdentityId: 'inferred_alter',
          source: forbiddenSource,
        });
        expect(attemptTentative.resolution.state).toBe('IDENTITY_UNKNOWN');
        expect(attemptTentative.resolution.rejectedAcousticInference).toBe(true);
        expect(attemptTentative.resolution.requiresUserDeclaration).toBe(false);
      },
    );

    it('rejects CONTEXTUAL_TENTATIVE if source is not EXPLICIT_SESSION_CONTINUITY', () => {
      const result = resolveSystemFrontIdentity({
        state: 'CONTEXTUAL_TENTATIVE',
        frontIdentityId: 'member_alpha',
        source: 'NONE',
      });
      expect(result.resolution.state).toBe('IDENTITY_UNKNOWN');
      expect(result.resolution.rejectedAcousticInference).toBe(true);
      expect(result.violations).toContain('FORBIDDEN_ACOUSTIC_FRONT_IDENTITY_INFERENCE');
    });

    it('accepts CONTEXTUAL_TENTATIVE only when grounded in EXPLICIT_SESSION_CONTINUITY', () => {
      const result = resolveSystemFrontIdentity({
        state: 'CONTEXTUAL_TENTATIVE',
        frontIdentityId: 'member_alpha',
        source: 'EXPLICIT_SESSION_CONTINUITY',
      });
      expect(result.resolution).toEqual({
        state: 'CONTEXTUAL_TENTATIVE',
        frontIdentityId: 'member_alpha',
        source: 'EXPLICIT_SESSION_CONTINUITY',
        requiresUserDeclaration: false,
        rejectedAcousticInference: false,
      });
      expect(result.violations).toEqual([]);
    });

    it('downgrades USER_DECLARED without a frontIdentityId to IDENTITY_UNKNOWN', () => {
      const result = resolveSystemFrontIdentity({
        state: 'USER_DECLARED',
        frontIdentityId: '   ',
        source: 'EXPLICIT_SELF_DECLARATION',
      });
      expect(result.resolution.state).toBe('IDENTITY_UNKNOWN');
      expect(result.violations).toContain('INVALID_USER_DECLARED_FRONT_WITHOUT_ID');
    });
  });

  // ==========================================================================
  // 3. FORBIDDEN ARCHITECTURAL IMPLICATIONS (MUST NEVER OCCUR)
  // ==========================================================================
  describe('3. Enforcement Against All Five Forbidden Architectural Implications', () => {
    it('FORBIDDEN IMPLICATION 1: "speech detected -> Christopher" is rejected', () => {
      const evaluation = evaluateDiscernmentPolicy({
        speaker: {
          state: 'UNKNOWN_SPEAKER',
          sessionSpeakerId: 'speaker_01',
        },
        addressee: {
          state: 'ADDRESSEE_UNKNOWN',
        },
        transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
        turnState: 'IDLE_AMBIENT',
      });

      expect(evaluation.speakerDiscernment.state).toBe('UNKNOWN_SPEAKER');
      expect(evaluation.speakerDiscernment.sessionSpeakerId).toBe('speaker_01');
      expect(evaluation.speakerDiscernment.verifiedPrimaryUser).toBe(false);
      expect(evaluation.decision).toBe('REMAIN_SILENT');
      expect(evaluation.shouldSpeak).toBe(false);
    });

    it('FORBIDDEN IMPLICATION 2: "Christopher speaking -> addressed to SAMARA" is rejected', () => {
      // Case A: Christopher speaking to a third party in the room
      const talkingToThirdParty = evaluateDiscernmentPolicy({
        speaker: {
          state: 'KNOWN_ENROLLED_SPEAKER',
          sessionSpeakerId: 'speaker_01',
          enrolledSpeakerId: 'christopher',
          isPrimaryUser: true,
        },
        addressee: {
          state: 'ADDRESSED_TO_THIRD_PARTY',
          targetParticipantId: 'speaker_02',
        },
        transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
        turnState: 'HUMAN_TO_HUMAN_CONVERSATION',
        signalCategory: 'DIRECT_QUESTION_OR_REQUEST',
      });

      expect(talkingToThirdParty.speakerDiscernment.verifiedPrimaryUser).toBe(true);
      expect(talkingToThirdParty.addresseeDiscernment.state).toBe(
        'ADDRESSED_TO_THIRD_PARTY',
      );
      expect(talkingToThirdParty.decision).toBe('REMAIN_SILENT');
      expect(talkingToThirdParty.shouldSpeak).toBe(false);
      expect(talkingToThirdParty.rationaleCodes).toContain(
        'ADDRESSED_TO_OTHER_HUMAN_SILENCE',
      );

      // Case B: Christopher thinking aloud / self-talk
      const selfTalk = evaluateDiscernmentPolicy({
        speaker: {
          state: 'KNOWN_ENROLLED_SPEAKER',
          sessionSpeakerId: 'speaker_01',
          enrolledSpeakerId: 'christopher',
          isPrimaryUser: true,
        },
        addressee: {
          state: 'SELF_TALK_OR_THINKING_ALOUD',
        },
        transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
        turnState: 'IDLE_AMBIENT',
      });

      expect(selfTalk.decision).toBe('REMAIN_SILENT');
      expect(selfTalk.shouldSpeak).toBe(false);
      expect(selfTalk.rationaleCodes).toContain('SELF_TALK_NOT_ADDRESSED_TO_SAMARA');

      // Case C: Christopher speaking with ADDRESSEE_UNKNOWN and no wake word
      const unknownAddressee = evaluateDiscernmentPolicy({
        speaker: {
          state: 'KNOWN_ENROLLED_SPEAKER',
          sessionSpeakerId: 'speaker_01',
          enrolledSpeakerId: 'christopher',
          isPrimaryUser: true,
        },
        addressee: {
          state: 'ADDRESSEE_UNKNOWN',
          explicitWakeOrNameUsed: false,
        },
        transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
        turnState: 'IDLE_AMBIENT',
      });

      expect(unknownAddressee.decision).toBe('REMAIN_SILENT');
      expect(unknownAddressee.rationaleCodes).toContain(
        'ADDRESSEE_UNKNOWN_DEFAULT_SILENCE',
      );
    });

    it('FORBIDDEN IMPLICATION 3: "addressed to SAMARA -> automatically authorized to receive private information" is rejected', () => {
      // Unknown speaker addressing SAMARA when third-party interaction is allowed
      const unknownSpeakerRequest = evaluateDiscernmentPolicy({
        speaker: {
          state: 'UNKNOWN_SPEAKER',
          sessionSpeakerId: 'speaker_02',
        },
        addressee: {
          state: 'ADDRESSED_TO_SAMARA',
          explicitWakeOrNameUsed: true,
        },
        transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
        turnState: 'IDLE_AMBIENT',
        signalCategory: 'SENSITIVE_PRIVATE_DATA_REQUEST',
        permissions: {
          allowThirdPartyInteraction: true,
        },
      });

      expect(unknownSpeakerRequest.addresseeDiscernment.state).toBe('ADDRESSED_TO_SAMARA');
      expect(unknownSpeakerRequest.privateDisclosurePermitted).toBe(false);
      expect(unknownSpeakerRequest.privacyMode).toBe('PUBLIC_SAFE_ONLY');
      expect(unknownSpeakerRequest.decision).toBe('ASK_FOR_CLARIFICATION');
      expect(unknownSpeakerRequest.rationaleCodes).toContain(
        'UNVERIFIED_SPEAKER_SENSITIVE_REQUEST_CLARIFY',
      );

      // Verified Christopher addressing SAMARA while an unverified guest is in the room
      const multiPersonRoomRequest = evaluateDiscernmentPolicy({
        speaker: {
          state: 'KNOWN_ENROLLED_SPEAKER',
          sessionSpeakerId: 'speaker_01',
          enrolledSpeakerId: 'christopher',
          isPrimaryUser: true,
        },
        addressee: {
          state: 'ADDRESSED_TO_SAMARA',
          explicitWakeOrNameUsed: true,
        },
        transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
        turnState: 'IDLE_AMBIENT',
        signalCategory: 'SENSITIVE_PRIVATE_DATA_REQUEST',
        roomPrivacy: {
          unverifiedParticipantsPresent: true,
          activeSessionSpeakerCount: 2,
        },
      });

      expect(multiPersonRoomRequest.speakerDiscernment.verifiedPrimaryUser).toBe(true);
      expect(multiPersonRoomRequest.privateDisclosurePermitted).toBe(false);
      expect(multiPersonRoomRequest.privacyMode).toBe('PUBLIC_SAFE_ONLY');
      expect(multiPersonRoomRequest.decision).toBe('ASK_FOR_CLARIFICATION');
      expect(multiPersonRoomRequest.rationaleCodes).toContain(
        'MULTI_PERSON_ROOM_PRIVACY_GUARD',
      );
    });

    it('FORBIDDEN IMPLICATION 4: "high model confidence (PROBABLE_ENROLLED_SPEAKER) -> factual certainty" is rejected', () => {
      const probableSpeakerSensitive = evaluateDiscernmentPolicy({
        speaker: {
          state: 'PROBABLE_ENROLLED_SPEAKER',
          sessionSpeakerId: 'speaker_01',
          enrolledSpeakerId: 'christopher',
          isPrimaryUser: true,
        },
        addressee: {
          state: 'ADDRESSED_TO_SAMARA',
          explicitWakeOrNameUsed: true,
        },
        transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
        turnState: 'IDLE_AMBIENT',
        signalCategory: 'SENSITIVE_PRIVATE_DATA_REQUEST',
      });

      expect(probableSpeakerSensitive.speakerDiscernment.state).toBe(
        'PROBABLE_ENROLLED_SPEAKER',
      );
      expect(probableSpeakerSensitive.speakerDiscernment.verifiedPrimaryUser).toBe(false);
      expect(probableSpeakerSensitive.privateDisclosurePermitted).toBe(false);
      expect(probableSpeakerSensitive.privacyMode).toBe('PUBLIC_SAFE_ONLY');
      expect(probableSpeakerSensitive.decision).toBe('ASK_FOR_CLARIFICATION');
      expect(probableSpeakerSensitive.rationaleCodes).toContain(
        'PROBABLE_SPEAKER_PUBLIC_SAFE_CONSTRAINT',
      );
      expect(probableSpeakerSensitive.rationaleCodes).toContain(
        'UNVERIFIED_SPEAKER_SENSITIVE_REQUEST_CLARIFY',
      );
    });

    it('FORBIDDEN IMPLICATION 5: "voice similarity -> DID/system-front identity" is rejected in full policy evaluation', () => {
      const evaluation = evaluateDiscernmentPolicy({
        speaker: {
          state: 'KNOWN_ENROLLED_SPEAKER',
          sessionSpeakerId: 'speaker_01',
          enrolledSpeakerId: 'christopher',
          isPrimaryUser: true,
        },
        addressee: {
          state: 'ADDRESSED_TO_SAMARA',
          explicitWakeOrNameUsed: true,
        },
        transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
        turnState: 'IDLE_AMBIENT',
        frontIdentity: {
          state: 'USER_DECLARED',
          frontIdentityId: 'alter_inferred_by_voice',
          source: 'speaker_similarity',
        },
      });

      expect(evaluation.frontIdentityResolution.state).toBe('IDENTITY_UNKNOWN');
      expect(evaluation.frontIdentityResolution.frontIdentityId).toBeUndefined();
      expect(evaluation.frontIdentityResolution.rejectedAcousticInference).toBe(true);
      expect(evaluation.frontIdentityResolution.requiresUserDeclaration).toBe(false);
      expect(evaluation.rationaleCodes).toContain('ACOUSTIC_FRONT_IDENTITY_REJECTED');
      expect(evaluation.violatedInvariants).toContain(
        'FORBIDDEN_ACOUSTIC_FRONT_IDENTITY_INFERENCE',
      );
    });
  });

  // ==========================================================================
  // 4. DETERMINISTIC RESPONSE POLICY MATRIX (ALL 6 DECISIONS)
  // ==========================================================================
  describe('4. Deterministic Response Policy Matrix Across All 6 Canonical Decisions', () => {
    const verifiedChristopherSpeaker = {
      state: 'KNOWN_ENROLLED_SPEAKER' as const,
      sessionSpeakerId: 'speaker_01' as const,
      enrolledSpeakerId: 'christopher',
      isPrimaryUser: true,
    };

    describe('Decision 1: REMAIN_SILENT', () => {
      it('remains silent when ambient listening is disabled in standing permissions', () => {
        const result = evaluateDiscernmentPolicy({
          speaker: verifiedChristopherSpeaker,
          addressee: { state: 'ADDRESSED_TO_SAMARA', explicitWakeOrNameUsed: true },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'IDLE_AMBIENT',
          permissions: { allowAmbientListening: false },
        });
        expect(result.decision).toBe('REMAIN_SILENT');
        expect(result.shouldSpeak).toBe(false);
        expect(result.rationaleCodes).toContain('AMBIENT_LISTENING_DISABLED');
      });

      it('remains silent when SAMARA is muted or suspended', () => {
        const result = evaluateDiscernmentPolicy({
          speaker: verifiedChristopherSpeaker,
          addressee: { state: 'ADDRESSED_TO_SAMARA', explicitWakeOrNameUsed: true },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'SAMARA_MUTED_OR_SUSPENDED',
        });
        expect(result.decision).toBe('REMAIN_SILENT');
        expect(result.rationaleCodes).toContain('SAMARA_MUTED_OR_SUSPENDED');
      });

      it('remains silent for background TV, radio, podcasts, or media (NON_PARTICIPANT_MEDIA)', () => {
        const result = evaluateDiscernmentPolicy({
          speaker: { state: 'UNKNOWN_SPEAKER', sessionSpeakerId: 'speaker_03' },
          addressee: { state: 'NON_PARTICIPANT_MEDIA', explicitWakeOrNameUsed: true },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'IDLE_AMBIENT',
          signalCategory: 'DIRECT_QUESTION_OR_REQUEST',
        });
        expect(result.decision).toBe('REMAIN_SILENT');
        expect(result.shouldSpeak).toBe(false);
        expect(result.rationaleCodes).toContain('NON_PARTICIPANT_MEDIA_IGNORED');
      });

      it('remains silent when another person addresses Christopher (ADDRESSED_TO_CHRISTOPHER)', () => {
        const result = evaluateDiscernmentPolicy({
          speaker: { state: 'UNKNOWN_SPEAKER', sessionSpeakerId: 'speaker_02' },
          addressee: {
            state: 'ADDRESSED_TO_CHRISTOPHER',
            targetParticipantId: 'christopher',
          },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'HUMAN_TO_HUMAN_CONVERSATION',
        });
        expect(result.decision).toBe('REMAIN_SILENT');
        expect(result.rationaleCodes).toContain('ADDRESSED_TO_OTHER_HUMAN_SILENCE');
      });

      it('remains silent when user issues an explicit stop or quiet directive', () => {
        const result = evaluateDiscernmentPolicy({
          speaker: verifiedChristopherSpeaker,
          addressee: { state: 'ADDRESSED_TO_SAMARA', explicitWakeOrNameUsed: true },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'ACTIVE_CONVERSATION_WITH_SAMARA',
          signalCategory: 'STOP_OR_QUIET_COMMAND',
        });
        expect(result.decision).toBe('REMAIN_SILENT');
        expect(result.shouldSpeak).toBe(false);
        expect(result.rationaleCodes).toContain('EXPLICIT_QUIET_OR_STOP_DIRECTIVE');
      });

      it('remains silent when addressee is ambiguous without wake phrase in idle ambient mode', () => {
        const result = evaluateDiscernmentPolicy({
          speaker: verifiedChristopherSpeaker,
          addressee: { state: 'ADDRESSEE_AMBIGUOUS', explicitWakeOrNameUsed: false },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'IDLE_AMBIENT',
        });
        expect(result.decision).toBe('REMAIN_SILENT');
        expect(result.rationaleCodes).toContain('ADDRESSEE_AMBIGUOUS_NO_WAKE_SILENCE');
      });

      it('remains silent when an unknown speaker addresses SAMARA and allowThirdPartyInteraction is false', () => {
        const result = evaluateDiscernmentPolicy({
          speaker: { state: 'UNKNOWN_SPEAKER', sessionSpeakerId: 'speaker_02' },
          addressee: { state: 'ADDRESSED_TO_SAMARA', explicitWakeOrNameUsed: true },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'IDLE_AMBIENT',
          permissions: { allowThirdPartyInteraction: false },
        });
        expect(result.decision).toBe('REMAIN_SILENT');
        expect(result.rationaleCodes).toContain('THIRD_PARTY_INTERACTION_NOT_AUTHORIZED');
      });
    });

    describe('Decision 2: LISTEN_WITHOUT_INTERRUPTING', () => {
      it('listens without interrupting when speaker is addressing SAMARA but still mid-utterance', () => {
        const result = evaluateDiscernmentPolicy({
          speaker: verifiedChristopherSpeaker,
          addressee: { state: 'ADDRESSED_TO_SAMARA', explicitWakeOrNameUsed: true },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'USER_SPEAKING_IN_PROGRESS',
          signalCategory: 'DIRECT_QUESTION_OR_REQUEST',
        });
        expect(result.decision).toBe('LISTEN_WITHOUT_INTERRUPTING');
        expect(result.shouldSpeak).toBe(false);
        expect(result.rationaleCodes).toContain('SPEAKER_TURN_IN_PROGRESS_WAIT');
      });
    });

    describe('Decision 3: ACKNOWLEDGE', () => {
      it('acknowledges briefly when addressed to SAMARA with a brief check-in or acknowledgment cue', () => {
        const result = evaluateDiscernmentPolicy({
          speaker: verifiedChristopherSpeaker,
          addressee: { state: 'ADDRESSED_TO_SAMARA', explicitWakeOrNameUsed: true },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'IDLE_AMBIENT',
          signalCategory: 'BRIEF_CHECK_IN_OR_ACK_TRIGGER',
        });
        expect(result.decision).toBe('ACKNOWLEDGE');
        expect(result.shouldSpeak).toBe(true);
        expect(result.privateDisclosurePermitted).toBe(true);
        expect(result.rationaleCodes).toContain('BRIEF_CHECK_IN_ACKNOWLEDGMENT');
      });
    });

    describe('Decision 4: ASK_FOR_CLARIFICATION', () => {
      it('asks for clarification when addressed to SAMARA but transcript is uncertain or unavailable', () => {
        const uncertain = evaluateDiscernmentPolicy({
          speaker: verifiedChristopherSpeaker,
          addressee: { state: 'ADDRESSED_TO_SAMARA', explicitWakeOrNameUsed: true },
          transcriptCertainty: 'TRANSCRIPT_UNCERTAIN',
          turnState: 'IDLE_AMBIENT',
        });
        expect(uncertain.decision).toBe('ASK_FOR_CLARIFICATION');
        expect(uncertain.shouldSpeak).toBe(true);
        expect(uncertain.privateDisclosurePermitted).toBe(false);
        expect(uncertain.rationaleCodes).toContain(
          'TRANSCRIPT_UNCERTAIN_OR_UNAVAILABLE_CLARIFY',
        );

        const unavailable = evaluateDiscernmentPolicy({
          speaker: verifiedChristopherSpeaker,
          addressee: { state: 'ADDRESSED_TO_SAMARA', explicitWakeOrNameUsed: true },
          transcriptCertainty: 'TRANSCRIPT_UNAVAILABLE',
          turnState: 'IDLE_AMBIENT',
        });
        expect(unavailable.decision).toBe('ASK_FOR_CLARIFICATION');
        expect(unavailable.privateDisclosurePermitted).toBe(false);
      });

      it('asks for clarification when wake phrase was used but addressee is ambiguous', () => {
        const result = evaluateDiscernmentPolicy({
          speaker: verifiedChristopherSpeaker,
          addressee: { state: 'ADDRESSEE_AMBIGUOUS', explicitWakeOrNameUsed: true },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'IDLE_AMBIENT',
        });
        expect(result.decision).toBe('ASK_FOR_CLARIFICATION');
        expect(result.shouldSpeak).toBe(true);
        expect(result.privateDisclosurePermitted).toBe(false);
        expect(result.rationaleCodes).toContain('ADDRESSEE_AMBIGUOUS_WITH_WAKE_CLARIFY');
      });

      it('asks for clarification when multiple or ambiguous speakers address SAMARA simultaneously', () => {
        const multiple = evaluateDiscernmentPolicy({
          speaker: {
            state: 'MULTIPLE_SPEAKERS',
            candidateSpeakerIds: ['speaker_01', 'speaker_02'],
          },
          addressee: { state: 'ADDRESSED_TO_SAMARA', explicitWakeOrNameUsed: true },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'IDLE_AMBIENT',
        });
        expect(multiple.decision).toBe('ASK_FOR_CLARIFICATION');
        expect(multiple.privateDisclosurePermitted).toBe(false);
        expect(multiple.rationaleCodes).toContain(
          'AMBIGUOUS_OR_MULTIPLE_SPEAKERS_CLARIFY',
        );
      });
    });

    describe('Decision 5: RESPOND', () => {
      it('responds with PRIVATE_PRIMARY_USER scope when verified Christopher directly addresses SAMARA in a private room', () => {
        const result = evaluateDiscernmentPolicy({
          speaker: verifiedChristopherSpeaker,
          addressee: { state: 'ADDRESSED_TO_SAMARA', explicitWakeOrNameUsed: true },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'IDLE_AMBIENT',
          signalCategory: 'DIRECT_QUESTION_OR_REQUEST',
          roomPrivacy: { unverifiedParticipantsPresent: false, activeSessionSpeakerCount: 1 },
        });
        expect(result.decision).toBe('RESPOND');
        expect(result.shouldSpeak).toBe(true);
        expect(result.privacyMode).toBe('PRIVATE_PRIMARY_USER');
        expect(result.privateDisclosurePermitted).toBe(true);
        expect(result.rationaleCodes).toContain('DIRECT_ADDRESS_CONFIDENT_RESPONSE');
      });

      it('responds in an active conversation continuation without requiring wake word when permitted', () => {
        const result = evaluateDiscernmentPolicy({
          speaker: verifiedChristopherSpeaker,
          addressee: { state: 'ADDRESSED_TO_SAMARA', explicitWakeOrNameUsed: false },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'ACTIVE_CONVERSATION_WITH_SAMARA',
          signalCategory: 'DIRECT_QUESTION_OR_REQUEST',
        });
        expect(result.decision).toBe('RESPOND');
        expect(result.shouldSpeak).toBe(true);
        expect(result.rationaleCodes).toContain(
          'ACTIVE_CONVERSATION_CONTINUATION_RESPONSE',
        );
      });

      it('responds with PUBLIC_SAFE_ONLY constraint when speaker is PROBABLE_ENROLLED_SPEAKER on a non-sensitive question', () => {
        const result = evaluateDiscernmentPolicy({
          speaker: {
            state: 'PROBABLE_ENROLLED_SPEAKER',
            sessionSpeakerId: 'speaker_01',
            enrolledSpeakerId: 'christopher',
            isPrimaryUser: true,
          },
          addressee: { state: 'ADDRESSED_TO_SAMARA', explicitWakeOrNameUsed: true },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'IDLE_AMBIENT',
          signalCategory: 'DIRECT_QUESTION_OR_REQUEST',
        });
        expect(result.decision).toBe('RESPOND');
        expect(result.shouldSpeak).toBe(true);
        expect(result.privacyMode).toBe('PUBLIC_SAFE_ONLY');
        expect(result.privateDisclosurePermitted).toBe(false);
        expect(result.rationaleCodes).toContain(
          'PROBABLE_SPEAKER_PUBLIC_SAFE_CONSTRAINT',
        );
      });

      it('responds only when high-confidence proactive assistance is explicitly authorized by standing permissions', () => {
        const unauthorized = evaluateDiscernmentPolicy({
          speaker: verifiedChristopherSpeaker,
          addressee: { state: 'ADDRESSEE_UNKNOWN', explicitWakeOrNameUsed: false },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'IDLE_AMBIENT',
          signalCategory: 'HIGH_CONFIDENCE_AUTHORIZED_ASSISTANCE',
          permissions: { allowProactiveAuthorizedAssistance: false },
        });
        expect(unauthorized.decision).toBe('REMAIN_SILENT');
        expect(unauthorized.rationaleCodes).toContain(
          'PROACTIVE_ASSISTANCE_NOT_AUTHORIZED',
        );

        const authorized = evaluateDiscernmentPolicy({
          speaker: verifiedChristopherSpeaker,
          addressee: { state: 'ADDRESSEE_UNKNOWN', explicitWakeOrNameUsed: false },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'IDLE_AMBIENT',
          signalCategory: 'HIGH_CONFIDENCE_AUTHORIZED_ASSISTANCE',
          permissions: { allowProactiveAuthorizedAssistance: true },
        });
        expect(authorized.decision).toBe('RESPOND');
        expect(authorized.shouldSpeak).toBe(true);
        expect(authorized.rationaleCodes).toContain(
          'AUTHORIZED_PROACTIVE_ASSISTANCE_RESPONSE',
        );
      });
    });

    describe('Decision 6: PROVIDE_GROUNDING_OR_ORIENTATION', () => {
      it('provides verified grounding/orientation with strict epistemic & DID-safe constraints', () => {
        const privateGrounding = evaluateDiscernmentPolicy({
          speaker: verifiedChristopherSpeaker,
          addressee: { state: 'ADDRESSED_TO_SAMARA', explicitWakeOrNameUsed: true },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'IDLE_AMBIENT',
          signalCategory: 'GROUNDING_OR_ORIENTATION_REQUEST',
          frontIdentity: { state: 'IDENTITY_UNKNOWN' },
        });

        expect(privateGrounding.decision).toBe('PROVIDE_GROUNDING_OR_ORIENTATION');
        expect(privateGrounding.shouldSpeak).toBe(true);
        expect(privateGrounding.frontIdentityResolution.state).toBe('IDENTITY_UNKNOWN');
        expect(privateGrounding.frontIdentityResolution.requiresUserDeclaration).toBe(
          false,
        );
        expect(privateGrounding.groundingConstraints).toEqual({
          verifiedFactsOnly: true,
          allowAcousticAlterInference: false,
          requireIdentityDeclaration: false,
          privateOrientationDetailsPermitted: true,
        });
      });

      it('restricts grounding response to public-safe verified facts if speaker is probable/unverified or room has other people', () => {
        const unverifiedGrounding = evaluateDiscernmentPolicy({
          speaker: {
            state: 'PROBABLE_ENROLLED_SPEAKER',
            sessionSpeakerId: 'speaker_01',
            enrolledSpeakerId: 'christopher',
            isPrimaryUser: true,
          },
          addressee: { state: 'ADDRESSED_TO_SAMARA', explicitWakeOrNameUsed: true },
          transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
          turnState: 'IDLE_AMBIENT',
          signalCategory: 'GROUNDING_OR_ORIENTATION_REQUEST',
        });

        expect(unverifiedGrounding.decision).toBe('PROVIDE_GROUNDING_OR_ORIENTATION');
        expect(unverifiedGrounding.privacyMode).toBe('GROUNDING_VERIFIED_FACTS_ONLY');
        expect(unverifiedGrounding.privateDisclosurePermitted).toBe(false);
        expect(unverifiedGrounding.groundingConstraints).toEqual({
          verifiedFactsOnly: true,
          allowAcousticAlterInference: false,
          requireIdentityDeclaration: false,
          privateOrientationDetailsPermitted: false,
        });
      });
    });
  });

  // ==========================================================================
  // 5. DETERMINISM & ORTHOGONALITY INVARIANT PROOF
  // ==========================================================================
  describe('5. Pure Determinism & Orthogonal Determination Preservation', () => {
    it('produces identical, deeply equal outputs across repeated invocations and does not mutate input', () => {
      const input: DiscernmentPolicyInput = Object.freeze({
        speaker: Object.freeze({
          state: 'PROBABLE_ENROLLED_SPEAKER',
          sessionSpeakerId: 'speaker_01',
          enrolledSpeakerId: 'christopher',
          isPrimaryUser: true,
        }),
        addressee: Object.freeze({
          state: 'ADDRESSED_TO_SAMARA',
          explicitWakeOrNameUsed: true,
        }),
        transcriptCertainty: 'TRANSCRIPT_CONFIDENT',
        turnState: 'IDLE_AMBIENT',
        signalCategory: 'DIRECT_QUESTION_OR_REQUEST',
        frontIdentity: Object.freeze({
          state: 'USER_DECLARED',
          frontIdentityId: 'protector_profile',
          source: 'EXPLICIT_SELF_DECLARATION',
        }),
      });

      const first = evaluateDiscernmentPolicy(input);
      const second = evaluateDiscernmentPolicy(input);

      expect(first).toEqual(second);
      expect(DEFAULT_STANDING_PERMISSIONS.allowAmbientListening).toBe(true);
      expect(first.speakerDiscernment.state).toBe('PROBABLE_ENROLLED_SPEAKER');
      expect(first.addresseeDiscernment.state).toBe('ADDRESSED_TO_SAMARA');
      expect(first.frontIdentityResolution.state).toBe('USER_DECLARED');
      expect(first.decision).toBe('RESPOND');
    });
  });
});
