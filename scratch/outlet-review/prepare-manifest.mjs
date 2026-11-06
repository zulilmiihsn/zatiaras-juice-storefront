import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const manifest = JSON.parse(execFileSync('rtk', ['proxy', 'git', 'show', 'HEAD:package.json'], {encoding:'utf8'}));
manifest.dependencies['maplibre-gl'] = '^6.13.0';
writeFileSync('scratch/outlet-review/package-zatiaras-restored.json', JSON.stringify(manifest,null,'\t')+'\n');
