import { createServer } from 'vite';
const server = await createServer({ configFile: false, cacheDir: 'scratch/.vite-liquid2-probe', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true } });
try {
	const { Fluid } = await server.ssrLoadModule('/src/lib/liquid2/fluid.ts');
	const { ShallowWater } = await server.ssrLoadModule('/src/lib/liquid2/shallow-water.ts');
	const { makeCamera, placeDrink, groundDomain } = await server.ssrLoadModule('/src/lib/liquid2/scene.ts');
	for (const [name, aspect, capacity] of [['desktop', 1.6, 1280], ['mobile', 390 / 844, 640]]) {
		const cam = makeCamera(aspect);
		const drink = placeDrink(cam, aspect < 0.9 ? 0.5 : 0.72, 0.85, Math.min(0.5, (aspect < 0.9 ? 0.84 : 0.62) * aspect / (960 / 778)), 960 / 778);
		console.log(name, JSON.stringify(drink));
		for (const solid of [true, false]) {
			const field = new ShallowWater({ cols: 32, rows: 24 }, groundDomain(cam));
			field.setObstacle(solid ? drink : null);
			const fluid = new Fluid(capacity);
			fluid.layout(drink);
			for (let frame = 0; frame < 180; frame++) {
				fluid.advance(1 / 60, frame < 105 ? 0.65 : 0, field, 0);
				if (![29, 59, 89, 119, 179].includes(frame)) continue;
				let raised = 0, rising = 0, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
				for (let i = 0; i < fluid.count; i++) {
					if (fluid.position[i * 3 + 1] < drink.height * 0.2) continue;
					raised++;
					if (fluid.velocity[i * 3 + 1] > 0) rising++;
					x0 = Math.min(x0, (fluid.position[i * 3] - drink.x) / drink.height);
					x1 = Math.max(x1, (fluid.position[i * 3] - drink.x) / drink.height);
					z0 = Math.min(z0, (fluid.position[i * 3 + 2] - drink.z) / drink.height);
					z1 = Math.max(z1, (fluid.position[i * 3 + 2] - drink.z) / drink.height);
				}
				console.log(JSON.stringify({ solid, t: (frame + 1) / 60, count: fluid.count, render: fluid.renderCount, h: +(fluid.maxHeight / drink.height).toFixed(2), visible: +(fluid.visibleHeight / drink.height).toFixed(2), speed: +fluid.speed.toFixed(2), raised, rising, bounds: [x0, x1, z0, z1].map(v => +v.toFixed(2)) }));
			}
		}
	}
} finally { await server.close(); }
