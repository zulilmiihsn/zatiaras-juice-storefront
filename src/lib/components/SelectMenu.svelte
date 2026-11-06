<script lang="ts">
	// Select-only combobox (WAI-ARIA APG): branded replacement for a native <select>.
	type Option = { value: string; label: string };

	let {
		id,
		label,
		options,
		value,
		onchange,
		placement = 'bottom'
	}: {
		id: string;
		label: string;
		options: Option[];
		value: string;
		onchange: (value: string) => void;
		placement?: 'top' | 'bottom';
	} = $props();

	let open = $state(false);
	let active = $state(0);
	let root: HTMLDivElement;
	let button: HTMLButtonElement;
	const selected = $derived(options.find((option) => option.value === value) ?? options[0]);

	function show() {
		active = Math.max(
			0,
			options.findIndex((option) => option.value === value)
		);
		open = true;
	}
	function close(restoreFocus = true) {
		open = false;
		if (restoreFocus) button?.focus();
	}
	function choose(index: number) {
		const option = options[index];
		if (option) onchange(option.value);
		close();
	}
	function onkeydown(event: KeyboardEvent) {
		const last = options.length - 1;
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				if (open) active = Math.min(last, active + 1);
				else show();
				break;
			case 'ArrowUp':
				event.preventDefault();
				if (open) active = Math.max(0, active - 1);
				else show();
				break;
			case 'Home':
			case 'End':
				if (!open) break;
				event.preventDefault();
				active = event.key === 'Home' ? 0 : last;
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				if (open) choose(active);
				else show();
				break;
			case 'Escape':
				if (!open) break;
				event.preventDefault();
				close();
				break;
			case 'Tab':
				open = false;
				break;
		}
	}
	function outside(event: PointerEvent) {
		if (open && !root.contains(event.target as Node)) open = false;
	}
	$effect(() => {
		if (open)
			document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
	});
</script>

<svelte:window onpointerdown={outside} />

<div class="select" bind:this={root} data-open={open} data-placement={placement}>
	<span class="sr-only" id="{id}-label">{label}</span>
	<button
		bind:this={button}
		{id}
		class="select-button"
		type="button"
		role="combobox"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls="{id}-list"
		aria-labelledby="{id}-label"
		aria-activedescendant={open ? `${id}-option-${active}` : undefined}
		data-value={selected?.value ?? ''}
		onclick={() => (open ? close(false) : show())}
		{onkeydown}
	>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"
			><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" /><circle
				cx="12"
				cy="10"
				r="2.5"
			/></svg
		>
		<span class="select-value">{selected?.label ?? ''}</span>
		<svg
			class="select-chevron"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg
		>
	</button>
	{#if open}
		<ul class="select-list" id="{id}-list" role="listbox" aria-labelledby="{id}-label">
			{#each options as option, index (option.value)}
				<!-- Keyboard handling lives on the combobox (activedescendant pattern). -->
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
				<li
					id="{id}-option-{index}"
					role="option"
					aria-selected={option.value === value}
					class:active={index === active}
					data-value={option.value}
					onpointerenter={() => (active = index)}
					onclick={() => choose(index)}
				>
					<span>{option.label}</span>
					{#if option.value === value}
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.2"
							aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg
						>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.select {
		position: relative;
		min-width: 0;
	}
	.select-button {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		min-height: 48px;
		padding: 0 14px;
		border: 1.5px solid var(--color-line);
		border-radius: 999px;
		background: #fff;
		color: var(--color-ink);
		font-family: var(--font-display);
		font-size: 16px;
		font-weight: 700;
		text-align: left;
		cursor: pointer;
		transition:
			border-color 180ms ease-out,
			background-color 180ms ease-out;
	}
	.select-button:hover,
	.select[data-open='true'] .select-button {
		border-color: var(--color-brand);
	}
	.select-button:focus-visible {
		outline: 2px solid var(--color-brand-dark);
		outline-offset: 3px;
	}
	.select svg {
		flex-shrink: 0;
		width: 16px;
		height: 16px;
		color: var(--color-brand);
	}
	.select-value {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.select-chevron {
		color: var(--color-ink);
		transition: rotate 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.select[data-open='true'] .select-chevron {
		rotate: 180deg;
	}
	.select-list {
		position: absolute;
		z-index: 20;
		left: 0;
		right: 0;
		top: calc(100% + 8px);
		margin: 0;
		padding: 6px;
		list-style: none;
		max-height: min(260px, 50dvh);
		overflow-y: auto;
		border: 1px solid var(--color-line);
		border-radius: 20px;
		background: #fff;
		box-shadow: 0 14px 36px rgb(82 34 55 / 18%);
		animation: select-in 160ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.select[data-placement='top'] .select-list {
		top: auto;
		bottom: calc(100% + 8px);
	}
	.select-list li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		min-height: 44px;
		padding: 0 14px;
		border-radius: 14px;
		font-family: var(--font-display);
		font-size: 15px;
		font-weight: 700;
		cursor: pointer;
	}
	.select-list li.active {
		background: var(--color-brand-soft);
	}
	.select-list li[aria-selected='true'] {
		color: var(--color-brand-dark);
	}
	@keyframes select-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.select-button,
		.select-chevron {
			transition: none;
		}
		.select-list {
			animation: none;
		}
	}
</style>
