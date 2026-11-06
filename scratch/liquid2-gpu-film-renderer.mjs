import { readFileSync, writeFileSync } from 'node:fs';
const rendererPath = 'src/lib/liquid2/renderer.ts';
let source = readFileSync(rendererPath, 'utf8');
const body = source.indexOf('buildFilmMesh(sim, this.sheet.grid);');
const start = source.lastIndexOf('\n\t\tif (', body);
const end = source.indexOf('\n\t\tgl.bindVertexArray(null);\n\t\treturn true;', body);
if (body < 0 || start < 0 || end < 0 || !source.slice(start, body).includes('exposedHeight')) throw new Error('Missing explicit film render owner');
source = source.slice(0, start) + `
\t\tif (!full && sim.drink && (!this.sheet || sim.sheets.exposedHeight > sim.drink.height * 0.005)) {
\t\t\tconst material = sim.sheets;
\t\t\tif (!this.sheet) {
\t\t\t\tconst vao = gl.createVertexArray(), index = gl.createBuffer(), texture = gl.createTexture();
\t\t\t\tif (!vao || !index || !texture) { gl.deleteVertexArray(vao); gl.deleteBuffer(index); gl.deleteTexture(texture); return false; }
\t\t\t\tconst grid = createFilmTopology(sim);
\t\t\t\tconst nodes = new Float32Array(material.vertices.length / 3 * 8);
\t\t\t\tthis.sheet = { vao, index, texture, nodes, grid };
\t\t\t\tgl.bindVertexArray(vao);
\t\t\t\tgl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, grid.indices, gl.STATIC_DRAW);
\t\t\t\tgl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, texture);
\t\t\t\tgl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
\t\t\t\tgl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
\t\t\t\tgl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, material.cols * 2, material.rows * grid.patches, 0, gl.RGBA, gl.FLOAT, null);
\t\t\t}
\t\t\tconst sheet = this.sheet, width = material.cols * 2;
\t\t\tfor (let i = 0; i < material.areas.length; i++) {
\t\t\t\tconst row = Math.floor(i / material.cols), col = i % material.cols;
\t\t\t\tconst p = (row * width + col) * 4, n = p + material.cols * 4, k = i * 3;
\t\t\t\tsheet.nodes[p] = material.vertices[k]; sheet.nodes[p + 1] = material.vertices[k + 1]; sheet.nodes[p + 2] = material.vertices[k + 2]; sheet.nodes[p + 3] = material.areas[i];
\t\t\t\tsheet.nodes[n] = material.normals[k]; sheet.nodes[n + 1] = material.normals[k + 1]; sheet.nodes[n + 2] = material.normals[k + 2]; sheet.nodes[n + 3] = material.referenceAreas[i];
\t\t\t}
\t\t\tgl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, sheet.texture);
\t\t\tgl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, material.rows * sheet.grid.patches, gl.RGBA, gl.FLOAT, sheet.nodes);
\t\t\tgl.useProgram(this.sheetProg); this.common(this.sheetU, cam, sim, time, cover);
\t\t\tgl.uniform1f(this.sheetU.uFilmScale, sim.drink.height);
\t\t\tgl.uniform1i(this.sheetU.uFilm, 4); gl.uniform1i(this.sheetU.uHeight, 3);
\t\t\tgl.uniform4f(this.sheetU.uFilmGrid, material.rows, material.cols, sheet.grid.rows, sheet.grid.cols);
\t\t\tconst d = sim.field.domain;
\t\t\tgl.uniform4f(this.sheetU.uHeightDomain, d.x0, d.z0, d.x1 - d.x0, d.z1 - d.z0);
\t\t\tconst solid = sim.field.obstacle;
\t\t\tgl.uniform4f(this.sheetU.uCup, solid?.x ?? 0, solid?.z ?? 0, solid?.radius ?? 0, solid ? solid.baseY + solid.height : 0);
\t\t\tgl.uniform1f(this.sheetU.uCupBase, solid?.baseY ?? 0); gl.uniform1f(this.sheetU.uCupBottom, solid?.baseRadius ?? solid?.radius ?? 0);
\t\t\tgl.bindVertexArray(sheet.vao); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
\t\t\tgl.drawElements(gl.TRIANGLES, sheet.grid.indices.length, gl.UNSIGNED_INT, 0);
\t\t\tgl.disable(gl.CULL_FACE);
\t\t}
` + source.slice(end);
source = source.replace('gl.deleteBuffer(this.sheet.vertex);', 'gl.deleteTexture(this.sheet.texture);');
if (source.includes('buildFilmMesh(') || source.includes('this.sheet.vertex')) throw new Error('Incomplete GPU film transfer');
writeFileSync(rendererPath, source);
const shaderPath = 'src/lib/liquid2/shaders.ts';
let shader = readFileSync(shaderPath, 'utf8');
const a = shader.indexOf('export const SHEET_VS ='), b = shader.indexOf('export const SHEET_FS =', a);
if (a < 0 || b < 0) throw new Error('Missing sheet shader');
const vertex = shader.slice(a, b).replace(/\bpatch\b/g, 'patchId').replace(/\bsample\b/g, 'pointData').replace(/\blocal\b/g, 'localId').replace(/\blength\b/g, 'lengthSquared');
shader = shader.slice(0, a) + vertex + shader.slice(b);
writeFileSync(shaderPath, shader);
