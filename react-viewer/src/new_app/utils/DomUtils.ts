/**
 * DomUtils.ts
 * Utilities for direct DOM manipulation and metadata extraction.
 */

export class DomUtils {
  /**
   * AUTHORITATIVE: Get astId from DOM element's data-ast-id attribute.
   * Scans upwards to the nearest container with the attribute.
   */
  public static getAstIdFromDOM(domElement: Element | null): string | null {
    if (!domElement) return null;

    if (domElement.hasAttribute && domElement.hasAttribute("data-ast-id")) {
      return domElement.getAttribute("data-ast-id");
    }

    const withAstId = domElement.closest
      ? domElement.closest("[data-ast-id]")
      : null;
    return withAstId ? withAstId.getAttribute("data-ast-id") : null;
  }

  /**
   * Get role and operator info from DOM element's dataset.
   */
  public static getMathMetadata(domElement: Element | null): {
    role: string | null;
    operator: string | null;
  } {
    if (!domElement) return { role: null, operator: null };

    const withMetadata = domElement.closest
      ? domElement.closest("[data-role]")
      : null;
    if (withMetadata) {
      return {
        role: withMetadata.getAttribute("data-role"),
        operator: withMetadata.getAttribute("data-operator") || null,
      };
    }

    return { role: null, operator: null };
  }

  /**
   * Scan a container for all elements with Stable-IDs.
   */
  public static scanForStableIds(
    container: HTMLElement,
  ): Map<string, HTMLElement> {
    const results = new Map<string, HTMLElement>();
    const elements = container.querySelectorAll("[data-ast-id]");

    elements.forEach((el) => {
      const astId = el.getAttribute("data-ast-id");
      if (astId) {
        results.set(astId, el as HTMLElement);
      }
    });

    return results;
  }
}
