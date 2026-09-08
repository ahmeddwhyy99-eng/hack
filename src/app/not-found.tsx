import Link from 'next/link'
import { Shell } from '@/components/shell'
import { Button } from '@/components/ui/button'
export default function NotFound() { return <Shell title="Page not found"><Button asChild><Link href="/event">Back to EventPass</Link></Button></Shell> }
