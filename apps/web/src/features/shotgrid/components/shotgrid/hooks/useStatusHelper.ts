import { useMemo } from 'react';
import type { Status, StatusMeta, EntityTypeForStatus } from '@shogunito/shared';

export const useStatusHelper = (apiStatuses: Status[]) => {
  const statusMap = useMemo<Record<string, StatusMeta>>(() => {
    const map: Record<string, StatusMeta> = {};
    for (const s of apiStatuses) {
      map[s.code] = { label: s.name || s.code, color: s.color };
      // Also map by ID for statusId lookups
      map[String(s.id)] = { label: s.name || s.code, color: s.color };
    }
    return map;
  }, [apiStatuses]);

  const hashStringToInt = (input: string): number => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const getOfficialStatusPool = (entityType: EntityTypeForStatus): string[] => {
    const pool = apiStatuses.filter(
      (s: Status) =>
        s.applicableEntities?.includes('all') || s.applicableEntities?.includes(entityType),
    );
    return pool.map((s: Status) => s.code);
  };

  const pickStableRandomStatus = (
    entityType: EntityTypeForStatus,
    itemId: string,
  ): string | undefined => {
    const pool = getOfficialStatusPool(entityType);
    if (pool.length === 0) return undefined;
    const idx = hashStringToInt(`${entityType}:${itemId}`) % pool.length;
    return pool[idx];
  };

  return {
    statusMap,
    pickStableRandomStatus,
  };
};
