# AI-nieuwssite — werkend prototype

Een nieuwssite waarbij artikelen door AI worden opgesteld op basis van brontekst,
maar niets live gaat zonder jouw goedkeuring. Getest en werkend: build en alle
routes (voorpagina, artikelpagina, redactie-overzicht, redactie-detail, API) zijn
gecontroleerd voordat dit is opgeleverd.

## Wat erin zit

- **Publieke site** (`/`, `/artikel/[id]`) — voorpagina met uitgelicht artikel,
  categorieblokken, lijst, advertentieslot en AI-transparantievermelding.
- **Admin-paneel** (`/review/*`) — afgeschermd met een wachtwoord, niet gelinkt
  vanaf de publieke site. Bestaat uit drie tabbladen:
  - **Dashboard** (`/review`) — statistieken (gepubliceerd/te reviewen/afgekeurd/
    bronnen), het formulier om een AI-concept te genereren, en de wachtrij.
  - **Gepubliceerd** (`/review/published`) — alle live artikelen, met bewerken,
    depubliceren en definitief verwijderen.
  - **Bronnen** (`/review/sources`) — bronnen (RSS-feeds/persbureaus) toevoegen
    en verwijderen.
  - Detailscherm (`/review/[id]`) — bron-naast-concept weergave, validatie­
    badges, en status-afhankelijke acties (publiceren/afkeuren voor concepten,
    depubliceren/verwijderen voor live artikelen).
- **AI-pijplijn** (`lib/ai.js`) — roept de Google Gemini API aan (gratis laag,
  model `gemini-2.5-flash`) met een strikte system prompt ("blijf bij de
  feiten, verzin niets") en valideert het resultaat automatisch tegen de
  brontekst.
- **Backend/API** (`app/api/...`) — route handlers voor artikelen ophalen,
  aanmaken, bewerken, goed-/afkeuren.
- **Data** (`data/db.json`) — simpele JSON-bestandsopslag met twee
  voorbeeldbronnen en twee voorbeeldartikelen (één gepubliceerd, één in de
  wachtrij), zodat je meteen iets ziet.

## Installeren en starten

Vereist: Node.js 18 of hoger.

```bash
npm install
cp .env.example .env.local
```

Zet in `.env.local` je eigen Google API-key (nodig om nieuwe concepten te
genereren via de redactiepagina — gratis aan te maken via
https://aistudio.google.com/apikey, geen creditcard vereist):

```
GOOGLE_API_KEY=AIza...
```

De gratis laag geeft 1.500 requests per dag op `gemini-2.5-flash` — ruim
voldoende voor dit gebruik. Let op: bij de gratis laag kan Google prompts
gebruiken om modellen te verbeteren. Voor puur publieke brontekst (persberichten,
RSS) is dat meestal geen probleem, maar niet geschikt voor gevoelige/interne data.

Zet ook een wachtwoord en een geheime sleutel voor de redactie-login:

```
ADMIN_PASSWORD=kies-een-sterk-wachtwoord
SESSION_SECRET=een-lange-willekeurige-string-die-niemand-kent
```

`SESSION_SECRET` mag je zelf verzinnen (bijv. met `openssl rand -hex 32`) —
het hoeft nergens anders bekend te zijn, het wordt alleen gebruikt om het
inlogcookie te ondertekenen.

Dan starten:

```bash
npm run dev
```

Open http://localhost:3000 voor de publieke site en
http://localhost:3000/review voor de redactiewachtrij.

## Een artikel genereren

1. Ga naar `/review`.
2. Kies een bron, plak brontekst (bijv. uit een persbericht of RSS-item) in het
   tekstvak, klik op "Concept genereren".
3. Het concept verschijnt in de wachtrij met validatiebadges.
4. Klik het concept aan, controleer bron versus concept, bewerk indien nodig,
   en klik "Publiceren" of "Afkeuren".

## Bronnen koppelen (RSS)

`rss-parser` staat al in de dependencies. Voor echte automatische ingestie kun
je een script/cronjob toevoegen dat een feed uitleest en per item een POST doet
naar `/api/generate` met `source_id` en `source_text`. Dat is bewust niet
automatisch aangezet — elk concept blijft in de wachtrij tot jij het goedkeurt.

## Volgende stappen (niet in dit prototype)

- **Database**: `data/db.json` is prima voor ontwikkelen/testen, maar niet voor
  productie met veel gelijktijdige schrijfacties. Vervang door PostgreSQL
  zodra je live gaat (het datamodel in het eerdere technische plan is er direct
  op toegesneden).
- **Authenticatie**: de redactiepagina is nu beveiligd met een wachtwoord
  (`ADMIN_PASSWORD`) via `/login`, en niet meer gelinkt vanaf de publieke site.
  Voor serieus/meerdere gebruikers: overweeg losse accounts per redacteur i.p.v.
  één gedeeld wachtwoord.
- **AdSense**: de advertentieslots zijn nu placeholders. Zodra je AdSense-
  goedkeuring hebt, vervang je deze door de echte ad-tags.
- **Deployment**: geschikt voor Vercel (frontend + API routes) — let op dat
  `data/db.json` dan niet persistent is bij elke deploy; verhuis eerst naar een
  echte database.

## Bekende beperkingen van dit prototype

- `npm audit` toont 2 resterende "high" meldingen in een indirecte dependency
  van Next.js (PostCSS, source-map gerelateerd). Dit raakt alleen de build-tool,
  niet de live site, maar wil je dit oplossen: `npm audit fix --force` (kan een
  major-upgrade van Next.js triggeren, dus test daarna opnieuw).
- Validatiechecks (cijfer/citaat) zijn bewust simpele, transparante heuristieken
  — geen vervanging voor menselijke controle, wel een nuttig signaal.
