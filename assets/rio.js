/* Rio · shared behaviour */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hero dot choreography — one engine, per-page designs (data-hero-anim)
  var hero = document.querySelector('.hero, .page-hero');
  if (hero && !hero.getAttribute('data-hero-anim')) hero = null;
  if (hero) {
    var mode = hero.getAttribute('data-hero-anim');
    var wrap = document.createElement('div');
    wrap.className = 'hero-anim';
    wrap.setAttribute('aria-hidden', 'true');
    var canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    hero.insertBefore(wrap, hero.firstChild);

    var ctx = canvas.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 0, H = 0, parts = [];
    var PAL = ['28,107,255', '42,168,201', '127,176,255', '90,120,180'];
    var TAU = Math.PI * 2;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function pick(arr) { return arr[Math.random() * arr.length | 0]; }

    // ── Flow-field sphere (XFX-style particle sphere, Rio palette) ──
    // Positions rotate rigidly (density never degrades); the swirl field
    // drives dash orientation + a bounded shimmer; a drifting, breathing
    // alpha "eye" recreates the opening in the reference animation.
    var SP = { R: 0, cx: 0, cy: 0, tilt: 0.16,
               ax: 0.22, ay: 0.95, az: 0.16, w: 0.10 };
    (function () { // normalize the rotation axis once
      var l = Math.sqrt(SP.ax * SP.ax + SP.ay * SP.ay + SP.az * SP.az);
      SP.ax /= l; SP.ay /= l; SP.az /= l;
    })();
    // pointer interaction: stir the field under the cursor
    var MS = { x: -1, y: -1, fx: -1, fy: -1, on: false, amt: 0, mx: 0, my: 0, mz: 0 };
    if (mode === 'sphere' || mode === 'wave' || mode === 'flow' || mode === 'vortex' || mode === 'lattice') {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        MS.x = e.clientX - r.left; MS.y = e.clientY - r.top;
        if (MS.fx < 0) { MS.fx = MS.x; MS.fy = MS.y; }
        MS.on = true;
      });
      hero.addEventListener('pointerleave', function () { MS.on = false; });
    }
    // 2D lagged stir for flat modes: displaces a point and bends its dash
    function stir2d(pt) {
      var dxm = pt.x - MS.fx, dym = pt.y - MS.fy;
      var d2 = dxm * dxm + dym * dym;
      var g = Math.exp(-d2 / 12800); // ~80px falloff
      if (g < 0.01) return;
      var d = Math.sqrt(d2) + 1e-6;
      var k = MS.amt * g;
      var awx = dxm / d, awy = dym / d;
      pt.x += k * (13 * awx - 8 * awy);
      pt.y += k * (13 * awy + 8 * awx);
      var b = Math.min(1, k * 1.4);
      pt.dx = pt.dx * (1 - b) + (-awy) * b * pt.L;
      pt.dy = pt.dy * (1 - b) + (awx) * b * pt.L;
    }
    function vortexCenter(k, t, c) {
      var ph = k ? 2.6 : 0.4;
      var th = 1.05 + 0.35 * Math.sin(t * 0.023 + ph);
      var fi = t * (k ? -0.017 : 0.021) + ph;
      c.x = Math.sin(th) * Math.cos(fi); c.y = Math.cos(th); c.z = Math.sin(th) * Math.sin(fi);
    }
    var C1 = { x: 0, y: 0, z: 0 }, C2 = { x: 0, y: 0, z: 0 };
    function sphereField(p, out) {
      // rigid rotation component
      out.x = SP.w * (SP.ay * p.z - SP.az * p.y);
      out.y = SP.w * (SP.az * p.x - SP.ax * p.z);
      out.z = SP.w * (SP.ax * p.y - SP.ay * p.x);
      // two counter-spinning vortices → fingerprint streamlines
      for (var k = 0; k < 2; k++) {
        var c = k ? C2 : C1, sgn = k ? -1 : 1;
        var dot = p.x * c.x + p.y * c.y + p.z * c.z;
        var d = Math.acos(Math.max(-1, Math.min(1, dot)));
        var g = Math.exp(-(d * d) / (k ? 0.55 : 0.85));
        var s = sgn * 0.55 * g;
        out.x += s * (c.y * p.z - c.z * p.y);
        out.y += s * (c.z * p.x - c.x * p.z);
        out.z += s * (c.x * p.y - c.y * p.x);
      }
      return out;
    }

    function build() {
      parts = [];
      var i, n;
      if (mode === 'sphere') {
        n = W < 760 ? 1100 : 2800;
        var ga = Math.PI * (3 - Math.sqrt(5));
        for (i = 0; i < n; i++) {
          var hy = 1 - (i / (n - 1)) * 2;
          var hr = Math.sqrt(1 - hy * hy), hth = ga * i;
          parts.push({
            hx: Math.cos(hth) * hr, hy: hy, hz: Math.sin(hth) * hr,
            ph: rnd(0, TAU), acc: Math.random() < 0.09, a: rnd(0.55, 1)
          });
        }
        SP.R = Math.min(W * 0.30, H * 0.60);
        SP.cx = W < 760 ? W * 0.72 : W * 0.76;
        SP.cy = H * 0.46;
      } else if (mode === 'wave') {
        var ncol = W < 760 ? 34 : 56;
        for (i = 0; i < ncol; i++) {
          parts.push({ px: i / (ncol - 1), ph: rnd(0, TAU) });
        }
      } else if (mode === 'flow') {
        var rows = W < 760 ? 20 : 30, perRow = W < 760 ? 10 : 14;
        for (var rj = 0; rj < rows; rj++) {
          for (i = 0; i < perRow; i++) {
            parts.push({
              row: rj, rows: rows, off: Math.random(), sp: rnd(0.05, 0.075),
              a: rnd(0.4, 0.75), acc: Math.random() < 0.06
            });
          }
        }
      } else if (mode === 'lattice') {
        var gapL = W < 760 ? 30 : 34;
        for (var gx = W * 0.55; gx < W * 0.99; gx += gapL) {
          for (var gy = H * 0.10; gy < H * 0.92; gy += gapL) {
            parts.push({ x: gx, y: gy, ph: rnd(0, TAU), a: rnd(0.35, 0.7), acc: Math.random() < 0.08 });
          }
        }
      } else if (mode === 'vortex') {
        n = W < 760 ? 450 : 950;
        for (i = 0; i < n; i++) {
          var rim = Math.random() < 0.55;
          var rr2 = rim ? rnd(0.78, 1) : rnd(0.25, 0.8);
          parts.push({
            u0: rnd(0, TAU), rr2: rr2, h: rnd(-1, 1),
            sp: rnd(0.12, 0.30) * (1.9 - rr2 * 1.1),
            a: rnd(0.4, 0.85), acc: Math.random() < 0.07
          });
        }
      } else if (mode === 'streams' || mode === 'cross') {
        n = W < 760 ? 90 : 170;
        var lanes = 5;
        for (i = 0; i < n; i++) {
          parts.push({
            lane: i % lanes, off: Math.random(), sp: rnd(0.02, 0.05),
            k: rnd(1.2, 2.4), ph: rnd(0, TAU), amp: rnd(14, 40),
            r: rnd(1.2, 2.6), c: pick(PAL), a: rnd(0.3, 0.75),
            dir: (mode === 'cross' && i % 2) ? -1 : 1
          });
        }
      } else if (mode === 'arc') {
        n = W < 760 ? 70 : 130;
        var arcs = [
          { x1: 0.42, y1: 0.72, cx: 0.66, cy: 0.10, x2: 0.96, y2: 0.42 },
          { x1: 0.46, y1: 0.30, cx: 0.72, cy: 0.72, x2: 1.00, y2: 0.26 },
          { x1: 0.52, y1: 0.85, cx: 0.80, cy: 0.42, x2: 1.02, y2: 0.70 }
        ];
        for (i = 0; i < n; i++) {
          parts.push({
            arc: arcs[i % arcs.length], off: Math.random(), sp: rnd(0.05, 0.11),
            j: rnd(-7, 7), r: rnd(1.2, 2.5), c: pick(PAL), a: rnd(0.3, 0.75)
          });
        }
      } else if (mode === 'orbit') {
        n = W < 760 ? 80 : 150;
        for (i = 0; i < n; i++) {
          parts.push({
            ring: 0.16 + (i % 4) * 0.085, a0: rnd(0, TAU),
            w: rnd(0.05, 0.16) * (i % 2 ? 1 : -1),
            wob: rnd(2, 9), ph: rnd(0, TAU),
            r: rnd(1.2, 2.5), c: pick(PAL), a: rnd(0.3, 0.7)
          });
        }
      } else if (mode === 'grid') {
        var gap = W < 760 ? 30 : 36;
        var x0 = W * 0.42;
        for (var gx = x0; gx < W + gap; gx += gap) {
          for (var gy = H * 0.06; gy < H * 0.96; gy += gap) {
            parts.push({ x: gx, y: gy, r: 1.7, c: pick(PAL), a: rnd(0.25, 0.55) });
          }
        }
      } else if (mode === 'converge') {
        n = W < 760 ? 80 : 150;
        for (i = 0; i < n; i++) {
          parts.push({
            off: Math.random(), sp: rnd(0.04, 0.09),
            a0: rnd(0, TAU), spin: rnd(0.6, 1.8) * (i % 2 ? 1 : -1),
            r: rnd(1.2, 2.5), c: pick(PAL), a: rnd(0.3, 0.75)
          });
        }
      }
    }

    function resize() {
      W = hero.offsetWidth; H = hero.offsetHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      build();
    }
    resize();
    window.addEventListener('resize', resize);

    function dot(x, y, r, c, a) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = 'rgba(' + c + ',' + a.toFixed(3) + ')';
      ctx.fill();
    }

    function render(t) {
      ctx.clearRect(0, 0, W, H);
      if (mode === 'wave' || mode === 'flow' || mode === 'vortex' || mode === 'lattice') {
        MS.fx = MS.x; MS.fy = MS.y;
        MS.amt += ((MS.on && MS.fx >= 0 ? 1 : 0) - MS.amt) * 0.14;
      }
      var i, p, prog, x, y, fade;
      var cx = W * 0.74, cy = H * 0.44, base = Math.min(W, H);
      if (mode === 'sphere') {
        vortexCenter(0, t, C1); vortexCenter(1, t, C2);
        var th0 = SP.w * t, cth = Math.cos(th0), sth = Math.sin(th0);
        var ct = Math.cos(SP.tilt), st = Math.sin(SP.tilt);
        var breath = 0.5 + 0.5 * Math.sin(t * 0.08);
        var v = { x: 0, y: 0, z: 0 }, q = { x: 0, y: 0, z: 0 };
        // map cursor to a point on the front of the sphere (un-tilt)
        var target = 0;
        // lagged follow point — the stir trails the cursor
        MS.fx = MS.x; MS.fy = MS.y;
        if (MS.on) {
          var mxn = (MS.fx - SP.cx) / SP.R, myn = (SP.cy - MS.fy) / SP.R;
          var rr2 = mxn * mxn + myn * myn;
          if (rr2 < 0.94) {
            var mz = Math.sqrt(1 - rr2);
            MS.mx = mxn; MS.my = myn * ct + mz * st; MS.mz = -myn * st + mz * ct;
            target = 1;
          }
        }
        MS.amt += (target - MS.amt) * 0.14;
        var stir = MS.amt > 0.01;
        ctx.lineWidth = 1.1;
        ctx.lineCap = 'round';
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          // rigid rotation of home point about SP axis (Rodrigues)
          var adoth = SP.ax * p.hx + SP.ay * p.hy + SP.az * p.hz;
          var crx = SP.ay * p.hz - SP.az * p.hy;
          var cry = SP.az * p.hx - SP.ax * p.hz;
          var crz = SP.ax * p.hy - SP.ay * p.hx;
          q.x = p.hx * cth + crx * sth + SP.ax * adoth * (1 - cth);
          q.y = p.hy * cth + cry * sth + SP.ay * adoth * (1 - cth);
          q.z = p.hz * cth + crz * sth + SP.az * adoth * (1 - cth);
          sphereField(q, v);
          if (stir) {
            var dm = q.x * MS.mx + q.y * MS.my + q.z * MS.mz;
            var da = Math.acos(Math.max(-1, Math.min(1, dm)));
            var gm = Math.exp(-(da * da) / 0.18);
            if (gm > 0.01) {
              var awx = q.x - dm * MS.mx, awy = q.y - dm * MS.my, awz = q.z - dm * MS.mz;
              var awl = Math.sqrt(awx * awx + awy * awy + awz * awz) + 1e-6;
              awx /= awl; awy /= awl; awz /= awl;
              var swx = MS.my * q.z - MS.mz * q.y;
              var swy = MS.mz * q.x - MS.mx * q.z;
              var swz = MS.mx * q.y - MS.my * q.x;
              var kk = MS.amt * gm;
              q.x += kk * (0.09 * awx + 0.06 * swx);
              q.y += kk * (0.09 * awy + 0.06 * swy);
              q.z += kk * (0.09 * awz + 0.06 * swz);
              var ql = 1 / Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z);
              q.x *= ql; q.y *= ql; q.z *= ql;
              v.x += kk * (0.5 * swx + 0.25 * awx);
              v.y += kk * (0.5 * swy + 0.25 * awy);
              v.z += kk * (0.5 * swz + 0.25 * awz);
            }
          }
          // bounded shimmer along the local flow line
          var sh = 0.22 * Math.sin(t * 0.55 + p.ph);
          var px = q.x + v.x * sh, py0 = q.y + v.y * sh, pz0 = q.z + v.z * sh;
          // tilt about x-axis, camera looks down +z
          var py = py0 * ct - pz0 * st, pz = py0 * st + pz0 * ct;
          if (pz < 0.02) continue; // front hemisphere only
          var vy = v.y * ct - v.z * st;
          var sx = SP.cx + px * SP.R, sy = SP.cy - py * SP.R;
          var spd = Math.sqrt(v.x * v.x + vy * vy) + 1e-6;
          var L = 5;
          var dx = (v.x / spd) * L, dy = (-vy / spd) * L;
          var depth = Math.min(1, pz * 1.6);
          var al = p.a * (0.12 + 0.58 * depth);
          // drifting, breathing eye around vortex 2
          var dot2 = q.x * C2.x + q.y * C2.y + q.z * C2.z;
          var d2 = Math.acos(Math.max(-1, Math.min(1, dot2)));
          al *= 1 - 0.9 * breath * Math.exp(-(d2 * d2) / 0.16);
          if (al < 0.02) continue;
          ctx.strokeStyle = p.acc
            ? 'rgba(28,107,255,' + (al * 0.9).toFixed(3) + ')'
            : 'rgba(16,24,44,' + al.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(sx - dx * 0.5, sy - dy * 0.5);
          ctx.lineTo(sx + dx * 0.5, sy + dy * 0.5);
          ctx.stroke();
        }
      } else if (mode === 'wave') {
        var wx0 = W * 0.56, wx1 = W * 0.99, wcy = H * 0.48;
        var gap = W < 760 ? 8 : 9;
        var stirOn = MS.amt > 0.01;
        ctx.lineWidth = 1.1; ctx.lineCap = 'round';
        var PT = { x: 0, y: 0, dx: 0, dy: 0, L: 5 };
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          var px2 = p.px;
          var e = 0.18 + 0.55 * (0.5 + 0.5 * Math.sin(px2 * 7 + t * 0.5)) *
                          (0.5 + 0.5 * Math.sin(px2 * 3.1 - t * 0.33 + p.ph * 0.2));
          e *= Math.pow(Math.sin(Math.PI * px2), 0.5);
          var A = e * H * 0.40;
          x = wx0 + px2 * (wx1 - wx0);
          var kk = 0;
          while (kk * gap <= A) {
            var fadeW = 1 - Math.pow(kk * gap / Math.max(A, 1), 2) * 0.75;
            var edgeW = Math.min(1, px2 / 0.22) * Math.min(1, (1 - px2) / 0.12);
            var aW = Math.max(0.04, 0.72 * fadeW * edgeW);
            var cW = ((i * 31 + kk) % 17 === 0) ? '28,107,255' : '16,24,44';
            for (var sgn = (kk === 0 ? 0 : -1); sgn <= (kk === 0 ? 0 : 1); sgn += 2) {
              PT.x = x; PT.y = wcy - sgn * kk * gap;
              if (kk === 0) PT.y = wcy;
              PT.dx = 0; PT.dy = 5;
              if (stirOn) stir2d(PT);
              ctx.strokeStyle = 'rgba(' + cW + ',' + aW.toFixed(3) + ')';
              ctx.beginPath();
              ctx.moveTo(PT.x - PT.dx * 0.5, PT.y - PT.dy * 0.5);
              ctx.lineTo(PT.x + PT.dx * 0.5, PT.y + PT.dy * 0.5);
              ctx.stroke();
              if (kk === 0) break;
            }
            kk++;
          }
        }
      } else if (mode === 'flow') {
        var fx0 = W * 0.50, fx1 = W * 1.02, fspan = fx1 - fx0;
        var rsp = W < 760 ? 6.5 : 7.5;
        var stirF = MS.amt > 0.01;
        var PT2 = { x: 0, y: 0, dx: 0, dy: 0, L: 5 };
        ctx.lineWidth = 1.1; ctx.lineCap = 'round';
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          prog = (p.off + t * p.sp) % 1;
          x = fx0 + prog * fspan;
          var yBase = H * 0.46 + (p.row - p.rows / 2) * rsp;
          var argF = x * 0.012 + t * 0.6 + p.row * 0.06;
          y = yBase + Math.sin(argF) * H * 0.11;
          var slope = Math.cos(argF) * H * 0.11 * 0.012;
          var nl = Math.sqrt(1 + slope * slope), Lf = 5;
          fade = Math.sin(prog * Math.PI);
          var rowFade = 1 - Math.abs(p.row - p.rows / 2) / (p.rows / 2) * 0.55;
          var af = Math.min(1, p.a * fade * rowFade);
          if (af < 0.03) continue;
          PT2.x = x; PT2.y = y;
          PT2.dx = Lf / nl; PT2.dy = slope * Lf / nl;
          if (stirF) stir2d(PT2);
          ctx.strokeStyle = 'rgba(' + (p.acc ? '28,107,255' : '16,24,44') + ',' + af.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(PT2.x - PT2.dx * 0.5, PT2.y - PT2.dy * 0.5);
          ctx.lineTo(PT2.x + PT2.dx * 0.5, PT2.y + PT2.dy * 0.5);
          ctx.stroke();
        }
      } else if (mode === 'lattice') {
        var stirL = MS.amt > 0.01;
        var PTL = { x: 0, y: 0, dx: 0, dy: 0, L: 5 };
        ctx.lineWidth = 1.1; ctx.lineCap = 'round';
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          var th = 0.9 * Math.sin(p.x * 0.012 + t * 0.5) + 0.9 * Math.cos(p.y * 0.014 - t * 0.4) + p.ph * 0.08;
          var aL = p.a * (0.55 + 0.45 * Math.sin(t * 0.9 + p.ph));
          if (aL < 0.03) continue;
          PTL.x = p.x; PTL.y = p.y;
          PTL.dx = Math.cos(th) * 5; PTL.dy = Math.sin(th) * 5;
          if (stirL) stir2d(PTL);
          ctx.strokeStyle = 'rgba(' + (p.acc ? '28,107,255' : '16,24,44') + ',' + aL.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(PTL.x - PTL.dx * 0.5, PTL.y - PTL.dy * 0.5);
          ctx.lineTo(PTL.x + PTL.dx * 0.5, PTL.y + PTL.dy * 0.5);
          ctx.stroke();
        }
      } else if (mode === 'vortex') {
        var vcx = W < 760 ? W * 0.70 : W * 0.76, vcy = H * 0.52;
        var S = Math.min(W * 0.20, H * 0.42);
        var tl = 1.0, ctv = Math.cos(tl), stv = Math.sin(tl);
        var stirV = MS.amt > 0.01;
        var PTV = { x: 0, y: 0, dx: 0, dy: 0, L: 5 };
        ctx.lineWidth = 1.1; ctx.lineCap = 'round';
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          var u = p.u0 + t * p.sp;
          var R3 = S * (0.42 + 0.58 * p.rr2) * (1 + 0.06 * Math.sin(t * 0.35 + p.u0));
          var y3 = p.h * S * 0.20 * (1.35 - p.rr2);
          var X3 = R3 * Math.cos(u), Z3 = R3 * Math.sin(u);
          var Yp = y3 * ctv - Z3 * stv, Zp = y3 * stv + Z3 * ctv;
          var sxv = vcx + X3, syv = vcy - Yp;
          var dX = -R3 * Math.sin(u), sdy = R3 * Math.cos(u) * stv;
          var nlv = Math.sqrt(dX * dX + sdy * sdy) + 1e-6, Lv = 5;
          var depthV = Math.max(0, Math.min(1, (Zp / S + 1) / 2));
          var av = Math.min(1, p.a * (0.18 + 0.72 * Math.pow(depthV, 1.2)));
          if (av < 0.03) continue;
          PTV.x = sxv; PTV.y = syv;
          PTV.dx = dX / nlv * Lv; PTV.dy = sdy / nlv * Lv;
          if (stirV) stir2d(PTV);
          ctx.strokeStyle = 'rgba(' + (p.acc ? '28,107,255' : '16,24,44') + ',' + av.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(PTV.x - PTV.dx * 0.5, PTV.y - PTV.dy * 0.5);
          ctx.lineTo(PTV.x + PTV.dx * 0.5, PTV.y + PTV.dy * 0.5);
          ctx.stroke();
        }
      } else if (mode === 'streams' || mode === 'cross') {
        var x0 = W * 0.42, x1 = W * 1.03, span = x1 - x0;
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          prog = (p.off + t * p.sp) % 1;
          var pr = p.dir === 1 ? prog : 1 - prog;
          x = x0 + pr * span;
          var laneY = H * (0.16 + p.lane * 0.16);
          y = laneY + Math.sin(pr * TAU * p.k + p.ph + t * 0.25) * p.amp;
          fade = Math.sin(prog * Math.PI);
          dot(x, y, p.r, p.c, p.a * fade);
        }
      } else if (mode === 'arc') {
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          prog = (p.off + t * p.sp) % 1;
          var A = p.arc, u = 1 - prog;
          x = u*u*A.x1*W + 2*u*prog*A.cx*W + prog*prog*A.x2*W;
          y = u*u*A.y1*H + 2*u*prog*A.cy*H + prog*prog*A.y2*H + p.j;
          fade = Math.sin(prog * Math.PI);
          dot(x, y, p.r, p.c, p.a * fade);
        }
        // endpoint nodes
        dot(W*0.42, H*0.72, 4, PAL[0], 0.55); dot(W*0.46, H*0.30, 4, PAL[1], 0.5);
      } else if (mode === 'orbit') {
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          var ang = p.a0 + t * p.w * TAU * 0.18;
          var rad = p.ring * base * 1.35 + Math.sin(t * 0.6 + p.ph) * p.wob;
          x = cx + Math.cos(ang) * rad;
          y = cy + Math.sin(ang) * rad * 0.86;
          dot(x, y, p.r, p.c, p.a);
        }
        dot(cx, cy, 3.5, PAL[0], 0.6);
      } else if (mode === 'grid') {
        var d0 = Math.hypot(W*0.74 - W*0.42, H*0.5);
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          var d = Math.hypot(p.x - cx, p.y - cy);
          var wsc = Math.sin(t * 1.5 - d * 0.028);
          var s = 1 + 0.65 * wsc;
          dot(p.x, p.y, p.r * Math.max(s, 0.4), p.c, p.a * (0.55 + 0.45 * wsc));
        }
      } else if (mode === 'converge') {
        var maxR = base * 0.62;
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          prog = (p.off + t * p.sp) % 1;
          var rr = (1 - prog) * maxR + 14;
          var aa = p.a0 + prog * p.spin;
          x = cx + Math.cos(aa) * rr;
          y = cy + Math.sin(aa) * rr * 0.9;
          fade = Math.sin(prog * Math.PI) * Math.min(1, (rr - 14) / 40 + 0.2);
          dot(x, y, p.r, p.c, p.a * fade);
        }
        dot(cx, cy, 4, PAL[0], 0.65);
      }
    }

    var running = true, t0 = performance.now();
    function frame(now) {
      if (!running) return;
      render((now - t0) / 1000);
      requestAnimationFrame(frame);
    }

    if (reduced) {
      render(0.001);
    } else {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
          if (!e.isIntersecting) running = false;
        });
      });
      vio.observe(hero);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) running = false;
        else if (!running) { running = true; requestAnimationFrame(frame); }
      });
      requestAnimationFrame(frame);
    }
  }

  // Nav hide on scroll down, show on up
  var nav = document.querySelector('.nav');
  if (nav && !reduced) {
    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y > 140 && y > lastY + 4) nav.classList.add('hidden');
      else if (y < lastY - 4) nav.classList.remove('hidden');
      lastY = y;
    }, { passive: true });
  }

  // Auto-stagger reveal delays for grid children
  ['.features', '.cur-grid', '.slabs', '.team-grid', '.pillars', '.flow', '.ledger', '.timeline', '.onboard'].forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (grid) {
      Array.prototype.slice.call(grid.children).forEach(function (child, i) {
        if (child.classList.contains('rv') || child.classList.contains('fstep') || child.classList.contains('ostep')) {
          child.classList.add('rv');
          child.style.setProperty('--d', Math.min(i * 0.08, 0.5).toFixed(2) + 's');
        }
      });
    });
  });

  // Onboarding steps + timeline items need their own reveal class
  document.querySelectorAll('.onboard .ostep').forEach(function (s, i) {
    s.style.setProperty('--d', (0.15 + i * 0.12).toFixed(2) + 's');
  });
  document.querySelectorAll('.tl-item').forEach(function (t) { t.classList.add('rv'); });

  // Split headlines into words for staggered reveal
  function splitWords(el) {
    var wi = 0;
    function process(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      kids.forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span'); w.className = 'w';
            var i = document.createElement('i'); i.textContent = part;
            i.style.setProperty('--wi', wi++);
            w.appendChild(i); frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && !child.classList.contains('badge')) {
          process(child);
        }
      });
    }
    process(el);
    el.classList.remove('rv', 'd1', 'd2', 'd3', 'd4');
    el.classList.add('split');
  }
  var headlines = document.querySelectorAll('.hero h1, .page-hero h1, .section h2, .quote-band .q, .cta-banner h2');
  if (!reduced) headlines.forEach(splitWords);

  // Scroll reveal (covers .rv and split headlines)
  var toReveal = Array.prototype.slice.call(document.querySelectorAll('.rv'));
  headlines.forEach(function (h) { if (toReveal.indexOf(h) === -1) toReveal.push(h); });
  if (reduced || !('IntersectionObserver' in window)) {
    toReveal.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
          // reveal stagger done: clear the delay so hover transitions respond instantly
          setTimeout(function () { e.target.style.transitionDelay = '0s'; }, 1400);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
    toReveal.forEach(function (el) { io.observe(el); });
  }

  // Count-up numbers: <span data-count="10">0</span>
  var counters = document.querySelectorAll('[data-count]');
  function animate(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var dur = 1100, start = null;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if (reduced || !('IntersectionObserver' in window)) {
    counters.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
  } else {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animate(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  // Products dropdown
  document.querySelectorAll('.dd').forEach(function (dd) {
    var btn = dd.querySelector('button');
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      dd.classList.toggle('open');
    });
    dd.addEventListener('mouseenter', function () { dd.classList.add('open'); });
    dd.addEventListener('mouseleave', function () { dd.classList.remove('open'); });
  });
  document.addEventListener('click', function () {
    document.querySelectorAll('.dd.open').forEach(function (dd) { dd.classList.remove('open'); });
  });

  // Duplicate marquee content for seamless loops
  document.querySelectorAll('.ribbon, .logo-track').forEach(function (r) {
    r.innerHTML += r.innerHTML;
  });
})();

/* CTA banner — white dash ribbon, same language as the page heroes */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var banner = document.querySelector('.cta-banner');
  if (!banner) return;
  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  banner.insertBefore(canvas, banner.firstChild);
  var ctx = canvas.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var W = 0, H = 0, parts = [];
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function build() {
    parts = [];
    var rows = W < 760 ? 12 : 18, per = W < 760 ? 8 : 12;
    for (var rj = 0; rj < rows; rj++) {
      for (var i = 0; i < per; i++) {
        parts.push({ row: rj, rows: rows, off: Math.random(), sp: rnd(0.05, 0.075), a: rnd(0.06, 0.16) });
      }
    }
  }
  function resize() {
    W = banner.offsetWidth; H = banner.offsetHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
  }
  resize();
  window.addEventListener('resize', resize);
  function render(t) {
    ctx.clearRect(0, 0, W, H);
    var rsp = H / (parts.length ? (parts[0].rows + 4) : 20);
    ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var pr = (p.off + t * p.sp) % 1;
      var x = pr * W;
      var yb = H * 0.5 + (p.row - p.rows / 2) * rsp;
      var arg = x * 0.012 + t * 0.6 + p.row * 0.06;
      var y = yb + Math.sin(arg) * H * 0.16;
      var slope = Math.cos(arg) * H * 0.16 * 0.012;
      var nl = Math.sqrt(1 + slope * slope), L = 5;
      var af = p.a * Math.sin(pr * Math.PI);
      if (af < 0.02) continue;
      ctx.strokeStyle = 'rgba(255,255,255,' + af.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(x - L / nl * 0.5, y - slope * L / nl * 0.5);
      ctx.lineTo(x + L / nl * 0.5, y + slope * L / nl * 0.5);
      ctx.stroke();
    }
  }
  if (reduced) { render(6); return; }
  var running = false, t0 = performance.now();
  function frame(now) {
    if (!running) return;
    render((now - t0) / 1000 + 6);
    requestAnimationFrame(frame);
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
      if (!e.isIntersecting) running = false;
    });
  });
  io.observe(banner);
})();

/* Comparison ledger: equalize paired row heights + mirrored hover pairing */
(function () {
  var ledgers = document.querySelectorAll('.ledger');
  ledgers.forEach(function (ledger) {
    var cols = ledger.querySelectorAll('.ledger-col');
    if (cols.length !== 2) return;
    var a = cols[0].querySelectorAll('.row'), b = cols[1].querySelectorAll('.row');
    var n = Math.min(a.length, b.length);
    function equalize() {
      for (var i = 0; i < n; i++) {
        a[i].style.minHeight = b[i].style.minHeight = '';
        var h = Math.max(a[i].offsetHeight, b[i].offsetHeight);
        a[i].style.minHeight = b[i].style.minHeight = h + 'px';
      }
    }
    equalize();
    window.addEventListener('resize', equalize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(equalize);
    for (var i = 0; i < n; i++) {
      (function (i) {
        [a[i], b[i]].forEach(function (row) {
          row.addEventListener('mouseenter', function () {
            a[i].classList.add('pair'); b[i].classList.add('pair');
          });
          row.addEventListener('mouseleave', function () {
            a[i].classList.remove('pair'); b[i].classList.remove('pair');
          });
        });
      })(i);
    }
  });
})();
