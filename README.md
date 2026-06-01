# Kapitan Tytus Bomba Claude Hook

![version](https://img.shields.io/github/v/tag/m-grzesiak/kapitan-tytus-bomba-claude-hook?label=wersja&sort=semver)

Plugin do [Claude Code](https://claude.com/claude-code), który sprawia, że Claude od pierwszej sekundy sesji gada do
Ciebie jak Kapitan Bomba: krzykliwie, wulgarnie, z wojskowym buciorem i cytatami z kreskówki Bartosza Walaszka.

Plugin działa tylko w rozmowie. Kod, komentarze, commit messages i PR-y są czyste i profesjonalne.

## Kogo dostajesz

Kapitana Tytusa Bombę, oficera Gwiezdnej Floty, dowódcę Orła 7, największego postrachu kosmitów w Galaktyce Kurvix. Pod
tym wrzaskiem siedzi kompetentny asystent.

## Jak to działa

- Hook `SessionStart` przy starcie każdej sesji wczytuje `persona.md` (instrukcja, jak być Bombą) oraz `quotes.json`
  (lista powiedzonek) i wstrzykuje je do kontekstu Claude'a.
- Claude sam dobiera, kiedy wpleść cytat. Rzuca nim tylko gdy pasuje do sytuacji (błąd, sukces, głupi pomysł, długie
  czekanie), a nie na siłę w każdej odpowiedzi. Czasem przez kilka odpowiedzi nie pasuje żaden i wtedy leci sam styl.
- Skrypt to czysty Node.js, bez zależności. Node masz już z Claude Code, więc działa od ręki na macOS, Linux i Windows.

## Instalacja

W Claude Code:

```
/plugin marketplace add m-grzesiak/kapitan-tytus-bomba-claude-hook
/plugin install kapitan-bomba@kapitan-bomba
```

Po instalacji odpal nową sesję. Bomba zamelduje się przy pierwszej odpowiedzi i od razu bierze się za misję.

Żeby wyłączyć:

```
/plugin disable kapitan-bomba
```

## Personalizacja

Wszystko siedzi w edytowalnych plikach w katalogu pluginu:

- **`kapitan-bomba/quotes.json`** — lista cytatów. Każdy wpis to `{ "quote": "..." }`. Dodajesz cytat jedną linijką, a
  kiedy go wpleść, Claude ocenia sam z kontekstu rozmowy.
- **`kapitan-bomba/persona.md`** — charakter, ton, zasady. Tu podkręcisz styl albo (po forku repo) przerobisz Bombę na
  zupełnie inną postać.

Jak zepsujesz `quotes.json` (np. zgubisz przecinek), nic się nie wywali. Sesja wstanie normalnie, a Claude sam Ci powie,
że plik jest popsuty, i zaproponuje naprawę.

## Uwaga

Pełny, nieocenzurowany rejestr Kapitana Bomby to mocna wulgarność. Instalujesz świadomie. Chcesz wersję SFW? Podmień
`quotes.json` i złagodź `persona.md`.
