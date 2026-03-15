/**
 * Returns the difference in days between today and a due date string (YYYY-MM-DD).
 * Positive  → overdue (today is past the due date)
 * Zero      → due today
 * Negative  → upcoming (due date is in the future)
 */
export const getDaysDiff = (dueDate: string): number => {
  const due = new Date(dueDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Returns the CSS row class for a payment row based on its status and due date.
 */
export const getPaymentRowClass = (status: string, dueDate: string): string => {
  if (status === 'paid') return '';
  if (status === 'overdue') return 'row-danger';
  const due = new Date(dueDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays >= 0 && diffDays <= 3) return 'row-warning';
  return 'table-row-striped';
};

/**
 * Returns the CSS row class for a student row based on status and monthly due day.
 */
export const getStudentRowClass = (status: string, dueDay: number): string => {
  if (status === 'overdue') return 'row-danger';
  const diff = dueDay - new Date().getDate();
  if (status === 'active' && diff >= 0 && diff <= 3) return 'row-warning';
  return 'table-row-striped';
};
