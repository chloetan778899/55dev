<script setup lang="ts">
import { NoToneMapping, SRGBColorSpace } from 'three'
import TheGlobeScene from './TheGlobeScene.vue'

import { TresCanvas, extend } from '@tresjs/core'
import { 
  Mesh, 
  Group, 
  PerspectiveCamera, 
  SphereGeometry, 
  TubeGeometry, 
  Points, 
  PointsMaterial, 
  MeshBasicMaterial 
} from 'three'

extend({ 
  Mesh, 
  Group, 
  PerspectiveCamera, 
  SphereGeometry, 
  TubeGeometry, 
  Points, 
  PointsMaterial, 
  MeshBasicMaterial 
})
</script>

<template>
  <TresCanvas 
    alpha
    class="w-full h-full block touch-pan-y"
    :tone-mapping="NoToneMapping"
    :output-color-space="SRGBColorSpace"
  >
    <TheGlobeScene />
  </TresCanvas>
</template>