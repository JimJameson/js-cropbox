var Cropbox = (function(window, document) {
    "use strict";  
    // const
    var VERSION = '0.9.0',
        EVENT_MOUSE_DOWN = 'mousedown',
        EVENT_MOUSE_MOVE = 'mousemove',
        EVENT_MOUSE_UP = 'mouseup',
        EVENT_MOUSE_WHEEL = 'wheel',
        EVENT_RESIZE = 'resize',
        EVENT_CHANGE = 'change',
        EVENT_LOAD = 'load',
        EVENT_CLICK = 'click';
    // default options
    var dO = {
        cb: null,
        inputFile: null,
        btnReset: null,
        btnCrop: null,
        resultContainer: null,
        inputInfo: null,
        messageBlock: null,
        imageOptions: {},
        variants: [
            {
                width: 200,
                height: 200,
                minWidth: 200,
                minHeight: 200,
                maxWidth: 350,
                maxHeight: 350
            }
        ],
        messages: []
    };
    
    /**
     * @param {Object} o
     * @returns {Cropbox}
     */
    function Cropbox(o) {
        this._configurate(o);
        this._initResultBackup();
        this._disableControls();
        this._hideMessage();
        this._initEvents();
    }
    /**
     * @param {Object} o
     */
    Cropbox.prototype._configurate = function(o) {
        /**
         * @type {HTMLElement}
         */
        this._cb = null;
        /**
         * @type {HTMLElement}
         */
        this._inputFile = null;
        /**
         * @type {HTMLElement}
         */
        this._inputInfo = null;
        /**
         * @type {HTMLElement}
         */
        this._btnReset = null;
        /**
         * @type {HTMLElement}
         */
        this._btnCrop = null;
        /**
         * @type {HTMLElement}
         */
        this._messageBlock = null;
        /**
         * @type {HTMLElement}
         */
        this._resultContainer = null;
        /**
         * @type {HTMLElement}
         */
        this._frame = null;
        /**
         * @type {HTMLElement}
         */
        this._image = null;
        /**
         * @type {HTMLElement}
         */
        this._workarea = null;
        /**
         * @type {HTMLElement}
         */
        this._membrane = null;
        /**
         * @type {HTMLElement}
         */
        this._resize = null;
        /**
         * @type {Object}
         */
        this._frameState = {};
        /**
         * @type {Object}
         */
        this._imageState = {};
        /**
         * @type {Object}
         */
        this._resizeState = {};
        /**
         * @type {Image}
         */
        this._sourceImage = new Image;
        /**
         * @type {Object}
         */
        this._imageOptions = {};
        /**
         * @type {Array}
         */
        this._messages = [];
        /**
         * @type {integer}
         */
        this._ratio = 1;
        /**
         * @type {Array}
         */
        this._variants = [];
        /**
         * @type {integer}
         */
        this._indexVariant = 0;
        /**
         * @type {HTMLElement}
         */
        this._backupResultContainer = null;

        // init
        var properties = [
                'cb',
                'inputFile',
                'inputInfo',
                'btnReset',
                'btnCrop',
                'resultContainer'
            ],
            name = null;
        for (var i = 0; i != properties.length; i++) {
            name = properties[i];
            this['_' + name] = typeof o[name] == 'string' ? document.querySelector(o[name]) : o[name];
        }
        this._variants = o.variants || dO.variants;
        this._imageOptions = o.imageOptions || dO.imageOptions;
        this._messages = o.messages || dO.messages;
        if (typeof o.messageBlock != 'undefined') {
            this._messageBlock = typeof o.messageBlock == 'string'
                ? document.querySelector(o.messageBlock)
                : o.messageBlock;
        } else {
            this._messageBlock = dO.messageBlock;
        }
        this._image = this._cb.querySelector('.image-cropbox');
        this._frame = this._cb.querySelector('.frame-cropbox');
        this._workarea = this._cb.querySelector('.workarea-cropbox');
        this._membrane = this._cb.querySelector('.membrane-cropbox');
        this._resize = this._cb.querySelector('.resize-cropbox');
    };
    Cropbox.prototype._initEvents = function() {
        // move frame
        this._attachFrameMouseDownEvent();
        this._attachFrameMouseMoveEvent();
        this._attachFrameMouseUpEvent();
        // resize frame
        this._attachResizeMouseDownEvent();
        this._attachResizeMouseMoveEvent();
        this._attachResizeMouseUpEvent();
        // move image
        this._attachImageMouseDownEvent();
        this._attachImageMouseMoveEvent();
        this._attachImageMouseUpEvent();
        this._attachImageMouseWheelEvent();
        // window resize
        this._attachResizeWorkareaEvent();
        // load image
        this._attachLoadImageEvent();
        // select image from file
        this._attachSelectFromFileEvent();
        // crop image
        this._attachCropImageEvent();
        // reset button
        this._attachResetEvent();
    };
    Cropbox.prototype._attachLoadImageEvent = function() {
        var self = this;
        this._sourceImage.addEventListener(EVENT_LOAD, function() {
            self._image.addEventListener(EVENT_LOAD, function() {
                self._start();
            });
            self._image.src = this.src;
        });
    };
    // TODO: REFACTORING
    Cropbox.prototype._attachSelectFromFileEvent = function() {
        var self = this;
        this._inputFile.addEventListener(EVENT_CHANGE, function() {
            var fileReader = new FileReader();
            fileReader.readAsDataURL(this.files[0]);
            fileReader.addEventListener(EVENT_LOAD, function(fRE) {
                self._sourceImage.src = fRE.target.result;
            });
        });
    };
    Cropbox.prototype._attachCropImageEvent = function() {
        var self = this;
        this._btnCrop.addEventListener(EVENT_CLICK, function() {
            var x = self._frame.offsetLeft - self._image.offsetLeft,
                y = self._frame.offsetTop - self._image.offsetTop,
                frameWidth = self._frame.clientWidth,
                frameHeight = self._frame.clientHeight,
                canvas = document.createElement('canvas'),
                image = null;
            canvas.width = frameWidth;
            canvas.height = frameHeight;
            canvas
                .getContext('2d')
                .drawImage(
                    self._image,
                    0,
                    0,
                    self._sourceImage.width,
                    self._sourceImage.height,
                    -x,
                    -y,
                    self._image.clientWidth,
                    self._image.clientHeight
                );
            var image = canvas.toDataURL('image/png'),
                info = {
                    sWidth: self._sourceImage.width,
                    sHeight: self._sourceImage.height,
                    x: x,
                    y: y,
                    dWidth: self._image.clientWidth,
                    dHeight: self._image.clientHeight,
                    ratio: self._ratio,
                    width: frameWidth,
                    height: frameHeight,
                    image: image
                };
            self._addInfo(info);
            var cImg = document.createElement('img');
            for (var name in self._imageOptions) {
                cImg.setAttribute(name, self._imageOptions[name]);
            }
            cImg.src = image;
            self._addToContainer(cImg);
            if (self._nextVariant()) {
                self._nextMessage();
            }
        });
    };
    Cropbox.prototype._initFrame = function() {
        var variant = this._getCurrentVariant(),
            left = this._workarea.clientWidth / 2 - variant.width / 2,
            top = this._workarea.clientHeight / 2 - variant.height / 2;        
        this._frame.style.width = variant.width + 'px';
        this._frame.style.height = variant.height + 'px';
        this._frame.style.backgroundImage = 'url("' + this._sourceImage.src + '")';
        this._refrashPosFrame(left, top);
    };
    /**
     * @param {number} left
     * @param {number} top
     */
    Cropbox.prototype._refrashPosFrame = function(left, top) {
        var imgLeft = parseFloat(getComputedStyle(this._image)['left']),
            imgTop = parseFloat(getComputedStyle(this._image)['top']),
            x = imgLeft - left,
            y = imgTop - top;
        if (x > 0) {
            x = 0;
            left = imgLeft;
        } else if (this._image.clientWidth + imgLeft < left + this._frame.clientWidth) {
            x = this._frame.clientWith - this._image.clientWidth;
            left = imgLeft + this._image.clientWidth - this._frame.clientWidth;
        }
        if (y > 0) {
            y = 0;
            top = imgTop;
        } else if (this._image.clientHeight + imgTop < top + this._frame.clientHeight) {
            y = this._frame.clientHeight - this._image.clientHeight;
            top = imgTop + this._image.clientHeight - this._frame.clientHeight;
        }
        this._frame.style.left = left + 'px';
        this._frame.style.top = top + 'px';
        this._frame.style.backgroundPosition = x + 'px ' + y + 'px';
    };
    /**
     * @param {number} width
     * @param {number} height
     */
    Cropbox.prototype._refrashSizeFrame = function(width, height) {
        var imgLeft = this._image.offsetLeft,
            imgTop = this._image.offsetTop,
            frameLeft = this._frame.offsetLeft,
            frameTop = this._frame.offsetTop,
            frameWidth = this._frame.clientWidth,
            frameHeight = this._frame.clientHeight,
            variant = this._getCurrentVariant(),
            maxWidth = variant.maxWidth,
            maxHeight = variant.maxHeight,
            minWidth = variant.minWidth,
            minHeight = variant.minHeight;
        // set max width and min width
        if (width > frameWidth && typeof maxWidth == 'undefined') {
            maxWidth = frameWidth;
        } else if (width < frameWidth && typeof minWidth == 'undefined') {
            minWidth = frameWidth;
        }
        if (height > frameHeight && typeof maxHeight == 'undefined') {
            maxHeight = frameHeight;
        } else if (height < frameHeight && typeof minHeight == 'undefined') {
            minHeight = frameHeight;
        }
        // check max and min width
        if (width > maxWidth) {
            width = maxWidth;
        } else if (width < minWidth) {
            width = minWidth;
        }
        if (this._image.clientWidth + imgLeft < frameLeft + width) {
            width = this._image.clientWidth + imgLeft - frameLeft;
        }
        // check max and min height
        if (height > maxHeight) {
            height = maxHeight;
        } else if (height < minHeight) {
            height = minHeight;
        }
        if (this._image.clientHeight + imgTop < frameTop + height) {
            height = this._image.clientHeight + imgTop - frameTop;
        }
        this._frame.style.width = width + 'px';
        this._frame.style.height = height + 'px';
    };
    Cropbox.prototype._attachFrameMouseDownEvent = function() {
        var self = this;
        this._frame.addEventListener(EVENT_MOUSE_DOWN, function(event) {
            self._frameState.dragable = true;
            self._frameState.mouseX = event.clientX;
            self._frameState.mouseY = event.clientY;
        });
    };
    Cropbox.prototype._attachFrameMouseMoveEvent = function() {
        var self = this;
        this._frame.addEventListener(EVENT_MOUSE_MOVE, function(event) {
            if (self._frameState.dragable) {
                var leftOld = self._frame.offsetLeft,
                    topOld = self._frame.offsetTop,
                    left = event.clientX - self._frameState.mouseX + leftOld,
                    top = event.clientY - self._frameState.mouseY + topOld;
                self._frameState.mouseX = event.clientX;
                self._frameState.mouseY = event.clientY;
                self._refrashPosFrame(left, top);
            }
        });
    };
    Cropbox.prototype._attachFrameMouseUpEvent = function() {
        var self = this;
        document.addEventListener(EVENT_MOUSE_UP, function(event) {
            event.preventDefault();
            event.stopPropagation();
            self._frameState.dragable = false;
        });
    };
    Cropbox.prototype._attachResizeMouseDownEvent = function() {
        var self = this;
        this._resize.addEventListener(EVENT_MOUSE_DOWN, function(event) {
            event.stopImmediatePropagation();
            self._resizeState.dragable = true;
            self._resizeState.mouseX = event.clientX;
            self._resizeState.mouseY = event.clientY;
        });
    };
    Cropbox.prototype._attachResizeMouseMoveEvent = function() {
        var self = this;
        document.addEventListener(EVENT_MOUSE_MOVE, function(event) {
            if (self._resizeState.dragable) {
                var widthOld = self._frame.clientWidth,
                    heightOld = self._frame.clientHeight,
                    width = event.clientX - self._resizeState.mouseX + widthOld,
                    height = event.clientY - self._resizeState.mouseY + heightOld;
                self._resizeState.mouseX = event.clientX;
                self._resizeState.mouseY = event.clientY;
                self._refrashSizeFrame(width, height);
            }
        });
    };
    Cropbox.prototype._attachResizeMouseUpEvent = function() {
        var self = this;
        document.addEventListener(EVENT_MOUSE_UP, function(event) {
            event.preventDefault();
            event.stopPropagation();
            self._resizeState.dragable = false;
        });
    };
    Cropbox.prototype._attachImageMouseDownEvent = function() {
        var self = this;
        this._membrane.addEventListener(EVENT_MOUSE_DOWN, function(event) {
            self._imageState.dragable = true;
            self._imageState.mouseX = event.clientX;
            self._imageState.mouseY = event.clientY;
        });
    };
    Cropbox.prototype._attachImageMouseMoveEvent = function() {
        var self = this;
        this._membrane.addEventListener(EVENT_MOUSE_MOVE, function(event) {
            if (self._imageState.dragable) {
                var leftOld = getComputedStyle(self._image)['left'],
                    topOld = getComputedStyle(self._image)['top'],
                    left = event.clientX - self._imageState.mouseX + parseFloat(leftOld),
                    top = event.clientY - self._imageState.mouseY + parseFloat(topOld);
                self._imageState.mouseX = event.clientX;
                self._imageState.mouseY = event.clientY;
                self._refrashPosImage(left, top);

                self._frameState.mouseX = event.clientX;
                self._frameState.mouseY = event.clientY;
                self._refrashPosFrame(
                    parseFloat(getComputedStyle(self._frame)['left']),
                    parseFloat(getComputedStyle(self._frame)['top'])
                );
            }
        });
    };
    Cropbox.prototype._attachImageMouseUpEvent = function() {
        var self = this;
        this._membrane.addEventListener(EVENT_MOUSE_UP, function(event) {
            event.preventDefault();
            event.stopPropagation();
            self._imageState.dragable = false;
        });
    };
    /**
     * @param {number} left
     * @param {number} top
     */
    Cropbox.prototype._refrashPosImage = function(left, top) {
        this._image.style.left = left + 'px';
        this._image.style.top = top + 'px';
    };
    Cropbox.prototype._initImage = function() {
        var left = this._image.clientWidth / 2 - this._workarea.clientWidth / 2,
            top = this._image.clientHeight / 2 - this._workarea.clientHeight / 2;
        this._refrashPosImage(-left, -top);
    };
    Cropbox.prototype._attachResizeWorkareaEvent = function() {
        var self = this;
        window.addEventListener(EVENT_RESIZE, function() {
            self._initRatio();
            self._initImage();
            self._initFrame();
        });
    };
    Cropbox.prototype._attachImageMouseWheelEvent = function() {
        var self = this;
        this._membrane.addEventListener(EVENT_MOUSE_WHEEL, function(event) {
            if (event.deltaY < 0) {
                self._zoomIn();
            } else {
                self._zoomOut();
            }
            event.preventDefault ? event.preventDefault() : (event.returnValue = false);
        });
    };
    Cropbox.prototype._zoomIn = function() {
        this._ratio *= 1.01;
        var width = this._sourceImage.width * this._ratio,
            height = this._sourceImage.height * this._ratio;
        this._zoom(width, height);
        this._refrashPosFrame(this._frame.offsetLeft, this._frame.offsetTop);
    };
    Cropbox.prototype._zoomOut = function() {
        var oldRatio = this._ratio;
        this._ratio *= 0.99;
        var width = this._sourceImage.width * this._ratio,
            height = this._sourceImage.height * this._ratio;
        if (width >= this._frame.clientWidth && height >= this._frame.clientHeight) {
            this._zoom(width, height);
            this._refrashPosFrame(this._frame.offsetLeft, this._frame.offsetTop);
        } else {
            this._ratio = oldRatio;
        }
    };
    /**
     * @param {number} width
     * @param {number} height
     */
    Cropbox.prototype._zoom = function(width, height) {
        this._image.style.width = width + 'px';
        this._image.style.height = height + 'px';
        this._frame.style.backgroundSize = width + 'px ' + height + 'px';
    };
    Cropbox.prototype._initRatio = function() {
        var variant = this._getCurrentVariant();
        if (variant.width > this._sourceImage.width || variant.height > this._sourceImage.height) {
            var wRatio = variant.width / this._sourceImage.width,
                hRatio = variant.height / this._sourceImage.height;
            if (wRatio > hRatio) {
                this._ratio = wRatio;
            } else {
                this._ratio = hRatio;
            }
        } else {
            this._ratio = 1;
        }
        this._zoom(this._sourceImage.width * this._ratio, this._sourceImage.height * this._ratio);
    };
    Cropbox.prototype._showWorkarea = function() {
        this._workarea.style.display = 'block';
    };
    Cropbox.prototype._hideWorkarea = function() {
        this._workarea.style.display = 'none';
    };
    Cropbox.prototype._resetVariant = function() {
        this._indexVariant = 0;
    };
    Cropbox.prototype._getCurrentVariant = function() {
        return this._variants[this._indexVariant];
    };
    /**
     * @returns {boolean}
     */
    Cropbox.prototype._nextVariant = function() {
        if (this._variants.length <= this._indexVariant + 1) {
            this._indexVariant = 0;
            this._stop();
            return false;
        }
        ++this._indexVariant;
        this._initRatio();
        this._initImage();
        this._initFrame();
        return true;
    };
    Cropbox.prototype._setInfo = function(value) {
        this._inputInfo.value = JSON.stringify(value);
    };
    Cropbox.prototype._addInfo = function(value) {
        var data = JSON.parse(this._inputInfo.value);
        data.push(value);
        this._inputInfo.value = JSON.stringify(data);
    };
    Cropbox.prototype._attachResetEvent = function() {
        var self = this;
        this._btnReset.addEventListener(EVENT_CLICK, function() {
            self._resultFromBackup();
            self._setInfo([]);
            self._resetVariant();
            self._hideWorkarea();
            self._disableControls();
            self._hideMessage();
        });
    };
    Cropbox.prototype._start = function() {
        this._emptyResultContainer();
        this._setInfo([]);
        this._resetVariant();
        this._showWorkarea();
        this._initRatio();
        this._initImage();
        this._initFrame();
        this._enableControls();
        this._showMessage();
    };
    Cropbox.prototype._stop = function() {
        this._hideWorkarea();
        this._disableControls();
        this._hideMessage();
    };
    Cropbox.prototype._disableControls = function() {
        this._btnCrop.setAttribute('disabled', 'disabled');
    };
    Cropbox.prototype._enableControls = function() {
        this._btnCrop.removeAttribute('disabled');
    };
    Cropbox.prototype._nextMessage = function() {
        if (!this._showMessage()) {
            this._hideMessage();
        }
    };
    /**
     * @returns {boolean}
     */
    Cropbox.prototype._showMessage = function() {
        if (typeof this._messages[this._indexVariant] != 'undefined' && this._messageBlock !== null) {
            this._messageBlock.innerHTML = this._messages[this._indexVariant];
            this._messageBlock.style.display = 'block';
            return true;
        }
        return false;
    };
    Cropbox.prototype._hideMessage = function() {
        if (this._messageBlock !== null) {
            this._messageBlock.style.display = 'none';
        }
    };
    Cropbox.prototype._initResultBackup = function() {
        this._backupResultContainer = this._resultContainer.cloneNode(true);
    };
    Cropbox.prototype._resultFromBackup = function() {
        this._resultContainer.html(this._backupResultContainer.innerHTML);
    };
    /**
     * @param {HTMLElement} content
     */
    Cropbox.prototype._addToContainer = function(content) {
        this._resultContainer.appendChild(content);
    };
    Cropbox.prototype._emptyResultContainer = function() {
        this._resultContainer.innerHTML = '';
    };
    return Cropbox;
})(window, document);