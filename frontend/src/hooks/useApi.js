import { useEffect, useRef, useState } from 'react';

export function useApi(requestFn, options = {}) {
  const { deps = [], immediate = true, initialData = null } = options;
  const requestRef = useRef(requestFn);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  requestRef.current = requestFn;

  async function refetch() {
    setLoading(true);
    setError(null);

    try {
      const result = await requestRef.current();
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!immediate) {
      setLoading(false);
      return;
    }

    refetch().catch(() => {});
  }, deps);

  return { data, loading, error, refetch };
}
