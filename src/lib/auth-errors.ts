// Plain-language Indonesian messages for what Better Auth can return. Unknown errors get a generic one.
type AuthError = { code?: string; status?: number } | null | undefined;

const BY_CODE: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email atau kata sandi salah.",
  INVALID_PASSWORD: "Kata sandi salah.",
  PASSWORD_TOO_SHORT: "Kata sandi terlalu pendek. Gunakan minimal 12 karakter.",
  BANNED_USER: "Akun ini dinonaktifkan. Hubungi admin.",
  INVALID_CODE: "Kode salah. Periksa lalu coba lagi.",
  INVALID_BACKUP_CODE: "Kode cadangan salah.",
  TOTP_ALREADY_ENABLED: "Verifikasi dua langkah sudah aktif.",
  TOTP_NOT_ENABLED: "Verifikasi dua langkah belum aktif.",
  TWO_FACTOR_NOT_ENABLED: "Verifikasi dua langkah belum aktif.",
  INVALID_TWO_FACTOR_COOKIE: "Sesi masuk sudah habis. Masuk lagi dari awal.",
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "Terlalu banyak percobaan. Masuk lagi dari awal.",
  ACCOUNT_TEMPORARILY_LOCKED: "Terlalu banyak percobaan salah. Akun dikunci sementara, coba lagi nanti.",
};

export function authMessage(err: AuthError): string {
  if (err?.status === 429) return "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.";
  if (err?.code && BY_CODE[err.code]) return BY_CODE[err.code];
  return "Terjadi kesalahan. Coba lagi.";
}
