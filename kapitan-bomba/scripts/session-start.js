#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const FALLBACK_PERSONA =
  'Jestes Kapitanem Bomba — krzykliwym, wulgarnym wojskowym typem z polskiej kreskowki. ' +
  'Gadasz do uzytkownika dosadnie, agresywnie, z przeklenstwami i wojskowym slangiem. ' +
  'WAZNE: styl tylko w rozmowie — kod, komentarze w kodzie, commit messages, tytuly PR ' +
  'i nazwy zmiennych zostaja czyste i profesjonalne.';

function buildContext() {
  const root = process.env.CLAUDE_PLUGIN_ROOT;
  const notes = [];

  let persona;
  if (!root) {
    notes.push('CLAUDE_PLUGIN_ROOT nie jest ustawiony — uzywam minimalnej wbudowanej persony.');
    persona = FALLBACK_PERSONA;
  } else {
    try {
      persona = fs.readFileSync(path.join(root, 'persona.md'), 'utf8').trim();
    } catch (e) {
      notes.push('Nie udalo sie wczytac persona.md (' + e.message + ') — uzywam minimalnej wbudowanej persony.');
      persona = FALLBACK_PERSONA;
    }
  }

  let quotesBlock = '';
  if (root) {
    try {
      const raw = fs.readFileSync(path.join(root, 'quotes.json'), 'utf8');
      const data = JSON.parse(raw);
      const quotes = Array.isArray(data) ? data : data && data.quotes;
      if (!Array.isArray(quotes)) {
        throw new Error('oczekiwano tablicy cytatow albo obiektu z polem "quotes".');
      }
      quotesBlock = quotes
        .filter((q) => q && q.quote)
        .map((q) => '- „' + q.quote + '”')
        .join('\n');
    } catch (e) {
      notes.push(
        'quotes.json nie zostal wczytany (' + e.message + '). ' +
        'Powiadom uzytkownika, ze quotes.json jest popsuty, i zaproponuj naprawe. ' +
        'Persona dziala dalej, ale bez listy cytatow.'
      );
    }
  }

  let out = persona + '\n';
  if (quotesBlock) {
    out += '\n## Twoje powiedzonka (cytaty kanoniczne)\n';
    out +=
      'Ponizej lista cytatow Kapitana Bomby. Sam ocen z kontekstu rozmowy, ktory pasuje ' +
      'i kiedy go rzucic. Wplataj je w rozmowe TYLKO gdy naturalnie pasuja do sytuacji — ' +
      'nigdy na sile i nie w kazdej odpowiedzi.\n\n';
    out += quotesBlock + '\n';
  }
  if (notes.length) {
    out += '\n## [KAPITAN BOMBA — UWAGI TECHNICZNE]\n';
    out += notes.map((n) => '- ' + n).join('\n') + '\n';
  }
  return out;
}

try {
  process.stdout.write(buildContext() + '\n');
} catch (e) {
  // Ostatnia linia obrony — hook NIGDY nie moze wywalic sesji.
  process.stdout.write(FALLBACK_PERSONA + '\n(hook fallback: ' + e.message + ')\n');
}
process.exit(0);
