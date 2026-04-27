# NRD Control de Stock

Microfrontend NRD para registrar **conteos de existencia** por producto (y variante si aplica) y ver el **historial** con la diferencia respecto al conteo anterior.

## Requisitos

- Misma pila que el resto de apps NRD: Firebase Auth, [NRD Common](https://github.com/yosbany/nrd-common), [NRD Data Access](https://github.com/yosbany/nrd-data-access) con soporte de `nrd.stockCounts` (build reciente).
- Reglas de **Firebase Realtime Database**: permitir lectura/escritura en `stockCounts` a usuarios autenticados (alineado al resto de colecciones). Ejemplo:

```json
{
  "rules": {
    "stockCounts": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

(Ajustá a tu política; no sustituye una revisión de seguridad.) Si usás `queryByChild('productId', ...)` y Firebase lo exige, en la regla de la base podés añadir índice: `"stockCounts": { ".indexOn": ["productId"] }` (junto a las reglas de lectura/escritura).

## Desarrollo local

Con el servidor NRD (`nrd-common/tools/server/restart.sh`), la app queda en:

`http://localhost/nrd-control-stock/`

## Despliegue (GitHub Pages)

1. Repositorio: [yosbany/nrd-control-stock](https://github.com/yosbany/nrd-control-stock).
2. Desde esta carpeta, si usás un repo **solo** para esta app:

```bash
cd nrd-control-stock
git init
git remote add origin https://github.com/yosbany/nrd-control-stock.git
git add .
git commit -m "feat: NRD Control de Stock"
git branch -M main
git push -u origin main
```

3. En GitHub: **Settings → Pages →** rama `main`, carpeta `/ (root)`.
4. Tras el build, la URL pública será `https://yosbany.github.io/nrd-control-stock/`.

## Datos

- Colección `/stockCounts`: ver modelo `StockCount` en `nrd-data-access` y `listByProductAndVariant` en `StockCountsService`.

## Cache busting

```bash
python3 tools/update-version/update-version.py
```
