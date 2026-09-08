import type { ComponentProps } from 'react'
export function Badge(props: ComponentProps<'span'>) { return <span {...props} className={`badge ${props.className || ''}`} /> }
