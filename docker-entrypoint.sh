#!/bin/sh
# Genereert bij de allereerste start automatisch een SESSION_SECRET en bewaart
# die in het gemounte data-volume, zodat je nergens handmatig een geheim
# hoeft in te vullen om in te kunnen loggen — vergelijkbaar met hoe tools als
# Overseerr/Jellyfin bij eerste gebruik zelf hun configuratie opzetten.
#
# Geef je zelf al een SESSION_SECRET mee via environment (bijv. voor
# meerdere replica's die dezelfde sleutel moeten delen), dan wordt die
# gebruikt in plaats van er een te genereren.
set -e

SECRET_FILE="${SESSION_SECRET_FILE:-/app/data/.session_secret}"

if [ -z "$SESSION_SECRET" ]; then
  if [ -f "$SECRET_FILE" ]; then
    SESSION_SECRET="$(cat "$SECRET_FILE")"
  else
    SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
    echo "$SESSION_SECRET" > "$SECRET_FILE"
  fi
  export SESSION_SECRET
fi

# Losstaand achtergrondproces voor automatische RSS-import — draait bewust
# als apart proces i.p.v. via Next.js' instrumentation-hook (zie
# scripts/rss-scheduler.mjs). Faalt dit om wat voor reden dan ook, dan mag
# dat de hoofdsite nooit platleggen — vandaar op de achtergrond, los van
# "exec" voor de hoofdserver hieronder.
node scripts/rss-scheduler.mjs &

exec node server.js
