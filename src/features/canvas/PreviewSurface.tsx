import { forwardRef, type ReactNode } from 'react';
import type { ContextId, ContextSettings, RoleProps, Theme } from '../../core';
import { canvasVars } from './canvasVars';
import { contextStyle } from './roleStyle';

interface Props {
  ctx: ContextId;
  resolved: Record<string, RoleProps>;
  settings: ContextSettings;
  width: number;
  theme: Theme;
  className?: string;
  clean?: boolean;
  children: ReactNode;
}

/** Tuval kökü: tuval teması ve bağlamdaki bütün türlerin değişkenleri burada tanımlanır. */
export const PreviewSurface = forwardRef<HTMLDivElement, Props>(function PreviewSurface(
  { ctx, resolved, settings, width, theme, className, clean, children }, ref,
) {
  return (
    <div
      ref={ref}
      className={`gx-canvas${className ? ` ${className}` : ''}`}
      data-canvas-theme={theme}
      data-clean={clean || undefined}
      style={{ ...canvasVars(theme), ...contextStyle(ctx, resolved, settings, width, theme) }}
    >
      {children}
    </div>
  );
});
