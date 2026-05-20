'use client';

import { useEffect } from 'react';
import { useTabContext, Tab } from './TabContext';

export default function TabSyncer(props: Tab) {
  const { openTab } = useTabContext();

  useEffect(() => {
    openTab(props);
  // openTab is stable (useCallback), re-run only when tab identity or title changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id, props.title, props.url]);

  return null;
}
