export const statusStyleClasses: Record<string, string> = {
  "action": "tw-status-action [&_small]:[color:#b43e37] [&_small]:text-[length:11px] grid gap-[5px] [justify-items:start]",
  "badge": "tw-status-badge inline-flex p-[5px_9px] rounded-[999px] text-[length:10px] font-[750]",
  "cancelled": "tw-status-cancelled [background:#faeae8] [color:#a95049]",
  "completed": "tw-status-completed [background:#e9f0fb] [color:#4668a0]",
  "confirmed": "tw-status-confirmed [background:#e8f4ec] [color:#36794f]",
  "failed": "tw-status-failed [.tw-notification-dot&]:[background:#c4473e]",
  "no_show": "tw-status-no_show [background:#fff1df] [color:#a66b25]",
  "sent": "tw-status-sent [.tw-notification-dot&]:[background:#4b9b69]",
};
