import { useState } from 'react'

const OTHER = '__other__'

interface SelectOrCustomProps {
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder?: string
}

export default function SelectOrCustom({ value, options, onChange, placeholder }: SelectOrCustomProps) {
  const [customMode, setCustomMode] = useState(false)
  const showCustom = customMode || (value !== '' && !options.includes(value))

  function handleSelect(v: string) {
    if (v === OTHER) {
      setCustomMode(true)
      onChange('')
    } else {
      setCustomMode(false)
      onChange(v)
    }
  }

  return (
    <>
      <select className="field-input" value={showCustom ? OTHER : value} onChange={(e) => handleSelect(e.target.value)}>
        <option value="">Choisir…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value={OTHER}>Autre…</option>
      </select>
      {showCustom && (
        <input
          className="field-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
      )}
    </>
  )
}
