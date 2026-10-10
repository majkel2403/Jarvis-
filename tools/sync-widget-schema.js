#!/usr/bin/env node
/* Synchronizuje wbudowaną kopię schematu widgetów w js/widget-spec.js z docs/spec/widget.schema.json
   (kopia = plik bez $comment; zgodność pilnuje tests/unit/w4.test.js).
   Uruchom po każdej zmianie schematu:  node tools/sync-widget-schema.js  */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SPEC = path.join(ROOT, 'docs', 'spec', 'widget.schema.json');
const JS = path.join(ROOT, 'js', 'widget-spec.js');

const schema = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
delete schema.$comment;
const compact = JSON.stringify(schema);

const src = fs.readFileSync(JS, 'utf8');
const re = /(\/\*SCHEMA:start\*\/)[\s\S]*?(\/\*SCHEMA:end\*\/)/;
if (!re.test(src)) { console.error('BŁĄD: brak znaczników /*SCHEMA:start*/ … /*SCHEMA:end*/ w js/widget-spec.js'); process.exit(1); }

const out = src.replace(re, (_, a, b) => a + compact + b);
if (out === src) { console.log('Schemat bez zmian (' + compact.length + ' znaków, wariantów: ' + schema.properties.blocks.items.oneOf.length + ')'); process.exit(0); }
fs.writeFileSync(JS, out);
console.log('OK: wbudowany schemat zsynchronizowany (' + compact.length + ' znaków, wariantów bloków: ' + schema.properties.blocks.items.oneOf.length + ')');
