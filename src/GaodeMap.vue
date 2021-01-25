<template>
    <div class="vf-map-container" :id="id">
        <!-- POI 搜索框 -->
        <div class="vf-map-search" v-if="!hasSlot('poiSearch') && this.enablePoiSearch">
            <input :id="id + '-search-input'" type="text" placeholder="请输入地点信息"/>
        </div>

        <div class="vf-map-slot-container" v-else>
            <slot name="poiSearch"></slot>
        </div>

        <!-- 消息窗口 -->
        <div :ref="id + '-window'" class="vf-map-window">
            <component
                v-if="currentMarker && currentMarker.window"
                v-bind:is="currentMarker.window.view"
                v-bind="currentMarker.window.viewOptions || {}"
                v-on="currentMarker.window.events || {}"
                :marker="currentMarker"
            ></component>
        </div>
    </div>
</template>

<script>
import image from './assets/poi-icon.png'
import './assets/common.css'
import AMapLoader from '@amap/amap-jsapi-loader'
import Marker from "./classes/VFMarker";
import MapWindow from "./conponents/MapWindow";
import Track from "./classes/VFTrack";

export default {
    name: "vf-map-gaode",

    props: {
        /**
         * 地图激活key
         */
        mapKey: {
            type: String,
            required: true,
        },

        /**
         * 地图初始化参数
         * 即高德地图 new AMap.Map() 的第二个参数
         */
        mapOptions: {
            type: Object,
        },

        /**
         * 需要加载的插件
         * 格式：
         * [
         *      {
         *          "name": "AMap.Scale", // 必传
         *          "options": {}, // 实例化插件时需要的参数
         *          "handler": Function, // 插件加载函数，此时未实例化，华位地图已经封装好了一部分
         *      }
         * ]
         *
         * @see https://lbs.amap.com/api/jsapi-v2/guide/abc/plugins#plugins
         */
        pluginList: {
            type: Array,
        },
    },

    data() {
        return {
            // ID
            id: 'map-' + (Math.random() * 10000000).toFixed(0),

            // 地图实例
            jMap: undefined,

            // 地图初始类
            AMap: undefined,

            // 覆盖物列表
            // 格式： { 覆盖物ID: VFMarker类实例 }
            markerList: {},

            // 渲染覆盖物间隔，毫秒
            // 调用覆盖物 reader 方法时，为了避免高频渲染，此时并不会直接渲染进地图里
            // 而是将 VFMarker 实例 的 isReader 设置为 false
            // 在当前倒计时结束后，通过一个 for 将所有 isRender = false 的覆盖物全部渲染进地图里
            renderMarkerInterval: 500,

            // 渲染覆盖物定时器实例
            renderMarkerInstance: undefined,

            // 当前的覆盖物，主要用于渲染 window
            currentMarker: undefined,

            /**
             * PathSimplifier 类
             * @see https://lbs.amap.com/api/amap-ui/reference-amap-ui/mass-data/pathsimplifier
             */
            PathSimplifier: undefined,

            // 当前轨迹回放实例
            currentTrack: undefined,

            // 是否显示 POI 搜索框
            enablePoiSearch: false,

            // 鼠标绘制实例
            drawInstance: undefined,

            // 已绘制的内容
            drawOverlayList: {}
        };
    },

    methods: {
        /**
         * 地图初始化方法
         * 自动调用
         */
        init() {
            AMapLoader.load({
                key: this.mapKey,
                version: "1.4.15",
                AMapUI: {
                    version: '1.1',
                }
            }).then(AMap => {
                this.AMap = AMap

                // 实例化高德地图
                this.jMap = new this.AMap.Map(this.id, Object.assign({
                    // 预置参数
                    rotateEnable: false,
                    resizeEnable: false,
                    jogEnable: false,
                    showBuildingBlock: false,
                    buildingAnimation: false,
                }, this.mapOptions))

                // 加载插件
                if (Array.isArray(this.pluginList) && this.pluginList.length > 0) {
                    this.AMap.plugin(this.pluginList.map(config => typeof config === 'object' ? config.name : config), () => {
                        this.onPluginLoaded();
                    })
                }

                // 触发完成事件
                this.$emit('onCreated', {
                    map: this.jMap,
                    Map: this.AMap,
                })
            })
        },

        /**
         * 返回是否包含某个插槽
         * @return {boolean}
         */
        hasSlot(name = 'default') {
            return !!this.$slots[name];
        },

        /**
         * 插件添加的通用处理方法
         */
        onPluginCommon(config) {
            let methodName = 'onPlugin' + (config.name.replace('AMap.', ''))
            if (typeof this[methodName] === 'function') {
                this[methodName](config)
                return undefined
            }

            let instance = new this.AMap[(config.name.replace('AMap.', ''))](config.options || {})
            this.jMap.addControl(instance)
        },

        /**
         * 开启地理区域搜索
         */
        onPluginAutocomplete() {
            // 设置允许默认 POI 搜素面板展示
            this.enablePoiSearch = true

            this.$nextTick(() => {
                let auto = new this.AMap.Autocomplete({
                    input: this.id + '-search-input'
                })
                this.AMap.event.addListener(auto, "select", (event) => {
                    let poi = event.poi
                    if (poi.location) {
                        let id = 'vf-search-poi'
                        this.removeMarker(id)
                        this.addMarker({
                            id,
                            position: {
                                lng: poi.location.lng,
                                lat: poi.location.lat
                            },
                            autoCenter: true,
                            image,
                            size: {
                                width: 24,
                                height: 24,
                            },
                            window: {
                                view: MapWindow,
                                viewOptions: {
                                    content: [
                                        {
                                            label: '名称',
                                            value: poi.name
                                        },
                                        {
                                            label: '地址',
                                            value: poi.district + poi.address
                                        },
                                    ]
                                }
                            },
                        })
                    }
                })
            })
        },
        /**
         * 留空，表示不处理，该方法不可删除
         */
        onPluginPlaceSearch() {
        },

        /**
         * 插件加载完成
         */
        onPluginLoaded() {
            for (let config of this.pluginList) {
                if (typeof config === 'object' && typeof config.handler === 'function') {
                    config.handler(config.options || {})
                    continue
                }
                this.onPluginCommon(config)
            }

            this.$emit('onPluginLoaded', {
                map: this.jMap,
                Map: this.AMap,
            })
        },

        /**
         * 添加覆盖物
         * @param {string} id 覆盖物ID，唯一值
         * @param {string} image 覆盖物图片，图片链接
         * @param {int} direction 覆盖物图片朝向，0代表正北
         * @param {{lng, lat}} position 覆盖物位置, { lng: Number, lat: Number }
         * @param {{width, height}} size 覆盖物尺寸，{ width: 32, height: 32 }
         * @param {array} related 相关的覆盖物ID列表，[String,String]
         * @param {{view, viewOptions, events}} window 消息窗口，{ view: Vue, viewOptions: Object, events: Object }
         * @param {object} events 覆盖物事件，{ onClick: Function, onRendered: Function }
         * @param {boolean} autoCenter 自动居中
         * @param {boolean} autoOpen 自动打开窗口
         */
        addMarker({
                      id,
                      image,
                      direction = 0,
                      position,
                      size,
                      window,
                      events,
                      related = [],
                      autoCenter = false,
                      autoOpen = true
                  }) {
            clearInterval(this.renderMarkerInterval)

            let marker = new Marker(this)
            marker.id = id
            marker.image = image
            marker.position = position
            marker.direction = direction
            marker.size = size
            marker.related = related
            marker.window = window
            marker.events = events
            marker.autoCenter = autoCenter
            marker.autoOpen = autoOpen

            let markers = {}
            markers[id] = marker

            this.markerList = Object.assign({}, this.markerList, markers)

            this.renderMarkerInstance = setTimeout(() => {
                this.renderMarkers()
            }, this.renderMarkerInterval)
        },

        /**
         * 根据ID获取覆盖物
         * @param {string} id
         */
        getMarker(id) {
            return this.markerList[id]
        },

        /**
         * 移除覆盖物
         * @param {string} id
         */
        removeMarker(id) {
            let marker = this.getMarker(id)
            if (marker) {
                marker.onDestroy()
                delete this.markerList[id]
            }
        },

        /**
         * 移除全部覆盖物
         */
        removeMarkers() {
            for (let id in this.markerList) {
                this.markerList[id].onDestroy()
            }
            this.markerList = {}
        },

        /**
         * 渲染覆盖物
         */
        renderMarkers() {
            // 高德地图覆盖物实例列表
            let markerInstances = []

            // 需要居中的覆盖物
            // 只居中最后一个
            let centerMarker = undefined
            // 自动打开的 window
            // 只打开最后一个
            let openMarker = undefined

            for (let id in this.markerList) {
                let marker = this.markerList[id]

                // 如果明确标记为未渲染的，才进行渲染
                if (marker.isRender === false) {
                    // 将渲染标记设置为已渲染，防止重复渲染
                    marker.isRender = true
                    // 调用渲染方法，生成高德地图覆盖物实例
                    marker.render(true)
                    // 将实例添加进列表中，稍后进行统一添加
                    markerInstances.push(marker.markerInstance)

                    if (marker.autoCenter === true) {
                        centerMarker = marker
                        delete marker.autoCenter
                    }
                    if (marker.autoOpen === true) {
                        openMarker = marker
                        delete marker.autoOpen
                    }
                }
            }
            if (markerInstances.length) {
                // 将覆盖物添加进地图中
                this.jMap.add(markerInstances)
                // 挨个触发 onRendered 方法，该方法在 Marker.js 中实现
                Object.values(this.markerList).map(marker => {
                    marker.onRendered()
                })
            }

            if (centerMarker) {
                this.jMap.setCenter(centerMarker.getPosition())
            }
            if (openMarker) {
                openMarker.openWindow()
            }
        },

        /**
         * 渲染轨迹
         * 第一次调用时，需要加载轨迹UI，因此该方法返回一个 Promise 实例
         * 通过 .then 或者 await ，可取到一个 Track 类实例
         * 通过 VFTrack 类实例，可使用 getNavInstance 方法，传入轨迹序号，即可拿到一个轨迹播放的实例
         * 轨迹播放的实例，有 start(startPointIndex = 0), pause, resume, stop, destroy 等方法
         * @param {Function} getPath 获取轨迹的方法，该方法有两个参数 pathData, pathIndex，根据着两个值，最终返回一个 [[lng,lat]] 格式的数组
         * @param {Function} getHoverTitle 获取 鼠标停留时 的展示内容，有三个参数 pathData, pathIndex, pointIndex
         * @param {array} trackPoints 轨迹数据，可一次传递多条轨迹，格式为 [{name, path}]，这里的 {name, path}，就是 getPath 和 getHoverTitle 里获取到的 pathData
         * @param {string} lineColor 轨迹线的颜色，可以是任何 css color 支持的值，比如 #fff, white, agb(255, 255, 255), rgba(255, 255, 255, 1)
         * @param {int} lineWidth 轨迹线的宽度，宽度大于 5 时，可显示轨迹方向
         * @returns {Promise<>}
         */
        renderTrack({getPath, getHoverTitle, trackPoints, lineWidth, lineColor}) {
            let add = (next) => {
                let track = new Track(this)
                track.getPath = getPath
                track.getHoverTitle = getHoverTitle
                track.trackPoints = trackPoints
                track.lineWidth = lineWidth
                track.lineColor = lineColor
                this.currentTrack = track
                this.currentTrack.render()
                next(this.currentTrack)
            }
            return new Promise(next => {
                if (!this.PathSimplifier) {
                    AMapUI.load(['ui/misc/PathSimplifier'], (PathSimplifier) => {
                        this.PathSimplifier = PathSimplifier
                        add(next)
                    })
                } else {
                    add(next)
                }
            })
        },

        /**
         * 初始化绘制插件
         * @param {function} callback 绘制后的回调函数
         * @param {boolean} force 是否强制初始化
         */
        initDraw(callback, force = false) {
            if (force || !this.drawInstance) {
                // 实例化鼠标绘制
                this.drawInstance = new AMap.MouseTool(this.jMap)
            }

            if( typeof callback === 'function' ) {
                // 监听绘制事件
                this.drawInstance.on('draw', e => {
                    // 添加一个 toJSON 方法，用于将绘制的图形转成类似 GeoJSON 的形式
                    // 圆形没有 GeoJSON，所以返回 Point + radius 的形式
                    e.obj.toJSON = () => {
                        return typeof e.obj.toGeoJSON === 'function' ? e.obj.toGeoJSON() : {
                            geometry: {
                                coordinates: [e.obj.getCenter().lng, e.obj.getCenter().lat],
                                type: 'Point',
                                radius: e.obj.getRadius()
                            },
                            properties: {},
                            type: "Feature"
                        }
                    }
                    callback(e.obj)
                })
            }
        },

        /**
         * 绘制图形
         * 需要开启 AMap.MouseTool 插件
         * @param {string} type 绘制的类型，允许的值有 polygon circle
         * @return {{actionMessage, exit, getOverlayList, clearOverlayList}}
         */
        draw(type) {
            // 生成绘制ID
            let drawId = 'vf-map-draw-' + parseInt( Math.random() * 10000 )

            this.drawOverlayList[drawId] = []

            // 初始化绘制插件
            this.initDraw((item) => {
                if( this.drawOverlayList[drawId] ) {
                    this.drawOverlayList[drawId].push( item.toJSON() )
                }
            })

            let handler = {
                // 操作说明
                actionMessage: '',
                // 退出绘制
                exit: () => {
                    this.jMap.setDefaultCursor('url(https://webapi.amap.com/theme/v1.3/openhand.cur),default');
                    this.drawInstance.close()
                },
                // 获取图形
                getOverlayList: () => {
                    return this.drawOverlayList[drawId]
                },
                // 删除图形
                clearOverlayList: () => {
                    this.jMap.remove( this.drawOverlayList[drawId] )
                    delete this.drawOverlayList[drawId]
                }
            };

            this.jMap.setDefaultCursor('crosshair');

            switch (type) {
                case 'polygon': {
                    this.drawInstance.polygon({
                        fillColor: '#00b0ff',
                        strokeColor: '#80d8ff'
                        //同Polygon的Option设置
                    });
                    handler.actionMessage = '请在地图点击左键进行绘制，点击右键退出绘制'
                    break;
                }
                case 'circle': {
                    this.drawInstance.circle({
                        fillColor: '#00b0ff',
                        strokeColor: '#80d8ff'
                        //同Circle的Option设置
                    });
                    handler.actionMessage = '请在地图拖拽进行绘制，松开鼠标退出绘制'
                    break;
                }
            }

            return handler
        },
    },

    mounted() {
        this.init()
    },

    destroyed() {
        this.jMap.destroy();
    },
}
</script>

<style scoped>

</style>
