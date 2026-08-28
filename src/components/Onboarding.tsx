import { SECTIONS } from '../lib/model'
import type { AppSettings } from '../lib/model'

type Props = { settings: AppSettings; onComplete: (next: Partial<AppSettings>) => void }

export default function Onboarding({ settings, onComplete }: Props) {
  return (
    <div className="onboarding-backdrop">
      <section className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="onboarding-mark" aria-hidden="true">✦</div>
        <span className="micro">WELCOME TO DAILY</span>
        <h1 id="onboarding-title">Make today<br /><i>count.</i></h1>
        <p>A calm place to decide what matters, follow through, and build consistency.</p>
        <div className="onboarding-field">
          <label>Where should new tasks start?</label>
          <div className="onboarding-options">
            {SECTIONS.map((item) => (
              <button type="button" key={item} className={settings.defaultSection === item ? 'selected' : ''} onClick={() => onComplete({ defaultSection: item })}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="onboarding-field">
          <label htmlFor="onboarding-day-start">When does your day begin?</label>
          <input id="onboarding-day-start" type="time" value={settings.dayStart} onChange={(event) => onComplete({ dayStart: event.target.value })} />
        </div>
        <button type="button" className="onboarding-continue" onClick={() => onComplete({ onboardingComplete: true })}>Enter your day <span>↗</span></button>
        <button type="button" className="onboarding-skip" onClick={() => onComplete({ onboardingComplete: true })}>Skip setup</button>
      </section>
    </div>
  )
}
