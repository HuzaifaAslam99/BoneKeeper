import { useGLTF } from '@react-three/drei'
import { useEffect } from 'react'

export function Bone({ objRef, onGrab }) {
  const { scene } = useGLTF('/models/items/Bone.glb')

  useEffect(() => {
    // scene.position.set(0, 0.05, -7)
    scene.position.set(5, 0.5, -8)
    scene.scale.setScalar(0.05)
  }, [scene])

  return (
    <primitive
      ref={objRef}
      object={scene}
      onClick={onGrab}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    />
  )
}