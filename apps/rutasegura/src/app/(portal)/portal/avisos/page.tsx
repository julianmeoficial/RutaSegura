import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NOTIFICATIONS_PAGE_MAX, type NotificationKind } from "@rutasegura/contracts";
import { IconCalendar, IconRefresh, IconTruck } from "@/components/icons";
import { ButtonLink, EmptyState, PageIntro } from "@/components/ui";
import { MarkReadButton } from "@/features/portal/mark-read-button";
import styles from "@/features/portal/portal.module.css";
import { NOTIFICATION_LABEL, dateTimeLabel } from "@/lib/format";
import { requirePortalUser } from "@/server/auth/current-user";
import { pageData } from "@/server/portal/page-data";
import { listNotificationsForUser } from "@/server/services/notifications";

export const metadata: Metadata = { title: "Avisos" };

const KIND_ICON: Record<NotificationKind, ReactNode> = {
  shipment_scheduled: <IconCalendar size={20} />,
  shipment_rescheduled: <IconRefresh size={20} />,
  shipment_unscheduled: <IconCalendar size={20} />,
  shipment_status_changed: <IconTruck size={20} />,
};

export default async function NotificationsPage() {
  const user = await requirePortalUser("/portal/avisos");
  const { notifications, unreadCount } = await pageData("portal.notifications", () =>
    listNotificationsForUser(user.id, NOTIFICATIONS_PAGE_MAX),
  );

  return (
    <>
      <PageIntro
        eyebrow="Avisos"
        title="Tus avisos"
        description={
          unreadCount === 0
            ? "Estás al día."
            : unreadCount === 1
              ? "Tienes 1 aviso sin leer."
              : `Tienes ${unreadCount} avisos sin leer.`
        }
        actions={unreadCount > 0 ? <MarkReadButton /> : undefined}
      />

      {notifications.length > 0 ? (
        <ul className={styles.notices} aria-label="Tus avisos">
          {notifications.map((notification, index) => (
            <li
              key={`${notification.createdAt}-${index}`}
              className={styles.notice}
              data-unread={notification.read ? undefined : "true"}
            >
              <span className={styles.noticeIcon}>{KIND_ICON[notification.kind]}</span>
              <div className={styles.noticeBody}>
                <p className={styles.noticeTitle}>
                  {NOTIFICATION_LABEL[notification.kind]}
                  {notification.read ? null : <span className={styles.noticeNew}>Nuevo</span>}
                </p>
                <p className={styles.noticeText}>{notification.body}</p>
                <p className={styles.noticeTime}>{dateTimeLabel(notification.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No tienes avisos"
          description="Te avisaremos aquí cuando agendes una entrega o cuando uno de tus envíos cambie de estado."
          action={<ButtonLink href="/portal">Ir a Mis envíos</ButtonLink>}
        />
      )}
    </>
  );
}
