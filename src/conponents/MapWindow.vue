<template>
    <div class="vf-map-window">
        <div v-for="(item, index) of content">
            <div :key="index" class="item-value">
                <label>{{item.label}}:</label>
                <span>{{item.value}}</span>
            </div>
        </div>
    </div>
</template>

<script>
import Marker from "../classes/VFMarker";

export default {
    name: "MapWindow",
    props: {
        content: {
            type: Array,
        },

        marker: {
            type: Marker,
            required: true,
        }
    },
}
</script>

<style scoped>

    .vf-map-window {
        padding: 12px;
    }
    .item-value {
        font-size: 12px;
        line-height: 2;
    }
</style>