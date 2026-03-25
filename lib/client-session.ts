export interface ClientSession {
  authenticated: boolean;
  vendedor: string | null;
}

export async function fetchClientSession(): Promise<ClientSession> {
  const res = await fetch('/api/session', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!res.ok) {
    return { authenticated: false, vendedor: null };
  }

  return res.json();
}

export async function clearClientSession() {
  await fetch('/api/session', {
    method: 'DELETE',
  });
}
