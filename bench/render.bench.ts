import { html } from '@src/html.ts';
import { render } from '@src/render.ts';
import '@src/server/shim/shim-dom.ts';

Deno.bench('repeat render should not leak', (): void => {
    const container = document.createElement('div');
    const before = Deno.memoryUsage();
    for (let i = 0; i < 10000; i++) {
        const template = html`<div>${i}</div>`;
        render(template, container);
    }
    const after = Deno.memoryUsage();

    console.log(before);
    console.log(after);
});
