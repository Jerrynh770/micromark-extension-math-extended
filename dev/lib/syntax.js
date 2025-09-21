/**
 * @import {Options} from 'micromark-extension-math-extended'
 * @import {Extension} from 'micromark-util-types'
 */

import {codes} from 'micromark-util-symbol'
import {mathFlowDollar, mathFlowBackslash} from './math-flow.js'
import {mathText} from './math-text.js'

/**
 * Create an extension for `micromark` to enable math syntax.
 *
 * @param {Options | null | undefined} [options={}]
 *   Configuration (default: `{}`).
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions`, to
 *   enable math syntax.
 */
export function math(options) {
  const textConstructs = mathText(options)

  return {
    flow: {
      [codes.dollarSign]: mathFlowDollar,
      [codes.backslash]: mathFlowBackslash
    },
    text: {
      [codes.dollarSign]: textConstructs.dollar,
      [codes.backslash]: textConstructs.backslash
    }
  }
}
