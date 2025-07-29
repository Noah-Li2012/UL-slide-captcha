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
    verifyText = 'Wait, human? Robot?', // NEW option
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

    // Create loading overlay
    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.style.position = 'absolute';
    this.loadingOverlay.style.top = '0';
    this.loadingOverlay.style.left = '0';
    this.loadingOverlay.style.width = '100%';
    this.loadingOverlay.style.height = '100%';
    this.loadingOverlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
    this.loadingOverlay.style.color = '#0ff';
    this.loadingOverlay.style.display = 'flex';
    this.loadingOverlay.style.alignItems = 'center';
    this.loadingOverlay.style.justifyContent = 'center';
    this.loadingOverlay.style.fontSize = '1.5rem';
    this.loadingOverlay.style.zIndex = '1000';
    this.loadingOverlay.textContent = 'Loading...';
    this.loadingOverlay.style.borderRadius = '12px';
    this.loadingOverlay.style.userSelect = 'none';

    this.container.style.position = 'relative'; // for loading overlay positioning
    this.container.appendChild(this.loadingOverlay);

    this.init();
  }

  init() {
    // Add or update verify text element above slider
    let verifyTextEl = this.container.querySelector('.verify-text');
    if (!verifyTextEl) {
      verifyTextEl = document.createElement('div');
      verifyTextEl.className = 'verify-text';
      verifyTextEl.style.color = '#0ff';
      verifyTextEl.style.textAlign = 'center';
      verifyTextEl.style.marginBottom = '6px';
      verifyTextEl.style.fontWeight = '600';
      verifyTextEl.style.fontSize = '1.2rem';
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

  open() {
    this.container.style.display = 'block';
    this.init();
  }

  close() {
    this.container.style.display = 'none';
  }
}
