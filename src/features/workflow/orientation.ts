export type Orientation = 'portrait' | 'landscape';

/** Accepts a device, a workflow family, or its group without coupling to approval state. */
export function supportsOrientation(device: { group?: string; family?: string } | string): boolean {
  const family = typeof device === 'string' ? device : device.family ?? device.group;
  return family === 'mobile' || family === 'tablet';
}

/** Preview geometry only: callers must continue resolving decisions at device.w. */
export function orientedViewport(
  device: { w: number; h: number; group?: string; family?: string },
  orientation: Orientation,
): { width: number; height: number; landscape: boolean } {
  const landscape = supportsOrientation(device) && orientation === 'landscape';
  return {
    width: landscape ? device.h : device.w,
    height: landscape ? device.w : device.h,
    landscape,
  };
}
