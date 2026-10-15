import type { ShipmentStatus } from "@rutasegura/contracts";
import { PROGRESS_STEPS, STATUS_LABEL, progressStep } from "@/lib/format";
import styles from "./shipment.module.css";

/**
 * Avance del envío como una ruta con cuatro paradas y un punto que llega hasta
 * la actual. La posición sale de `data-step` en CSS: la CSP de producción no
 * admite estilos en línea.
 */
export function ShipmentProgress({
  status,
  compact = false,
}: {
  status: ShipmentStatus;
  compact?: boolean;
}) {
  const step = progressStep(status);
  const tone = status === "exception" ? "danger" : status === "delivered" ? "done" : "active";
  const current =
    status === "exception" ? STATUS_LABEL.exception.label : PROGRESS_STEPS[step]!.label;

  return (
    <div
      className={compact ? `${styles.progress} ${styles.progressCompact}` : styles.progress}
      data-step={step}
      data-tone={tone}
    >
      <div className={styles.rail} aria-hidden="true">
        <span className={styles.fill} />
        {PROGRESS_STEPS.map((item, index) => (
          <span
            key={item.status}
            className={styles.stop}
            data-reached={index <= step ? "" : undefined}
          />
        ))}
        <span className={styles.marker} />
      </div>
      {compact ? (
        <p className="visually-hidden">
          Paso {step + 1} de {PROGRESS_STEPS.length}: {current}
        </p>
      ) : (
        <ol className={styles.steps} aria-label="Progreso del envío">
          {PROGRESS_STEPS.map((item, index) => {
            const state = index < step ? "done" : index === step ? "current" : "upcoming";
            return (
              <li
                key={item.status}
                className={styles.step}
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
              >
                {state === "current" && status === "exception"
                  ? STATUS_LABEL.exception.label
                  : item.label}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
