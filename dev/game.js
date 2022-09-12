(() => {
  // node_modules/kontra/kontra.mjs
  var noop = () => {
  };
  function removeFromArray(array, item) {
    let index = array.indexOf(item);
    if (index != -1) {
      array.splice(index, 1);
      return true;
    }
  }
  var callbacks$2 = {};
  function emit(event, ...args) {
    (callbacks$2[event] || []).map((fn) => fn(...args));
  }
  var canvasEl;
  var context;
  var handler$1 = {
    get(target, key) {
      if (key == "_proxy")
        return true;
      return noop;
    }
  };
  function getContext() {
    return context;
  }
  function init$1(canvas2, { contextless = false } = {}) {
    canvasEl = document.getElementById(canvas2) || canvas2 || document.querySelector("canvas");
    if (contextless) {
      canvasEl = canvasEl || new Proxy({}, handler$1);
    }
    if (!canvasEl) {
      throw Error("You must provide a canvas element for the game");
    }
    context = canvasEl.getContext("2d") || new Proxy({}, handler$1);
    context.imageSmoothingEnabled = false;
    emit("init");
    return { canvas: canvasEl, context };
  }
  var Animation = class {
    constructor({ spriteSheet: spriteSheet2, frames, frameRate, loop: loop2 = true }) {
      this.spriteSheet = spriteSheet2;
      this.frames = frames;
      this.frameRate = frameRate;
      this.loop = loop2;
      let { width, height, margin = 0 } = spriteSheet2.frame;
      this.width = width;
      this.height = height;
      this.margin = margin;
      this._f = 0;
      this._a = 0;
    }
    clone() {
      return new Animation(this);
    }
    reset() {
      this._f = 0;
      this._a = 0;
    }
    update(dt = 1 / 60) {
      if (!this.loop && this._f == this.frames.length - 1)
        return;
      this._a += dt;
      while (this._a * this.frameRate >= 1) {
        this._f = ++this._f % this.frames.length;
        this._a -= 1 / this.frameRate;
      }
    }
    render({
      x,
      y,
      width = this.width,
      height = this.height,
      context: context2 = getContext()
    }) {
      let row = this.frames[this._f] / this.spriteSheet._f | 0;
      let col = this.frames[this._f] % this.spriteSheet._f | 0;
      context2.drawImage(
        this.spriteSheet.image,
        col * this.width + (col * 2 + 1) * this.margin,
        row * this.height + (row * 2 + 1) * this.margin,
        this.width,
        this.height,
        x,
        y,
        width,
        height
      );
    }
  };
  function factory$b() {
    return new Animation(...arguments);
  }
  function rotatePoint(point, angle) {
    let sin = Math.sin(angle);
    let cos = Math.cos(angle);
    return {
      x: point.x * cos - point.y * sin,
      y: point.x * sin + point.y * cos
    };
  }
  function clamp(min, max, value) {
    return Math.min(Math.max(min, value), max);
  }
  function collides(obj1, obj2) {
    [obj1, obj2] = [obj1, obj2].map((obj) => getWorldRect(obj));
    return obj1.x < obj2.x + obj2.width && obj1.x + obj1.width > obj2.x && obj1.y < obj2.y + obj2.height && obj1.y + obj1.height > obj2.y;
  }
  function getWorldRect(obj) {
    let { x = 0, y = 0, width, height } = obj.world || obj;
    if (obj.mapwidth) {
      width = obj.mapwidth;
      height = obj.mapheight;
    }
    if (obj.anchor) {
      x -= width * obj.anchor.x;
      y -= height * obj.anchor.y;
    }
    if (width < 0) {
      x += width;
      width *= -1;
    }
    if (height < 0) {
      y += height;
      height *= -1;
    }
    return {
      x,
      y,
      width,
      height
    };
  }
  var Vector = class {
    constructor(x = 0, y = 0, vec = {}) {
      this.x = x;
      this.y = y;
      if (vec._c) {
        this.clamp(vec._a, vec._b, vec._d, vec._e);
        this.x = x;
        this.y = y;
      }
    }
    add(vec) {
      return new Vector(this.x + vec.x, this.y + vec.y, this);
    }
    subtract(vec) {
      return new Vector(this.x - vec.x, this.y - vec.y, this);
    }
    scale(value) {
      return new Vector(this.x * value, this.y * value);
    }
    normalize(length = this.length()) {
      return new Vector(this.x / length, this.y / length);
    }
    dot(vec) {
      return this.x * vec.x + this.y * vec.y;
    }
    length() {
      return Math.hypot(this.x, this.y);
    }
    distance(vec) {
      return Math.hypot(this.x - vec.x, this.y - vec.y);
    }
    angle(vec) {
      return Math.acos(this.dot(vec) / (this.length() * vec.length()));
    }
    clamp(xMin, yMin, xMax, yMax) {
      this._c = true;
      this._a = xMin;
      this._b = yMin;
      this._d = xMax;
      this._e = yMax;
    }
    get x() {
      return this._x;
    }
    get y() {
      return this._y;
    }
    set x(value) {
      this._x = this._c ? clamp(this._a, this._d, value) : value;
    }
    set y(value) {
      this._y = this._c ? clamp(this._b, this._e, value) : value;
    }
  };
  function factory$a() {
    return new Vector(...arguments);
  }
  var Updatable = class {
    constructor(properties) {
      return this.init(properties);
    }
    init(properties = {}) {
      this.position = factory$a();
      this.velocity = factory$a();
      this.acceleration = factory$a();
      this.ttl = Infinity;
      Object.assign(this, properties);
    }
    update(dt) {
      this.advance(dt);
    }
    advance(dt) {
      let acceleration = this.acceleration;
      if (dt) {
        acceleration = acceleration.scale(dt);
      }
      this.velocity = this.velocity.add(acceleration);
      let velocity = this.velocity;
      if (dt) {
        velocity = velocity.scale(dt);
      }
      this.position = this.position.add(velocity);
      this._pc();
      this.ttl--;
    }
    get dx() {
      return this.velocity.x;
    }
    get dy() {
      return this.velocity.y;
    }
    set dx(value) {
      this.velocity.x = value;
    }
    set dy(value) {
      this.velocity.y = value;
    }
    get ddx() {
      return this.acceleration.x;
    }
    get ddy() {
      return this.acceleration.y;
    }
    set ddx(value) {
      this.acceleration.x = value;
    }
    set ddy(value) {
      this.acceleration.y = value;
    }
    isAlive() {
      return this.ttl > 0;
    }
    _pc() {
    }
  };
  var GameObject = class extends Updatable {
    init({
      width = 0,
      height = 0,
      context: context2 = getContext(),
      render = this.draw,
      update = this.advance,
      children = [],
      anchor = { x: 0, y: 0 },
      opacity = 1,
      rotation = 0,
      scaleX = 1,
      scaleY = 1,
      ...props
    } = {}) {
      this._c = [];
      super.init({
        width,
        height,
        context: context2,
        anchor,
        opacity,
        rotation,
        scaleX,
        scaleY,
        ...props
      });
      this._di = true;
      this._uw();
      this.addChild(children);
      this._rf = render;
      this._uf = update;
    }
    update(dt) {
      this._uf(dt);
      this.children.map((child) => child.update && child.update(dt));
    }
    render() {
      let context2 = this.context;
      context2.save();
      if (this.x || this.y) {
        context2.translate(this.x, this.y);
      }
      if (this.rotation) {
        context2.rotate(this.rotation);
      }
      if (this.scaleX != 1 || this.scaleY != 1) {
        context2.scale(this.scaleX, this.scaleY);
      }
      let anchorX = -this.width * this.anchor.x;
      let anchorY = -this.height * this.anchor.y;
      if (anchorX || anchorY) {
        context2.translate(anchorX, anchorY);
      }
      this.context.globalAlpha = this.opacity;
      this._rf();
      if (anchorX || anchorY) {
        context2.translate(-anchorX, -anchorY);
      }
      let children = this.children;
      children.map((child) => child.render && child.render());
      context2.restore();
    }
    draw() {
    }
    _pc() {
      this._uw();
      this.children.map((child) => child._pc());
    }
    get x() {
      return this.position.x;
    }
    get y() {
      return this.position.y;
    }
    set x(value) {
      this.position.x = value;
      this._pc();
    }
    set y(value) {
      this.position.y = value;
      this._pc();
    }
    get width() {
      return this._w;
    }
    set width(value) {
      this._w = value;
      this._pc();
    }
    get height() {
      return this._h;
    }
    set height(value) {
      this._h = value;
      this._pc();
    }
    _uw() {
      if (!this._di)
        return;
      let {
        _wx = 0,
        _wy = 0,
        _wo = 1,
        _wr = 0,
        _wsx = 1,
        _wsy = 1
      } = this.parent || {};
      this._wx = this.x;
      this._wy = this.y;
      this._ww = this.width;
      this._wh = this.height;
      this._wo = _wo * this.opacity;
      this._wsx = _wsx * this.scaleX;
      this._wsy = _wsy * this.scaleY;
      this._wx = this._wx * _wsx;
      this._wy = this._wy * _wsy;
      this._ww = this.width * this._wsx;
      this._wh = this.height * this._wsy;
      this._wr = _wr + this.rotation;
      let { x, y } = rotatePoint({ x: this._wx, y: this._wy }, _wr);
      this._wx = x;
      this._wy = y;
      this._wx += _wx;
      this._wy += _wy;
    }
    get world() {
      return {
        x: this._wx,
        y: this._wy,
        width: this._ww,
        height: this._wh,
        opacity: this._wo,
        rotation: this._wr,
        scaleX: this._wsx,
        scaleY: this._wsy
      };
    }
    set children(value) {
      this.removeChild(this._c);
      this.addChild(value);
    }
    get children() {
      return this._c;
    }
    addChild(...objects2) {
      objects2.flat().map((child) => {
        this.children.push(child);
        child.parent = this;
        child._pc = child._pc || noop;
        child._pc();
      });
    }
    removeChild(...objects2) {
      objects2.flat().map((child) => {
        if (removeFromArray(this.children, child)) {
          child.parent = null;
          child._pc();
        }
      });
    }
    get opacity() {
      return this._opa;
    }
    set opacity(value) {
      this._opa = value;
      this._pc();
    }
    get rotation() {
      return this._rot;
    }
    set rotation(value) {
      this._rot = value;
      this._pc();
    }
    setScale(x, y = x) {
      this.scaleX = x;
      this.scaleY = y;
    }
    get scaleX() {
      return this._scx;
    }
    set scaleX(value) {
      this._scx = value;
      this._pc();
    }
    get scaleY() {
      return this._scy;
    }
    set scaleY(value) {
      this._scy = value;
      this._pc();
    }
  };
  var Sprite = class extends GameObject {
    init({
      image: image2,
      width = image2 ? image2.width : void 0,
      height = image2 ? image2.height : void 0,
      ...props
    } = {}) {
      super.init({
        image: image2,
        width,
        height,
        ...props
      });
    }
    get animations() {
      return this._a;
    }
    set animations(value) {
      let prop, firstAnimation;
      this._a = {};
      for (prop in value) {
        this._a[prop] = value[prop].clone();
        firstAnimation = firstAnimation || this._a[prop];
      }
      this.currentAnimation = firstAnimation;
      this.width = this.width || firstAnimation.width;
      this.height = this.height || firstAnimation.height;
    }
    playAnimation(name) {
      this.currentAnimation = this.animations[name];
      if (!this.currentAnimation.loop) {
        this.currentAnimation.reset();
      }
    }
    advance(dt) {
      super.advance(dt);
      if (this.currentAnimation) {
        this.currentAnimation.update(dt);
      }
    }
    draw() {
      if (this.image) {
        this.context.drawImage(
          this.image,
          0,
          0,
          this.image.width,
          this.image.height
        );
      }
      if (this.currentAnimation) {
        this.currentAnimation.render({
          x: 0,
          y: 0,
          width: this.width,
          height: this.height,
          context: this.context
        });
      }
      if (this.color) {
        this.context.fillStyle = this.color;
        this.context.fillRect(0, 0, this.width, this.height);
      }
    }
  };
  function factory$8() {
    return new Sprite(...arguments);
  }
  function clear(context2) {
    let canvas2 = context2.canvas;
    context2.clearRect(0, 0, canvas2.width, canvas2.height);
  }
  function GameLoop({
    fps = 60,
    clearCanvas = true,
    update = noop,
    render,
    context: context2 = getContext(),
    blur = false
  } = {}) {
    if (!render) {
      throw Error("You must provide a render() function");
    }
    let accumulator = 0;
    let delta = 1e3 / fps;
    let step = 1 / fps;
    let clearFn = clearCanvas ? clear : noop;
    let last, rAF, now, dt, loop2;
    let focused = true;
    if (!blur) {
      window.addEventListener("focus", () => {
        focused = true;
      });
      window.addEventListener("blur", () => {
        focused = false;
      });
    }
    function frame() {
      rAF = requestAnimationFrame(frame);
      if (!focused)
        return;
      now = performance.now();
      dt = now - last;
      last = now;
      if (dt > 1e3) {
        return;
      }
      emit("tick");
      accumulator += dt;
      while (accumulator >= delta) {
        loop2.update(step);
        accumulator -= delta;
      }
      clearFn(context2);
      loop2.render();
    }
    loop2 = {
      update,
      render,
      isStopped: true,
      start() {
        last = performance.now();
        this.isStopped = false;
        requestAnimationFrame(frame);
      },
      stop() {
        this.isStopped = true;
        cancelAnimationFrame(rAF);
      },
      _frame: frame,
      set _last(value) {
        last = value;
      }
    };
    return loop2;
  }
  function parseFrames(consecutiveFrames) {
    if (+consecutiveFrames == consecutiveFrames) {
      return consecutiveFrames;
    }
    let sequence = [];
    let frames = consecutiveFrames.split("..");
    let start = +frames[0];
    let end = +frames[1];
    let i = start;
    if (start < end) {
      for (; i <= end; i++) {
        sequence.push(i);
      }
    } else {
      for (; i >= end; i--) {
        sequence.push(i);
      }
    }
    return sequence;
  }
  var SpriteSheet = class {
    constructor({
      image: image2,
      frameWidth,
      frameHeight,
      frameMargin,
      animations
    } = {}) {
      if (!image2) {
        throw Error("You must provide an Image for the SpriteSheet");
      }
      this.animations = {};
      this.image = image2;
      this.frame = {
        width: frameWidth,
        height: frameHeight,
        margin: frameMargin
      };
      this._f = image2.width / frameWidth | 0;
      this.createAnimations(animations);
    }
    createAnimations(animations) {
      let sequence, name;
      for (name in animations) {
        let { frames, frameRate, loop: loop2 } = animations[name];
        sequence = [];
        if (frames == void 0) {
          throw Error(
            "Animation " + name + " must provide a frames property"
          );
        }
        [].concat(frames).map((frame) => {
          sequence = sequence.concat(parseFrames(frame));
        });
        this.animations[name] = factory$b({
          spriteSheet: this,
          frames: sequence,
          frameRate,
          loop: loop2
        });
      }
    }
  };
  function factory$1() {
    return new SpriteSheet(...arguments);
  }

  // src/levels.js
  var levels = {
    1: {
      0: [],
      32: [],
      64: [],
      96: [],
      128: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      160: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      192: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      224: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      256: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      288: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      320: [0, 0, 2, 0, 0, 3, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 4, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 4, 0, 0, 0, 0, 2, 4, 0, 0, 0, 0, 0, 0, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      352: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 9, 9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 9, 9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      384: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 9, 9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 9, 9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    },
    2: {
      0: [],
      32: [],
      64: [],
      96: [],
      128: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      160: [0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      192: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      224: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      256: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      288: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      320: [0, 0, 6, 0, 3, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 3, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 3, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      352: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      384: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    },
    3: {
      0: [],
      32: [],
      64: [],
      96: [],
      128: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      160: [0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      192: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      224: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      256: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      288: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      320: [0, 0, 0, 0, 0, 2, 0, 0, 3, 0, 0, 0, 2, 0, 8, 3, 0, 2, 0, 0, 8, 0, 0, 2, 3, 0, 0, 0, 0, 2, 0, 8, 0, 0, 3, 0, 0, 0, 0, 0, 2, 8, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      352: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      384: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    },
    4: {
      0: [],
      32: [],
      64: [],
      96: [],
      128: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      160: [0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      192: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      224: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      256: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      288: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      320: [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 3, 0, 2, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 3, 0, 0, 2, 0, 0, 0, 0, 0, 3, 2, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      352: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      384: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    }
  };

  // src/game.js
  var { canvas } = init$1();
  var paused = false;
  var timerStarted = false;
  var objects = [];
  var currentLevel = 1;
  var building = false;
  var spriteSheet;
  var scene;
  var sprite;
  var watch;
  var watch2;
  var dy = 2;
  var dx = 2;
  var jumpForce = 20;
  var time = 900;
  var currentZombieColIndex;
  var zombieBeatings = 0;
  var zombieHelpings = 0;
  var textSet = false;
  var keys = {
    ArrowRight: false,
    ArrowLeft: false,
    ArrowUp: false,
    space: false,
    x: false
  };
  var textOptions = [
    "Hey bro, can you help me get to class?",
    "I lost my biology syllabus, do you have a copy?",
    "Can you tell me where the bathrooms are?",
    "It's hard to see with my eye like this, can you help fix it?"
  ];
  var levelMapping = {
    1: "ZSU - Parking Lot",
    2: "ZSU - Quad",
    3: "ZSU - Commons",
    4: "ZSU - Biology Building"
  };
  var styleIt = (el, display) => {
    document.getElementById(el).style.display = display;
  };
  var keyPressed = (key) => {
    if (key === " ") {
      return keys["space"];
    }
    return keys[key];
  };
  var image = new Image();
  image.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAWkAAAAaCAMAAABCZF2nAAAC/VBMVEUAAABCOioQbCg9PT+GgXQOZiYhPR1iQCowMBMOEQ5ZdHA7Nxzni9+GeXG2q6EYuEQCAgJBPjilfmsgxE0MaSXQwqCsh3OimpVCNy4WlzpcLw0NEBAcjTq/kXhpZjxgPidUTky7tKxZLQ22rqgOaSdVqm3s5piEe3GMe3BVcIYdrkVqxeUFBQOTkpISEhFJSURXunZZZHMVkjjTzLfx0dFSjFUWFAxNTEZ6kn9kV0+OVUiTdWcXfTMSdC1ZVVGIW0oBn+ZOnWZialcXuERGOywReC3foMujp2triqMSEhC5sKoYrUFJmWB/b2YYgjY7jn3pb6Ld356gfWuNcWPOmXtImVUWoz4yMy1lYU2Qh4NFtOBKimD2YnhQs2/DiWtMfU5ReUJGe8Zlim+ek4s2My3mktuKgHmBMjVVwepSRUE2Y6MtsujWXFSGSTMsmHDCx5PXz7KOkI+9rqHt6ZhxbmwWlzjrbHTo5Kp6MzY1s+Yrd6TfktQ0qdnpnOXQcrfWfK+2ZU7s56J7eHfcmMdHueWwYk+qma13i4EMpOWcPTapKzA1UFzTJCy9aajph9pSWGN6dE2WMyoe5laMlaNUHxh1SSxmJB4d2FGNjY2DLSYyLhJNSChwRyyioaF2dW5ZX2xVRz2DLSVPHBiEjJpybEZeWDZjWiwdHRxraWl6KiJ8g5FEPyEh0FEYnj1fIRywr7BCQkHokOVjaXaUnaudnZ+Tk5LMdF0pKB9XxX6Gf3qBa2uamZZhYF9aWlszMS9NPzmFiot1bWqAglw7OzZUTy2fp7F3fouV2OrolurBzuPHGzHPm35tZFxZUh/tuPDP2NGlkYk64GllmGFMSks2j0rpqOitvtA3xFdXTUh+VzvS5PpakfiD0emTtNqffWy6Z1HfyqCVhIT1ZoE3RVo0rE9wUDpxp8IxuE1thT14nK2fzoGAoWNOvFzCb1ieMDWQm5xv44t8fH6JHx9mOxvjm83577fJe6Z0wGy1aHa0W0zDtdHbg9CMvqPxoIdBVz70WD63AAAAj3RSTlMAISCfQD0Q/WAiEP7+Xlz+gkIh/lcj/r9hf2BDxv393sO9n5t+/fy+pv7+676g/oH+/uQ7EP5pYf7+/v33uKB6J/7fvLueaf78397XiXFpXDXz7dnXwqmKiHr95uTWr6n9+vfn3drataefjWtjSjj207mpn52QfW3308jDup9U39/AupSK99fAkGDfv7+vnxi7/T8AAA1USURBVGje7ZgHVFNXGIBvIkk0gVASCKAQoQwRqlIBRYaKQlFRRK271r3qbF2tbe3ewxjQUCBKawAriYgGA0Y2iFSqKCBalVFRcdTRWkfX6X9fxrthJOk4Pe05/ZLcd99/HvD43p//3fejv4uDiRgYYSDnyCxcRMBmdAUb/SHY8ZGqePiZpKQvvkhK6jwiHatGrII/vgpZRa8+BBbO54cfeiOzMOB/Xrlx48aEBETiwECCZ7799plnNiJTBAJBMCJJ3Iqhxr3k3Lzo5Q70TtCQlOxO8FKmW6+ayYofP9hfJrsau8lp27Yvv9wGdBx1nueOmuMT6BM1ewSyhsc0RTqyNFkDeyGzpKVZMD2DgdC3mGdIEXaj7NgjwsuAqa6uLESTQOlf2cl05xGZY6gHfd59FqZmSDqh4KX27PY6TXjzTRtE4xiVf+eUf0Tk4EZf30nmTK8+7ZNPETWDYZXp/hcprj15qfyvmp7SNCU+zl8poxBOM4ZF4W5KWaNSCsga45AB1oyy08DUadMc2aTpo4Tjo9aYHkSLXlQh6YqKGh7qmqDnS9OPlM4MNnh2u3NKqlRFMpFjzNx163bs2LdvB9BxRMD4fD2Bc600ffKbkydzqqsvXtqf9ddMcyeLmlyFyusPZKD06vU2QzhcJHKTPfjxOtiX3fhxNtIT7KYU3qT0CxtdEcBAjEQs9+CTlF16brVph1E1ilQdYkmqkQowXTpddzJMJpONMEwKmyPpNYcPDytewmSyXMfPXaA+JZWqBjsyAQR88Tmm86g37eMTGOKT7zMXWWe6oHJNznb1mCt/2TQkr8hV9qDlR5UsU+nue8N4AcKb3GSxk35Vtn2p/LVlFDLgJrsO+oVXr7ZMokyvnzIjEWfxwa0U9NxK08GefXeWpe6kOJsh4e00wJMoMgp4lGpWYKD/e68Cb7nZA6ryYYcpiiMi7HNOnDjRAKaF9hhVTAwLJW3DdB4RMCgpqiK15mFNfqCVprfe3a3Vhh/u3580zRbwGQK+Ddy0+fB2YvBtBGyLphnhTeGuyhstLTeFGcKylhuG8BTRlGmy07EPFPVtIWE34mjTkOHHZfMyb/7aMh52J4hEI8Du3gNbE3dhyDnqAhsbBwcT09E1OyUVpckUw8B0sgGeRJJaUPo4ZfqmVFZyAshTSYH69MM6an6TSn/SmTYiUzHNm54XFXX7Xlm+z6jXX+98U0xISAjukNO1P9VWn6m+eLGONs0Qx4a3xzZJ2tvLjra3h+a0L6itFTMs5rSfyM8VCnJj2K1zYd8rhYbwzCa/GCGc+VeARLqBMP3gxs3P5oWcK7sJOT1DJJoMOb1r94Gtu3cn7oYPMR/uZ4c60s/u1i3SdPROEL0zuTvTBbwh1B+VSv1LQuvrVUrsct7ZPXrKG6W/NDQ0/CIVqnTAGdszkz7DdB6p6qE41xqacy80P6rs0KHvPkAmPLX42LFc20+dTEyHJYfJ+4+pHEPnNJuTmUa9MzPTMmA4m5mRnpHpwbZUpyeE92OpoEjPA6Vimavhsk1omtDLDcJXFeck/tOYyADWL7sFx7YpWchuMqQ0Sty1dzdU5gN7oWKQc49+fjYd8UMrvzKYhi9fdKlEzCtN7tJ0tqSCx0tJcYGDveFEhEIYMLLy0hw9RW1S6alTkNERMd5MgDUYm4YbYNK+HZ1HyvTphegp9T25T9l3YPp1Lql5cUPDMdvc3GOLnyJMP1lT0rq7/8Gco3ROu3C2dwHHRb+edilON6HYWD6aGIjtZj8as4FFr5onC7jITcXCIBJve1i1hsyrj3NEwX6iyfANTNy7e9dWvV1yjpCfn52znf5Nbfr5Df0Ymw5ymN7DgZedLZYo9qfvBDrX6ZpsCZDBSxYgtEEmpZH9Rpu+aowK7d1WI0SZhkKx47NtnUcqsSZC0jw/6Y0Rh0D0oUeraNHHbH+GhM61PWZra5tguvbAr4uXCNNpxZztacXF27fDBxwXp8EOxyU6mmHWtJ273/OzhVKWgOXoOnp0vCH87HHRQhxGJIIXbGbOtY9jYnApEE2GuwI6CHINdsk5/G475OWE+HzkhRB/HPLi+3EHLV2JevWUp6TwUvHaTlxXl0qTIU4lkAAKTgoDVw/SdP3ZUj3lp8h4pCXTBiau2TSi+dCh5kPNzxpjL2PHuZDRubm2tosJ02tOrsmZVB17eythmjMMTA9L3749HT7bL9eA6XSOy/oeSEfdHoLC4Ybq4Q6cltWL8kaPdo2LG2y4cx2vVeOwDV6uGh5dBHBobZssZKYAdljsEaLJQxGQCHINdmFOmnb2GjfOy9PTa5wXNQ5YgoCgfqkVFRViCSaz7qyEJvNreq7IxOO575MI079UNsLYVnxYrj1c0Hp4WL1U6a/C+CuVMulgbPrOdUFSN4/jZM0M+w5Ml4W9Q5u2/dkWHB8D3WCbqB6x6ticlsrYnLtG0x6ctPQ0yGkOpDM2nQYTmHoM7/u4Ds7ly5fzDOwxPAuvPK6Wi0L9S0TPw068o6Mhpd3Vci2E1aEq1WhYPbERsNFdra1dEFIWusDb2y1yWrifg4W+h90SJ6dxfP44pxec4O3FnzkBAXbpYtrnWYVl08zBUhAJJbnhRKUSJ3UxaIYF9W9SWYQ3E+PtHWlPmW6c5Otkoe+BmfEIV4/TTc109cjFovEHcvstIqerq6u/qa7+6UyhuToNajnLH0+j+cEo2gPpefq4Vq1Vy+V2iASKhxricnUevgCu8TEI4w765fJAGYW90M1y38PPjqod8OLDgKsJ0DNFTAs1PIaL4SYuNphWwA5hmpWvjBgsk0nzG0404NVHiPYssD9CKZU5Gp/H1ffeRSjyqq+v+b4H9Rw0FO6HwOky2nTw4tx7x3IxP9ve30Kb3nXmTHX1w6ZHiVvNmR62v5Djsjy6t57o7OxCPR4M0rRcK5cPQCQQrs1Ta318proC8Yagex6YDg1lMZkOIbI4tuW+B9cvyGtckCd+8YNeCFpiozOtUdBpbEznr7+mTcMOaXrqHW+WY4z97MqGHH8gBJYmNfVCGVWb9TBf9n0LfE+1bHp8YIii7BAm7FEzolU/9cnLtpDY9+/ff418cqk8c/JMa2v40XKzaw/IaZfhPVAnhi8nlIpa1YHC+gXMDjntXpsX6uOzYMM0/0hD4kBMq9Wq1TPxo+VUJrKi71EwgO/J53t68vHL2U/3RT1Zp9CDTXdXPTD6Os1q8waLKqgRjrAUmgGiS0KUSikQwUJ6nHw3UaNvsJm+B8CdHRW/ekRzc/M7YWFhHsiEhC1btrx2/7UEZFI9vsFUFtHr6WEcDqcvCexy+vZav+hxPQ606R6kUq02L8qnzX4a2bITPF0rp5iJmMRVcadiCwVwwvRS1FzfY8JMG2cbG2dnG/zqxzWazkjBZCskmZndmE7BiM+dS8WmI9hg+qb+itvdTS4pGRUTGYgfwt1o05OC8SbYbN8DYE5E6LnzFJdMsxBSYq2n5zgvRK6nHz48gyH7HsM9HAoZiGDQKAbc+AYUp+kg+tQDetBKn9Up1b4X57YB0UxolcvV6tuJYxDNyqe1cqBjUTfX9xD0KyBARtMpGk05PJdUKBSZii5Ni1M0PF42TywB0zocIxwN51ZSsJ4LAZ/AO1KVNwZyZJLvG0EIY7bvQYFNz39u8/nz88EdjWBty9o1a9duEpj0PQ4cGIPpb2p6T1emo3vvA/r2Th/alWlYHyReu3btypWA1WxEwJ04/0pAQMCFC68gmuB3tdSxbyMSs30PrkDQT8+S1um61MkrzkjRFO0vKtekVGRkV2QYqcg2TnmaovLy7JRUcTYDdQszUCpTAkK4CE7g2XrT859DjPPz55v8bqcXvPh8JyfTvsee5BJM8u06S6Zpq4UupGmCl6ouBCy7UAX6SEbOqqpatmLFrAsrTIJwbEDVhZGIoLu+BwJ6ELyZ44B0d0QATO/XZGlSuoOXVVRXnq3hZdcIULewp97Bzy7KxjlB694wRrvte9D0iYJTmT4bNJgHTJcUYQorC0nTbAdE4jDIxPTO7ky/f6EqgPt21TJT0S9BdCRsX3nJ5KqAfm5AFWm6274HApydnQucdSxc6IkoGD179syC6lGuycrKGtKza8ZmaYo0vKwnevKDUfcwYwIb7e2v+/quW7fJGOy+70ETgoc5E60wrS65u+duyW1T06gj1poOWIGWmdhjfzQrYNkKri6NRw6h68orVQEruAEBXERjpu+BWXprqQO1/fBFIhEGZmmArIFDUDc8MVADhwx8DFmACQhMv/IWn8aBdso00wrTlZVq8FxJm6Y7vqSw5b0sm149a3MfULgZEfQ50h8Z2PwkfQknznquDxp5xSQXzPQ9MC9+dcuF3hoYMnBgVhaIZndbGAZixrKR9VhvmjnRB8ZVp63I6f1H9OwvB9NmWd+5TkP1NLE6ymMIii5c9AQZjF5k+CenE3k3/YiHR59ehXWL6Ji5vgem99KlDAQsf/ED2BKux44day5je40F0J/BYt+DO2fOVHiCaZ+z2rLpRSC5kFJ9t9y8adpquYnpfw42W7dhoP8gQ54gYKP/+XfzOzduiULUDODtAAAAAElFTkSuQmCC";
  image.onload = function() {
    spriteSheet = factory$1({
      image,
      frameWidth: 24,
      frameHeight: 26,
      animations: {
        idle: {
          frames: 0
        },
        walk: {
          frames: [0, 1],
          frameRate: 15
        },
        jump: {
          frames: [1]
        },
        attack: {
          frames: [2],
          frameRate: 5
        },
        ground: {
          frames: [3]
        },
        ground2: {
          frames: [9]
        },
        zombie: {
          frames: [10]
        },
        cart: {
          frames: [4]
        },
        foosball: {
          frames: [13]
        },
        soda: {
          frames: [12]
        },
        desk: {
          frames: [14]
        },
        brain: {
          frames: [11]
        },
        car: {
          frames: [5]
        },
        car2: {
          frames: [6]
        },
        watch: {
          frames: [7]
        },
        watch2: {
          frames: [8]
        }
      }
    });
  };
  function helpStudent() {
    zombieHelpings++;
    time = time + 2;
    styleIt("classmate-text", "none");
    scene.objects.splice(currentZombieColIndex, 1);
    currentZombieColIndex = null;
    styleIt("thanks", "inline");
    setTimeout(() => {
      styleIt("thanks", "none");
    }, 850);
  }
  function buildLevel(levelNumber) {
    objects = [];
    currentLevel = levelNumber;
    if (!timerStarted) {
      setInterval(() => {
        if (!paused) {
          time = time + 1;
        }
      }, 5e3);
      timerStarted = true;
    }
    sprite = factory$8({
      x: 100,
      y: 400 - 80,
      height: 32,
      width: 32,
      animations: spriteSheet.animations,
      player: true
    });
    watch = factory$8({
      x: 32,
      y: 40,
      anchor: { x: 0.5, y: 0.5 },
      width: 96,
      height: 96,
      animations: spriteSheet.animations,
      watch: true,
      timer: true
    });
    watch2 = factory$8({
      x: 4 * 32,
      y: 40,
      anchor: { x: 0.5, y: 0.5 },
      width: 96,
      height: 96,
      animations: spriteSheet.animations,
      watch2: true,
      timer: true
    });
    const level = levels[levelNumber];
    const levelKeys = Object.keys(level);
    levelKeys.forEach((k) => {
      const data = level[k];
      let index = 0;
      data.forEach((d) => {
        switch (d) {
          case 0:
            break;
          case 1:
            let ground = factory$8({
              x: 32 * index,
              y: parseInt(k, 10),
              height: 36,
              width: 32,
              animations: spriteSheet.animations,
              color: currentLevel === 2 ? "green" : null,
              ground: true
            });
            objects.push(ground);
            break;
          case 2:
            let cart = factory$8({
              x: 32 * index,
              y: parseInt(k, 10),
              width: 32,
              height: 32,
              animations: spriteSheet.animations,
              ground: true,
              movable: true
            });
            objects.push(cart);
            break;
          case 3:
            let zombie = factory$8({
              x: 32 * index,
              y: parseInt(k, 10),
              width: 32,
              height: 32,
              animations: spriteSheet.animations,
              zombie: true
            });
            objects.push(zombie);
            break;
          case 4:
            let car = factory$8({
              x: 32 * index,
              y: parseInt(k, 10),
              width: 32,
              height: 32,
              animations: spriteSheet.animations,
              car: true
            });
            objects.push(car);
            let car2 = factory$8({
              x: 32 * index + 32,
              y: parseInt(k, 10),
              width: 32,
              height: 32,
              animations: spriteSheet.animations,
              car2: true
            });
            objects.push(car2);
            break;
          case 5:
            let building2 = factory$8({
              x: 32 * index,
              y: parseInt(k, 10),
              width: 32,
              height: 32,
              color: "orange",
              levelEnd: true
            });
            objects.push(building2);
            break;
          case 6:
            let sprinkler = factory$8({
              x: 32 * index,
              y: parseInt(k, 10) + 25,
              color: "green",
              ground: true,
              sprinkler: true,
              spraying: false
            });
            objects.push(sprinkler);
            break;
          case 8:
            let soda = factory$8({
              x: 32 * index,
              y: parseInt(k, 10) - 12,
              height: 44,
              width: 44,
              ground: true,
              soda: true,
              animations: spriteSheet.animations
            });
            objects.push(soda);
            break;
          case 9:
            let pothole = factory$8({
              x: 32 * index,
              y: parseInt(k, 10) + 2,
              height: 32,
              width: 32,
              color: "black"
            });
            objects.push(pothole);
            break;
          default:
            break;
        }
        index++;
      });
    });
    objects.push(sprite);
    objects.push(watch);
    objects.push(watch2);
    scene = {
      objects
    };
    loop.start();
  }
  function handlePause() {
    const el = document.getElementById("controls");
    const game = document.getElementById("game");
    const timer = document.getElementById("timer");
    const score = document.getElementById("score");
    if (paused) {
      game.style.display = "inline";
      score.style.display = "inline";
      timer.style.display = "inline";
      el.style.display = "none";
      paused = false;
      timerStarted = true;
    } else {
      score.style.display = "none";
      timer.style.display = "none";
      game.style.display = "none";
      el.style.display = "inline";
      paused = true;
      timerStarted = false;
    }
  }
  function moveRight() {
    if (sprite.touchingMovable && !sprite.touchingCartTop && keyPressed("x")) {
      scene.objects.filter((o) => o.spriteCol !== true && !o.player && !o.timer && !o.brain).forEach((o) => {
        if (!sprite.zombieCartCol) {
          o.dx = -dx;
        }
      });
    } else {
      scene.objects.filter((o) => !o.player && !o.timer && !o.brain).forEach((o) => {
        o.dx = -dx;
      });
    }
  }
  function moveLeft() {
    if (sprite.touchingMovable && !sprite.touchingCartTop && keyPressed("x")) {
      scene.objects.filter((o) => o.spriteCol !== true && !o.player && !o.timer && !o.brain).forEach((o) => {
        if (!sprite.zombieCartCol) {
          o.dx = dx;
        }
      });
    } else {
      scene.objects.filter((o) => !o.player && !o.timer && !o.brain).forEach((o) => {
        o.dx = dx;
      });
    }
  }
  function collisionCalc(player, o) {
    const rightBuffer = dx + 2;
    sprite.touchingRight = player.x + player.width >= o.x && player.x + player.width < o.x + rightBuffer;
    sprite.touchingLeft = player.x === o.x + rightBuffer;
    sprite.touchingBottom = player.y === o.y + o.height;
    sprite.touchingMovable = o.movable && sprite.y + sprite.height > o.y;
    sprite.touchingCartTop = o.movable && player.x >= o.x && player.x < o.x + o.width && player.y + player.height <= o.y + o.height && player.y + player.height >= o.y;
    o.spriteCol = sprite.touchingMovable;
  }
  var ticks = 0;
  var bloodSplatter = false;
  var bloodTicks = 0;
  var sprinklerInitiated = false;
  var loop = GameLoop({
    update: function() {
      if (time >= 930) {
        timerStarted = false;
        time = 0;
        styleIt("fail-screen", "flex");
        currentLevel = 1;
      }
      if (bloodSplatter) {
        bloodTicks++;
        if (bloodTicks > 45) {
          const nonBlood = scene.objects.filter((o) => !o.blood);
          scene.objects = nonBlood;
          bloodSplatter = false;
          bloodTicks = 0;
        }
      }
      if (objects.length > 0) {
        building = false;
      }
      if (currentLevel === 2) {
        ticks++;
        if (ticks >= 150 && sprinklerInitiated === false) {
          sprinklerInitiated = true;
          scene.objects.filter((o) => o.sprinkler).forEach((o) => {
            o.spraying = true;
          });
        } else if (ticks >= 300) {
          ticks = 0;
          sprinklerInitiated = false;
          scene.objects.filter((o) => o.sprinkler).forEach((o) => {
            o.spraying = false;
          });
          const nonSpray = scene.objects.filter((o) => !o.spray);
          scene.objects = nonSpray;
        }
      }
      if (currentLevel === 4) {
        ticks++;
        if (ticks >= 150) {
          const brain = factory$8({
            x: canvas.width - 25,
            y: Math.floor(
              Math.random() * (sprite.y - 15 - (sprite.y + sprite.height) + 1) + (sprite.y + sprite.height / 2)
            ),
            width: 32,
            height: 32,
            xVel: Math.floor(Math.random() * (4 - 2 + 1) + 2),
            animations: spriteSheet.animations,
            brain: true
          });
          scene.objects.push(brain);
          ticks = 0;
        }
      }
      sprite.playAnimation("idle");
      watch.playAnimation("watch");
      sprite.colLeft = false;
      sprite.touchingBottom = false;
      sprite.touchingLeft = false;
      sprite.touchingRight = false;
      sprite.touchingMovable = false;
      sprite.zombieCol = false;
      sprite.zombieCartCol = false;
      sprite.dy = 0;
      currentZombieColIndex = null;
      let groundCollision = false;
      scene.objects.forEach((o) => {
        if (o.ground && !o.movable && !o.sprinkler && !o.spray && !o.soda) {
          currentLevel === 1 ? o.playAnimation("ground") : [3, 4].includes(currentLevel) ? o.playAnimation("ground2") : null;
        }
        if (o.soda) {
          o.playAnimation("soda");
        }
        if (o.zombie) {
          o.playAnimation("zombie");
        }
        if (o.movable) {
          currentLevel === 1 ? o.playAnimation("cart") : currentLevel === 3 ? o.playAnimation("foosball") : currentLevel === 4 ? o.playAnimation("desk") : null;
        }
        if (o.car) {
          o.playAnimation("car");
        }
        if (o.car2) {
          o.playAnimation("car2");
        }
        if (o.watch) {
          o.playAnimation("watch");
        }
        if (o.watch2) {
          o.playAnimation("watch2");
        }
        if (o.brain) {
          o.playAnimation("brain");
          o.dx = -dx * o.xVel;
        }
        if (o.spraying) {
          let spray = factory$8({
            x: o.x + Math.floor(Math.random() * 25),
            y: o.y,
            height: 5,
            width: 5,
            ySpeed: Math.floor(Math.random() * 50),
            color: "blue",
            ground: true,
            spray: true
          });
          scene.objects.push(spray);
        }
        if (!o.brain && !o.player) {
          o.dx = 0;
        }
        if (o.movable && !o.player) {
          o.spriteCol = false;
        }
        if (o.movable && !o.player) {
          scene.objects.filter((o2) => o2.zombie).forEach((z) => {
            if (collides(o, z)) {
              o.collides = true;
            } else {
              o.collides = false;
            }
          });
        }
        if (o.spray && !o.player) {
          o.y = o.y - o.ySpeed;
          if (collides(sprite, o)) {
            sprite.y = sprite.y > -10 ? sprite.y - o.ySpeed : sprite.y;
          }
        }
        if (collides(sprite, o) && o.zombie) {
          const index = scene.objects.indexOf(o);
          currentZombieColIndex = index;
          sprite.zombieCol = true;
        }
        if (o.brain && collides(sprite, o) && o.y >= sprite.y) {
          o.dx = 0;
          for (let i = 0; i < 40; i++) {
            const blood = factory$8({
              x: Math.floor(Math.random() * (o.x - 10 - o.x + 1) + o.x),
              y: Math.floor(Math.random() * (o.y + 15 - o.y + 1) + o.y),
              width: 5,
              height: 5,
              color: "red",
              blood: true,
              dx: Math.random() * (1 - -1 + 1) + -1,
              dy: Math.random() * (1 - -1 + 1) + -1
            });
            scene.objects.push(blood);
            bloodSplatter = true;
          }
          const index = scene.objects.indexOf(o);
          scene.objects.splice(index, 1);
          time = time + 1;
        }
        if (!o.player && collides(sprite, o) && o.soda) {
          collisionCalc(sprite, o);
        }
        if (!o.player && collides(sprite, o) && !o.ground || collides(sprite, o) && o.movable) {
          collisionCalc(sprite, o);
        }
        if (!o.player && o.ground && collides(sprite, o)) {
          groundCollision = true;
        }
        if (o.levelEnd && collides(sprite, o)) {
          loop.stop();
          scene.objects = [];
          if (currentLevel === 4) {
            styleIt("game", "none");
            styleIt("score", "none");
            styleIt("end-scene", "inline");
            const timeRemaining = 930 - time;
            const maxScore = 25;
            const armyPowerRaw = zombieHelpings * 2 - zombieBeatings + timeRemaining;
            const armyPower = (armyPowerRaw / maxScore * 100).toFixed(2);
            document.getElementById("army-power").innerText = armyPower;
            document.getElementById("zombie-beatings").innerText = zombieBeatings;
            document.getElementById("zombie-helps").innerText = zombieHelpings;
            document.getElementById("time-remaining").innerText = timeRemaining;
          } else if (!building) {
            building = true;
            styleIt("level-screen", "flex");
            document.getElementById("level-name").innerText = levelMapping[currentLevel + 1];
            setTimeout(() => {
              styleIt("level-screen", "none");
              buildLevel(currentLevel + 1);
            }, 1500);
          }
        }
        if (o.movable) {
          scene.objects.filter((a) => a.zombie || a.soda).forEach((z) => {
            if (collides(o, z) && sprite.x < z.x) {
              sprite.zombieCartCol = true;
            }
          });
        }
      });
      canvas.style.background = [1, 2].includes(currentLevel) ? "skyblue" : currentLevel === 3 ? "gray" : "lightgray";
      if (!sprite.touchingLeft && keyPressed("ArrowLeft")) {
        moveLeft();
        sprite.playAnimation("walk");
      } else if ((sprite.touchingMovable || !sprite.touchingRight) && keyPressed("ArrowRight")) {
        moveRight();
        sprite.playAnimation("walk");
      }
      if (keyPressed("ArrowUp") && groundCollision) {
        sprite.dy = -jumpForce;
      }
      if (keyPressed(" ")) {
        sprite.playAnimation("attack");
        scene.objects.filter((o) => o.zombie).forEach((o) => {
          if (collides(sprite, o)) {
            o.dead = true;
            zombieBeatings++;
          }
        });
      }
      if (!groundCollision) {
        sprite.dy = dy;
        sprite.playAnimation("jump");
        if (sprite.y > 400) {
          time = time + 5;
          sprite.y = 100;
          sprite.x = sprite.x + 64;
        }
      }
      scene.objects = scene.objects.filter((o) => !o.dead);
      if (sprite.zombieCol) {
        !textSet ? document.getElementById("classmate-text-p").innerText = textOptions[Math.floor(Math.random() * textOptions.length)] : null;
        styleIt("classmate-text", "inline");
        textSet = true;
      } else {
        styleIt("classmate-text", "none");
        textSet = false;
      }
      scene.objects.forEach((o) => o.update());
    },
    render: function() {
      const realDigits = time.toString().split("").map(Number);
      document.getElementById("timer").classList.add("time");
      if (realDigits) {
        document.getElementById(
          "timer"
        ).innerText = `${realDigits[0]}:${realDigits[1]}${realDigits[2]}`;
      }
      document.getElementById("score").classList.add("score");
      document.getElementById(
        "score"
      ).innerText = `\u{1F480} - ${zombieBeatings}

\u{1F9DF} - ${zombieHelpings}`;
      scene.objects.forEach((o) => {
        o.render();
      });
    }
  });
  var startGame = () => {
    localStorage.setItem("zsu-started", "true");
    styleIt("level-screen", "flex");
    document.getElementById("level-name").innerText = levelMapping[currentLevel];
    setTimeout(() => {
      styleIt("level-screen", "none");
      buildLevel(1);
    }, 1500);
    styleIt("story", "none");
    styleIt("game", "inline");
  };
  var started = localStorage.getItem("zsu-started");
  if (started) {
    startGame();
  }
  var currentPannel = 0;
  var storyPanels = [
    "There was never a Zombie Apocalypse. There was only The Great War. We won, and we're building a better world with Zombie State University.",
    "With humans eradicated and the undead free to build the lives they always dreamed of, ZSU stands as a pillar of our community's initiative.",
    "And today marks the first day of classes. You, Munchie, better get to class!",
    "Your first class\u2014Biology 101 begins at 09:30. There will be many distractions, but remember one thing...",
    "Don't be late.",
    "Your fellow classmates might slow you down. Cars, sprinklers, flying objects, and more might get in your way. Buy you will persevere because you are the first cohort!",
    "Right and Left arrows move you\n Up arrow jumps\n X allows you to grab and move items (if they are movable)\n Space swings your bat",
    "Engage your fellow classmates by answering their questions along the way, or if you're pressed for time, you can jump over them. And if you're really late, you've got a bat for a reason...",
    "Good luck!"
  ];
  var setPanelText = () => {
    const panelEl = document.getElementById("story-panel");
    panelEl.innerText = storyPanels[currentPannel];
  };
  var changePanel = (dir) => {
    if (currentPannel < 8 && dir === "forward") {
      currentPannel++;
      setPanelText(currentPannel);
    } else if (currentPannel > 0 && dir === "back") {
      currentPannel--;
      setPanelText(currentPannel);
    }
    if (currentPannel === 8 && dir === "forward") {
      const btn = document.getElementById("next-btn");
      btn.innerText = "Play";
      currentPannel++;
    }
    if (currentPannel > 8) {
      startGame();
    }
    if (currentPannel > 0) {
      styleIt("back-btn", "inline");
    } else {
      styleIt("back-btn", "none");
    }
  };
  document.getElementById("help-student").addEventListener("click", helpStudent);
  document.getElementById("next-btn").addEventListener("click", () => changePanel("forward"));
  document.getElementById("back-btn").addEventListener("click", () => changePanel("back"));
  document.getElementById("play-again").addEventListener("click", () => window.location.reload());
  document.getElementById("try-again").addEventListener("click", () => window.location.reload());
  document.getElementById("pause").addEventListener("mouseup", handlePause);
  document.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      keys["space"] = true;
    } else {
      keys[e.key] = true;
    }
  });
  document.addEventListener("keyup", (e) => {
    if (e.key === " ") {
      keys["space"] = false;
    } else {
      keys[e.key] = false;
    }
  });
})();
