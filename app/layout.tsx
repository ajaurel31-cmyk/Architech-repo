import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kidney Nutrition Analyzer',
  description: 'Upload nutrition facts to check if ingredients are kidney-friendly',
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
