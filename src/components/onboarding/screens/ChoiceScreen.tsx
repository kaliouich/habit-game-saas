"use client";

interface ChoiceScreenProps {
  aiConfigured: boolean;
  onQuestionnaire: () => void;
  onAi: () => void;
}

export function ChoiceScreen({ aiConfigured, onQuestionnaire, onAi }: ChoiceScreenProps) {
  return (
    <div className="onboardscreen">
      <h1 className="onboardscreen__title">Let&apos;s build your habits</h1>
      <p className="onboardscreen__subtitle">Two ways to start — pick whichever feels right.</p>

      <div className="onboardchoice">
        <button type="button" className="onboardchoice__card" onClick={onQuestionnaire}>
          <span className="onboardchoice__emoji">📋</span>
          <span className="onboardchoice__label">Answer a few questions</span>
          <span className="onboardchoice__desc">Quick multiple-choice — we&apos;ll suggest habits that fit.</span>
        </button>

        {aiConfigured && (
          <button type="button" className="onboardchoice__card" onClick={onAi}>
            <span className="onboardchoice__emoji">✨</span>
            <span className="onboardchoice__label">Just tell me what you want</span>
            <span className="onboardchoice__desc">Describe your goal in your own words — AI builds a starter list.</span>
          </button>
        )}
      </div>
    </div>
  );
}
