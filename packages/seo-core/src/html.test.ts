import { describe, expect, it } from "vitest";
import {
  ArticleHtmlError,
  addImageLoadingHints,
  assertHeadingOrder,
  assertNoH1,
  findImagesWithoutAlt,
  prepareArticleHtml,
} from "./html.js";

describe("assertNoH1", () => {
  it("accepts a body starting at h2", () => {
    expect(() => assertNoH1("<h2>Fine</h2><p>Body</p>", "a-post")).not.toThrow();
  });

  it("rejects a body containing an h1 and names the post", () => {
    expect(() => assertNoH1("<h1>Nope</h1>", "washing-machine-care")).toThrow(ArticleHtmlError);
    expect(() => assertNoH1("<h1>Nope</h1>", "washing-machine-care")).toThrow(
      /washing-machine-care/,
    );
  });

  it("catches an h1 with attributes", () => {
    expect(() => assertNoH1('<h1 class="x">Nope</h1>', "p")).toThrow(ArticleHtmlError);
  });

  it("does not confuse h1 with other tags", () => {
    expect(() => assertNoH1("<hgroup><h2>ok</h2></hgroup>", "p")).not.toThrow();
  });
});

describe("assertHeadingOrder", () => {
  it("accepts h2, h3, h2, h3", () => {
    expect(() =>
      assertHeadingOrder("<h2>a</h2><h3>b</h3><h2>c</h2><h3>d</h3>", "p"),
    ).not.toThrow();
  });

  it("rejects h2 followed by h4", () => {
    expect(() => assertHeadingOrder("<h2>a</h2><h4>b</h4>", "p")).toThrow(/skips a heading level/);
  });

  it("rejects a body that opens at h3, since the template supplies h1", () => {
    expect(() => assertHeadingOrder("<h3>a</h3>", "p")).toThrow(/skips a heading level/);
  });

  it("accepts an empty body", () => {
    expect(() => assertHeadingOrder("<p>no headings</p>", "p")).not.toThrow();
  });
});

describe("addImageLoadingHints", () => {
  it("adds both hints to a bare img", () => {
    const out = addImageLoadingHints('<img src="a.jpg" alt="A">');
    expect(out).toContain('loading="lazy"');
    expect(out).toContain('decoding="async"');
  });

  it("never overwrites an attribute the editor set", () => {
    const out = addImageLoadingHints('<img src="a.jpg" alt="A" loading="eager">');
    expect(out).toContain('loading="eager"');
    expect(out).not.toContain('loading="lazy"');
  });

  it("leaves everything except img tags untouched", () => {
    const input = "<p>text</p><figure><figcaption>c</figcaption></figure>";
    expect(addImageLoadingHints(input)).toBe(input);
  });

  it("handles several images in one body", () => {
    const out = addImageLoadingHints('<img src="a.jpg" alt="A"><p>x</p><img src="b.jpg" alt="B">');
    expect(out.match(/loading="lazy"/g)).toHaveLength(2);
  });
});

describe("findImagesWithoutAlt", () => {
  it("finds a missing alt and an empty alt", () => {
    const html = '<img src="a.jpg"><img src="b.jpg" alt=""><img src="c.jpg" alt="fine">';
    expect(findImagesWithoutAlt(html)).toHaveLength(2);
  });

  it("returns nothing when every image describes itself", () => {
    expect(findImagesWithoutAlt('<img src="a.jpg" alt="A">')).toEqual([]);
  });
});

describe("prepareArticleHtml", () => {
  it("validates before transforming", () => {
    // A structural failure must surface as itself, not as a confusing diff in
    // the transformed output.
    expect(() => prepareArticleHtml('<h1>x</h1><img src="a.jpg" alt="A">', "p")).toThrow(
      ArticleHtmlError,
    );
  });

  it("returns transformed HTML for a valid body", () => {
    const out = prepareArticleHtml('<h2>Title</h2><img src="a.jpg" alt="A">', "p");
    expect(out).toContain('loading="lazy"');
    expect(out).toContain("<h2>Title</h2>");
  });
});
