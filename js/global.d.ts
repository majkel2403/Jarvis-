/* Wspólne typy JSDoc dla całego projektu Jarvis OS (vanilla JS).
   Służą tylko IDE i `tsc --noEmit` (typecheck = lint, bez wpływu na runtime).
   Zero importów, zero wpływu na produkcję - plik nie jest ładowany przez index.html. */

/**
 * Koperta wyniku każdego polecenia z Command Registry.
 * @typedef {Object} Result
 * @property {boolean} ok      - czy operacja się udała
 * @property {ResultCode} code - maszyna stanu: OK | NOT_FOUND | INVALID_ARGS | ...
 * @property {*} [data]        - dane specyficzne dla polecenia (albo null)
 * @property {string} text     - komunikat po polsku dla użytkownika
 * @property {*} [ui]          - opcjonalny marker dla UI (np. propozycja)
 */

/**
 * @typedef {('OK'|'NOT_FOUND'|'INVALID_ARGS'|'NEEDS_CONFIRMATION'|'DENIED'|'DUPLICATE'|'OFFLINE'|'RATE_LIMITED'|'TIMEOUT'|'UNSUPPORTED'|'INTERNAL')} ResultCode
 */

/**
 * Skrócony kształt envelope dla helperów.
 * @typedef {Object} EnvelopeOk
 * @property {true} ok
 * @property {'OK'} code
 * @property {*} data
 * @property {string} text
 */

/**
 * @typedef {Object} EnvelopeFail
 * @property {false} ok
 * @property {ResultCode} code
 * @property {string} text
 * @property {*} data
 */

/**
 * Property schematu argumentów (subset JSON Schema używany w registry).
 * @typedef {Object} ArgProp
 * @property {string} [type]       - 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'
 * @property {string} [format]     - 'time' | 'date'
 * @property {string[]} [enum]     - lista dozwolonych wartości
 * @property {number} [minimum]
 * @property {number} [maximum]
 * @property {number} [maxLength]
 * @property {string} [description]
 * @property {*} [default]
 */

/**
 * @typedef {Object} ArgSchema
 * @property {'object'} type
 * @property {Object<string, ArgProp>} properties
 * @property {string[]} [required]
 */

/**
 * Definicja polecenia w rejestrze.
 * @typedef {Object} CommandSpec
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {ArgSchema} args
 * @property {string[]} examples
 * @property {string} group
 * @property {'safe'|'confirm'|'blocked'} risk
 * @property {boolean} [undoable]
 * @property {boolean} [hermes]    - false = polecenie nie jest eksportowane do Hermesa
 * @property {boolean} [voice]     - false = nie pojawia się w helpie głosowym
 * @property {boolean} [palette]   - false = nie pojawia się w palecie
 * @property {string[]} reads
 * @property {string[]} writes
 */

/**
 * Schemat narzędzia dla modelu (OpenAI/Hermes format).
 * @typedef {Object} ToolFunction
 * @property {string} name
 * @property {string} description
 * @property {ArgSchema} parameters
 */

/**
 * @typedef {Object} ToolSchema
 * @property {'function'} type
 * @property {ToolFunction} function
 */

/**
 * Kontekst wywołania polecenia.
 * @typedef {Object} RunContext
 * @property {string} [source]     - 'ui' | 'local' | 'voice' | 'hermes' | 'signal' | 'routine' | 'jev'
 * @property {boolean} [confirmed]
 * @property {boolean} [forceConfirm]
 * @property {Object} [judge]      - decyzja Jeva (intencja, ryzyko)
 * @property {AbortSignal} [signal]
 */

/**
 * @typedef {Object} JNamespace
 * @property {Object} state
 * @property {Object} nlp
 * @property {Function} norm
 * @property {Function} pad
 * @property {Object} registry
 * @property {Function} save
 * @property {Function} emit
 * @property {Function} on
 * @property {Function} log
 * @property {Function} confirm
 */

/**
 * Pomocnik: weź z obiektu klucze walidowane schematem.
 * @template T
 * @typedef {T extends string ? never : T} _Phantom
 */

/* =========================================================
   Warstwa efektów (js/fx/*) — port biblioteki `jarvis-efekty`
   ========================================================= */

/**
 * Poziom jakości biblioteki. Mapowany 1:1 na `J.fx.rank()`:
 * off(0) · low(1, „tool") · high(2, „standard") · ultra(3, „cinema").
 * @typedef {('off'|'low'|'high'|'ultra')} FxQuality
 */

/**
 * Waga efektu. `hero` jest wyłączny (wypiera poprzednie hero),
 * `accent` nakłada się, `micro` jest częsty i thottlowany.
 * @typedef {('hero'|'accent'|'micro')} FxWeight
 */

/**
 * Wpis rejestru efektów sygnaturowych.
 * @typedef {Object} FxEntry
 * @property {string} id          np. 'orb.supernova'
 * @property {string} family      orb | screen | particles | hud | text | data | glitch | success | transition | pointer | ambient
 * @property {string} title
 * @property {string} blurb
 * @property {number} durationMs
 * @property {FxWeight} weight
 */

/**
 * Publiczne API warstwy efektów (`js/fx/index.js`).
 * UWAGA: to NIE jest `J.fx` — `J.fx` od `js/main.js:89` to system poziomów
 * jakości aplikacji. Warstwa żyje pod `J.fxLayer`, a `window.__jarvisOsFx`
 * wystawia to samo API dla biblioteki.
 * @typedef {Object} FxLayerApi
 * @property {(id: string, opts?: Object) => boolean} play
 * @property {() => void} stopAll
 * @property {() => FxEntry[]} list
 * @property {number} activeCount
 * @property {boolean} ready
 * @property {(now: number) => void} frame  wywoływane z pętli głównej aplikacji
 * @property {() => number} refresh          przebudowuje rejestr i zwraca liczbę efektów
 */

/**
 * Rejestr kotwic (`js/fx/targets.js`) — rzeczy, na które efekty potrafią
 * działać. Klucze DOM rozwiązywane są leniwie przy każdym `get()`.
 * @typedef {Object} FxTargets
 * @property {(key: string, value: unknown) => (() => void)} set
 * @property {(key: string, selector: string) => void} define
 * @property {(key: string) => (Element|Object|undefined)} get
 * @property {(key: string) => (Element|undefined)} visible
 * @property {() => string[]} keys
 */

/**
 * Przełącznik renderera kuli (`js/fx/webgl-orb.js`).
 * @typedef {Object} FxOrbApi
 * @property {(mode: 'canvas'|'webgl') => ('canvas'|'webgl')} apply
 * @property {() => 'canvas'|'webgl'} current
 * @property {() => boolean} available
 * @property {(level: number) => void} setEnergy
 * @property {(color?: string) => void} burst
 * @property {() => void} inhale
 * @property {() => void} dispose
 */

/**
 * Nuty dźwiękowe z biblioteki. Wartości dosłownie jak w `katalog/08-audio`.
 * @typedef {Object} FxNote
 * @property {number} freq
 * @property {number} at
 * @property {number} dur
 * @property {string} [type]  typ oscylatora WebAudio
 * @property {number} [gain]
 * @property {number} [glideTo]
 */

export {};
