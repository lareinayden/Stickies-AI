/**
 * Home page with voice upload interface
 */

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Stickies AI - Voice Input Pipeline</h1>
        
        <div className="bg-gray-100 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">API Endpoints</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-bold">POST /api/voice/upload</h3>
              <p className="text-gray-600">Upload audio file for transcription</p>
              <code className="block bg-gray-200 p-2 rounded mt-2">
                curl -X POST http://localhost:3000/api/voice/upload \
                  -F &quot;file=@audio.wav&quot; \
                  -F &quot;language=en&quot;
              </code>
            </div>
            
            <div>
              <h3 className="font-bold">GET /api/voice/status/:ingestionId</h3>
              <p className="text-gray-600">Get transcription status</p>
              <code className="block bg-gray-200 p-2 rounded mt-2">
                curl http://localhost:3000/api/voice/status/&lt;ingestionId&gt;
              </code>
            </div>
            
            <div>
              <h3 className="font-bold">GET /api/voice/transcript/:ingestionId</h3>
              <p className="text-gray-600">Get transcription result</p>
              <code className="block bg-gray-200 p-2 rounded mt-2">
                curl http://localhost:3000/api/voice/transcript/&lt;ingestionId&gt;
              </code>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-gray-600">
          <p>See TESTING.md for detailed testing instructions.</p>
        </div>
      </div>
    </main>
  );
}
