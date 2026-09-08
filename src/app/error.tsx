'use client'
import { Shell } from '@/components/shell'
import { Button } from '@/components/ui/button'
export default function ErrorPage({ reset }: { reset: () => void }) { return <Shell title="We couldn’t load this page"><p>Please try again.</p><Button onClick={reset}>Retry</Button></Shell> }
