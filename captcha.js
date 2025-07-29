class TextCaptcha {
  constructor({
    containerId = 'captcha-popup',
    length = 5,
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  } = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error('Container not found');

    Object.assign(this.container.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#111',
      border: '2px solid #0ff',
      borderRadius: '12px',
      padding: '20px',
      zIndex: '9999',
      maxWidth: '320px',
      boxSizing: 'border-box',
      color: '#0ff',
      textAlign: 'center',
      fontFamily: 'monospace',
      userSelect: 'none',
      display: 'none', // hidden initially
    });

    this.length = length;
    this.chars = chars;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 250;
    this.canvas.height = 80;
    Object.assign(this.canvas.style, {
      border: '1px solid #0ff',
      borderRadius: '8px',
      display: 'block',
      margin: '0 auto 12px auto',
      backgroundColor: '#222',
    });
    this.ctx = this.canvas.getContext('2d');

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.maxLength = this.length;
    Object.assign(this.input.style, {
      width: '100%',
      fontSize: '1.5rem',
      padding: '8px',
      borderRadius: '8px',
      border: '2px solid #0ff',
      backgroundColor: '#000',
      color: '#0ff',
      outline: 'none',
      marginBottom: '12px',
      textAlign: 'center',
      fontFamily: 'monospace',
      letterSpacing: '3px',
    });

    this.verifyBtn = document.createElement('button');
    this.verifyBtn.textContent = 'Verify';
    Object.assign(this.verifyBtn.style, {
      width: '100%',
      padding: '10px',
      fontSize: '1.2rem',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: '#0ff',
      color: '#000',
      cursor: 'pointer',
      userSelect: 'none',
    });

    this.msg = document.createElement('div');
    Object.assign(this.msg.style, {
      marginTop: '12px',
      minHeight: '24px',
      fontWeight: '700',
    });

    this.container.appendChild(this.canvas);
    this.container.appendChild(this.input);
    this.container.appendChild(this.verifyBtn);
    this.container.appendChild(this.msg);

    this.generateText();

    this.verifyBtn.addEventListener('click', () => this.verify());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.verify();
    });
  }

  generateText() {
    this.text = '';
    for (let i = 0; i < this.length; i++) {
      this.text += this.chars.charAt(Math.floor(Math.random() * this.chars.length));
    }
    this.drawText();
  }

  drawText() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < 15; i++) {
      ctx.strokeStyle = 'rgba(0,255,255,' + Math.random() * 0.3 + ')';
      ctx.beginPath();
      ctx.moveTo(Math.random() * this.canvas.width, Math.random() * this.canvas.height);
      ctx.lineTo(Math.random() * this.canvas.width, Math.random() * this.canvas.height);
      ctx.stroke();
    }

    ctx.font = 'bold 42px monospace';
    ctx.fillStyle = '#0ff';
    ctx.textBaseline = 'middle';

    const charSpacing = this.canvas.width / (this.length + 1);

    for (let i = 0; i < this.text.length; i++) {
      const char = this.text[i];
      const x = charSpacing * (i + 1);
      const y = this.canvas.height / 2 + (Math.random() * 10 - 5);
      const angle = (Math.random() * 20 - 10) * (Math.PI / 180);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }

    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = 'rgba(0,255,255,' + Math.random() * 0.3 + ')';
      ctx.beginPath();
      ctx.arc(Math.random() * this.canvas.width, Math.random() * this.canvas.height, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  verify() {
    if (this.input.value.toUpperCase() === this.text) {
      this.msg.style.color = '#0f0';
      this.msg.textContent = '✅ Verified! You are human.';
      this.close();
    } else {
      this.msg.style.color = '#f00';
      this.msg.textContent = '❌ Incorrect! Try again.';
      this.input.value = '';
      this.generateText();
      this.input.focus();
    }
  }

  open() {
    this.container.style.display = 'block';
    this.input.value = '';
    this.msg.textContent = '';
    this.generateText();
    this.input.focus();
  }

  close() {
    setTimeout(() => {
      this.container.style.display = 'none';
    }, 1200);
  }
}
