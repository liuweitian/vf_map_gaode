import GaodeMap from './src/GaodeMap'
import _Vue from 'vue'

GaodeMap.install = Vue => {
  if (!Vue) {
    window.Vue = Vue = _Vue
  }
  Vue.component(GaodeMap.name, GaodeMap)
}
export default GaodeMap;
