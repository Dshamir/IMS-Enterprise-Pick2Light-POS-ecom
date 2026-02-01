export default function DebugPage() {
  return (
    <html>
      <head>
        <title>Debug Page</title>
        <style>{`
          body { 
            font-family: Arial, sans-serif; 
            background: #f0f0f0; 
            color: #333; 
            padding: 20px;
          }
          .card { 
            background: white; 
            border: 1px solid #ddd; 
            padding: 20px; 
            margin: 10px 0; 
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .button { 
            background: #0070f3; 
            color: white; 
            padding: 10px 20px; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer;
          }
          .button:hover { 
            background: #0051a5; 
          }
          h1 { 
            color: #333; 
            font-size: 2rem; 
            margin-bottom: 1rem;
          }
        `}</style>
      </head>
      <body>
        <h1>🔍 Debug Test Page</h1>
        <div className="card">
          <h2>This should be styled with inline CSS</h2>
          <p>If you see proper styling here, the issue is with Tailwind/external CSS loading.</p>
          <button className="button">Test Button</button>
        </div>
        
        <div className="bg-blue-500 text-white p-4 rounded">
          This div uses Tailwind classes - if invisible, Tailwind isn't working
        </div>
        
        <div style={{background: 'green', color: 'white', padding: '16px', borderRadius: '4px', margin: '10px 0'}}>
          This div uses inline styles - should always work
        </div>
      </body>
    </html>
  )
}