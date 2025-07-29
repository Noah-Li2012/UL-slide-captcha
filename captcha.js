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

    // Style container popup inline
    Object.assign(this.container.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      border: '2px solid #0ff',
      borderRadius: '12px',
      padding: '20px',
      zIndex: '10000',
      maxWidth: '90vw',
      maxHeight: '80vh',
      boxSizing: 'border-box',
      overflow: 'hidden',
      display: 'none', // hidden initially
      flexDirection: 'column',
      alignItems: 'center',
      display: 'flex',
      flexWrap: 'nowrap',
      userSelect: 'none',
    });

    this.imageLink = imageLink;
    this.randomImage = randomImage;
    this.saveResultInLocalStorage = saveResultInLocalStorage;
    this.localStorageKey = localStorageKey;
    this.skipCountKey = skipCountKey;
    this.maxSkips = maxSkips;
    this.pieceSize = pieceSize;
    this.tolerance = tolerance;
    this.verifyText = verifyText;

    // Find or create base canvas
    this.baseCanvas = this.container.querySelector('#base-canvas');
    if (!this.baseCanvas) {
      this.baseCanvas = document.createElement('canvas');
      this.baseCanvas.id = 'base-canvas';
      this.baseCanvas.width = 300;
      this.baseCanvas.height = 150;
      Object.assign(this.baseCanvas.style, {
        borderRadius: '8px',
        marginBottom: '8px',
        display: 'block',
        position: 'relative',
        zIndex: '1',
      });
      this.container.appendChild(this.baseCanvas);
    }

    // Find or create piece canvas
    this.pieceCanvas = this.container.querySelector('#piece-canvas');
    if (!this.pieceCanvas) {
      this.pieceCanvas = document.createElement('canvas');
      this.pieceCanvas.id = 'piece-canvas';
      this.pieceCanvas.width = this.pieceSize;
      this.pieceCanvas.height = this.pieceSize;
      Object.assign(this.pieceCanvas.style, {
        position: 'absolute',
        borderRadius: '8px',
        border: '3px solid #0ff',
        boxSizing: 'border-box',
        top: '50px',
        zIndex: '10',
        cursor: 'grab',
        userSelect: 'none',
      });
      this.container.appendChild(this.pieceCanvas);
    }

    // Find or create verify text div
    this.verifyTextEl = this.container.querySelector('.verify-text');
    if (!this.verifyTextEl) {
      this.verifyTextEl = document.createElement('div');
      this.verifyTextEl.className = 'verify-text';
      Object.assign(this.verifyTextEl.style, {
        color: '#0ff',
        fontWeight: '600',
        fontSize: '1.2rem',
        marginBottom: '8px',
        textAlign: 'center',
        userSelect: 'none',
        width: '100%',
      });
      this.container.appendChild(this.verifyTextEl);
    }
    this.verifyTextEl.textContent = this.verifyText;

    // Find or create slider input
    this.slider = this.container.querySelector('#slider');
    if (!this.slider) {
      this.slider = document.createElement('input');
      this.slider.id = 'slider';
      this.slider.type = 'range';
      this.slider.min = 0;
      this.slider.max = this.baseCanvas.width - this.pieceSize;
      this.slider.value = 0;
      Object.assign(this.slider.style, {
        width: '100%',
        height: '20px',
        borderRadius: '12px',
        accentColor: '#0ff',
        cursor: 'pointer',
        userSelect: 'none',
        marginTop: '8px',
        backgroundColor: '#111',
        outline: 'none',
      });
      this.container.appendChild(this.slider);
    }

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

    this.container.style.position = 'fixed'; // Ensure container is fixed
    this.container.appendChild(this.loadingOverlay);

    // Bind methods
    this.scaleCaptcha = this.scaleCaptcha.bind(this);

    // Event listeners
    this.slider.addEventListener('input', () => this.updatePiecePosition(parseInt(this.slider.value)));
    this.slider.addEventListener('change', () => this.autoVerify());
    this.slider.addEventListener('mouseup', () => this.autoVerify());
    this.slider.addEventListener('touchend', () => this.autoVerify());
    window.addEventListener('resize', this.scaleCaptcha);

    this.init();
  }

  init() {
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
    this.initCaptcha();
  }

  showAlreadyVerified() {
    this.container.innerHTML = '<h3 style="color:#0f0; text-align:center; user-select:none;">✅ Already Verified! Skipped captcha.</h3>';
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

    // random piece x inside canvas width - pieceSize - padding
    this.pieceX = Math.floor(Math.random() * (this.baseCanvas.width - this.pieceSize - 20)) + 20;

    this.img.onload = () => {
      this.showLoading(false);

      this.baseCtx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
      this.baseCtx.drawImage(this.img, 0, 0);

      // cut out piece hole on base
      this.baseCtx.clearRect(this.pieceX, this.pieceY, this.pieceSize, this.pieceSize);

      this.baseCtx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
      this.baseCtx.lineWidth = 3;
      this.baseCtx.strokeRect(this.pieceX, this.pieceY, this.pieceSize, this.pieceSize);

      this.pieceCtx.clearRect(0, 0, this.pieceCanvas.width, this.pieceCanvas.height);
      this.pieceCtx.drawImage(this.img, this.pieceX, this.pieceY, this.pieceSize, this.pieceSize, 0, 0, this.pieceSize, this.pieceSize);

      this.pieceCanvas.style.top = this.pieceY + 'px';

      this.slider.max = this.baseCanvas.width - this.pieceSize;
      this.slider.value = 0;
      this.updatePiecePosition(0);

      this.scaleCaptcha(); // scale if needed
    };

    this.img.onerror = () => {
      this.showLoading(false);
      alert('Failed to load CAPTCHA image. Please try again.');
    };
  }

  updatePiecePosition(val) {
    const maxLeft = this.baseCanvas.width - this.pieceSize;
    const left = Math.min(Math.max(0, val), maxLeft);
    this.pieceCanvas.style.left = left + '
