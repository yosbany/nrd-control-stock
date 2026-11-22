# Reglas de Firebase — Control de Stock

Este repo **no** es dueño de las reglas RTDB del sistema.

Documento histórico de reglas (JSON del repo GitHub `nrd-system`, **no** necesariamente LIVE):

`https://github.com/yosbany/nrd-system/blob/main/FIREBASE_RULES.md`

Baseline LIVE (verificado en Console): `nrd-enterprise-architecture/platform/security/03-firebase-security-baseline.md`

Índice de `stockCounts` (incluido en el archivo histórico):

```json
"stockCounts": {
  ".indexOn": ["productId"]
}
```
