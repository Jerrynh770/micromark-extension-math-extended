/**
 * @import {Options} from 'micromark-extension-math-extended'
 * @import {Construct, Previous, Resolver, State, Token, TokenizeContext, Tokenizer} from 'micromark-util-types'
 */

// To do: next major: clean spaces in HTML compiler.
// This has to be coordinated together with `mdast-util-math`.

import {ok as assert} from 'devlop'
import {markdownLineEnding} from 'micromark-util-character'
import {codes, types} from 'micromark-util-symbol'

/**
 * @param {Options | null | undefined} [options={}]
 *   Configuration (default: `{}`).
 * @returns {{dollar: Construct, backslash: Array<Construct>}}
 *   Constructs grouped by their opening marker.
 */
export function mathText(options) {
  const options_ = options || {}
  let single = options_.singleDollarTextMath

  if (single === null || single === undefined) {
    single = true
  }

  return {
    dollar: createDollarMathText(single),
    backslash: [
      createBackslashMathText(codes.leftParenthesis, codes.rightParenthesis),
      createBackslashMathText(codes.leftSquareBracket, codes.rightSquareBracket)
    ]
  }
}

/**
 * @param {boolean} allowSingle
 * @returns {Construct}
 */
function createDollarMathText(allowSingle) {
  return {
    tokenize: tokenizeMathText,
    resolve: resolveMathText,
    previous: previousDollar,
    name: 'mathText'
  }

  /**
   * @this {TokenizeContext}
   * @type {Tokenizer}
   */
  function tokenizeMathText(effects, ok, nok) {
    const self = this
    let sizeOpen = 0
    /** @type {number} */
    let size
    /** @type {Token} */
    let token

    return start

    /**
     * Start of math (text).
     *
     * ```markdown
     * > | $a$
     *     ^
     * > | \$a$
     *      ^
     * ```
     *
     * @type {State}
     */
    function start(code) {
      assert(code === codes.dollarSign, 'expected `$`')
      assert(previousDollar.call(self, self.previous), 'expected correct previous')
      effects.enter('mathText')
      effects.enter('mathTextSequence')
      return sequenceOpen(code)
    }

    /**
     * In opening sequence.
     *
     * ```markdown
     * > | $a$
     *     ^
     * ```
     *
     * @type {State}
     */
    function sequenceOpen(code) {
      if (code === codes.dollarSign) {
        effects.consume(code)
        sizeOpen++
        return sequenceOpen
      }

      if (sizeOpen < 2 && !allowSingle) {
        return nok(code)
      }

      effects.exit('mathTextSequence')
      return between(code)
    }

    /**
     * Between something and something else.
     *
     * ```markdown
     * > | $a$
     *      ^^
     * ```
     *
     * @type {State}
     */
    function between(code) {
      if (code === codes.eof) {
        return nok(code)
      }

      if (code === codes.dollarSign) {
        token = effects.enter('mathTextSequence')
        size = 0
        return sequenceClose(code)
      }

      if (code === codes.space) {
        effects.enter('space')
        effects.consume(code)
        effects.exit('space')
        return between
      }

      if (markdownLineEnding(code)) {
        effects.enter(types.lineEnding)
        effects.consume(code)
        effects.exit(types.lineEnding)
        return between
      }

      effects.enter('mathTextData')
      return data(code)
    }

    /**
     * In data.
     *
     * ```markdown
     * > | $a$
     *      ^
     * ```
     *
     * @type {State}
     */
    function data(code) {
      if (
        code === codes.eof ||
        code === codes.space ||
        code === codes.dollarSign ||
        markdownLineEnding(code)
      ) {
        effects.exit('mathTextData')
        return between(code)
      }

      effects.consume(code)
      return data
    }

    /**
     * In closing sequence.
     *
     * ```markdown
     * > | `a`
     *       ^
     * ```
     *
     * @type {State}
     */
    function sequenceClose(code) {
      if (code === codes.dollarSign) {
        effects.consume(code)
        size++
        return sequenceClose
      }

      if (size === sizeOpen) {
        effects.exit('mathTextSequence')
        effects.exit('mathText')
        return ok(code)
      }

      token.type = 'mathTextData'
      return data(code)
    }
  }
}

/**
 * @param {number} open
 * @param {number} close
 * @returns {Construct}
 */
function createBackslashMathText(open, close) {
  return {
    tokenize: tokenizeMathText,
    resolve: resolveMathText,
    previous: previousBackslash,
    name: 'mathText'
  }

  /**
   * @this {TokenizeContext}
   * @type {Tokenizer}
   */
  function tokenizeMathText(effects, ok, nok) {
    const self = this
    let sizeOpen = 0
    /** @type {number} */
    let size
    /** @type {Token} */
    let token

    return start

    /**
     * Start of math (text) for backslash variant.
     *
     * @param {number} code
     * @returns {State | void}
     * @type {State}
     */
    function start(code) {
      assert(code === codes.backslash, 'expected `\\`')
      assert(previousBackslash.call(self, self.previous), 'expected correct previous')
      effects.enter('mathText')
      effects.enter('mathTextSequence')
      return sequenceOpen(code)
    }

    /**
     * In opening sequence (backslash variant).
     * @param {number} code
     * @returns {State | void}
     * @type {State}
     */
    function sequenceOpen(code) {
      if (sizeOpen === 0 && code === codes.backslash) {
        effects.consume(code)
        sizeOpen = 1
        return sequenceOpen
      }

      if (sizeOpen === 1 && code === open) {
        effects.consume(code)
        sizeOpen = 2
        return sequenceOpen
      }

      if (sizeOpen < 2) {
        return nok(code)
      }

      effects.exit('mathTextSequence')
      return between(code)
    }

    /**
     * Between something and something else (backslash variant).
     * @param {number} code
     * @returns {State | void}
     * @type {State}
     */
    function between(code) {
      if (code === codes.eof) {
        return nok(code)
      }

      if (code === codes.backslash) {
        token = effects.enter('mathTextSequence')
        size = 0
        return sequenceClose(code)
      }

      if (code === codes.space) {
        effects.enter('space')
        effects.consume(code)
        effects.exit('space')
        return between
      }

      if (markdownLineEnding(code)) {
        effects.enter(types.lineEnding)
        effects.consume(code)
        effects.exit(types.lineEnding)
        return between
      }

      effects.enter('mathTextData')
      return data(code)
    }

    /**
     * In data (backslash variant).
     * @param {number} code
     * @returns {State | void}
     * @type {State}
     */
    function data(code) {
      if (
        code === codes.eof ||
        code === codes.space ||
        code === codes.backslash ||
        markdownLineEnding(code)
      ) {
        effects.exit('mathTextData')
        return between(code)
      }

      effects.consume(code)
      return data
    }

    /**
     * In closing sequence (backslash variant).
     * @param {number} code
     * @returns {State | void}
     * @type {State}
     */
    function sequenceClose(code) {
      if (size === 2) {
        effects.exit('mathTextSequence')
        effects.exit('mathText')
        return ok(code)
      }

      if (size === 0) {
        if (code === codes.backslash) {
          effects.consume(code)
          size = 1
          return sequenceClose
        }
      } else if (size === 1) {
        if (code === close) {
          effects.consume(code)
          size = 2
          return sequenceClose
        }
      }

      token.type = 'mathTextData'
      return data(code)
    }
  }
}

/** @type {Resolver} */
function resolveMathText(events) {
  let tailExitIndex = events.length - 4
  let headEnterIndex = 3
  /** @type {number} */
  let index
  /** @type {number | undefined} */
  let enter

  if (
    (events[headEnterIndex][1].type === types.lineEnding ||
      events[headEnterIndex][1].type === 'space') &&
    (events[tailExitIndex][1].type === types.lineEnding ||
      events[tailExitIndex][1].type === 'space')
  ) {
    index = headEnterIndex

    while (++index < tailExitIndex) {
      if (events[index][1].type === 'mathTextData') {
        events[tailExitIndex][1].type = 'mathTextPadding'
        events[headEnterIndex][1].type = 'mathTextPadding'
        headEnterIndex += 2
        tailExitIndex -= 2
        break
      }
    }
  }

  index = headEnterIndex - 1
  tailExitIndex++

  while (++index <= tailExitIndex) {
    if (enter === undefined) {
      if (
        index !== tailExitIndex &&
        events[index][1].type !== types.lineEnding
      ) {
        enter = index
      }
    } else if (
      index === tailExitIndex ||
      events[index][1].type === types.lineEnding
    ) {
      events[enter][1].type = 'mathTextData'

      if (index !== enter + 2) {
        events[enter][1].end = events[index - 1][1].end
        events.splice(enter + 2, index - enter - 2)
        tailExitIndex -= index - enter - 2
        index = enter + 2
      }

      enter = undefined
    }
  }

  return events
}

/**
 * @this {TokenizeContext}
 * @type {Previous}
 */
function previousDollar(code) {
  return (
    code !== codes.dollarSign ||
    this.events[this.events.length - 1][1].type === types.characterEscape
  )
}

/**
 * @this {TokenizeContext}
 * @type {Previous}
 */
/* c8 ignore start */
function previousBackslash(code) {
  return (
    code !== codes.backslash ||
    this.events[this.events.length - 1][1].type === types.characterEscape
  )
}
/* c8 ignore stop */

