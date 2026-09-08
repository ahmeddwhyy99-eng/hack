import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Express, Request, Response } from 'express'
import express from 'express'
import { readFileSync } from 'node:fs'
export const random = () => randomBytes(32).toString('base64url')
export const digest = (value: string) => createHash('sha256').update(value).digest('base64url')
export const equal = (a: string, b: string) => timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)))
export const cookie = (req: Request, name: string) => req.headers.cookie?.split('; ').find(v => v.startsWith(`${name}=`))?.slice(name.length + 1) || ''
export const cookieOptions = (secure: boolean) => ({ httpOnly: true, secure, sameSite: 'lax' as const, path: '/' })
export function security(app: Express, origin: string, callback?: string) {
  app.disable('x-powered-by')
  app.use((_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': `default-src 'none'; style-src 'self'; script-src 'self'; form-action 'self'${callback ? " " + callback : ""}; frame-ancestors 'none'; base-uri 'none'` })
    if (origin.startsWith('https:')) res.set('Strict-Transport-Security', 'max-age=31536000')
    next()
  })
  // Browser forms are same-origin; token exchange is server-to-server. No CORS grants needed.
  app.use((req, res, next) => {
    // Chromium may serialize Origin as null for no-referrer native form posts.
    // Accept that only with its unforgeable same-origin Fetch Metadata header;
    // all browser mutations also require a server-bound CSRF token.
    const source = req.get('origin')
    const localOpaqueForm = source === 'null' && req.get('sec-fetch-site') === 'same-origin'
    if (req.method === 'POST' && source && source !== origin && !localOpaqueForm) { res.status(403).send('Cross-origin request denied.'); return }
    next()
  })
  app.use(express.urlencoded({ extended: false, limit: '8kb' }), express.json({ limit: '8kb' }))
  app.get('/auth-style.css', (_req, res) => res.type('css').send(readFileSync(new URL('../../src/app/globals.css', import.meta.url), 'utf8').replace('@import "tailwindcss";', '') + '\ninput:not([type=hidden]){display:block;width:100%;padding:12px;border:1px solid #64748b;border-radius:6px;margin:8px 0 18px;font:inherit}form{margin-top:18px}.auth-links{display:flex;flex-wrap:wrap;gap:16px;margin-top:18px}.auth-links a{text-decoration:underline}.auth-status{margin-top:12px}'))
  app.get('/auth-form.js', (_req, res) => res.type('js').send("document.addEventListener('submit',e=>{const f=e.target;if(f.dataset.submitting){e.preventDefault();return}if(!f.checkValidity())return;f.dataset.submitting='true';if(e.submitter?.name){const i=document.createElement('input');i.type='hidden';i.name=e.submitter.name;i.value=e.submitter.value;f.append(i)}const s=document.createElement('p');s.role='status';s.textContent='Please wait…';f.append(s);for(const b of f.querySelectorAll('button'))b.disabled=true},{capture:true});"))
}
export function safeError(_error: unknown, _req: Request, res: Response, _next: import('express').NextFunction) { res.status(503).send('Service unavailable. Return to the application and try again.') }
export function origin(value: string) {
  const u = new URL(value)
  if (u.origin !== value || u.username || u.password || (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname)))) throw new Error('Use an HTTPS origin, or HTTP localhost for development.')
  return value
}
