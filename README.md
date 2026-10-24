# Photos

Photo backup as its own optional Wizard app (one launcher tile). Wizard Settings has no Photos row.

- **View** (`/photos/`): one switch turns backup on; on a phone that is not signed in it opens Wizard Sign-in
  (fingerprint) and switches backup on when sign-in returns. Wi-Fi only and first-backup-while-charging switches,
  album choice, Back up now, Sign in again, two-tap Disconnect. Dark, phone-first, Appearance v1 tokens.
  Back closes the album list; at the root Wizard OS takes its own step.
- **Native side** lives in Wizard OS for Android (`ai.wizards.os` 0.9.32+, package `ai.wizards.os.photos`): photo
  access, the backup worker, the photo server client and Wizard Sign-in. The view reaches it only through the shell
  relay (`wizard-os:photos` postMessage, `/photos/` frames only, allowlisted methods). Keys and sign-in state never
  reach the view. Older Wizard OS builds open their native backup screen; a browser or the desktop shell shows where
  backup runs.
- **Photo server**: Immich, self-hosted (the build's default server, or the address the owner enters once).
- **State**: none. This container serves the view and a health check only; it never sees photos or keys.
- **Later**: the owner's photo library and the private agent's photo tools (MCP) join this app.
- **Status: alpha.** Backup, de-duplication, permission denial and the switch→sign-in→on path are tested on an Android
  emulator against a disposable Immich; the real fingerprint round trip is proven on the owner's phone.

## Run locally

```
python3 app/server.py   # http://127.0.0.1:9418/photos/
node --test tests/*.cjs && python3 -m unittest discover tests
```
