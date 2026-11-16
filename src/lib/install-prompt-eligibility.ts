/** Installation reminders are only for signed-in account holders. */
export function canShowInstallPrompt(userId: string | null, installed: boolean, dismissed: boolean) {
  return Boolean(userId) && !installed && !dismissed;
}