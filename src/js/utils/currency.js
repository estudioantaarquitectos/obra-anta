/**
 * Utilidades para formateo e interpretación de cantidades monetarias en Euros (€).
 * Reglas de formato: Estándar español/europeo (separador de miles con punto,
 * decimales con coma, dos céntimos y símbolo de euro €).
 */

export function parseCurrency(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim().replace(/[^\d.,-]/g, '');
  if (!str) return 0;

  if (str.includes('.') && str.includes(',')) {
    // Formato europeo 8.121.870,27 -> quitamos puntos de miles y cambiamos coma por punto
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    // 8121870,27 -> cambiamos coma por punto
    str = str.replace(',', '.');
  } else if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length > 2) {
      // Varios puntos (ej. 8.121.870)
      str = str.replace(/\./g, '');
    } else if (parts.length === 2) {
      // Si la parte derecha tiene exactamente 3 dígitos y no más de 3 a la izquierda, interpretamos como miles
      if (parts[1].length === 3 && parts[0].length >= 1 && parts[0].length <= 3) {
        str = str.replace('.', '');
      }
      // Si tiene 2 dígitos (ej: 8121870.27), se mantiene como decimal
    }
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function formatCurrency(val, fallback = '0,00 €') {
  if (val === null || val === undefined || val === '') return fallback;
  const num = parseCurrency(val);
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}
