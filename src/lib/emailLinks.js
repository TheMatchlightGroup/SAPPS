// Three ways to hand a pre-written email to the sender, so nobody is forced
// into a mail client they don't use:
//   gmail  — opens Gmail's web composer in a new tab, fields pre-filled
//   mailto — the OS default mail app (classic behavior)
//   copy   — puts recipients + subject + body on the clipboard to paste anywhere

export function gmailComposeUrl({ to, subject, body }) {
  return (
    'https://mail.google.com/mail/?view=cm&fs=1' +
    `&to=${encodeURIComponent(to)}` +
    `&su=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`
  )
}

export function mailtoUrl({ to, subject, body }) {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export async function copyEmailToClipboard({ to, subject, body }) {
  const text = `To: ${to}\nSubject: ${subject}\n\n${body}`
  await navigator.clipboard.writeText(text)
}
