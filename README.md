# GO PERÚ - Landing Page Esports

Landing page oficial de **GO PERÚ**, comunidad competitiva peruana de esports nacida en
StarCraft II. Lema: **Siempre Unidos**.

Sitio estático en HTML + CSS + JavaScript vanilla. Sin backend, sin base de datos, sin
frameworks. Se despliega tal cual en GitHub Pages, Netlify o Vercel.

## Estructura

```
go-peru/
├── index.html          # Estructura y contenido del sitio
├── admin.html          # Panel de control (administrar torneos y roster)
├── data/content.js     # Datos editables (torneos + roster)
├── css/styles.css      # Estilos (tema dark, acento rojo, responsive)
├── js/script.js        # Render de datos, brasas, navbar, reveal, contadores
├── js/admin.js         # Lógica del panel admin
└── assets/
    ├── img/            # Logos + imágenes de juegos/secciones
    └── fonts/          # Oswald + Barlow (woff2 self-host)
```

## Panel de control (admin.html)

Para administrar **torneos** y **roster** sin tocar código:

1. Abre `admin.html` (doble clic, o `tusitio.com/admin.html` si está desplegado).
2. Agrega, edita o elimina torneos y jugadores con los formularios.
3. Pulsa **Descargar content.js**.
4. Reemplaza `data/content.js` de tu proyecto con el archivo descargado.
5. Sube/despliega de nuevo. Los cambios quedan en vivo.

El panel **no guarda solo**: aplica los cambios cuando reemplazas `data/content.js`.
Usa **Importar content.js** para volver a cargar un archivo y seguir editándolo.

> El sitio lee el contenido desde `data/content.js`, por eso funciona tanto abriendo el
> archivo directo (doble clic) como desplegado, sin necesidad de servidor.

## Cómo verlo en local

Por las fuentes y rutas relativas, conviene servirlo con un servidor estático en vez de
abrir el archivo directamente:

```bash
# Opción 1: Python
python -m http.server 8000

# Opción 2: Node
npx serve .
```

Luego abre `http://localhost:8000`.

## Despliegue

- **GitHub Pages:** sube la carpeta a un repo y activa Pages sobre la rama (`/root`).
- **Netlify / Vercel:** arrastra la carpeta o conecta el repo. No requiere build ni comandos.

## Cómo personalizar

| Quieres cambiar... | Dónde |
|---|---|
| Torneos (agregar/editar/borrar) | **Panel `admin.html`** → Descargar content.js → reemplazar `data/content.js`. |
| Roster: líder, jugadores y enlaces | **Panel `admin.html`** (incluye fotos y enlaces de transmisión). |
| Foto de un jugador o del líder | En el panel, botón **Subir foto** (se optimiza y se incrusta sola) o pega una ruta/URL. Sin foto, muestra la inicial. |
| Logo | El sitio usa `assets/img/logo.png` (versión web optimizada). El original es `NEWLOGO.png`; si lo cambias, vuelve a generar `logo.png`/`favicon.png`. |
| Estadísticas (contadores) | Texto en `index.html`, sección Stats. Usan `data-count` y `data-suffix`. |
| Formulario de postulación | En Reclutamiento, el botón con `data-form` (`href="#"`): apunta a tu Google Forms o formulario propio. |
| Redes (Discord/WhatsApp/Twitch) | En el footer, los `.footer__icon--soon` tienen `href="#"`: agrega las URLs y quita la clase `--soon`. |
| Colores | Variables CSS en `:root` (`--red`, `--bg`, etc.) al inicio de `styles.css`. |

## Decisiones de diseño (resumen)

- **Tema único oscuro** con un **único acento rojo** derivado del logo (negro/rojo/blanco/gris),
  para una identidad coherente tipo organización profesional de esports.
- **Logo protagonista** en el hero con glow rojo y leve flotación.
- **Tipografía:** Oswald (display condensada, fuerza deportiva/militar) + Barlow (cuerpo legible).
- **Brasas en canvas** en el hero: motion premium pero sutil; se reduce en móvil y se pausa
  con la pestaña oculta o fuera de vista.
- **Animaciones motivadas:** scroll-reveal para jerarquía, contadores para impacto de cifras,
  hover en tarjetas para feedback. Todo respeta `prefers-reduced-motion`.
- **Fotos de juegos** con duotono rojo/oscuro por CSS para unificarlas con la marca.
- **Mobile first**, navbar colapsable, layouts que pasan a una columna en pantallas chicas.

## Notas

- El contenido de torneos y el roster (salvo AyaxFenix) son **ejemplos** editables.
- Las imágenes de las secciones son fotografía gaming de stock; reemplázalas por key art o
  fotos propias cuando las tengas (mismas rutas en `assets/img/`).
- Las fuentes están self-hosteadas (sin llamadas externas), así el sitio carga sin depender
  de terceros y despliega idéntico en cualquier hosting estático.
