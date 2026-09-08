import type { ComponentProps } from 'react'
export function Select(props: ComponentProps<'select'>) { return <select {...props} className={`select ${props.className || ''}`} /> }
