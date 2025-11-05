import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('px-4', 'py-2')
    expect(result).toBe('px-4 py-2')
  })

  it('should handle conditional classes', () => {
    const result = cn('base-class', false && 'hidden', true && 'visible')
    expect(result).toBe('base-class visible')
  })

  it('should deduplicate tailwind classes', () => {
    const result = cn('p-4', 'p-2')
    // tailwind-merge should keep only the last class
    expect(result).toBe('p-2')
  })

  it('should handle empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle undefined and null values', () => {
    const result = cn('base', undefined, null, 'end')
    expect(result).toBe('base end')
  })

  it('should merge conflicting tailwind classes correctly', () => {
    const result = cn('text-red-500', 'text-blue-500')
    expect(result).toBe('text-blue-500')
  })

  it('should handle arrays of classes', () => {
    const result = cn(['px-4', 'py-2'], 'mx-2')
    expect(result).toBe('px-4 py-2 mx-2')
  })

  it('should handle object notation', () => {
    const result = cn({
      'active': true,
      'disabled': false,
      'hover:bg-blue': true
    })
    expect(result).toContain('active')
    expect(result).toContain('hover:bg-blue')
    expect(result).not.toContain('disabled')
  })
})
