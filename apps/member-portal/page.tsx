import { renderToStaticMarkup } from 'react-dom/server'
import { Compass, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

export function portalPage(title: string, children: ReactNode, variant: 'landing' | 'simple' | 'dashboard' = 'simple') {
  return '<!doctype html>' + renderToStaticMarkup(
    <html lang="en">
      <head>
        <meta charSet="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="theme-color" content="#17132b"/>
        <title>{`${title} · MemberSpace`}</title>
        <link rel="stylesheet" href="/portal-style.css"/>
        <script src="/auth-form.js" defer/>
      </head>
      <body className={`portal-body portal-${variant}`}>
        <a className="portal-skip" href="#main-content">Skip to content</a>
        <header className="portal-header">
          <a className="portal-brand" href="/">
            <span className="portal-brand-mark"><Compass size={21} aria-hidden="true"/></span>
            <span>MemberSpace</span>
          </a>
          <nav aria-label="MemberSpace navigation">
            <a href="/">Home</a>
            <a href="/dashboard">Dashboard</a>
          </nav>
          <span className="portal-demo-label"><Sparkles size={14} aria-hidden="true"/> Hackathon demo</span>
        </header>
        <main id="main-content" className="portal-main">{children}</main>
        <footer className="portal-footer">
          <span>MemberSpace demonstration portal</span>
          <span>Authentication is provided independently by EventPass.</span>
        </footer>
      </body>
    </html>,
  )
}

export function PortalHidden({ csrf }: { csrf: string }) {
  return <input type="hidden" name="csrf" value={csrf}/>
}

