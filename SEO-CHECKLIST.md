# Checklist de visibilidad - GO PERÚ GAMING

URL del sitio: **https://gersonha.github.io/go-peru/**

## 1. Publicar en GitHub Pages
- [ ] Sube el repositorio `go-peru` a GitHub.
- [ ] En el repo: **Settings -> Pages -> Build and deployment**. Source: `Deploy from a branch`, rama `main`, carpeta `/ (root)`.
- [ ] Espera a que la URL responda: https://gersonha.github.io/go-peru/
- [ ] Verifica que carguen: la página, `assets/img/og-image.png`, `sitemap.xml`, `robots.txt` y `llms.txt`.

## 2. Google Search Console (indexación)
- [ ] Entra a https://search.google.com/search-console y agrega una propiedad de tipo **Prefijo de URL** con `https://gersonha.github.io/go-peru/`.
- [ ] Verifica la propiedad. Como GitHub Pages no deja subir el archivo de verificación a la raíz del dominio, usa el método **etiqueta HTML**: Google te dará un `<meta name="google-site-verification" ... />` para pegar en el `<head>` de `index.html` (puedo agregarlo cuando lo tengas).
- [ ] En **Sitemaps**, envía directamente: `https://gersonha.github.io/go-peru/sitemap.xml`
  - Nota: en GitHub Pages el `robots.txt` del subpath NO es el autoritativo (Google lo busca en la raíz `gersonha.github.io/robots.txt`), por eso conviene enviar el sitemap a mano.
- [ ] Usa **Inspección de URLs** -> "Solicitar indexación" para la página principal.

## 3. Bing Webmaster Tools (opcional, recomendado)
- [ ] https://www.bing.com/webmasters -> agrega el sitio.
- [ ] Importa la propiedad desde Search Console (más rápido) o verifica con etiqueta HTML.
- [ ] Envía el mismo sitemap.

## 4. Previsualización social (Open Graph)
- [ ] Prueba cómo se ve al compartir: https://www.opengraph.xyz/ (pega tu URL) o el depurador de Facebook: https://developers.facebook.com/tools/debug/
- [ ] Debe mostrar el banner `og-image.png` (1200x630), el título y la descripción.

## 5. Datos estructurados (Schema.org)
- [ ] Valida el JSON-LD con https://search.google.com/test/rich-results (pega la URL).
- [ ] Debe reconocer la organización `SportsOrganization` (GO PERÚ GAMING).

## 6. Visibilidad fuera del sitio (lo que más mueve la aguja)
- [ ] Enlaza el sitio desde la **bio de tu Facebook** y publicaciones.
- [ ] Compártelo en tu **Discord** y comunidades de StarCraft II / esports peruano.
- [ ] Agrega el enlace en tus perfiles de **Challonge** y en descripciones de **transmisiones de Twitch/YouTube**.
- [ ] Si compites en ligas (Liquipedia, etc.), incluye el sitio oficial en el perfil del equipo.
- [ ] Considera crear un **Google Business Profile** si más adelante manejan ubicación/eventos físicos en Lima.

## Pendientes opcionales
- [ ] Agregar la etiqueta `google-site-verification` cuando la tengas.
- [ ] Si cambias de dominio (ej. dominio propio), avísame para actualizar canonical, og:url, sitemap, robots y JSON-LD.
