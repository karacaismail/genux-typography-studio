/** Yerel dosya indirme: tarayıcı dışına veri göndermez. */
export function downloadText(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const stamp = (d = new Date()) => d.toISOString().slice(0, 16).replace(/[:T]/g, '-');
