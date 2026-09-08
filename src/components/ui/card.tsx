import type { ComponentProps } from 'react'
import { cn } from '../../shared/utils'
export function Card({ className, ...props }: ComponentProps<'section'>) { return <section className={cn('card', className)} {...props} /> }
