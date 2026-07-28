import { STOP_PRESETS, toStopFraction } from '../utils/stops'
import NumberStepper from './NumberStepper'

interface StopUnitPickerProps {
  value: number
  onChange: (value: number) => void
}

/**
 * Choix d'une unité de stop. Volontairement limité aux fractions unitaires (1/N) et aux
 * presets : une saisie décimale libre produirait des valeurs comme 0,35 stop, impossibles
 * à afficher autrement qu'en décimal.
 */
export default function StopUnitPicker({ value, onChange }: StopUnitPickerProps) {
  const fraction = toStopFraction(value)
  const denominator = fraction.count === 1 ? fraction.denominator : 12

  return (
    <>
      {STOP_PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          className={Math.abs(value - preset.value) < 0.0005 ? 'chip chip-active' : 'chip'}
          onClick={() => onChange(preset.value)}
        >
          {preset.label}
        </button>
      ))}
      <span className="field-label-inline">ou 1/</span>
      <NumberStepper min={1} max={24} step={1} value={denominator} onChange={(d) => onChange(1 / Math.max(1, d))} />
    </>
  )
}
