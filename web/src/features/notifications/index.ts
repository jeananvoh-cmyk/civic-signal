/**
 * Feature: Notifications
 * Centralise la gestion des abonnements Web Push, le ciblage territorial et les bannières.
 */

export { usePushSubscription } from "@/hooks/usePushSubscription";
export { default as PushPromptBanner } from "@/components/PushPromptBanner";
export { default as PushNotificationToggle } from "@/components/PushNotificationToggle";
export { default as CommuneAlertButton } from "@/components/CommuneAlertButton";
