/**
 * SWR fetcher — kastar Error vid icke-ok HTTP-svar
 * så att useSWR:s `error`-prop faktiskt triggas.
 */
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json() as Promise<T>;
}
