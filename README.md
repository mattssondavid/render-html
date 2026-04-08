# Render HTML

_Render HTML efficiently with minimum DOM manipulation either to a specified DOM node container or render to string._

## Features

The project aims to

- Render HTML efficiently with minimum DOM manipulation;
- Allow render HTML to DOM container;
- Allow render HTML to string output;

## Dependencies

This project will assume that the caller defines DOM APIs. For expected DOM interfaces and properties, see [shim-dom](./src/server/shim/shim-dom.ts).

## API reference

### HTML

The `html` acts as a tagged template producing a `TemplateResult` consumable via `render` or `renderToString` as a "dirty check" rendering approach for DOM manipulation.

The `TemplateResult` is defined as

```ts
{
    partMeta: {
        type: 'text' | 'attr' | 'event';
        attr?: string;
        event?: string;
        substitutionIndex: number;
        substitutionPlaceholder: string;
    }[];
    templateStrings: TemplateStringsArray;
    templateWithPlaceholders: string;
    substitutions: unknown[];
}
```

### Render

The `render` consumes a `TemplateResult` and renders the template into a specified container where placeholder values are replaced with the provided substitutions.

### Render to string

The `renderToString` consumes a `TemplateResult` and renders the template with placeholder values replaced with the provided substitutions into a HTML string.

#### Options

- `renderer`: An optional custom renderer to render the `TemplateResult` template node to a string.

    If not specified then the template node is rendered via an implementation of [Serializing HTML fragments](https://html.spec.whatwg.org/multipage/parsing.html#serialising-html-fragments).

- `customElements`: An optional provided custom element registry to use when checking for web component definitions.

- `serializeShadowRootAdoptedStyleSheets`: An optional setting to, if true, serialize custom element shadow root's adopted stylesheets.

## Usage

1. Create a `TemplateResult` via `html`;
2. Render the `TemplateResult` either via `render` or `renderToString`;

### Examples

#### Render to DOM

```ts
const container = document.createElement('div');
const template = html`<p>hi</p>`;
render(template, container);
console.log(container.innerHTML); // <p>hi</p>
```

#### Render to string

```ts
const template = html`<p>hi</p>`;
const result = renderToString(template);
console.log(result); // <p>hi</p>
```

## Node

The project aims to be Deno-first, but provides Node compatibility.

### Examples

1. Add `render-html` as a dependency in `package.json`.

2. Import `html` and `renderToString`. If needed, also import `createShimDom`

    Using dynamic module import

    ```js
    const { html, renderToString } = await import('render-html');
    const { createShimDom } = await import('render-html/shim');
    ```

## License

MIT
