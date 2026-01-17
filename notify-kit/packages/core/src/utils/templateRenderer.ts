/**
 * Template Renderer
 *
 * Simple Mustache-style template rendering for notification content
 *
 * @module @notify-kit/core
 */

import type { TemplateContext } from '../types';

/**
 * Render a template string with the given context
 *
 * Supports simple {{placeholder}} syntax. Nested properties are not supported.
 *
 * @param template - Template string with {{placeholders}}
 * @param context - Object with values to substitute
 * @returns Rendered string
 *
 * @example
 * ```typescript
 * const result = renderTemplate(
 *   '{{name}} in {{offset}} minutes',
 *   { name: 'Meeting', offset: 15 }
 * );
 * // Result: 'Meeting in 15 minutes'
 * ```
 */
export function renderTemplate(
  template: string,
  context: TemplateContext
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key];
    if (value === undefined || value === null) {
      return match; // Keep placeholder if value not found
    }
    return String(value);
  });
}

/**
 * Extract placeholder names from a template
 *
 * @param template - Template string
 * @returns Array of placeholder names
 *
 * @example
 * ```typescript
 * const placeholders = extractPlaceholders('{{name}} at {{time}}');
 * // Result: ['name', 'time']
 * ```
 */
export function extractPlaceholders(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+)\}\}/g);
  return Array.from(matches, (m) => m[1]);
}

/**
 * Validate that a context has all required placeholders
 *
 * @param template - Template string
 * @param context - Context object to validate
 * @returns Object with validation result and missing keys
 */
export function validateContext(
  template: string,
  context: TemplateContext
): { valid: boolean; missing: string[] } {
  const placeholders = extractPlaceholders(template);
  const missing = placeholders.filter(
    (key) => context[key] === undefined || context[key] === null
  );
  return {
    valid: missing.length === 0,
    missing,
  };
}
