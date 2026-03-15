/**
 * Generates a random temporary password that meets the portal's requirements:
 * at least 8 characters, one uppercase letter, and one digit.
 */
export const generatePassword = (): string => {
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = lower + upper + digits;

  // Guarantee at least one uppercase and one digit
  const pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    digits[Math.floor(Math.random() * digits.length)],
    ...Array.from({ length: 8 }, () => all[Math.floor(Math.random() * all.length)]),
  ];

  // Shuffle so guaranteed chars aren't always at position 0-1
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }

  return pwd.join('');
};
