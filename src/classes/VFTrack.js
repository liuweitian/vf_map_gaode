export default class VFTrack {
    constructor(vMap) {
        /**
         * GaodeMap.vue 组件
         * @type Vue
         */
        this.vMap = vMap

        /**
         * 获取某个路径点的方法
         * 接收两个参数：pathData, pathIndex
         * @type {Function}
         */
        this._getPath = undefined

        /**
         * 获取轨迹点的 hover 信息
         * 接收三个参数：pathData, pathIndex, pointIndex
         * @type {Function}
         */
        this._getHoverTitle = undefined

        /**
         * 轨迹点列表，格式跟随 getPath 方法而定
         * @type {array} 格式 [ { name: '第一条轨迹', path: [] }, { name: '第二条轨迹', path: [] } ]
         */
        this._trackPoints = undefined

        /**
         * 轨迹实例
         * @type {Object}
         * @private
         */
        this._pathInstance = undefined

        /**
         * 巡航器的播放速度
         * @type {number}
         */
        this._speed = 1000

        /**
         * 当前巡航器
         * @type {Object}
         * @private
         */
        this._currentNavInstance = undefined

        /**
         * 轨迹线的宽度
         * @type {number}
         */
        this._lineWidth = 5

        /**
         * 轨迹线的颜色
         * @type {string}
         */
        this._lineColor = '#409eff'
    }

    /**
     * 获取渲染选项
     * @returns {{eventSupport: boolean, dirArrowStyle: {strokeStyle: string, stepSpace: number}, eventSupportInvisible: boolean, endPointStyle: {radius: number}, pathTolerance: number, startPointStyle: {fillStyle: string, radius: number}, renderAllPointsIfNumberBelow: number, pathLineStyle: {strokeStyle: string, lineWidth: number}}}
     */
    get renderOptions() {
        return {
            // 响应事件，设置为 false（关闭）以提高性能
            eventSupport: true,
            // 被压缩的点是否响应事件，设置为 false（关闭）以提高性能
            eventSupportInvisible: false,
            // 压缩率
            pathTolerance: 2,
            // 轨迹点个数小于该值则不进行压缩
            renderAllPointsIfNumberBelow: 10,
            // 轨迹线的样式
            pathLineStyle: {
                strokeStyle: this.lineColor,
                lineWidth: this.lineWidth
            },
            pathLineSelectedStyle: {
                strokeStyle: this.lineColor,
                lineWidth: this.lineWidth
            },
            // 轨迹方向箭头
            dirArrowStyle: {
                // 颜色
                strokeStyle: '#FFF',
                // 箭头间隔，像素
                stepSpace: 50
            },
            // 开始点的样式
            startPointStyle: {
                radius: 8,
                fillStyle: '#64B3AE'
            },
            // 结束点的样式
            endPointStyle: {
                radius: 8
            },
        }
    }

    get speed() {
        return this._speed
    }

    set speed(value) {
        this._speed = value || this._speed
        if (this._currentNavInstance) {
            this._currentNavInstance.setSpeed(this._speed)
        }
        return this
    }

    get pathInstance() {
        return this._pathInstance
    }

    /**
     * 渲染轨迹
     * @param {int} selectIndex 默认选中的轨迹
     * @returns {Object}
     */
    render(selectIndex = 0) {
        this._pathInstance = new this.vMap.PathSimplifier({
            map: this.vMap.jMap,
            getPath: this.getPath,
            getHoverTitle: this.getHoverTitle,
            data: this.trackPoints,
            renderOptions: this.renderOptions
        })
        this._pathInstance.setSelectedPathIndex(selectIndex);
        return this.pathInstance
    }

    /**
     * 获取巡航器
     * @param {int} index 轨迹序号，trackPoints 的轨迹下标
     * @param {boolean} destroyPrev 是否销毁上一个巡航器
     * @returns {*}
     */
    getNavInstance(index, destroyPrev = false) {
        if( destroyPrev && this._currentNavInstance ) {
            this._currentNavInstance.destroy()
            this._currentNavInstance = undefined
        }
        this.selectPath(index)
        this._currentNavInstance = this._pathInstance.createPathNavigator(index, {
            loop: false,
            speed: this.speed,
            animInterval: 100,
        });
        return this._currentNavInstance
    }

    /**
     * 选中轨迹
     * @param {int} index 轨迹序号
     */
    selectPath(index) {
        this._pathInstance.setSelectedPathIndex(index);
    }

    get getPath() {
        return this._getPath;
    }

    set getPath(value) {
        this._getPath = value;
    }

    get getHoverTitle() {
        return this._getHoverTitle;
    }

    set getHoverTitle(value) {
        this._getHoverTitle = value;
    }

    get trackPoints() {
        return this._trackPoints;
    }

    set trackPoints(value) {
        this._trackPoints = value;
        if (this._pathInstance) {
            this._pathInstance.setData(this.trackPoints)
        }
        return this
    }

    get lineWidth() {
        return this._lineWidth;
    }

    set lineWidth(value) {
        this._lineWidth = value|| this._lineWidth;
    }

    get lineColor() {
        return this._lineColor;
    }

    set lineColor(value) {
        this._lineColor = value || this._lineColor;
    }
}