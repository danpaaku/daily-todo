import { useRef } from 'react'
import { SECTIONS } from '../lib/model'
import type { AppSettings, Section } from '../lib/model'

type Props = {
  settings: AppSettings
  onChange: (next: Partial<AppSettings>) => void
  onExport: () => void
  onImport: (file: File) => void
  onReset: () => void
}

export default function SettingsView({ settings, onChange, onExport, onImport, onReset }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <section className="page-view settings-page">
      <div className="page-heading">
        <div>
          <div className="micro">YOUR SPACE</div>
          <h1>Set it <i>your way.</i></h1>
          <p>Quiet controls for the things that shape how Daily works for you.</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="settings-card settings-card-wide">
          <div className="settings-card-head"><div><span className="micro">APPEARANCE</span><h2>Make it feel like yours.</h2></div></div>
          <div className="setting-row">
            <div><b>Theme</b><span>Choose how Daily looks.</span></div>
            <div className="segmented" role="group" aria-label="Theme">
              <button type="button" className={settings.theme === 'light' ? 'selected' : ''} onClick={() => onChange({ theme: 'light' })}>Light</button>
              <button type="button" className={settings.theme === 'dark' ? 'selected' : ''} onClick={() => onChange({ theme: 'dark' })}>Dark</button>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <span className="micro">TODAY</span>
          <h2>Your defaults.</h2>
          <div className="setting-control">
            <label htmlFor="default-section">Default section</label>
            <select id="default-section" value={settings.defaultSection} onChange={(event) => onChange({ defaultSection: event.target.value as Section })}>
              {SECTIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="setting-control">
            <label htmlFor="day-start">Day starts at</label>
            <input id="day-start" type="time" value={settings.dayStart} onChange={(event) => onChange({ dayStart: event.target.value })} />
          </div>
          <p className="settings-copy">The day-start time is the business-day boundary for Today, routines, carry-over and history.</p>
        </section>

        <section className="settings-card">
          <span className="micro">DATA</span>
          <h2>Your data stays yours.</h2>
          <p className="settings-copy">Daily is local-first. Export a backup whenever you want, or bring one back in later. Invalid files never overwrite what you already have.</p>
          <div className="settings-actions">
            <button type="button" className="primary" onClick={onExport}>Export backup</button>
            <button type="button" onClick={() => fileRef.current?.click()}>Import backup</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onImport(file)
                event.currentTarget.value = ''
              }}
            />
          </div>
        </section>

        <section className="settings-card danger-card">
          <span className="micro">START OVER</span>
          <h2>Reset your Daily data.</h2>
          <p className="settings-copy">This removes tasks, routines and history from this browser. Export a backup first if you might want them later.</p>
          <button type="button" className="danger-button" onClick={onReset}>Reset all data</button>
        </section>
      </div>
    </section>
  )
}
