import { useGLTF } from '@react-three/drei'
import { useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { useColliders } from '../../hooks/useColliders.jsx'

export function House({ url, ground = false, scale = 1, ...props }) {
  const { scene } = useGLTF(url)
  const group = useRef()
  const inner = useRef()
  const { register } = useColliders()

  useLayoutEffect(() => {
    if (!ground || !group.current || !inner.current) return
    inner.current.position.y = 0            // reset before measuring
    group.current.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(scene)
    const s = group.current.getWorldScale(new THREE.Vector3()).y || 1
    inner.current.position.y = -box.min.y / s
  }, [scene, ground, scale])

  useEffect(() => {
    const boxes = []
    scene.traverse((o) => {
      if (!o.isMesh) return
      if (o.name.startsWith('col_')) {
        o.visible = false
        boxes.push(o)
      } else {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    if (boxes.length === 0) scene.traverse((o) => { if (o.isMesh) boxes.push(o) })

    group.current.updateWorldMatrix(true, true)
    return register(boxes)
  }, [scene, register])

  return (
    <group ref={group} scale={scale} {...props}>
      <group ref={inner}>
        <primitive object={scene} />
      </group>
    </group>
  )
}