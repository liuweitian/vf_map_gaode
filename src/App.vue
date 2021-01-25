<template>
    <div id="app">
        <gaode-map
            map-key="ecceb2d076bfdb2017733836f7f9e100"
            ref="map"
            @onCreated="onCreated"
            :plugin-list="pluginList"
        >
        </gaode-map>
    </div>
</template>

<script>
import GaodeMap from "./GaodeMap";
import MapWindow from "./conponents/MapWindow";

export default {
    components: {GaodeMap},

    data() {
        return {
            pluginList: [
                // {
                //     name: 'AMap.PlaceSearch'
                // },
                {
                    name: 'AMap.MouseTool'
                },
            ]
        }
    },

    methods: {
        onCreated() {
            let handler = this.$refs.map.draw('circle')

            setTimeout(() => {
                handler.clearOverlayList()
                handler.exit()
            }, 5000)
        }
    }
}
</script>

<style>
html, body {
    margin: 0;
    height: 100%;
}

#app {
    height: 100%;
}
</style>
