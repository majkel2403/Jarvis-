# MiniMax — głosy do bąbelków i mowy Jarvisa

Region globalny: `https://api.minimax.io`. Klucz `MINIMAX_API_KEY` czytaj z `.env` profilu parserem linii `KLUCZ=wartość` w `python` przez `terminal`; w raporcie podawaj tylko `bool(key)` / `len(key)`, nigdy wartości.

## 1. Gdzie Hermes trzyma ustawienia głosu

- Sekcja `tts:` w `config.yaml` (provider `minimax`): `model`, `voice_id`, `speed`, `vol`, `pitch`, `emotion`, `sample_rate`, `bitrate`, `region` / `base_url`, `group_id`.
- Domyślne wartości w kodzie: `hermes-agent/tools/tts_tool_providers.py` → `DEFAULT_MINIMAX_MODEL = "speech-02-hd"`, `DEFAULT_MINIMAX_VOICE_ID = "English_expressive_narrator"`.
- Narzędzie `text_to_speech` **nie ma parametru głosu** — przyjmuje `text`, `speed` i (`instructions` — tylko OpenAI). Głos, ton i jakość ustawiasz w configu, a zmianę wprowadza restart gatewaya (`schtasks /Run /TN JarvisOS-GatewayRestart`).
- `language_boost` (m.in. `Polish`, `Dutch`, `auto`) poprawia wymowę, ale **Hermes go nie wysyła** — ustaw go jawnie, gdy generujesz wprost przez API.

## 2. Sprawdź dostępne głosy (nie zgaduj ID)

```
POST https://api.minimax.io/v1/get_voice
Authorization: Bearer <MINIMAX_API_KEY>
{"voice_type": "system" | "voice_cloning" | "voice_generation" | "all"}
→ system_voice[]: { voice_id, voice_name, description[] }
```

Ostatni pomiar: 332 głosy systemowe, w tym 4 polskie — `Polish_female_1_sample1` (Calm Woman), `Polish_female_2_sample3` (Casual Woman), `Polish_male_1_sample4` (Male Narrator), `Polish_male_2_sample3` (Male Anchor). Listę odświeżaj zapytaniem, nie pamięcią — MiniMax dodaje głosy.

## 3. Wygeneruj plik wprost przez API (próbka, inny głos, klon)

```
POST https://api.minimax.io/v1/t2a_v2
{"model":"speech-02-hd", "text":"…", "language_boost":"Polish",
 "voice_setting":{"voice_id":"Polish_female_1_sample1","speed":1.0,"vol":1.0,"pitch":0,"emotion":"neutral"},
 "audio_setting":{"sample_rate":32000,"bitrate":128000,"format":"mp3","channel":1}}
→ base_resp.status_code == 0 ; data.audio = dźwięk w HEX → bytes.fromhex(...) → zapis pliku
→ extra_info.audio_length = długość w ms (dowód, że dźwięk powstał)
```

Zakresy i warianty:

- `speed` 0.5–2 (1.0 = normalnie); `vol` (0, 10]; `pitch` liczba całkowita −12…12 (0 = oryginalna barwa).
- `emotion`: `happy`, `sad`, `angry`, `fearful`, `disgusted`, `surprised`, `calm`, `neutral`; `fluent` i `whisper` (szept) tylko dla `speech-2.6-*` i `speech-2.8-*`.
- Modele: `speech-02-hd` (domyślny w Hermesie), `speech-02-turbo`, `speech-2.6-hd/turbo`, `speech-2.8-hd/turbo` (najnowsze, najwięcej emocji). `-hd` = lepsza jakość, `-turbo` = szybciej i taniej.
- Format `mp3 | pcm | flac | wav`, do 10 000 znaków na żądanie; jest też tryb strumieniowy i WebSocket.
- Głosy własne: `voice_cloning` (kopia głosu z próbki nagrania) i `voice_generation` (głos z opisu słownego). Proponuj je, nie uruchamiaj po cichu — to dane biometryczne użytkownika wymagające jego decyzji.

## 4. Jak odpowiadać na „jakie mamy możliwości głosu”

Nie wyliczaj opcji w oderwaniu od dźwięku — **zagraj je**. Wygeneruj 3–4 krótkie próbki tym samym zdaniem (np. polski żeński, polski męski, obecny domyślny dla porównania), każdą wyślij jako bąbel (`MEDIA:<ścieżka>` + `[[audio_as_voice]]`, ścieżki z backslashami). Do tego krótkie wyjaśnienie prostym językiem: co da się ustawić (głos, ton, tempo, wysokość, jakość, język, klonowanie) i co trzeba zmienić, żeby weszło na stałe (config + restart). Użytkownik wybiera słuchem i mówi, który głos zostawić.
