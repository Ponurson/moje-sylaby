# Moje Sylaby

Statyczna aplikacja do nauki czytania sylab z dzwiekiem (Web Speech API), gotowa pod GitHub Pages.

## Funkcje

- **Tryb szybki** - klik sylaby od razu odtwarza dzwiek.
- **Tryb skladania** - budowanie ciagu z sylab i odtwarzanie przyciskiem `Play`.
- **Tryb skladania+drzewo** - rozbudowana biblioteka sylab (baza slownikowa 10k+).
- **Tryb tekstu** - wpisanie zdania i automatyczny podzial na sylaby.
- **Przelacznik liter** - szybka zmiana miedzy `WIELKIE LITERY` i `male litery` we wszystkich trybach.
- **Edycja ciagu** - `Wstaw spacje`, `Cofnij ostatnia`, `Wyczysc`, usuwanie pojedynczych elementow kliknieciem.

## Struktura

- `index.html` - struktura strony i panele trybow
- `styles.css` - styl aplikacji
- `app.js` - logika trybow, TTS i podzialu na sylaby
- `syllables_pl_dict_12k.json` - slownikowa baza sylab dla trybu drzewiastego
- `.github/workflows/deploy-pages.yml` - automatyczny deploy na GitHub Pages

## Uruchomienie lokalnie

1. Uruchom serwer statyczny w katalogu projektu:

   `python3 -m http.server 8088 --bind 0.0.0.0`

2. Otworz aplikacje w przegladarce:

   `http://127.0.0.1:8088`

Uwaga: nie otwieraj pliku `index.html` bezposrednio przez `file://`, bo tryb drzewiasty laduje dane z pliku JSON przez HTTP.

## Publikacja na GitHub Pages

1. W repozytorium wejdz w **Settings -> Pages**.
2. W sekcji **Build and deployment** ustaw source na **GitHub Actions**.
3. Workflow `deploy-pages.yml` uruchomi sie automatycznie po kazdym pushu do `main`.
4. Po zielonym deployu aplikacja bedzie dostepna pod adresem:

   `https://<twoj-login>.github.io/<nazwa-repozytorium>/`
