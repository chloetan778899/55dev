<script setup lang="ts">
import { shallowRef, onMounted, onUnmounted } from 'vue'
import { useRenderLoop } from '@tresjs/core'
import { 
  Vector3, 
  CatmullRomCurve3, 
  MeshBasicMaterial, 
  type Group, 
  type Mesh 
} from 'three'

const globeGroupRef = shallowRef<Group | null>(null)
const orbitRef = shallowRef<Mesh | null>(null)

const radius = 4
const linePoints: Vector3[] = []
for (let i = 0; i <= 100; i++) {
  const theta = (i / 100) * Math.PI * 2
  linePoints.push(new Vector3(
    (radius + 0.5) * Math.cos(theta),
    (radius + 0.5) * Math.sin(theta) * 0.5,
    (radius + 0.5) * Math.sin(theta)
  ))
}
const curve = new CatmullRomCurve3(linePoints)
curve.closed = true

let mouseX = 0
let mouseY = 0
let windowHalfX = window.innerWidth / 2
let windowHalfY = window.innerHeight / 2

const onMouseMove = (event: MouseEvent) => {
  mouseX = (event.clientX - windowHalfX)
  mouseY = (event.clientY - windowHalfY)
}

const onTouchMove = (event: TouchEvent) => {
  if (event.touches.length > 0) {
    mouseX = (event.touches[0].clientX - windowHalfX)
    mouseY = (event.touches[0].clientY - windowHalfY)
  }
}

const onWindowResize = () => {
  windowHalfX = window.innerWidth / 2
  windowHalfY = window.innerHeight / 2
}

onMounted(() => {
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('touchmove', onTouchMove, { passive: true })
  document.addEventListener('touchstart', onTouchMove, { passive: true }) 
  window.addEventListener('resize', onWindowResize)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchstart', onTouchMove)
  window.removeEventListener('resize', onWindowResize)
})

const { onLoop } = useRenderLoop()

onLoop(({ elapsed }) => {
  if (globeGroupRef.value) {
    globeGroupRef.value.rotation.y += 0.002

    const targetRotationY = mouseX * 0.0001
    const targetRotationX = mouseY * 0.0001

    globeGroupRef.value.rotation.y += 0.05 * (targetRotationY - globeGroupRef.value.rotation.y)
    globeGroupRef.value.rotation.x += 0.05 * (targetRotationX - globeGroupRef.value.rotation.x)
    
    if (orbitRef.value && orbitRef.value.material instanceof MeshBasicMaterial) {
      orbitRef.value.material.opacity = 0.5 + Math.sin(elapsed * 1.5) * 0.2
    }
  }
})
</script>

<template>
  <TresPerspectiveCamera :position="[0, 0, 15.5]" :fov="45" />
  
  <TresGroup ref="globeGroupRef">
    <TresPoints>
      <TresSphereGeometry :args="[4, 64, 64]" />
      <TresPointsMaterial color="#635bff" :size="0.08" transparent :opacity="0.8" />
    </TresPoints>

    <TresMesh ref="orbitRef" :rotation-x="Math.PI / 4">
      <TresTubeGeometry :args="[curve, 64, 0.02, 8, true]" />
      <TresMeshBasicMaterial color="#ffc400" />
    </TresMesh>
  </TresGroup>
</template>