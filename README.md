# Moje Sylaby

Statyczna aplikacja do nauki czytania sylab z dzwiekiem (Web Speech API), gotowa pod GitHub Pages.

## Struktura

- `index.html` - szkielet strony
- `styles.css` - style
- `app.js` - logika aplikacji

## Uruchomienie lokalnie

Otworz `index.html` w przegladarce (zalecany Microsoft Edge).

## Publikacja na GitHub Pages

1. Utworz repozytorium na GitHub i wypchnij kod.
2. W repozytorium wejdz w **Settings -> Pages**.
3. W sekcji **Build and deployment** ustaw source na **GitHub Actions**.
4. Workflow `deploy-pages.yml` uruchomi sie automatycznie po kazdym pushu do `main`.
5. Po pierwszym deployu odczekaj chwile na publikacje.

Adres aplikacji bedzie mial format:

`https://<twoj-login>.github.io/<nazwa-repozytorium>/`
