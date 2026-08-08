/** Nuances de la gamme de zones, du noir au blanc-papier (système Ansel Adams). */
const ZONES = ['#050505', '#232320', '#413f3a', '#605c53', '#7f7a6e', '#9d9787', '#bcb5a1', '#dad2ba', '#f0e9d4', '#fbf8ee']

export default function GradusLogo() {
  return (
    <div className="gradus-logo">
      <span className="gradus-wordmark">GRADUS</span>
      <div className="gradus-zones" aria-hidden="true">
        {ZONES.map((shade) => (
          <span key={shade} style={{ background: shade }} />
        ))}
      </div>
    </div>
  )
}
