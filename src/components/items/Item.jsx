import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'

const TYPES = {
  bone:         { url: '/models/items/Bone.glb',          scale: 0.05,  hand: { pos: [0, 0.001, 0], rot: [0, 0, Math.PI / 2], scale: 0.0005 } },
  bullHorn:     { url: '/models/items/Bull_Horn.glb',     scale: 0.0009,  hand: { pos: [0.0005, 0.001, -0.0005], rot: [0, Math.PI / 2, 0],           scale: 0.000008} },
  fishBone:     { url: '/models/items/Fish_Bone.glb',     scale: 0.5,  hand: { pos: [0, 0.001, 0], rot: [0, 0, 0],           scale: 0.004 } },
  handAxe:      { url: '/models/items/Hand_Axe.glb',       scale: 2,  hand: { pos: [0, 0.001, 0], rot: [0, 0, Math.PI / 2],           scale: 0.015} },
  skeletalHand: { url: '/models/items/Skeletal_Hand.glb', scale: 0.015, hand: { pos: [0.001, -0.00065, -0.002], rot: [0, 0, 0],       scale: 0.00015 } },
  lantern:        { url: '/models/items/Lantern.glb',         scale: 0.5,  hand: { pos: [0, 0.0051, 0.0005], rot: [ Math.PI, Math.PI / 2, 0],           scale: 0.005 } },
}

export function Item({ data, objRef, carrying, color = '#22ff66' }) {

  const type = TYPES[data.type]
  const { scene } = useGLTF(type.url)
  const mats = useRef([])
  const base = useRef([])

  const model = useMemo(() => {
    const c = scene.clone()
    c.userData.item = type  
    c.userData.itemScale = data.scale ?? 0.05  
    const found = []
    const orig = []

    c.traverse((o) => {
      if (!o.isMesh) return
      o.material = o.material.clone()
      orig.push(o.material.color.clone())
      o.material.color.set(color)
      o.castShadow = true
      found.push(o.material)
    })

    mats.current = found
    base.current = orig
    return c
  }, [scene, color])

  const box = new THREE.Box3().setFromObject(model)
  const size = new THREE.Vector3()
  box.getSize(size)
  // console.log(data.type, 'size:', size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2))

  // green on the ground, original colour once picked up
  useEffect(() => {
    const held = data.id === carrying
    mats.current.forEach((m, i) => {
      if (held) m.color.copy(base.current[i])
      else m.color.set(color)
    })
  }, [carrying, color, data.id])

  useFrame((_, delta) => {
    if (data.id === carrying) return
    model.rotation.y += delta * 1.5
  })

  return <primitive ref={objRef} object={model} position={data.position} scale={type.scale} />
}

Object.values(TYPES).forEach((t) => useGLTF.preload(t.url))