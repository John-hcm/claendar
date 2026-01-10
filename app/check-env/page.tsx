export default function CheckEnvPage() {
  return (
    <pre style={{ padding: 20 }}>
      {JSON.stringify(
        {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            ? 'SET'
            : 'EMPTY',
        },
        null,
        2
      )}
    </pre>
  );
}
