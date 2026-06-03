export default function Korb({ onClose }) {
  return (
    <div style={{background:'#101020',borderRadius:'14px',padding:'24px',maxWidth:'480px',width:'100%'}}>
      <button onClick={onClose}>Schließen</button>
      <p style={{color:'rgba(255,255,255,0.5)'}}>Korb (coming soon)</p>
    </div>
  )
}
