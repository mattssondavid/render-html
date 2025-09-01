if (typeof self.document === 'undefined') {
    await import('@src/server/shim/shim-dom.ts');
}
import { css } from '@src/css.ts';
import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';

const cssRuleToCssText = (cssRule: CSSRule): string => cssRule.cssText;
const cssRulesToCssText = (cssRuleList: CSSRuleList): string[] =>
    [...cssRuleList].map(cssRuleToCssText);

describe('html', (): void => {
    it('can handle no substitution', (): void => {
        const actual = css`
            * {
                color: purple;
            }
        `;

        const expected = new self.CSSStyleSheet();
        expected.insertRule(`* { color: purple;}`);

        assertEquals(
            cssRulesToCssText(actual.cssRules),
            cssRulesToCssText(expected.cssRules),
            'incorrect value'
        );
    });

    it('can handle simple substitution', (): void => {
        const color = 'orange';
        const actual = css`
            * {
                color: ${color};
            }
        `;
        const expected = new self.CSSStyleSheet();
        expected.insertRule(`* {color: orange}`);
        assertEquals(
            cssRulesToCssText(actual.cssRules),
            cssRulesToCssText(expected.cssRules),
            'incorrect value'
        );
    });
});
