// Utilities for input formatting & validation

export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

export function formatSUS(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 15);
  return digits
    .replace(/(\d{3})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d{1,4})$/, '$1 $2');
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

export function getDayOfWeekName(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[date.getDay()] || '';
}

export function cleanPhoneForWhatsApp(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (!clean.startsWith('55') && (clean.length === 10 || clean.length === 11)) {
    clean = '55' + clean;
  }
  return clean;
}

/**
 * Validação de senha alfanumérica de segurança aumentada:
 * Exatamente 6 caracteres no total, contendo 5 números e 1 letra (em qualquer posição).
 */
export function isValidAlphanumericPassword(pwd: string): boolean {
  if (!pwd || pwd.length !== 6) return false;
  const digits = (pwd.match(/\d/g) || []).length;
  const letters = (pwd.match(/[a-zA-Z]/g) || []).length;
  return digits === 5 && letters === 1 && (digits + letters === 6);
}

export function validatePasswordMessage(pwd: string): string | null {
  if (!pwd) return 'Informe a senha de 6 caracteres.';
  if (pwd.length !== 6) return 'A senha deve conter exatamente 6 caracteres (5 números e 1 letra).';
  const digits = (pwd.match(/\d/g) || []).length;
  const letters = (pwd.match(/[a-zA-Z]/g) || []).length;
  if (digits !== 5 || letters !== 1 || (digits + letters !== 6)) {
    return 'Formato inválido: a senha deve conter obrigatoriamente 5 números e 1 letra (Ex: 543W21).';
  }
  return null;
}

