import { error } from '@sveltejs/kit';
import { MENU, getMenuItem } from '$lib/data/menu';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => MENU.map((m) => ({ slug: m.slug }));

export const load: PageLoad = ({ params }) => {
	const item = getMenuItem(params.slug);
	if (!item) throw error(404, 'menu_not_found');
	return { item };
};
