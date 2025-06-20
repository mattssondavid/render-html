# Render HTML

_Render HTML efficiently with minimum DOM manipulation either to a specified DOM node container or render to string._

## Features

The project aims to

-   Render HTML efficiently with minimum DOM manipulation;
-   Allow render HTML to DOM comtainer;
-   Allow render HTML to string output;

## API reference

### HTML

The `html` acts as a tagged template producing a `TemplateResult` consumeable via `render` or `renderToString` as a "dirty check" rendering approach for DOM manipulation.

### Render

The `render` consumes a `TemplateResult` and renders the template into a specified container where placeholder values are replaced with the provided substitutions.

### Render to string

The `renderToString` consumes a `TemplateResult` and renders the template with placeholder values replaced with the provided substitutions into a HTML string.

#### Options

-   `renderer`: An optional custom renderer to render the `TemplateResult` template node to a string. If not specified then the template node is rendered via an implementation of [Serializing HTML fragments](https://html.spec.whatwg.org/multipage/parsing.html#serialising-html-fragments).

-   `customElements`: An optional provided custom element registry to use when checking for web component definitions.

## Usage

1. Create a `TemplateResult` via `html`;
2. Render the `TemplateResult` either via `render` or `renderToString`;

### Examples

#### Render

```ts
container = document.createElement('div');
const template = html`<p>hi</p>`;
render(template, container);
```

#### Render to string

```ts
container = document.createElement('div');
const template = html`<p>hi</p>`;
renderToString(template, container);
```
