/* Bestemmiometro — genera l'immagine ricordo di fine viaggio.
   Tutto disegnato su canvas: niente librerie, funziona anche offline. */
(function (global) {
  'use strict';

  var W = 1080, H = 1920;
  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  var C = {
    bg: '#0d0f14', card: '#151923', line: '#262c3b',
    text: '#eef1f7', muted: '#98a1b5', accent: '#ff4d3d', gold: '#ffb020'
  };

  function loadImage(src) {
    return new Promise(function (resolve) {
      if (!src) return resolve(null);
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function avatar(ctx, img, name, color, cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (img) {
      var side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, cx - r, cy - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = '#1d2230';
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.fillStyle = color || C.muted;
      ctx.font = '700 ' + Math.round(r * 0.9) + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var parts = String(name || '?').trim().split(/\s+/);
      ctx.fillText(((parts[0] || '?')[0] + (parts[1] ? parts[1][0] : '')).toUpperCase(), cx, cy + 2);
    }
    ctx.restore();
    ctx.strokeStyle = color || C.line;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Manda a capo il testo e restituisce le righe effettivamente usate.
  function wrap(ctx, text, maxWidth, maxLines) {
    var words = String(text || '').split(/\s+/);
    var lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var candidate = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
        if (maxLines && lines.length === maxLines) break;
      } else {
        line = candidate;
      }
    }
    if ((!maxLines || lines.length < maxLines) && line) lines.push(line);
    if (maxLines && lines.length === maxLines) {
      var last = lines[maxLines - 1];
      while (last && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
      if (words.join(' ') !== lines.join(' ')) lines[maxLines - 1] = last + '…';
    }
    return lines;
  }

  function build(s) {
    var photos = (s.podium || []).map(function (p) { return p.photo; });
    return Promise.all(photos.map(loadImage)).then(function (images) {
      var canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      var ctx = canvas.getContext('2d');

      // sfondo
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#2a1116');
      g.addColorStop(0.45, C.bg);
      g.addColorStop(1, '#101722');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      var y = 130;
      ctx.fillStyle = C.muted;
      ctx.font = '600 30px ' + FONT;
      ctx.fillText('BESTEMMIOMETRO', W / 2, y);

      y += 76;
      ctx.fillStyle = C.text;
      ctx.font = '800 62px ' + FONT;
      wrap(ctx, s.title || 'Il viaggio', W - 140, 2).forEach(function (l) {
        ctx.fillText(l, W / 2, y);
        y += 68;
      });

      if (s.period) {
        ctx.fillStyle = C.muted;
        ctx.font = '400 32px ' + FONT;
        ctx.fillText(s.period, W / 2, y);
        y += 40;
      }

      // totale: il numero è alto 200px, serve spazio sopra la linea di base
      y += 200;
      ctx.fillStyle = C.accent;
      ctx.font = '800 200px ' + FONT;
      ctx.fillText(String(s.total || 0), W / 2, y);
      y += 54;
      ctx.fillStyle = C.muted;
      ctx.font = '600 34px ' + FONT;
      ctx.fillText('bestemmie registrate', W / 2, y);

      // riga di statistiche
      y += 110;
      var stats = (s.stats || []).slice(0, 3);
      if (stats.length) {
        var slot = (W - 120) / stats.length;
        stats.forEach(function (st, i) {
          var cx = 60 + slot * i + slot / 2;
          ctx.fillStyle = C.text;
          ctx.font = '800 46px ' + FONT;
          ctx.fillText(String(st.value), cx, y);
          ctx.fillStyle = C.muted;
          ctx.font = '600 24px ' + FONT;
          ctx.fillText(String(st.label).toUpperCase(), cx, y + 36);
        });
      }

      // podio
      y += 210;
      var podium = (s.podium || []).slice(0, 3);
      if (podium.length) {
        var order = [1, 0, 2];         // secondo, primo, terzo
        var xs = [W / 2 - 300, W / 2, W / 2 + 300];
        var radii = [78, 104, 78];
        order.forEach(function (idx, slotIndex) {
          var p = podium[idx];
          if (!p) return;
          var cx = xs[slotIndex];
          var r = radii[slotIndex];
          var cy = y + (slotIndex === 1 ? 0 : 26);
          avatar(ctx, images[idx], p.name, p.color, cx, cy, r);
          ctx.fillStyle = ['#cfd6e4', '#ffd24a', '#d99257'][slotIndex];
          ctx.font = '800 34px ' + FONT;
          ctx.fillText(['2°', '1°', '3°'][slotIndex], cx, cy + r + 46);
          ctx.fillStyle = C.text;
          ctx.font = '700 30px ' + FONT;
          wrap(ctx, p.name, 260, 1).forEach(function (l) { ctx.fillText(l, cx, cy + r + 84); });
          ctx.fillStyle = C.accent;
          ctx.font = '800 40px ' + FONT;
          ctx.fillText(p.count + (p.points ? ' · ' + p.points + ' pt' : ''), cx, cy + r + 130);
        });
        y += 330;
      }

      // riquadro fantasia
      if (s.fantasyName) {
        y += 40;
        ctx.fillStyle = C.card;
        roundRect(ctx, 60, y, W - 120, 160, 28);
        ctx.fill();
        ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = C.gold;
        ctx.font = '700 26px ' + FONT;
        ctx.fillText('RE DELLA FANTASIA', W / 2, y + 56);
        ctx.fillStyle = C.text;
        ctx.font = '800 46px ' + FONT;
        ctx.fillText(s.fantasyName + ' · ' + s.fantasyPoints + ' pt', W / 2, y + 116);
        y += 210;
      }

      // migliore bonus o frase celebre
      var quote = s.bestQuote;
      if (quote && quote.text) {
        var boxTop = y;
        ctx.font = 'italic 400 40px ' + FONT;
        var lines = wrap(ctx, '“' + quote.text + '”', W - 200, 4);
        var boxH = 110 + lines.length * 54;
        ctx.fillStyle = C.card;
        roundRect(ctx, 60, boxTop, W - 120, boxH, 28);
        ctx.fill();
        ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = C.gold;
        ctx.fillRect(60, boxTop + 24, 6, boxH - 48);

        ctx.fillStyle = C.text;
        ctx.font = 'italic 400 40px ' + FONT;
        var ly = boxTop + 78;
        lines.forEach(function (l) { ctx.fillText(l, W / 2, ly); ly += 54; });
        ctx.fillStyle = C.muted;
        ctx.font = '600 28px ' + FONT;
        ctx.fillText('— ' + (quote.author || ''), W / 2, ly + 14);
        y = boxTop + boxH + 40;
      }

      // piede
      ctx.fillStyle = C.muted;
      ctx.font = '500 26px ' + FONT;
      ctx.fillText(s.footer || 'Il contatore ufficiale del roadtrip', W / 2, H - 70);

      return canvas;
    });
  }

  function toBlob(canvas) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) canvas.toBlob(resolve, 'image/png');
      else resolve(null);
    });
  }

  // Prova la condivisione nativa; se non c'è, scarica il file.
  function share(canvas, filename, text) {
    return toBlob(canvas).then(function (blob) {
      if (!blob) throw new Error('Immagine non generata');
      var file = null;
      try { file = new File([blob], filename, { type: 'image/png' }); } catch (e) { file = null; }
      if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        return navigator.share({ files: [file], text: text || '' })
          .then(function () { return 'shared'; })
          .catch(function (err) {
            if (err && err.name === 'AbortError') return 'annullato';
            return download(blob, filename);
          });
      }
      return download(blob, filename);
    });
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return 'scaricato';
  }

  global.Poster = { build: build, share: share, toBlob: toBlob };
})(window);
