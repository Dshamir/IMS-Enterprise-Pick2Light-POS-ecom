export default function TestStylesPage() {
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightblue', color: 'darkblue' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Test Page - Inline Styles</h1>
      <p style={{ marginBottom: '12px' }}>This uses inline styles to test if the issue is with CSS loading.</p>
      
      <div className="bg-red-500 text-white p-4 mb-4" style={{ backgroundColor: 'red', color: 'white', padding: '16px', marginBottom: '16px' }}>
        This div has both Tailwind classes AND inline styles as fallback
      </div>
      
      <div className="bg-blue-500 text-white p-4 mb-4">
        This div ONLY has Tailwind classes (should be invisible if Tailwind isn't working)
      </div>
      
      <div style={{ backgroundColor: 'green', color: 'white', padding: '16px', marginBottom: '16px' }}>
        This div ONLY has inline styles
      </div>
    </div>
  )
}