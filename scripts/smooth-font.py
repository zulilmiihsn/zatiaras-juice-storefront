"""Refit polygonal TrueType outlines (all lineTo) as smooth curves.

Zatiaras Display ships every glyph as a polyline of ~25-unit segments, so edges show
facets at hero sizes. This refits each contour with piecewise cubic Beziers (Schneider),
with sigma > 0 the outline is first low-passed (Gaussian along arc length) to remove the
trace jogs; then converts to TrueType quadratics. Metrics, cmap and GPOS are left untouched.

  python smooth.py <in.ttf> <out.ttf> [fit_tolerance_units [lowpass_sigma_units]]
  e.g. python smooth.py in.ttf out.ttf 0.9 24
"""
import sys, math
import numpy as np
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen

CORNER_DEG = 58.0   # vertex turn at/above this stays a hard corner
TOL = float(sys.argv[3]) if len(sys.argv) > 3 else 1.6
SIGMA = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0   # low-pass width along the outline, font units (0 = off)
STRAIGHT_LEN = 150.0   # a side counts as straight if it holds a line this long
STRAIGHT_TOL = 0.6     # ... within this many units
SNAP_TOL = 4.5         # tail on either end within this distance of the line is pulled onto it
SNAP_MAX = 90.0        # ... for at most this many units
STEP = 3.0          # resample spacing before smoothing, font units
DENSIFY = 8.0     # max spacing of inserted points on long edges, font units
Q_ERR = 0.35        # cubic -> quadratic error, font units

def unit(v):
    n = np.hypot(*v)
    return v / n if n > 1e-9 else v

def bez(c, t):
    u = 1 - t
    return (u**3)[:, None]*c[0] + (3*u*u*t)[:, None]*c[1] + (3*u*t*t)[:, None]*c[2] + (t**3)[:, None]*c[3]

def bez_d1(c, t):
    u = 1 - t
    return (3*u*u)[:, None]*(c[1]-c[0]) + (6*u*t)[:, None]*(c[2]-c[1]) + (3*t*t)[:, None]*(c[3]-c[2])

def bez_d2(c, t):
    u = 1 - t
    return (6*u)[:, None]*(c[2]-2*c[1]+c[0]) + (6*t)[:, None]*(c[3]-2*c[2]+c[1])

def chord_params(P):
    d = np.r_[0, np.cumsum(np.hypot(*(P[1:]-P[:-1]).T))]
    return d / d[-1]

def gen_bezier(P, u, t1, t2):
    p0, p3 = P[0], P[-1]
    b0, b1, b2, b3 = (1-u)**3, 3*u*(1-u)**2, 3*u*u*(1-u), u**3
    A1 = b1[:, None]*t1; A2 = b2[:, None]*t2
    C = np.array([[np.sum(A1*A1), np.sum(A1*A2)], [np.sum(A1*A2), np.sum(A2*A2)]])
    tmp = P - (b0+b1)[:, None]*p0 - (b2+b3)[:, None]*p3
    X = np.array([np.sum(A1*tmp), np.sum(A2*tmp)])
    det = C[0,0]*C[1,1]-C[0,1]*C[1,0]
    seg = np.hypot(*(p3-p0))
    eps = 1e-6*seg
    if abs(det) > 1e-12:
        a1 = (X[0]*C[1,1]-X[1]*C[0,1])/det; a2 = (C[0,0]*X[1]-C[1,0]*X[0])/det
    else:
        a1 = a2 = 0
    if a1 < eps or a2 < eps or a1 > 2.0*seg or a2 > 2.0*seg:
        a1 = a2 = seg/3
    return np.array([p0, p0+t1*a1, p3+t2*a2, p3])

def reparam(c, P, u):
    d1 = bez_d1(c, u); d2 = bez_d2(c, u); q = bez(c, u) - P
    num = np.sum(q*d1, axis=1); den = np.sum(d1*d1, axis=1) + np.sum(q*d2, axis=1)
    den = np.where(np.abs(den) < 1e-12, 1e-12, den)
    return np.clip(u - num/den, 0, 1)

def max_err(c, P, u):
    d = np.sum((bez(c, u)-P)**2, axis=1)
    i = int(np.argmax(d))
    return d[i], i

def fit_cubic(P, t1, t2, tol, out):
    if len(P) == 2:
        dist = np.hypot(*(P[1]-P[0]))/3
        out.append(np.array([P[0], P[0]+t1*dist, P[1]+t2*dist, P[1]])); return
    u = chord_params(P)
    c = gen_bezier(P, u, t1, t2)
    err, split = max_err(c, P, u)
    if err < tol*tol:
        out.append(c); return
    if err < (tol*4)**2:
        for _ in range(8):
            u = reparam(c, P, u)
            c = gen_bezier(P, u, t1, t2)
            err, split = max_err(c, P, u)
            if err < tol*tol:
                out.append(c); return
    split = min(max(split, 1), len(P)-2)
    tc = unit(P[split-1]-P[split+1])
    fit_cubic(P[:split+1], t1, tc, tol, out)
    fit_cubic(P[split:], -tc, t2, tol, out)

def turn_deg(a, b, c):
    v1, v2 = b-a, c-b
    l1, l2 = np.hypot(*v1), np.hypot(*v2)
    if l1 < 1e-9 or l2 < 1e-9: return 0.0
    return math.degrees(math.acos(max(-1, min(1, float(np.dot(v1, v2)/(l1*l2))))))

def snap_straight(Q, step):
    """Pull near-straight sides onto their line, tails included. The trace leaves small jogs
    where a straight side meets a corner; a low-pass only spreads them into a lean."""
    m = len(Q)
    win = int(STRAIGHT_LEN / step)
    if m < win + 4: return Q
    def fit(idx):
        pts = Q[idx]; c = pts.mean(axis=0)
        d = np.linalg.svd(pts - c)[2][0]
        return c, d, np.abs((pts - c) @ np.array([-d[1], d[0]]))
    covered = np.zeros(m, bool)
    for i in range(0, m, 4):
        idx = (i + np.arange(win)) % m
        if fit(idx)[2].max() < STRAIGHT_TOL: covered[idx] = True
    if covered.all() or not covered.any(): return Q
    out = Q.copy(); taken = np.zeros(m, bool)
    start = int(np.argmax(~covered))   # a position that is not covered, so runs do not wrap the seam
    order = (start + np.arange(m)) % m
    run = []
    for k in list(order) + [None]:
        if k is not None and covered[k]:
            run.append(k); continue
        if len(run) >= win:
            c, d, res = fit(np.array(run))
            if res.max() < 1.0:
                n = np.array([-d[1], d[0]]); ext = int(SNAP_MAX / step); idxs = list(run)
                for direction, anchor in ((-1, run[0]), (1, run[-1])):
                    j = anchor
                    for _ in range(ext):
                        j = (j + direction) % m
                        if taken[j] or covered[j] or abs((Q[j] - c) @ n) > SNAP_TOL: break
                        idxs.append(j)
                for j in idxs:
                    out[j] = c + ((Q[j] - c) @ d) * d; taken[j] = True
        run = []
    return out

def lowpass(P, sigma):
    """Resample a closed outline evenly, then low-pass it: removes trace
    facets and jogs."""
    n = len(P)
    seg = np.hypot(*(np.roll(P, -1, axis=0) - P).T)
    cum = np.r_[0, np.cumsum(seg)]
    total = cum[-1]
    m = max(8, int(total / STEP))
    t = np.linspace(0, total, m, endpoint=False)
    Q = np.c_[np.interp(t, cum, np.r_[P[:, 0], P[0, 0]]), np.interp(t, cum, np.r_[P[:, 1], P[0, 1]])]
    Q = snap_straight(Q, total / m)
    # Gaussian low-pass along arc length (FFT, periodic). Shrinkage is ~sigma^2/(2R): under
    # half a unit on bowls, only visible on very tight corners, which stay recognisable.
    freq = np.fft.fftfreq(m, d=total / m)

    def gauss(Q, sg):
        g = np.exp(-0.5 * (2 * np.pi * freq * sg) ** 2)
        return np.c_[np.fft.ifft(np.fft.fft(Q[:, 0]) * g).real, np.fft.ifft(np.fft.fft(Q[:, 1]) * g).real]

    Q = gauss(Q, sigma)
    return Q

def fit_contour(pts):
    P = np.array(pts, float)
    # drop repeated points
    keep = [0] + [i for i in range(1, len(P)) if np.hypot(*(P[i]-P[i-1])) > 1e-6]
    P = P[keep]
    if np.hypot(*(P[0]-P[-1])) < 1e-6: P = P[:-1]
    if SIGMA > 0 and len(P) >= 3:
        P = lowpass(P, SIGMA)
    n0 = len(P)
    if n0 < 3: return None
    turns0 = [turn_deg(P[i-1], P[i], P[(i+1) % n0]) for i in range(n0)]
    # Densify long edges so a fitted curve cannot bulge away from a straight side
    # between two distant vertices; hard corners are tracked through the index remap.
    dense, orig_idx = [], []
    for i in range(n0):
        a_, b_ = P[i], P[(i+1) % n0]
        orig_idx.append(len(dense)); dense.append(a_)
        L = float(np.hypot(*(b_-a_)))
        for j in range(1, int(L // DENSIFY)):
            dense.append(a_ + (b_-a_) * (j*DENSIFY/L))
    P = np.array(dense); n = len(P)
    corners = [orig_idx[i] for i in range(n0) if turns0[i] >= (999 if SIGMA > 0 else CORNER_DEG)]
    global corners_set
    corners_set = set(corners)
    smooth_start = False
    if not corners:
        corners = [orig_idx[int(np.argmax(turns0))]]; smooth_start = True
    curves = []
    for k, s in enumerate(corners):
        e = corners[(k+1) % len(corners)]
        idx = [(s+j) % n for j in range(((e-s) % n or n)+1)]
        run = P[idx]
        if len(run) == 2:
            curves.append(('line', run[0], run[1])); continue
        # tangents: central at smooth joins, one-sided at hard corners
        def tan_at(i, side):
            if i in corners_set and not (smooth_start and i == corners[0]):
                return unit(P[(i+1) % n]-P[i]) if side == 'out' else unit(P[(i-1) % n]-P[i])
            t = unit(P[(i+1) % n]-P[(i-1) % n])
            return t if side == 'out' else -t
        t1 = tan_at(s, 'out'); t2 = tan_at(e, 'in')
        cs = []
        fit_cubic(run, t1, t2, TOL, cs)
        curves += [('cubic', *c) for c in cs]
    return curves
corners_set = set()

def run(inp, outp):
    global corners_set
    f = TTFont(inp); glyf = f['glyf']; order = f.getGlyphOrder()
    stats = {'in': 0, 'out': 0}
    new = {}
    for name in order:
        g = glyf[name]
        if g.numberOfContours == 0 or g.isComposite():
            new[name] = g; continue
        coords, ends, flags = g.getCoordinates(glyf)
        pen = TTGlyphPen(None)
        cpen = Cu2QuPen(pen, max_err=Q_ERR, reverse_direction=False)
        start = 0
        for e in ends:
            pts = [tuple(p) for p in coords[start:e+1]]; start = e+1
            stats['in'] += len(pts)
            curves = fit_contour(pts)
            first = curves[0]; p0 = first[1]
            cpen.moveTo(tuple(p0))
            for c in curves:
                if c[0] == 'line': cpen.lineTo(tuple(c[2]))
                else: cpen.curveTo(tuple(c[2]), tuple(c[3]), tuple(c[4]))
            cpen.closePath()
        ng = pen.glyph()
        stats['out'] += len(ng.coordinates)
        new[name] = ng
    for name, g in new.items():
        glyf[name] = g
    for name in order:
        g = glyf[name]
        if g.numberOfContours:
            g.recalcBounds(glyf)
            adv, _ = f['hmtx'][name]
            f['hmtx'][name] = (adv, g.xMin)
    f.save(outp)
    print('points', stats['in'], '->', stats['out'], 'tol', TOL)

if __name__ == '__main__':
    run(sys.argv[1], sys.argv[2])
