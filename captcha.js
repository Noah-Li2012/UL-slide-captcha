class SlideCaptcha {
  constructor({
    containerId = 'captcha-popup',
    imageLink = '',
    randomImage = true,
    saveResultInLocalStorage = false,
    localStorageKey = 'slideCaptchaVerified',
    skipCountKey = 'slideCaptchaSkipCount',
    maxSkips = 3,
    pieceSize = 50,
    tolerance = 8,
    verifyText = 'Wait, human? Robot?',
  } = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error('Container element not found');

    this.imageLink = imageLink;
    this.randomImage = randomImage;
    this.saveResultInLocalStorage = saveResultInLocalStorage;
    this.localStorageKey = localStorageKey;
    this.skipCountKey = skipCountKey;
    this.maxSkips = maxSkips;
    this.pieceSize = pieceSize;
    this.tolerance = tolerance;
    this.verifyText = verifyText;

    this.baseCanvas = this.container.querySelector('#base-canvas');
    this.pieceCanvas = this.container.querySelector('#piece-canvas');
    this.slider = this.container.querySelector('#slider');
    this.pieceCtx = this.pieceCanvas.getContext('2d');
    this.baseCtx = this.baseCanvas.getContext('2d');

    this.pieceX = 0;
    this.pieceY = 50;

    this.img = new Image();

    // Loading overlay
    this.loadingOverlay = document.createElement('div');
    Object.assign(this.loadingOverlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: '#0ff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.5rem',
      zIndex: '1000',
      borderRadius: '12px',
      userSelect: 'none',
    });
    this.loadingOverlay.textContent = 'Loading...';

    this.container.style.position = 'fixed'; // center and fixed
    this.container.style.top = '50%';
    this.container.style.left = '50%';
    this.container.style.transform = 'translate(-50%, -50%)';
    this.container.style.backgroundColor = 'rgba(0,0,0,0.9)';
    this.container.style.border = '2px solid #0ff';
    this.container.style.borderRadius = '12px';
    this.container.style.padding = '20px';
    this.container.style.display = 'none'; // hidden initially
    this.container.style.zIndex = '10000';
    this.container.style.maxWidth = '90vw';
    this.container.style.maxHeight = '80vh';
    this.container.style.boxSizing = 'border-box';
    this.container.style.overflow = 'hidden';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.alignItems = 'center';

    this.container.appendChild(this.loadingOverlay);

    // Responsive scale
    this.scaleCaptcha = this.scaleCaptcha.bind(this);
    window.addEventListener('resize', this.scaleCaptcha);

    this.init();
  }

  init() {
    // Verify text element
    let verifyTextEl = this.container.querySelector('.verify-text');
    if (!verifyTextEl) {
      verifyTextEl = document.createElement('div');
      verifyTextEl.className = 'verify-text';
      Object.assign(verifyTextEl.style, {
        color: '#0ff',
        textAlign: 'center',
        marginBottom: '6px',
        fontWeight: '600',
        fontSize: '1.2rem',
        userSelect: 'none',
      });
      this.container.insertBefore(verifyTextEl, this.slider);
    }
    verifyTextEl.textContent = this.verifyText;

    if (this.saveResultInLocalStorage) {
      const verified = localStorage.getItem(this.localStorageKey);
      const skipCount = parseInt(localStorage.getItem(this.skipCountKey)) || 0;

      if (verified === 'true' && skipCount < this.maxSkips) {
        localStorage.setItem(this.skipCountKey, skipCount + 1);
        this.showAlreadyVerified();
        return;
      } else if (verified === 'true' && skipCount >= this.maxSkips) {
        localStorage.setItem(this.skipCountKey, 0);
      }
    }

    this.slider.addEventListener('input', () => this.updatePiecePosition(parseInt(this.slider.value)));
    this.slider.addEventListener('change', () => this.autoVerify());
    this.slider.addEventListener('mouseup', () => this.autoVerify());
    this.slider.addEventListener('touchend', () => this.autoVerify());

    this.initCaptcha();
  }

  showAlreadyVerified() {
    this.container.innerHTML = '<h3 style="color:#0f0; text-align:center;">✅ Already Verified! Skipped captcha.</h3>';
  }

  showLoading(show) {
    this.loadingOverlay.style.display = show ? 'flex' : 'none';
  }

  initCaptcha() {
    this.showLoading(true);

    let src = '';
    if (this.randomImage || !this.imageLink) {
      src = 'https://picsum.photos/300/150?random=' + Math.random();
    } else {
      src = this.imageLink;
    }
    this.img.src = src;

    this.pieceX = Math.floor(Math.random() * (this.baseCanvas.width - this.pieceSize - 20)) + 20;

    this.img.onload = () => {
      this.showLoading(false);

      this.baseCtx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
      this.baseCtx.drawImage(this.img, 0, 0);

      this.baseCtx.clearRect(this.pieceX, this.pieceY, this.pieceSize, this.pieceSize);

      this.baseCtx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
      this.baseCtx.lineWidth = 3;
      this.baseCtx.strokeRect(this.pieceX, this.pieceY, this.pieceSize, this.pieceSize);

      this.pieceCtx.clearRect(0, 0, this.pieceCanvas.width, this.pieceCanvas.height);
      this.pieceCtx.drawImage(this.img, this.pieceX, this.pieceY, this.pieceSize, this.pieceSize, 0, 0, this.pieceSize, this.pieceSize);

      this.pieceCtx.strokeStyle = '#0ff';
      this.pieceCtx.lineWidth = 3;
      this.pieceCtx.strokeRect(0, 0, this.pieceSize, this.pieceSize);

      this.pieceCanvas.style.top = this.pieceY + 'px';

      this.slider.value = 0;
      this.updatePiecePosition(0);

      this.scaleCaptcha(); // scale when ready
    };

    this.img.onerror = () => {
      this.showLoading(false);
      alert('Failed to load CAPTCHA image. Please try again.');
    };
  }

  updatePiecePosition(val) {
    const maxLeft = this.baseCanvas.width - this.pieceSize;
    const left = Math.min(Math.max(0, val), maxLeft);
    this.pieceCanvas.style.left = left + 'px';
    this.pieceCanvas.style.top = this.pieceY + 'px';
  }

  autoVerify() {
    const userPos = parseInt(this.slider.value);
    const diff = Math.abs(userPos - this.pieceX);
    if (diff <= this.tolerance) {
      alert('✅ Verified! You matched the puzzle piece!');
      if (this.saveResultInLocalStorage) {
        localStorage.setItem(this.localStorageKey, 'true');
        localStorage.setItem(this.skipCountKey, '0');
      }
      this.close();
    } else {
      alert('❌ Nope, try again!');
      this.slider.value = 0;
      this.updatePiecePosition(0);
    }
  }

  scaleCaptcha() {
    const containerWidth = this.container.clientWidth - 40; // padding offset
    const maxCanvasWidth = this.baseCanvas.width;

    let scaleRatio = 1;
    if (containerWidth < maxCanvasWidth) {
      scaleRatio = containerWidth / maxCanvasWidth;
    }

    this.baseCanvas.style.transform = `scale(${scaleRatio})`;
    this.baseCanvas.style.transformOrigin = 'top left';

    this.pieceCanvas.style.transform = `scale(${scaleRatio})`;
    this.pieceCanvas.style.transformOrigin = 'top left';

    this.slider.style.width = `${containerWidth}px`;
  }

  open() {
    this.container.style.display = 'flex';
    this.init();
  }

  close() {
    this.container.style.display = 'none';
  }
}
