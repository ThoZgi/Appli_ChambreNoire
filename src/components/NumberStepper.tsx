interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}

export default function NumberStepper({ value, onChange, min, max, step = 1, className }: NumberStepperProps) {
  function clamp(v: number): number {
    let result = v
    if (min !== undefined) result = Math.max(min, result)
    if (max !== undefined) result = Math.min(max, result)
    return result
  }

  return (
    <div className={className ? `number-stepper ${className}` : 'number-stepper'}>
      <button type="button" className="number-stepper-btn" onClick={() => onChange(clamp(value - step))}>
        −
      </button>
      <input
        type="number"
        className="field-input number-stepper-input"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
      />
      <button type="button" className="number-stepper-btn" onClick={() => onChange(clamp(value + step))}>
        +
      </button>
    </div>
  )
}
