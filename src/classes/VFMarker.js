
export default class VFMarker {
    constructor(vMap) {
        this.vMap = vMap

        this._id = undefined

        this._position = {lng: 0, lat: 0}

        this._size = {
            width: 32,
            height: 32
        }

        this._image = undefined

        this._direction = 0

        this._related = []

        this._window = undefined

        this._events = undefined

        this.isRender = false

        this._markerInstance = undefined

        this._windowInstance = undefined
    }

    get markerInstance() {
        return this._markerInstance;
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value
        return this
    }

    get direction() {
        return this._direction;
    }

    set direction(value) {
        this._direction = value || this._direction

        if( this.isRender ) {
            this.markerInstance.setAngle( this._direction )
        }
        return this
    }

    get position() {
        return this._position;
    }

    get windowInstance() {
        return this._windowInstance
    }

    set position(value) {
        let oldPosition = this._position
        this._position = value || this._position

        if (this.isRender) {
            let point = this.getPosition()

            // 如果打开了 window ，则将 window 移动过去
            if (this.windowInstance && this.windowInstance.getIsOpen()) {
                this.windowInstance.setPosition(point)
            }

            // 计算新的位置 距离 原位置的距离
            let distance = this.vMap.AMap.GeometryUtil.distance(
                point,
                new this.vMap.AMap.LngLat( oldPosition.lng, oldPosition.lat )
            )

            // 如果距离小于 1000 米，则以 (distance * 2) m/s 的速度 move 过去
            if( distance <= 1000 ) {
                this.markerInstance.moveTo( point,  Math.round( distance * 18 / 5 , 2) )
            } else {
                this.markerInstance.setPosition(point)
            }
        }

        return this
    }

    get size() {
        return this._size;
    }

    set size(value) {
        this._size = value || this._size;
        if (this.isRender) {
            this.markerInstance.setIcon(this.getIcon())
        }
        return this
    }

    get image() {
        return this._image;
    }

    set image(value) {
        this._image = value || this._image;
        if (this.isRender) {
            this.markerInstance.setIcon(this.getIcon())
        }
        return this
    }

    get related() {
        return this._related;
    }

    set related(value) {
        this._related = value || this._related;
        this.isRender = false
        return this
    }

    get window() {
        return this._window;
    }

    set window(value) {
        this._window = value || this._window
        // 如果打开了 window，就需要更新消息窗
        if( this.isRender && this.windowInstance && this.windowInstance.getIsOpen() ) {
            this.openWindow()
        }
        return this
    }

    get events() {
        return this._events;
    }

    set events(value) {
        this._events = value || this._events;
        this.isRender = false
        return this
    }

    /**
     * 根据当前覆盖物的 size，实例化高德地图的 Size
     * @returns {*}
     */
    getSize() {
        return new this.vMap.AMap.Size(this.size.width, this.size.height)
    }

    /**
     * 根据当前的 image，实例化高德地图的 Icon
     * @returns {*}
     */
    getIcon() {
        let iconSize = this.getSize()
        return new this.vMap.AMap.Icon({
            image: this.image,
            size: iconSize,
            imageSize: iconSize
        })
    }

    /**
     * 根据当前的经纬度，实例化高德的 LngLat
     * @returns {*}
     */
    getPosition() {
        return new this.vMap.AMap.LngLat(
            this.position.lng,
            this.position.lat
        )
    }

    /**
     * 显示覆盖物
     */
    show() {
        if (this.isRender) {
            this.markerInstance.show()
        }
    }

    /**
     * 隐藏覆盖物
     */
    hide() {
        if (this.isRender) {
            this.markerInstance.hide()
        }
    }

    /**
     * 打开 window
     * 未配置 window 时，返回 false
     * 配置了 window 但未实例化时，实例化后开启
     * 配置了 window 已实例化时，重新实例化后开启
     */
    openWindow() {
        if( !this.window ) {
            return
        }
        // 由于信息窗口是不定高的，在渲染后直接打开会导致位置不准
        // 这里的解决方式是：
        // 1： 如果地图当前覆盖物为当前覆盖物实例，则直接调用 open ，因为此时已经渲染过了
        // 2： 如果不是，则延迟 100 毫秒，再调用 open
        let timeout = this.vMap.currentMarker && this.vMap.currentMarker.id === this.id ? 0 : 100

        this.vMap.currentMarker = this
        this._windowInstance = new this.vMap.AMap.InfoWindow({
            autoMove: true,
            anchor: 'bottom-center',
            content: this.vMap.$refs[this.vMap.id + '-window'],
        })

        if (timeout) {
            setTimeout(() => {
                this._windowInstance.open(this.vMap.jMap, this.getPosition())
            }, timeout)
        } else {
            this._windowInstance.open(this.vMap.jMap, this.getPosition())
        }
    }

    /**
     * 关闭 window
     */
    closeWindow() {
        if( this.windowInstance && this.windowInstance.getIsOpen() ) {
            this.windowInstance.close()
        }
    }

    /**
     * 将覆盖物添加到地图上
     * @param {boolean} isForce 是否强制渲染
     */
    render(isForce = false) {
        if (isForce === true || this.isRender === false) {

            if (this.markerInstance) {
                this.vMap.jMap.remove(this.markerInstance)
            }

            this._markerInstance = new AMap.Marker({
                icon: this.getIcon(),
                position: this.getPosition(),
                anchor: 'center',
                angle: this.direction,
                offset: new this.vMap.AMap.Pixel(0,0)
            })

            // 监听事件
            this.onEvents()
        }
    }

    /**
     * 绑定地图事件
     * @see https://lbs.amap.com/api/javascript-api/reference/overlay
     */
    onEvents() {
        this.markerInstance.on('click', event => {
            this.openWindow()
            if (this.events && typeof this.events.onClick === 'function') {
                this.events.onClick({
                    marker: this,
                    event,
                });
            }
        })
    }

    /**
     * 当覆盖物添加进地图后触发
     * 由 GaodeMap.vue 的渲染进程触发该方法，所以不在 onEvents 方法里
     */
    onRendered() {
        if (this.events && typeof this.events.onRendered === 'function') {
            this.events.onRendered({
                marker: this,
            });
        }
    }

    /**
     * 当覆盖物被移除时触发
     * 由 GaodeMap.vue 触发
     */
    onDestroy() {
        this.closeWindow()
        this.markerInstance.setMap(null)
    }
}
