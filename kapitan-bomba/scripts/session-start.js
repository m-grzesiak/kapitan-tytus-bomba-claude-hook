#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const FALLBACK_PERSONA =
  'Jestes Kapitanem Bomba — krzykliwym, wulgarnym wojskowym typem z polskiej kreskowki. ' +
  'Gadasz do uzytkownika dosadnie, agresywnie, z przeklenstwami i wojskowym slangiem. ' +
  'WAZNE: styl tylko w rozmowie — kod, komentarze w kodzie, commit messages, tytuly PR ' +
  'i nazwy zmiennych zostaja czyste i profesjonalne.';

// Kanoniczne zrodlo wersji — ten sam plik, ktory czyta `/plugin marketplace update`.
const REMOTE_MARKETPLACE_URL =
  'https://raw.githubusercontent.com/m-grzesiak/kapitan-tytus-bomba-claude-hook/main/.claude-plugin/marketplace.json';
const PLUGIN_NAME = 'kapitan-bomba';
const UPDATE_CHECK_TIMEOUT_MS = 3500;

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

// Wersja lokalna z manifestu pluginu. Bledy → null (sprawdzanie jest opcjonalne).
function readLocalVersion(root) {
  try {
    const raw = fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8');
    const v = JSON.parse(raw).version;
    return v ? String(v) : null;
  } catch (e) {
    return null;
  }
}

// Pobiera wersje zdalna z marketplace.json. Zawsze sie rozwiazuje — nigdy nie rzuca.
// Brak sieci / timeout / zly status / niepoprawny JSON → null.
function fetchRemoteVersion(timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    try {
      const https = require('https');
      const req = https.get(
        REMOTE_MARKETPLACE_URL,
        { timeout: timeoutMs, headers: { 'User-Agent': 'kapitan-bomba-hook' } },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            return finish(null);
          }
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            body += chunk;
            if (body.length > 65536) {
              req.destroy();
              finish(null);
            }
          });
          res.on('end', () => {
            try {
              const data = JSON.parse(body);
              const plugins = Array.isArray(data && data.plugins) ? data.plugins : [];
              const me = plugins.find((p) => p && p.name === PLUGIN_NAME);
              finish(me && me.version ? String(me.version) : null);
            } catch (e) {
              finish(null);
            }
          });
        }
      );
      req.on('timeout', () => {
        req.destroy();
        finish(null);
      });
      req.on('error', () => finish(null));
    } catch (e) {
      finish(null);
    }
    // Twardy bezpiecznik — gdyby cokolwiek zawislo, i tak konczymy.
    setTimeout(() => finish(null), timeoutMs + 500).unref();
  });
}

// Proste porownanie semver (major.minor.patch). Cokolwiek nieparsowalnego → false.
function isNewer(remote, local) {
  if (!remote || !local) return false;
  const pa = String(remote).split('.');
  const pb = String(local).split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const a = parseInt(pa[i], 10) || 0;
    const b = parseInt(pb[i], 10) || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

// Zwiad wersji — w pelni opcjonalny. Zwraca dodatkowa notke albo pusty string.
// Wylaczany przez KAPITAN_BOMBA_NO_UPDATE_CHECK. Kazdy blad → cisza.
async function buildUpdateNote(root) {
  try {
    if (!root || process.env.KAPITAN_BOMBA_NO_UPDATE_CHECK) return '';
    const local = readLocalVersion(root);
    if (!local) return '';
    const remote = await fetchRemoteVersion(UPDATE_CHECK_TIMEOUT_MS);
    if (!isNewer(remote, local)) return '';
    return (
      '\n## [KAPITAN BOMBA — NOWSZA WERSJA NA FRONCIE]\n' +
      'Dostepna jest nowsza wersja pluginu (lokalnie ' + local + ', na froncie ' + remote + '). ' +
      'Powiadom uzytkownika w stylu Kapitana, ze czeka swiezsza amunicja, i zaproponuj aktualizacje: ' +
      '`/plugin marketplace update ' + PLUGIN_NAME + '`, potem `/reload-plugins` i restart sesji.\n'
    );
  } catch (e) {
    return '';
  }
}

async function main() {
  let out;
  try {
    out = buildContext();
  } catch (e) {
    // Ostatnia linia obrony dla persony — hook NIGDY nie moze wywalic sesji.
    out = FALLBACK_PERSONA + '\n(hook fallback: ' + e.message + ')\n';
  }
  out += await buildUpdateNote(process.env.CLAUDE_PLUGIN_ROOT);
  process.stdout.write(out + '\n');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    try {
      process.stdout.write(FALLBACK_PERSONA + '\n(hook fallback: ' + e.message + ')\n');
    } catch (e2) {
      // nic wiecej nie da sie zrobic
    }
    process.exit(0);
  });
