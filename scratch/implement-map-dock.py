from pathlib import Path
p=Path('src/lib/components/OutletMap.svelte')
s=p.read_text(encoding='utf-8')
s=s.replace('onselect\n', 'onselect,\n\t\tcameraPadding\n',1)
s=s.replace('onselect: (id: OutletId) => void;', 'onselect: (id: OutletId) => void;\n\t\tcameraPadding: { top: number; bottom: number; left: number; right: number };')
s=s.replace('\tlet threeD = $state(false);\n','')
s=s.replace("\tconst selectedPoint = $derived(selected ? outletMapPoint(selected) : null);\n",'')
s=s.replace('zoom: initialPoint ? 13.5 : view.zoom,','zoom: initialPoint ? 16 : 13,\n\t\t\t\tpadding: cameraPadding,')
s=s.replace('pitch: 0,\n\t\t\t\tbearing: 0,','pitch: 50,\n\t\t\t\tbearing: -16,\n\t\t\t\tcooperativeGestures: true,')
s=s.replace('pitch: threeD ? 50 : 0,','pitch: 50,\n\t\t\t\tpadding: cameraPadding,').replace('bearing: threeD ? -16 : 0,','bearing: -16,')
s=s.replace('const dimensions = threeD;','const padding = cameraPadding;')
s=s.replace("dimensions ? 'visible' : 'none'", "'visible'")
s=s.replace('zoom: dimensions ? 16 : 13.5,','zoom: 16,\n\t\t\t\tpadding,')
s=s.replace('zoom: dimensions ? 15.5 : view.zoom,','zoom: 13,\n\t\t\t\tpadding,')
s=s.replace('pitch: dimensions ? 50 : 0,','pitch: 50,').replace('bearing: dimensions ? -16 : 0,','bearing: -16,')
s=s.replace("<div class=\"outlet-map\" data-map-state={status} data-map-mode={threeD ? '3d' : '2d'}>", '<div class="outlet-map" data-map-state={status} data-map-mode="3d" style={`--map-safe-top: ${cameraPadding.top}px; --map-safe-bottom: ${cameraPadding.bottom}px;`}>')
start=s.index('\t<div class="map-caption"')
end=s.index("\t{#if status === 'idle'",start)
s=s[:start]+s[end:]
start=s.index('\t\t\t<div class="map-dimensions"')
end=s.index('\n\t{/if}\n</div>',start)
s=s[:start]+'\t\t</div>'+s[end:]
start=s.index('<style>')
markers=s[s.index('\t.outlet-map :global(.z-outlet-marker)',start):]
markers=markers[:markers.index('\t@media (max-width: 1023px)')]
css='''<style>
	.outlet-map { position: relative; isolation: isolate; height: 100%; overflow: hidden; background: #fff8ec; }
	.map-canvas { position: absolute; inset: 0; }
	.map-loading, .map-error { position: absolute; top: var(--map-safe-top); bottom: var(--map-safe-bottom); left: 16px; right: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; font-size: 12px; color: #65595e; }
	.map-error { padding: 12px; border-radius: 16px; background: rgb(255 248 236 / 96%); max-width: 360px; margin-inline: auto; }
	.map-error strong { color: var(--color-ink); font-size: 14px; }
	.map-error svg { width: 24px; height: 24px; color: var(--color-brand-dark); }
	.map-error button, .map-overview { min-height: 44px; padding: 10px 16px; border: 1px solid var(--color-line); border-radius: 999px; background: #fffdf9; color: var(--color-ink); font-size: 11px; font-weight: 700; transition: transform 220ms cubic-bezier(.22, 1, .36, 1); }
	.map-error button:active, .map-overview:active { transform: scale(.98); }
	.map-actions { position: absolute; top: 200px; right: 24px; }
	.map-overview { display: inline-flex; align-items: center; gap: 8px; }
	.map-skeleton { height: 6px; width: 100px; border-radius: 999px; background: var(--color-brand-soft); overflow: hidden; }
	.map-skeleton::after { content: ''; display: block; width: 50%; height: 100%; border-radius: inherit; background: var(--color-brand); animation: map-load 1.2s ease-in-out infinite alternate; }
	@keyframes map-load { to { transform: translateX(100%); } }
	.outlet-map :global(.maplibregl-ctrl-top-right) { top: 96px; right: 14px; }
	.outlet-map :global(.maplibregl-ctrl-bottom-right) { bottom: 4px; right: 6px; max-width: calc(100% - 12px); }
	.outlet-map :global(.maplibregl-ctrl-attrib-inner) { white-space: normal; }
'''
css+=markers
css+='''	@media (max-width: 767px) {
		.outlet-map :global(.maplibregl-ctrl-top-right) { top: 76px; right: 6px; }
		.map-actions { top: 180px; right: 16px; }
		.map-overview { font-size: 0; width: 44px; padding: 0; justify-content: center; }
		.map-overview span { font-size: 18px; }
		.map-error { gap: 4px; font-size: 10px; }
		.map-error svg { display: none; }
	}
	@media (prefers-reduced-motion: reduce) { .map-skeleton::after { animation: none; } .outlet-map button { transition: none; } }
</style>
'''
s=s[:start]+css
p.write_text(s,encoding='utf-8')
# Prevent another commerce bar from covering the context-specific dock/credits.
p=Path('src/routes/+layout.svelte');s=p.read_text(encoding='utf-8')
s=s.replace('let footerVisible = $state(false);', 'let footerVisible = $state(false);\n\tlet finderVisible = $state(false);\n\tlet finderIO: IntersectionObserver | null = null;')
s=s.replace('!heroCtaVisible && !footerVisible','!heroCtaVisible && !footerVisible && !finderVisible')
needle='\tonMount(() => {'
code='''	function setupFinderObserver(): void {
		finderIO?.disconnect();
		finderVisible = false;
		if (!isHome || typeof document === 'undefined') return;
		const dock = document.querySelector('#temukan-zatiaras .finder-dock');
		if (!dock) return;
		finderIO = new IntersectionObserver(([entry]) => {
			finderVisible = entry.isIntersecting;
		}, { rootMargin: '0px 0px 88px 0px' });
		finderIO.observe(dock);
	}

'''
s=s.replace(needle,code+needle,1)
s=s.replace('setupFooterObserver();','setupFooterObserver();\n\t\tsetupFinderObserver();')
s=s.replace('footerIO?.disconnect();\n\t\t};','footerIO?.disconnect();\n\t\t\tfinderIO?.disconnect();\n\t\t};')
p.write_text(s,encoding='utf-8')
p=Path('scripts/build-map-style.mjs');s=p.read_text(encoding='utf-8');s=s.replace("layout: { visibility: 'none' },","layout: { visibility: 'visible' },");p.write_text(s,encoding='utf-8')
p=Path('static/maps/zatiaras.json');s=p.read_text(encoding='utf-8');import json
style=json.loads(s)
next(l for l in style['layers'] if l['id']=='zatiaras-buildings-3d')['layout']['visibility']='visible'
p.write_text(json.dumps(style,separators=(',',':'),ensure_ascii=False),encoding='utf-8')
