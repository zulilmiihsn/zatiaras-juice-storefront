from pathlib import Path
p=Path('src/routes/+page.svelte');s=p.read_text(encoding='utf-8')
Path('scratch/outlet-review/before-featured-menu-page.svelte').write_text(s,encoding='utf-8')
s=s.replace("import { MENU, MENU_VERIFIED } from '$lib/data/menu';", "import { MENU } from '$lib/data/menu';")
s=s.replace("\timport OutletFinder from '$lib/components/OutletFinder.svelte';", "\timport OutletFinder from '$lib/components/OutletFinder.svelte';\n\timport FeaturedMenu from '$lib/components/FeaturedMenu.svelte';")
s=s.replace('\n\tconst andalan = MENU.slice(0, 4);\n','\n')
start=s.index('\t\t\t<!-- 03 MENU ANDALAN -->')
end=s.index('\n\t\t\t<!-- Section Divider Line -->',start)
s=s[:start]+'\t\t\t<!-- 03 MENU ANDALAN -->\n\t\t\t<FeaturedMenu />\n'+s[end:]
p.write_text(s,encoding='utf-8')
