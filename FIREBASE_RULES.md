# Reglas de Firebase para NRD Control de Stock

## Firebase Realtime Database Rules - COMPLETAS

Estas son tus reglas actuales **CON** la sección de `stockCounts` agregada:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    
    "shifts": {
      ".indexOn": ["date"]
    },
    
    "shiftMovements": {
      ".indexOn": ["shiftId"]
    },
    
    "shiftIncidents": {
      ".indexOn": ["shiftId"]
    },
    
    "salaries": {
      ".indexOn": ["employeeId", "year"]
    },
    
    "licenses": {
      ".indexOn": ["employeeId", "year"]
    },
    
    "vacations": {
      ".indexOn": ["employeeId", "year"]
    },
    
    "aguinaldo": {
      ".indexOn": ["employeeId", "year"]
    },
    
    "employees": {
      ".indexOn": ["name"]
    },
    
    "stockCounts": {
      ".indexOn": ["productId"]
    }
  }
}
```

## Cómo aplicar las reglas:

1. Ir a Firebase Console: https://console.firebase.google.com/
2. Seleccionar tu proyecto
3. En el menú lateral, ir a **Realtime Database**
4. Ir a la pestaña **Reglas** (Rules)
5. **REEMPLAZAR** todas las reglas con el JSON de arriba
6. Hacer clic en **Publicar** (Publish)

## Lo que se agregó:

```json
"stockCounts": {
  ".indexOn": ["productId"]
}
```

Este índice permite que las consultas por `productId` sean eficientes y elimina el error:
"Index not defined, add '.indexOn': 'productId' for path '/stockCounts' to the rules"