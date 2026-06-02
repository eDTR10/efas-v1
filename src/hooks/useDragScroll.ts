import { useRef, useCallback } from 'react'

const INTERACTIVE = new Set(['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA', 'A', 'LABEL'])

export function useDragScroll<T extends HTMLElement>() {
    const ref = useRef<T>(null)
    const state = useRef({ dragging: false, startX: 0, scrollLeft: 0 })

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement
        if (INTERACTIVE.has(target.tagName) || target.closest('button, input, select, textarea, a')) return
        const el = ref.current
        if (!el) return
        state.current = { dragging: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft }
        el.style.cursor = 'grabbing'
        el.style.userSelect = 'none'
    }, [])

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!state.current.dragging) return
        const el = ref.current
        if (!el) return
        const x = e.pageX - el.offsetLeft
        const walk = (x - state.current.startX) * 1.2
        el.scrollLeft = state.current.scrollLeft - walk
    }, [])

    const onMouseUp = useCallback(() => {
        const el = ref.current
        if (!el) return
        state.current.dragging = false
        el.style.cursor = ''
        el.style.userSelect = ''
    }, [])

    return { ref, onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp }
}
