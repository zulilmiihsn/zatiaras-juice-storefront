import { readFileSync, writeFileSync } from 'node:fs';
const path = 'src/lib/liquid2/renderer.ts';
let source = readFileSync(path, 'utf8');
source = source.replace("import { buildSurfaceMesh, createSurfaceGrid, type SurfaceGrid } from './surface';", "import { buildSurfaceMesh, createSurfaceGrid, type SurfaceGrid, createFilmMesh, buildFilmMesh, type FilmMesh } from './surface';");
source = source.replace('\tprivate sheetData = new Float32Array(0);\n', '');
source = source.replace(/\tprivate sheet: \{[\s\S]*?\} \| null = null;/, '\tprivate sheet: { vao: WebGLVertexArrayObject; vertex: WebGLBuffer; index: WebGLBuffer; grid: FilmMesh } | null = null;');
const start = source.indexOf('\t\tif (!full) {');
const end = source.indexOf('\t\tgl.bindVertexArray(null);\n\t\treturn true;', start);
if (start < 0 || end < 0) throw new Error('Missing direct film render block');
source = source.slice(0, start) + `
\t\tif (!full && sim.drink) {
\t\t\tif (!this.sheet) {
\t\t\t\tconst vao = gl.createVertexArray(), vertex = gl.createBuffer(), index = gl.createBuffer();
\t\t\t\tif (!vao || !vertex || !index) { gl.deleteVertexArray(vao); gl.deleteBuffer(vertex); gl.deleteBuffer(index); return false; }
\t\t\t\tconst grid = createFilmMesh(sim);
\t\t\t\tthis.sheet = { vao, vertex, index, grid };
\t\t\t\tgl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
\t\t\t\tgl.bufferData(gl.ARRAY_BUFFER, grid.data.byteLength, gl.DYNAMIC_DRAW);
\t\t\t\tgl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
\t\t\t\tgl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
\t\t\t\tgl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, grid.indices, gl.STATIC_DRAW);
\t\t\t}
\t\t\tbuildFilmMesh(sim, this.sheet.grid);
\t\t\tgl.bindVertexArray(this.sheet.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.sheet.vertex);
\t\t\tgl.bufferSubData(gl.ARRAY_BUFFER, 0, this.sheet.grid.data);
\t\t\tgl.useProgram(this.sheetProg); this.common(this.sheetU, cam, sim, time, cover);
\t\t\tgl.uniform1f(this.sheetU.uFilmScale, sim.drink.height);
\t\t\tconst solid = sim.field.obstacle;
\t\t\tgl.uniform4f(this.sheetU.uCup, solid?.x ?? 0, solid?.z ?? 0, solid?.radius ?? 0, solid ? solid.baseY + solid.height : 0);
\t\t\tgl.uniform1f(this.sheetU.uCupBase, solid?.baseY ?? 0); gl.uniform1f(this.sheetU.uCupBottom, solid?.baseRadius ?? solid?.radius ?? 0);
\t\t\tgl.drawElements(gl.TRIANGLES, this.sheet.grid.indices.length, gl.UNSIGNED_INT, 0);
\t\t}
` + source.slice(end);
if (source.includes('sheetData') || !source.includes('createFilmMesh, buildFilmMesh')) throw new Error('Incomplete film mesh integration');
writeFileSync(path, source);
