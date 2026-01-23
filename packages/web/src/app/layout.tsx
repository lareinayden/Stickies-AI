import './globals.css'

export const metadata = {
  title: 'Stickies AI - Voice Input Pipeline',
  description: 'Upload audio files for transcription using OpenAI Whisper API',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
