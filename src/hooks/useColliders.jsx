import { createContext, useContext, useRef, useCallback } from 'react'

const CollidersContext = createContext(null)

export function CollidersProvider({ children }) {
  const list = useRef([])

  const register = useCallback((meshes) => {
    list.current = [...list.current, ...meshes]
    return () => {
      list.current = list.current.filter((m) => !meshes.includes(m))
    }
  }, [])

  return (
    <CollidersContext.Provider value={{ list, register }}>
      {children}
    </CollidersContext.Provider>
  )
}

export const useColliders = () => useContext(CollidersContext)