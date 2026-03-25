function parseDateParts(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);

  if (!year || !month || !day) {
    throw new Error(`Fecha invalida: ${dateStr}`);
  }

  return { year, month, day };
}

export function parseLocalDateStart(dateStr: string) {
  const { year, month, day } = parseDateParts(dateStr);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function parseLocalDateEnd(dateStr: string) {
  const { year, month, day } = parseDateParts(dateStr);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

export function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
