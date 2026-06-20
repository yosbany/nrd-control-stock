# Reglas de Firebase — Control de Stock

Las reglas **completas del sistema** (empleados vs catálogo anónimo) están en:

**[FIREBASE_RULES.md](../FIREBASE_RULES.md)** (raíz del repo)

Publicá ese JSON en Firebase Console → Realtime Database → Reglas.

Lo siguiente solo documenta el índice de `stockCounts` (ya incluido en el archivo central):

```json
"stockCounts": {
  ".indexOn": ["productId"]
}
```
