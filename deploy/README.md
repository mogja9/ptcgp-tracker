# Deployment recipes

Three sample setups for keeping ptcgp-tracker running on a server with the
database refreshed automatically. Pick whichever matches your environment.

## Option 1 - Docker Compose (recommended)

The repo ships a `Dockerfile` and a `docker-compose.yml` that runs two
containers off the same image: a web container and a sync container. They
share a volume so the SQLite database is persistent.

```bash
# In the repo root
docker compose up -d
docker compose logs -f sync   # watch the loop tick
```

Knobs (set as env vars or in a `.env` file):

| Variable | Default | What it does |
| --- | --- | --- |
| `INTERVAL_MINUTES` | 120 | Sleep time between sync runs |
| `PAGES` | 2 | How many `/tournaments` pages to sweep per run |
| `LIMITLESS_API_KEY` | unset | Optional, lifts the 50 req / 5min cap |

Data lives in `./data` on the host - back this up (it's just a SQLite file).

## Option 2 - systemd

Two unit files plus a timer. Copy them to `/etc/systemd/system/`,
substitute paths for your install, then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pocket-tracker.service
sudo systemctl enable --now pocket-tracker-sync.timer
```

The web service runs `npm run start` (port 3001 by default). The sync
timer fires every two hours with a 5-minute jitter so different
self-hosters don't all hit the API at the same instant.

Files:
- `pocket-tracker.service` - long-running web server
- `pocket-tracker-sync.service` - one-shot, runs `npm run sync`
- `pocket-tracker-sync.timer` - schedules the sync service

## Option 3 - cron

If you'd rather use cron instead of systemd, drop this line in `crontab -e`:

```
0 */2 * * * cd /opt/ptcgp-tracker && /usr/bin/npm run sync >> /var/log/ptcgp-tracker-sync.log 2>&1
```

That runs the sync at the top of every other hour. Pair with whatever you
use to keep `npm run start` alive (pm2, systemd, supervisord, tmux).

## Verifying it's working

`/api/health` returns `{ ok: true, lastSync, eligibleTournaments,
distinctPlayers }`. Use it as a Docker `HEALTHCHECK`, an uptime monitor
ping, or a quick `curl` to confirm a fresh sync has landed.
